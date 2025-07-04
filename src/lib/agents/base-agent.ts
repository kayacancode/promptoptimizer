import { AgentTask, AgentResult } from '@/types'

export abstract class BaseAgent {
  protected id: string
  protected name: string
  protected capabilities: string[]

  constructor(id: string, name: string, capabilities: string[] = []) {
    this.id = id
    this.name = name
    this.capabilities = capabilities
  }

  abstract execute(task: AgentTask): Promise<AgentResult>

  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    console.log(`[${this.name}] ${level.toUpperCase()}: ${message}`)
  }

  protected createResult(
    taskId: string, 
    success: boolean, 
    data?: any, 
    error?: string,
    logs: string[] = [],
    metrics?: Record<string, number>
  ): AgentResult {
    return {
      taskId,
      success,
      data,
      error,
      logs,
      metrics
    }
  }

  canHandle(task: AgentTask): boolean {
    return this.capabilities.includes(task.type)
  }

  getId(): string {
    return this.id
  }

  getName(): string {
    return this.name
  }

  getCapabilities(): string[] {
    return [...this.capabilities]
  }
}