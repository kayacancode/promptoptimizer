import { BaseAgent } from './agents/base-agent'
import { FeedbackAgent } from './agents/feedback-agent'
import { ImplementationAgent } from './agents/implementation-agent'
import { QAAgent } from './agents/qa-agent'
import { EvaluatorAgent } from './agents/evaluator-agent'
import { AgentTask, AgentResult, ConfigFile, SafetyGuard } from '@/types'
import { GitManager } from './git-manager'

export class AgentOrchestrator {
  private agents: Map<string, BaseAgent>
  private taskQueue: AgentTask[]
  private activeTask: AgentTask | null
  private gitManager: GitManager
  private safetyGuards: SafetyGuard[]
  private maxRetries: number = 3

  constructor() {
    this.agents = new Map()
    this.taskQueue = []
    this.activeTask = null
    this.gitManager = new GitManager()
    this.safetyGuards = []
    
    this.initializeAgents()
    this.initializeSafetyGuards()
  }

  private initializeAgents(): void {
    const agents = [
      new FeedbackAgent(),
      new ImplementationAgent(),
      new QAAgent(),
      new EvaluatorAgent()
    ]

    agents.forEach(agent => {
      this.agents.set(agent.getId(), agent)
    })

  }

  private initializeSafetyGuards(): void {
    this.safetyGuards = [
      {
        id: 'rollback-on-failure',
        name: 'Automatic Rollback',
        type: 'rollback',
        condition: 'test_failure_rate > 0.5',
        action: 'rollback',
        threshold: 0.5,
        enabled: true
      },
      {
        id: 'human-review-threshold',
        name: 'Human Review Required',
        type: 'evaluation',
        condition: 'confidence < 0.7 || impact === "high"',
        action: 'notify',
        threshold: 0.7,
        enabled: true
      }
    ]
  }

