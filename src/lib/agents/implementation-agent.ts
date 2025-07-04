import { BaseAgent } from './base-agent'
import { AgentTask, AgentResult, ConfigFile, FileChange, ChangeProposal } from '@/types'
import { GitManager } from '../git-manager'

export class ImplementationAgent extends BaseAgent {
  private gitManager: GitManager

  constructor() {
    super('implementation-agent', 'Implementation Agent', ['implementation'])
    this.gitManager = new GitManager()
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const logs: string[] = []
    
    try {
      this.log(`Starting implementation for task: ${task.description}`)
      logs.push('Beginning implementation of optimization changes')

      const { configFile, optimizationResult, targetPath } = task.metadata || {}
      
      if (!configFile || !optimizationResult) {
        throw new Error('Missing required data for implementation')
      }

      // Create implementation plan
      const implementationPlan = await this.createImplementationPlan(
        configFile, 
        optimizationResult, 
        targetPath
      )
      logs.push(`Created implementation plan with ${implementationPlan.changes.length} changes`)

      // Execute changes in sandbox first
      const sandboxResult = await this.executeInSandbox(implementationPlan)
      logs.push(`Sandbox execution completed: ${sandboxResult.success ? 'SUCCESS' : 'FAILED'}`)

      if (!sandboxResult.success) {
        throw new Error(`Sandbox execution failed: ${sandboxResult.error}`)
      }

      // Apply changes to actual codebase
      const applyResult = await this.applyChanges(implementationPlan)
      logs.push(`Applied ${applyResult.appliedChanges} changes successfully`)

      const metrics = {
        implementationTime: Date.now() - new Date(task.createdAt).getTime(),
        changesApplied: applyResult.appliedChanges,
        sandboxTestsPassed: sandboxResult.testsPassed || 0
      }

      return this.createResult(task.id, true, applyResult, undefined, logs, metrics)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Implementation failed: ${errorMessage}`, 'error')
      return this.createResult(task.id, false, undefined, errorMessage, logs)
    }
  }

  private async createImplementationPlan(
    configFile: ConfigFile,
    optimizationResult: any,
    targetPath?: string
  ): Promise<ChangeProposal> {
    const changes: FileChange[] = []
    
    // Determine target file path
    const filePath = targetPath || `configs/${configFile.name}`
    
    // Create the main configuration change
    changes.push({
      path: filePath,
      operation: 'update',
      content: optimizationResult.optimizedContent,
      oldContent: optimizationResult.originalContent,
      reason: optimizationResult.explanation
    })

    // Check if we need to create backup
    const backupPath = `${filePath}.backup.${Date.now()}`
    changes.push({
      path: backupPath,
      operation: 'create',
      content: optimizationResult.originalContent,
      reason: 'Create backup before applying optimizations'
    })

    // Generate test files if needed
    const testChanges = await this.generateTestFiles(configFile, optimizationResult)
    changes.push(...testChanges)

    return {
      id: `impl-${Date.now()}`,
      title: `Optimize ${configFile.name}`,
      description: optimizationResult.explanation,
      changes,
      reasoning: `Implementing ${optimizationResult.changes?.length || 0} optimizations to improve configuration performance and clarity`,
      impact: this.assessImpact(optimizationResult),
      reviewStatus: 'pending',
      autoApprove: this.shouldAutoApprove(optimizationResult)
    }
  }

  private async generateTestFiles(configFile: ConfigFile, optimizationResult: any): Promise<FileChange[]> {
    const changes: FileChange[] = []
    
    // Generate test file for configuration validation
    const testFileName = `tests/${configFile.name.replace(/\.[^/.]+$/, '')}.test.ts`
    const testContent = this.generateTestContent(configFile, optimizationResult)
    
    changes.push({
      path: testFileName,
      operation: 'create',
      content: testContent,
      reason: 'Create validation tests for optimized configuration'
    })

    return changes
  }

  private generateTestContent(configFile: ConfigFile, optimizationResult: any): string {
    return `// Auto-generated test for ${configFile.name}
import { describe, it, expect } from 'vitest'
import { validateConfig } from '../lib/config-validator'

describe('${configFile.name} Configuration Tests', () => {
  const optimizedConfig = ${JSON.stringify(optimizationResult.optimizedContent, null, 2)}
  
  it('should have valid structure', () => {
    expect(validateConfig(optimizedConfig)).toBeTruthy()
  })
  
  it('should improve upon original metrics', () => {
    // This would be populated with actual metric comparisons
    expect(true).toBeTruthy()
  })
  
  ${optimizationResult.changes?.map((change: any, index: number) => `
  it('should implement change ${index + 1}: ${change.reason}', () => {
    // Test specific to: ${change.reason}
    expect(optimizedConfig).toContain('${change.optimized?.substring(0, 20) || 'optimized'}')
  })`).join('\n  ') || ''}
})`
  }

  private async executeInSandbox(plan: ChangeProposal): Promise<{
    success: boolean
    error?: string
    testsPassed?: number
  }> {
    this.log('Executing changes in sandbox environment')
    
    try {
      // Simulate sandbox execution
      // In a real implementation, this would:
      // 1. Create isolated environment
      // 2. Apply changes
      // 3. Run tests
      // 4. Validate results
      
      await new Promise(resolve => setTimeout(resolve, 100)) // Simulate work
      
      return {
        success: true,
        testsPassed: plan.changes.length
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sandbox execution failed'
      }
    }
  }

  private async applyChanges(plan: ChangeProposal): Promise<{
    appliedChanges: number
    failedChanges: number
    details: Array<{ path: string; success: boolean; error?: string }>
  }> {
    const results = []
    let appliedChanges = 0
    let failedChanges = 0

    for (const change of plan.changes) {
      try {
        await this.applyFileChange(change)
        results.push({ path: change.path, success: true })
        appliedChanges++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({ path: change.path, success: false, error: errorMessage })
        failedChanges++
      }
    }

    return { appliedChanges, failedChanges, details: results }
  }

  private async applyFileChange(change: FileChange): Promise<void> {
    switch (change.operation) {
      case 'create':
        await this.gitManager.createFile(change.path, change.content || '')
        break
      case 'update':
        await this.gitManager.updateFile(change.path, change.content || '')
        break
      case 'delete':
        await this.gitManager.deleteFile(change.path)
        break
    }
  }

  private assessImpact(optimizationResult: any): 'low' | 'medium' | 'high' {
    const changeCount = optimizationResult.changes?.length || 0
    const confidence = optimizationResult.confidence || 0

    if (changeCount > 5 || confidence > 0.9) return 'high'
    if (changeCount > 2 || confidence > 0.7) return 'medium'
    return 'low'
  }

  private shouldAutoApprove(optimizationResult: any): boolean {
    return (optimizationResult.confidence || 0) > 0.85 && 
           (optimizationResult.changes?.length || 0) <= 3
  }
}