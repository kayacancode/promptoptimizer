import * as yaml from 'js-yaml'
import { ConfigFile, FileChange } from '@/types'
import * as fs from 'fs/promises'
import * as path from 'path'

export class ConfigManager {
  private basePath: string

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath
  }

  async loadConfig(filePath: string): Promise<ConfigFile> {
    try {
      const fullPath = path.join(this.basePath, filePath)
      const content = await fs.readFile(fullPath, 'utf8')
      const stats = await fs.stat(fullPath)
      
      const configFile: ConfigFile = {
        name: path.basename(filePath),
        type: this.detectConfigType(filePath),
        content,
        size: stats.size
      }

      // Validate the configuration
      await this.validateConfig(configFile)
      
      return configFile
    } catch (error) {
      throw new Error(`Failed to load config from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async saveConfig(configFile: ConfigFile, targetPath?: string): Promise<void> {
    try {
      const filePath = targetPath || `configs/${configFile.name}`
      const fullPath = path.join(this.basePath, filePath)
      
      // Ensure directory exists
      const dir = path.dirname(fullPath)
      await fs.mkdir(dir, { recursive: true })
      
      // Validate before saving
      await this.validateConfig(configFile)
      
      await fs.writeFile(fullPath, configFile.content, 'utf8')
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async updateConfig(filePath: string, changes: FileChange[]): Promise<ConfigFile> {
    try {
      const originalConfig = await this.loadConfig(filePath)
      let updatedContent = originalConfig.content

      // Apply changes in order
      for (const change of changes) {
        if (change.path === filePath || change.path === originalConfig.name) {
          switch (change.operation) {
            case 'update':
              updatedContent = change.content || updatedContent
              break
            case 'delete':
              // For config files, deletion means removing specific sections
              updatedContent = this.removeConfigSection(updatedContent, change.oldContent || '')
              break
          }
        }
      }

      const updatedConfig: ConfigFile = {
        ...originalConfig,
        content: updatedContent,
        size: Buffer.byteLength(updatedContent, 'utf8')
      }

      // Validate the updated configuration
      await this.validateConfig(updatedConfig)
      
      // Save the updated config
      await this.saveConfig(updatedConfig, filePath)
      
      return updatedConfig
    } catch (error) {
      throw new Error(`Failed to update config: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async validateConfig(configFile: ConfigFile): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Basic validation
      if (!configFile.content || configFile.content.trim().length === 0) {
        errors.push('Configuration content is empty')
      }

      // Type-specific validation
      switch (configFile.type) {
        case 'json':
          await this.validateJSON(configFile.content)
          break
        case 'yaml':
          await this.validateYAML(configFile.content)
          break
        case 'typescript':
          await this.validateTypeScript(configFile.content)
          break
      }

      // Prompt-specific validation
      const promptValidation = this.validatePromptStructure(configFile.content)
      warnings.push(...promptValidation.warnings)
      
      return {
        valid: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Validation failed')
      return { valid: false, errors, warnings }
    }
  }

  private detectConfigType(filePath: string): 'yaml' | 'json' | 'typescript' {
    const ext = path.extname(filePath).toLowerCase()
    
    switch (ext) {
      case '.json':
        return 'json'
      case '.yaml':
      case '.yml':
        return 'yaml'
      case '.ts':
      case '.tsx':
        return 'typescript'
      default:
        // Try to detect based on content
        return 'json'
    }
  }

  private async validateJSON(content: string): Promise<void> {
    try {
      JSON.parse(content)
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`)
    }
  }

  private async validateYAML(content: string): Promise<void> {
    try {
      yaml.load(content)
    } catch (error) {
      throw new Error(`Invalid YAML: ${error instanceof Error ? error.message : 'Parse error'}`)
    }
  }

  private async validateTypeScript(content: string): Promise<void> {
    // Basic TypeScript validation
    const issues = []
    
    // Check for basic syntax issues
    if (content.includes('function') && !content.includes('{')) {
      issues.push('Function declarations appear incomplete')
    }
    
    if (content.includes('interface') && !content.includes('{')) {
      issues.push('Interface declarations appear incomplete')
    }
    
    // Check for unterminated strings
    const singleQuotes = (content.match(/'/g) || []).length
    const doubleQuotes = (content.match(/"/g) || []).length
    const backticks = (content.match(/`/g) || []).length
    
    if (singleQuotes % 2 !== 0) issues.push('Unterminated single quotes detected')
    if (doubleQuotes % 2 !== 0) issues.push('Unterminated double quotes detected')
    if (backticks % 2 !== 0) issues.push('Unterminated template literals detected')
    
    if (issues.length > 0) {
      throw new Error(`TypeScript validation failed: ${issues.join(', ')}`)
    }
  }

  private validatePromptStructure(content: string): {
    warnings: string[]
  } {
    const warnings: string[] = []
    const lowerContent = content.toLowerCase()

    // Check for common prompt engineering best practices
    if (!lowerContent.includes('system') && !lowerContent.includes('role')) {
      warnings.push('No system role or context defined')
    }

    if (!lowerContent.includes('example') && !lowerContent.includes('sample')) {
      warnings.push('No examples provided - consider adding examples for better performance')
    }

    if (!lowerContent.includes('format') && !lowerContent.includes('output')) {
      warnings.push('No output format specified - consider defining expected output structure')
    }

    if (lowerContent.includes('never') || lowerContent.includes('always') || lowerContent.includes('must')) {
      // Good - has constraints
    } else {
      warnings.push('Consider adding explicit constraints or rules')
    }

    if (content.length > 5000) {
      warnings.push('Very long prompt - consider breaking into smaller, focused prompts')
    }

    if (content.length < 50) {
      warnings.push('Very short prompt - might benefit from more detailed instructions')
    }

    return { warnings }
  }

  private removeConfigSection(content: string, sectionToRemove: string): string {
    // Simple implementation - in a real system, this would be more sophisticated
    return content.replace(sectionToRemove, '').trim()
  }

  async discoverConfigs(directory: string = 'configs'): Promise<ConfigFile[]> {
    const configs: ConfigFile[] = []
    
    try {
      const fullPath = path.join(this.basePath, directory)
      const entries = await fs.readdir(fullPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(directory, entry.name)
          const ext = path.extname(entry.name).toLowerCase()
          
          if (['.json', '.yaml', '.yml', '.ts', '.tsx'].includes(ext)) {
            try {
              const config = await this.loadConfig(filePath)
              configs.push(config)
            } catch (error) {
              console.warn(`Failed to load config ${filePath}:`, error)
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to discover configs in ${directory}:`, error)
    }

    return configs
  }

  async backupConfig(configFile: ConfigFile): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `${configFile.name}.backup.${timestamp}`
    const backupPath = `backups/${backupName}`
    
    await this.saveConfig({
      ...configFile,
      name: backupName
    }, backupPath)
    
    return backupPath
  }

  async restoreConfig(backupPath: string, targetPath: string): Promise<ConfigFile> {
    const backupConfig = await this.loadConfig(backupPath)
    const restoredConfig: ConfigFile = {
      ...backupConfig,
      name: path.basename(targetPath)
    }
    
    await this.saveConfig(restoredConfig, targetPath)
    return restoredConfig
  }

  // Template management
  async getConfigTemplates(): Promise<Record<string, ConfigFile>> {
    const templates: Record<string, ConfigFile> = {}
    
    // Predefined templates
    templates['basic-prompt'] = {
      name: 'basic-prompt.yaml',
      type: 'yaml',
      content: `system: |
  You are a helpful AI assistant. You should:
  - Provide accurate and helpful responses
  - Ask for clarification when needed
  - Be concise but thorough
  - Maintain a professional tone

format: |
  Provide responses in clear, structured format with:
  1. Direct answer
  2. Supporting explanation
  3. Additional context if relevant

constraints:
  - Must be factual and accurate
  - Should not make assumptions
  - Must ask for clarification on ambiguous requests`,
      size: 0
    }

    templates['code-assistant'] = {
      name: 'code-assistant.json',
      type: 'json',
      content: JSON.stringify({
        system: "You are an expert programming assistant specialized in helping developers write, debug, and optimize code.",
        instructions: [
          "Provide clean, well-commented code examples",
          "Explain complex concepts in simple terms",
          "Suggest best practices and optimizations",
          "Include error handling where appropriate"
        ],
        output_format: {
          code: "Provide the code solution",
          explanation: "Explain what the code does",
          best_practices: "List relevant best practices"
        }
      }, null, 2),
      size: 0
    }

    // Calculate sizes
    Object.keys(templates).forEach(key => {
      templates[key].size = Buffer.byteLength(templates[key].content, 'utf8')
    })

    return templates
  }
}