  async orchestrateOptimization(configFile: ConfigFile): Promise<{
    success: boolean
    results: AgentResult[]
    finalOptimization?: any
    rollbackPerformed?: boolean
    error?: string
  }> {
    const results: AgentResult[] = []
    let rollbackPerformed = false

    try {

      // Step 1: Feedback Analysis
      const feedbackTask = this.createTask('feedback', 'Analyze configuration for optimization opportunities', {
        configFile,
        priority: 'high'
      })
      
      const feedbackResult = await this.executeTask(feedbackTask)
      results.push(feedbackResult)

      if (!feedbackResult.success) {
        throw new Error(`Feedback analysis failed: ${feedbackResult.error}`)
      }

      // Step 2: Implementation
      const implementationTask = this.createTask('implementation', 'Implement optimization changes', {
        configFile,
        optimizationResult: feedbackResult.data,
        priority: 'high'
      })

      const implementationResult = await this.executeTask(implementationTask)
      results.push(implementationResult)

      if (!implementationResult.success) {
        throw new Error(`Implementation failed: ${implementationResult.error}`)
      }

      // Step 3: QA Validation
      const qaTask = this.createTask('qa', 'Validate implemented changes', {
        changeProposal: implementationResult.data,
        priority: 'high'
      })

      const qaResult = await this.executeTask(qaTask)
      results.push(qaResult)

      // Check if QA passed or if rollback is needed
      if (!qaResult.success || (qaResult.data?.recommendation === 'REJECT')) {
        rollbackPerformed = await this.initiateRollback(implementationResult.data)
        
        if (!rollbackPerformed) {
          throw new Error('QA validation failed and rollback unsuccessful')
        }
        
        return { success: false, results, rollbackPerformed, error: 'Changes rolled back due to QA failures' }
      }

      // Step 4: Final Evaluation
      const evaluationTask = this.createTask('evaluation', 'Perform final evaluation of optimized configuration', {
        beforeConfig: configFile,
        afterConfig: implementationResult.data,
        priority: 'medium'
      })

      const evaluationResult = await this.executeTask(evaluationTask)
      results.push(evaluationResult)

      // Check if evaluation meets thresholds
      if (evaluationResult.success && evaluationResult.data?.improvement < 5) {
        
        if (await this.shouldRollback(evaluationResult.data)) {
          rollbackPerformed = await this.initiateRollback(implementationResult.data)
          return { 
            success: false, 
            results, 
            rollbackPerformed, 
            error: 'Changes rolled back due to insufficient improvement' 
          }
        }
      }

      // Success - commit changes if not already committed
      if (evaluationResult.success) {
        await this.commitOptimization(implementationResult.data, evaluationResult.data)
      }

      return {
        success: true,
        results,
        finalOptimization: evaluationResult.data,
        rollbackPerformed: false
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Orchestration failed:', errorMessage)
      
      // Attempt rollback on critical failure
      if (results.length > 1) { // If we got past implementation
        const implementationResult = results.find(r => r.taskId.includes('implementation'))
        if (implementationResult?.success) {
          rollbackPerformed = await this.initiateRollback(implementationResult.data)
        }
      }

      return {
        success: false,
        results,
        rollbackPerformed,
        error: errorMessage
      }
    }
  }

  async executeTask(task: AgentTask): Promise<AgentResult> {
    // Find capable agent
    const agent = this.findCapableAgent(task)
    if (!agent) {
      return {
        taskId: task.id,
        success: false,
        error: `No capable agent found for task type: ${task.type}`,
        logs: []
      }
    }

    // Execute with retry logic
    let lastError: string | undefined
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        
        task.status = 'running'
        task.updatedAt = new Date().toISOString()
        
        const result = await agent.execute(task)
        
        if (result.success) {
          task.status = 'completed'
        } else {
          task.status = 'failed'
          lastError = result.error
        }
        
        task.updatedAt = new Date().toISOString()
        return result
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Task ${task.id} attempt ${attempt} failed:`, errorMessage)
        lastError = errorMessage
        
        if (attempt === this.maxRetries) {
          task.status = 'failed'
          task.updatedAt = new Date().toISOString()
        }
      }
    }

    return {
      taskId: task.id,
      success: false,
      error: lastError || 'Task failed after all retry attempts',
      logs: [`Failed after ${this.maxRetries} attempts`]
    }
  }

  private createTask(type: AgentTask['type'], description: string, metadata: any): AgentTask {
    return {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      status: 'pending',
      priority: metadata.priority || 'medium',
      description,
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  private findCapableAgent(task: AgentTask): BaseAgent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.canHandle(task)) {
        return agent
      }
    }
    return undefined
  }

  private async shouldRollback(evaluationData: any): Promise<boolean> {
    // Check safety guards
    for (const guard of this.safetyGuards) {
      if (!guard.enabled) continue

      if (guard.type === 'rollback' && guard.action === 'rollback') {
        // Simulate guard condition evaluation
        if (guard.id === 'rollback-on-failure' && evaluationData?.improvement < 0) {
          return true
        }
      }
    }

    // Check if improvement is significantly negative
    return evaluationData?.improvement < -10
  }

  private async initiateRollback(implementationData: any): Promise<boolean> {
    try {
      
      if (implementationData?.changes) {
        // Reverse the changes
        const rollbackOperation = {
          type: 'revert' as const,
          files: implementationData.changes.map((change: any) => change.path),
          message: 'Automatic rollback due to failed validation'
        }
        
        const rollbackResult = await this.gitManager.executeOperation(rollbackOperation)
        
        if (rollbackResult.success) {
          return true
        } else {
          console.error('Rollback failed:', rollbackResult.error)
          return false
        }
      }
      
      return false
    } catch (error) {
      console.error('Rollback process failed:', error)
      return false
    }
  }

  private async commitOptimization(implementationData: any, evaluationData: any): Promise<void> {
    try {
      const commitMessage = `Optimize configuration: ${evaluationData.improvement.toFixed(1)}% improvement

- Applied ${implementationData.changes?.length || 0} optimization changes
- Test results: ${evaluationData.metrics?.passedTests || 0}/${evaluationData.metrics?.totalTests || 0} passed
- Overall score: ${(evaluationData.afterScore?.overall * 100).toFixed(1)}%

🤖 Generated with PromptLoop Agent System`

      const commitOperation = {
        type: 'commit' as const,
        files: implementationData.changes?.map((change: any) => change.path) || [],
        message: commitMessage
      }

      await this.gitManager.executeOperation(commitOperation)
    } catch (error) {
      console.error('Failed to commit optimization:', error)
    }
  }

  // Public methods for external integration
  async startContinuousMonitoring(configFiles: ConfigFile[], interval: number = 3600000): Promise<void> {
    
    setInterval(async () => {
      for (const configFile of configFiles) {
        try {
          // Check if configuration needs re-optimization
          const needsOptimization = await this.checkForOptimizationNeeds(configFile)
          
          if (needsOptimization) {
            await this.orchestrateOptimization(configFile)
          }
        } catch (error) {
          console.error(`Monitoring error for ${configFile.name}:`, error)
        }
      }
    }, interval)
  }

  private async checkForOptimizationNeeds(configFile: ConfigFile): Promise<boolean> {
    // This would implement drift detection, performance monitoring, etc.
    // For now, simulate occasional need for re-optimization
    return Math.random() < 0.1 // 10% chance of needing optimization
  }

  getAgentStatus(): Record<string, { id: string; name: string; capabilities: string[] }> {
    const status: Record<string, any> = {}
    
    for (const [id, agent] of this.agents) {
      status[id] = {
        id: agent.getId(),
        name: agent.getName(),
        capabilities: agent.getCapabilities()
      }
    }
    
    return status
  }

  getCurrentTask(): AgentTask | null {
    return this.activeTask
  }

  getTaskQueue(): AgentTask[] {
    return [...this.taskQueue]
  }
}