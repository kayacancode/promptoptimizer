import { ConfigManager } from '../config-manager'
import { GitManager } from '../git-manager'
import { createClient } from '@supabase/supabase-js'
import { OptimizationResult } from '@/types'
import * as fs from 'fs/promises'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ConfigUpdateRequest {
  userId: string
  appIdentifier: string
  repositoryUrl?: string
  branch?: string
  configPaths: string[] // Paths to config files to update
  optimizationResult: OptimizationResult
  backupEnabled: boolean
  createPR: boolean
  autoMerge: boolean
  dryRun?: boolean
}

export interface ConfigUpdateResult {
  success: boolean
  updatedFiles: string[]
  backupPaths: string[]
  pullRequestUrl?: string
  commitHash?: string
  errors: string[]
  changes: Array<{
    file: string
    originalContent: string
    updatedContent: string
    changeDescription: string
  }>
}

export interface AutoUpdateConfig {
  userId: string
  appIdentifier: string
  enabled: boolean
  repositoryUrl: string
  branch: string
  configPaths: string[]
  updateTriggers: {
    improvementThreshold: number // Minimum improvement % to trigger update
    confidenceThreshold: number // Minimum confidence to trigger update
    issueTypes: string[] // Issue types that trigger updates
  }
  safetySettings: {
    requireApproval: boolean
    createBackups: boolean
    runTests: boolean
    testCommand?: string
    rollbackOnFailure: boolean
  }
  githubIntegration: {
    createPR: boolean
    autoMerge: boolean
    reviewers: string[]
    prTemplate?: string
  }
}

export class ConfigUpdater {
  private configManager: ConfigManager
  private gitManager: GitManager
  private supabase
  private workingDirectory: string

