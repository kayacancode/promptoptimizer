// Server-side only agent orchestrator
import { AgentOrchestrator } from '../agent-orchestrator'
import { ServerConfigManager } from './config-manager-server'
import { GitHubIntegration } from '../github-integration'
import { ConfigFile, OptimizationResult } from '@/types'

export class ServerAgentOrchestrator {
  private static orchestrator = new AgentOrchestrator()
  private static configManager = new ServerConfigManager()
  private static githubIntegration = new GitHubIntegration()

  static async orchestrateOptimization(configFile: ConfigFile) {
    return await this.orchestrator.orchestrateOptimization(configFile)
  }

  static getAgentStatus() {
    return this.orchestrator.getAgentStatus()
  }

  static getCurrentTask() {
    return this.orchestrator.getCurrentTask()
  }

  static getTaskQueue() {
    return this.orchestrator.getTaskQueue()
  }

  static async createPullRequest(optimizationResult: OptimizationResult, configFile: ConfigFile) {
    const changeProposal = {
      id: `opt-${Date.now()}`,
      title: `Optimize ${configFile.name}`,
      description: optimizationResult.explanation,
      changes: optimizationResult.changes.map(change => ({
        path: `prompts/${configFile.name}`,
        operation: change.type === 'addition' ? 'create' as const : 
                  change.type === 'deletion' ? 'delete' as const : 'update' as const,
        content: change.optimized || optimizationResult.optimizedContent,
        oldContent: change.original || optimizationResult.originalContent,
        reason: change.reason
      })),
      reasoning: optimizationResult.explanation,
      impact: optimizationResult.confidence > 0.8 ? 'high' as const : 'medium' as const,
      reviewStatus: 'pending' as const,
      autoApprove: optimizationResult.confidence > 0.9
    }
    
    return await this.githubIntegration.createPullRequest(changeProposal)
  }
}