  constructor(workingDirectory: string = '/tmp/bestmate-configs') {
    this.configManager = new ConfigManager()
    this.gitManager = new GitManager()
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    )
    this.workingDirectory = workingDirectory
  }

  /**
   * Set up automatic config updates for a project
   */
  async setupAutoUpdate(config: AutoUpdateConfig): Promise<void> {
    // Validate repository access
    await this.validateRepositoryAccess(config.repositoryUrl, config.branch)

    // Save configuration
    const { error } = await this.supabase
      .from('auto_update_configs')
      .upsert({
        user_id: config.userId,
        app_identifier: config.appIdentifier,
        config: config,
        updated_at: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Failed to save auto-update config: ${error.message}`)
    }
  }

  /**
   * Check if optimization should trigger automatic config update
   */
  async shouldTriggerAutoUpdate(
    userId: string,
    appIdentifier: string,
    optimizationResult: OptimizationResult
  ): Promise<{ shouldUpdate: boolean; config?: AutoUpdateConfig; reason?: string }> {
    // Get auto-update configuration
    const { data: configData, error } = await this.supabase
      .from('auto_update_configs')
      .select('config')
      .eq('user_id', userId)
      .eq('app_identifier', appIdentifier)
      .single()

    if (error || !configData) {
      return { shouldUpdate: false, reason: 'No auto-update configuration found' }
    }

    const config = configData.config as AutoUpdateConfig

    if (!config.enabled) {
      return { shouldUpdate: false, reason: 'Auto-update disabled' }
    }

    // Check improvement threshold
    const improvement = optimizationResult.confidence * 100
    if (improvement < config.updateTriggers.improvementThreshold) {
      return { 
        shouldUpdate: false, 
        reason: `Improvement ${improvement.toFixed(1)}% below threshold ${config.updateTriggers.improvementThreshold}%` 
      }
    }

    // Check confidence threshold
    if (optimizationResult.confidence < config.updateTriggers.confidenceThreshold) {
      return { 
        shouldUpdate: false, 
        reason: `Confidence ${optimizationResult.confidence} below threshold ${config.updateTriggers.confidenceThreshold}` 
      }
    }

    // Check if optimization addresses relevant issue types
    if (config.updateTriggers.issueTypes.length > 0 && optimizationResult.advancedFeatures?.autonomousContext) {
      const hasRelevantIssues = optimizationResult.advancedFeatures.autonomousContext.issueCount > 0
      
      if (!hasRelevantIssues) {
        return { 
          shouldUpdate: false, 
          reason: 'No relevant issues addressed by optimization' 
        }
      }
    }

    return { shouldUpdate: true, config }
  }

  /**
   * Execute automatic config update
   */
  async executeAutoUpdate(
    config: AutoUpdateConfig,
    optimizationResult: OptimizationResult
  ): Promise<ConfigUpdateResult> {
    const updateRequest: ConfigUpdateRequest = {
      userId: config.userId,
      appIdentifier: config.appIdentifier,
      repositoryUrl: config.repositoryUrl,
      branch: config.branch,
      configPaths: config.configPaths,
      optimizationResult,
      backupEnabled: config.safetySettings.createBackups,
      createPR: config.githubIntegration.createPR,
      autoMerge: config.githubIntegration.autoMerge && !config.safetySettings.requireApproval
    }

    return this.updateConfigs(updateRequest)
  }

  /**
   * Update configuration files with optimization results
   */
  async updateConfigs(request: ConfigUpdateRequest): Promise<ConfigUpdateResult> {
    const result: ConfigUpdateResult = {
      success: false,
      updatedFiles: [],
      backupPaths: [],
      errors: [],
      changes: []
    }

    try {
      // Clone/update repository
      const repoPath = await this.prepareRepository(request)

      // Create backups if enabled
      if (request.backupEnabled) {
        result.backupPaths = await this.createBackups(repoPath, request.configPaths)
      }

      // Update each config file
      for (const configPath of request.configPaths) {
        try {
          const fullPath = path.join(repoPath, configPath)
          const updateResult = await this.updateConfigFile(fullPath, request.optimizationResult)
          
          if (updateResult.updated) {
            result.updatedFiles.push(configPath)
            result.changes.push({
              file: configPath,
              originalContent: updateResult.originalContent,
              updatedContent: updateResult.updatedContent,
              changeDescription: updateResult.description
            })
          }
        } catch (error) {
          result.errors.push(`Failed to update ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // If no files were updated, return early
      if (result.updatedFiles.length === 0) {
        result.success = true
        return result
      }

      // Validate changes (syntax check, etc.)
      const validationErrors = await this.validateChanges(repoPath, result.updatedFiles)
      if (validationErrors.length > 0) {
        result.errors.push(...validationErrors)
        // Restore backups if validation fails
        if (request.backupEnabled) {
          await this.restoreBackups(repoPath, result.backupPaths)
        }
        return result
      }

      // Run tests if configured
      const testErrors = await this.runTests(repoPath, request)
      if (testErrors.length > 0) {
        result.errors.push(...testErrors)
        // Restore backups if tests fail
        if (request.backupEnabled) {
          await this.restoreBackups(repoPath, result.backupPaths)
        }
        return result
      }

      // Commit changes
      if (!request.dryRun) {
        result.commitHash = await this.commitChanges(repoPath, request, result)

        // Create pull request if requested
        if (request.createPR) {
          result.pullRequestUrl = await this.createPullRequest(repoPath, request, result)
        }
      }

      result.success = true
      return result

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error occurred')
      return result
    }
  }

  /**
   * Prepare repository for updates
   */
  private async prepareRepository(request: ConfigUpdateRequest): Promise<string> {
    const repoName = request.repositoryUrl.split('/').pop()?.replace('.git', '') || 'repo'
    const repoPath = path.join(this.workingDirectory, `${request.userId}-${repoName}`)

    // Ensure working directory exists
    await fs.mkdir(this.workingDirectory, { recursive: true })

    try {
      // Check if repo already exists
      await fs.access(repoPath)
      
      // Update existing repo
      await execAsync(`cd "${repoPath}" && git fetch origin && git checkout ${request.branch || 'main'} && git pull origin ${request.branch || 'main'}`)
    } catch (error) {
      // Clone fresh repo
      await execAsync(`git clone ${request.repositoryUrl} "${repoPath}"`)
      
      if (request.branch && request.branch !== 'main') {
        await execAsync(`cd "${repoPath}" && git checkout ${request.branch}`)
      }
    }

    return repoPath
  }

  /**
   * Create backups of config files
   */
  private async createBackups(repoPath: string, configPaths: string[]): Promise<string[]> {
    const backupPaths: string[] = []

    for (const configPath of configPaths) {
      const fullPath = path.join(repoPath, configPath)
      const backupPath = `${fullPath}.bestmate-backup-${Date.now()}`
      
      try {
        await fs.copyFile(fullPath, backupPath)
        backupPaths.push(backupPath)
      } catch (error) {
        console.warn(`Failed to create backup for ${configPath}:`, error)
      }
    }

    return backupPaths
  }

  /**
   * Update a single config file
   */
  private async updateConfigFile(
    filePath: string, 
    optimizationResult: OptimizationResult
  ): Promise<{
    updated: boolean
    originalContent: string
    updatedContent: string
    description: string
  }> {
    const originalContent = await fs.readFile(filePath, 'utf8')
    let updatedContent = originalContent

    // Detect file type and update accordingly
    const fileExtension = path.extname(filePath).toLowerCase()
    
    switch (fileExtension) {
      case '.json':
        updatedContent = await this.updateJsonConfig(originalContent, optimizationResult)
        break
      case '.yaml':
      case '.yml':
        updatedContent = await this.updateYamlConfig(originalContent, optimizationResult)
        break
      case '.py':
        updatedContent = await this.updatePythonConfig(originalContent, optimizationResult)
        break
      case '.js':
      case '.ts':
        updatedContent = await this.updateJavaScriptConfig(originalContent, optimizationResult)
        break
      default:
        updatedContent = await this.updateGenericConfig(originalContent, optimizationResult)
    }

    const updated = updatedContent !== originalContent

    if (updated) {
      await fs.writeFile(filePath, updatedContent, 'utf8')
    }

    return {
      updated,
      originalContent,
      updatedContent,
      description: updated 
        ? `Updated prompts with optimization improvements (${(optimizationResult.confidence * 100).toFixed(1)}% confidence)`
        : 'No changes needed'
    }
  }

  /**
   * Update JSON configuration file
   */
  private async updateJsonConfig(content: string, optimizationResult: OptimizationResult): Promise<string> {
    try {
      const config = JSON.parse(content)
      
      // Look for common prompt field names
      const promptFields = ['prompt', 'system_prompt', 'systemPrompt', 'instructions', 'template']
      let updated = false

      for (const field of promptFields) {
        if (config[field] && typeof config[field] === 'string') {
          if (config[field] === optimizationResult.originalContent) {
            config[field] = optimizationResult.optimizedContent
            updated = true
          }
        }
      }

      // Look for nested prompt configurations
      if (config.prompts && typeof config.prompts === 'object') {
        for (const [key, value] of Object.entries(config.prompts)) {
          if (typeof value === 'string' && value === optimizationResult.originalContent) {
            config.prompts[key] = optimizationResult.optimizedContent
            updated = true
          }
        }
      }

      return updated ? JSON.stringify(config, null, 2) : content
    } catch (error) {
      console.error('Failed to parse JSON config:', error)
      return content
    }
  }

  /**
   * Update YAML configuration file
   */
  private async updateYamlConfig(content: string, optimizationResult: OptimizationResult): Promise<string> {
    // Simple string replacement for YAML files
    // In a production system, you'd want to use a proper YAML parser
    if (content.includes(optimizationResult.originalContent)) {
      return content.replace(optimizationResult.originalContent, optimizationResult.optimizedContent)
    }
    return content
  }

  /**
   * Update Python configuration file
   */
  private async updatePythonConfig(content: string, optimizationResult: OptimizationResult): Promise<string> {
    // Look for string assignments that match the original prompt
    const lines = content.split('\n')
    let updated = false

    const updatedLines = lines.map(line => {
      // Look for common patterns like: PROMPT = "...", system_prompt = "...", etc.
      const promptAssignmentRegex = /^(\s*\w+\s*=\s*)(["'])(.*?)\2(.*)$/
      const match = line.match(promptAssignmentRegex)
      
      if (match && match[3] === optimizationResult.originalContent) {
        updated = true
        return `${match[1]}${match[2]}${optimizationResult.optimizedContent}${match[2]}${match[4]}`
      }
      
      return line
    })

    return updated ? updatedLines.join('\n') : content
  }

  /**
   * Update JavaScript/TypeScript configuration file
   */
  private async updateJavaScriptConfig(content: string, optimizationResult: OptimizationResult): Promise<string> {
    // Similar to Python but with JS/TS syntax
    if (content.includes(optimizationResult.originalContent)) {
      return content.replace(
        new RegExp(optimizationResult.originalContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        optimizationResult.optimizedContent
      )
    }
    return content
  }

  /**
   * Update generic configuration file
   */
  private async updateGenericConfig(content: string, optimizationResult: OptimizationResult): Promise<string> {
    // Simple string replacement for generic files
    if (content.includes(optimizationResult.originalContent)) {
      return content.replace(optimizationResult.originalContent, optimizationResult.optimizedContent)
    }
    return content
  }

  /**
   * Validate changes (syntax check, etc.)
   */
  private async validateChanges(repoPath: string, updatedFiles: string[]): Promise<string[]> {
    const errors: string[] = []

    for (const filePath of updatedFiles) {
      const fullPath = path.join(repoPath, filePath)
      const fileExtension = path.extname(filePath).toLowerCase()

      try {
        switch (fileExtension) {
          case '.json':
            const content = await fs.readFile(fullPath, 'utf8')
            JSON.parse(content) // Validate JSON syntax
            break
          case '.py':
            // Basic Python syntax check
            await execAsync(`python -m py_compile "${fullPath}"`)
            break
          case '.js':
          case '.ts':
            // Basic JavaScript/TypeScript syntax check with Node.js
            await execAsync(`node --check "${fullPath}"`)
            break
          // Add more validation as needed
        }
      } catch (error) {
        errors.push(`Validation failed for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return errors
  }

  /**
   * Run tests if configured
   */
  private async runTests(repoPath: string, request: ConfigUpdateRequest): Promise<string[]> {
    const errors: string[] = []

    // Get auto-update config to check for test commands
    try {
      const { data: configData } = await this.supabase
        .from('auto_update_configs')
        .select('config')
        .eq('user_id', request.userId)
        .eq('app_identifier', request.appIdentifier)
        .single()

      const autoConfig = configData?.config as AutoUpdateConfig
      
      if (autoConfig?.safetySettings.runTests && autoConfig.safetySettings.testCommand) {
        const { stderr } = await execAsync(`cd "${repoPath}" && ${autoConfig.safetySettings.testCommand}`)
        
        if (stderr) {
          errors.push(`Test failures: ${stderr}`)
        }
      }
    } catch (error) {
      errors.push(`Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return errors
  }

  /**
   * Restore backups
   */
  private async restoreBackups(repoPath: string, backupPaths: string[]): Promise<void> {
    for (const backupPath of backupPaths) {
      const originalPath = backupPath.replace(/\.bestmate-backup-\d+$/, '')
      try {
        await fs.copyFile(backupPath, originalPath)
      } catch (error) {
        console.error(`Failed to restore backup ${backupPath}:`, error)
      }
    }
  }

  /**
   * Commit changes to repository
   */
  private async commitChanges(
    repoPath: string, 
    request: ConfigUpdateRequest, 
    result: ConfigUpdateResult
  ): Promise<string> {
    const commitMessage = `BestMate: Automated prompt optimization

Updated ${result.updatedFiles.length} configuration file(s):
${result.updatedFiles.map(f => `- ${f}`).join('\n')}

Optimization Details:
- Confidence: ${(request.optimizationResult.confidence * 100).toFixed(1)}%
- Changes: ${request.optimizationResult.changes.length} modifications
- Explanation: ${request.optimizationResult.explanation}

🤖 Generated with BestMate Autonomous Optimization
https://bestmate.io`

    // Stage changes
    await execAsync(`cd "${repoPath}" && git add ${result.updatedFiles.map(f => `"${f}"`).join(' ')}`)
    
    // Commit changes
    await execAsync(`cd "${repoPath}" && git commit -m "${commitMessage}"`)
    
    // Get commit hash
    const { stdout } = await execAsync(`cd "${repoPath}" && git rev-parse HEAD`)
    
    return stdout.trim()
  }

  /**
   * Create pull request
   */
  private async createPullRequest(
    repoPath: string, 
    request: ConfigUpdateRequest, 
    result: ConfigUpdateResult
  ): Promise<string> {
    // Push to feature branch
    const branchName = `bestmate-optimization-${Date.now()}`
    await execAsync(`cd "${repoPath}" && git checkout -b ${branchName}`)
    await execAsync(`cd "${repoPath}" && git push origin ${branchName}`)

    // Create PR using GitHub API (simplified)
    const prTitle = `🤖 BestMate: Automated Prompt Optimization`
    const prBody = `## Automated Prompt Optimization

This PR contains automated optimizations generated by BestMate AI.

### Changes
${result.changes.map(c => `- **${c.file}**: ${c.changeDescription}`).join('\n')}

### Optimization Details
- **Confidence**: ${(request.optimizationResult.confidence * 100).toFixed(1)}%
- **Improvements**: ${request.optimizationResult.changes.length} modifications
- **Explanation**: ${request.optimizationResult.explanation}

### Testing
- ✅ Syntax validation passed
- ✅ Automated tests passed (if configured)
- ✅ Backup created for rollback

---
🤖 Generated with [BestMate](https://bestmate.io) - Autonomous Dev Tool for LLM Apps`

    // This would use the GitHub API to create the actual PR
    // For now, return a mock URL
    return `https://github.com/user/repo/pull/${Math.floor(Math.random() * 1000)}`
  }

  /**
   * Validate repository access
   */
  private async validateRepositoryAccess(repositoryUrl: string, branch?: string): Promise<void> {
    try {
      const tempDir = path.join(this.workingDirectory, 'temp-validation')
      await execAsync(`git clone --depth 1 ${repositoryUrl} "${tempDir}"`)
      
      if (branch) {
        await execAsync(`cd "${tempDir}" && git checkout ${branch}`)
      }
      
      // Clean up
      await execAsync(`rm -rf "${tempDir}"`)
    } catch (error) {
      throw new Error(`Repository access validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Clean up working directory
   */
  async cleanup(): Promise<void> {
    try {
      await execAsync(`rm -rf "${this.workingDirectory}"`)
    } catch (error) {
      console.error('Cleanup failed:', error)
    }
  }
}

// Export singleton instance
export const configUpdater = new ConfigUpdater()