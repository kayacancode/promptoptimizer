import { BaseAgent } from './base-agent'
import { AgentTask, AgentResult, ConfigFile, OptimizationResult } from '@/types'

export class FeedbackAgent extends BaseAgent {
  constructor() {
    super('feedback-agent', 'Feedback Agent', ['feedback'])
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const logs: string[] = []
    
    try {
      this.log(`Starting feedback analysis for task: ${task.description}`)
      logs.push('Analyzing configuration for optimization opportunities')

      const { configFile, currentMetrics } = task.metadata || {}
      
      if (!configFile) {
        throw new Error('No configuration file provided for feedback analysis')
      }

      const feedback = await this.analyzeFeedback(configFile, currentMetrics)
      logs.push(`Generated ${feedback.suggestions.length} optimization suggestions`)

      const metrics = {
        analysisTime: Date.now() - new Date(task.createdAt).getTime(),
        suggestionsCount: feedback.suggestions.length,
        confidenceScore: feedback.confidence
      }

      return this.createResult(task.id, true, feedback, undefined, logs, metrics)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Feedback analysis failed: ${errorMessage}`, 'error')
      return this.createResult(task.id, false, undefined, errorMessage, logs)
    }
  }

  private async analyzeFeedback(configFile: ConfigFile, currentMetrics?: any): Promise<{
    suggestions: Array<{
      type: 'structure' | 'clarity' | 'performance' | 'safety'
      description: string
      impact: 'low' | 'medium' | 'high'
      implementation: string
    }>
    confidence: number
    reasoning: string
  }> {
    const suggestions = []
    let confidence = 0.8

    // Analyze configuration structure
    if (configFile.type === 'yaml' || configFile.type === 'json') {
      const content = configFile.content.toLowerCase()
      
      // Check for missing system prompts
      if (!content.includes('system') && !content.includes('role')) {
        suggestions.push({
          type: 'structure',
          description: 'Add explicit system role definition',
          impact: 'high' as const,
          implementation: 'Define clear system role with specific instructions and constraints'
        })
      }

      // Check for output format specification
      if (!content.includes('format') && !content.includes('output')) {
        suggestions.push({
          type: 'clarity',
          description: 'Specify output format requirements',
          impact: 'medium' as const,
          implementation: 'Add structured output format specification with examples'
        })
      }

      // Check for safety constraints
      if (!content.includes('constraint') && !content.includes('rule')) {
        suggestions.push({
          type: 'safety',
          description: 'Add behavioral constraints and safety rules',
          impact: 'high' as const,
          implementation: 'Include explicit safety constraints and behavioral guidelines'
        })
      }

      // Performance analysis based on metrics
      if (currentMetrics?.hallucinationRate > 0.2) {
        suggestions.push({
          type: 'performance',
          description: 'Reduce hallucination rate through better prompt engineering',
          impact: 'high' as const,
          implementation: 'Add fact-checking instructions and source requirements'
        })
      }

      if (currentMetrics?.responseQuality < 0.7) {
        suggestions.push({
          type: 'performance',
          description: 'Improve response quality with examples and templates',
          impact: 'medium' as const,
          implementation: 'Include high-quality response examples and templates'
        })
      }
    }

    // TypeScript-specific analysis
    if (configFile.type === 'typescript') {
      const content = configFile.content
      
      if (!content.includes('interface') && content.includes('type')) {
        suggestions.push({
          type: 'structure',
          description: 'Convert type aliases to interfaces for better extensibility',
          impact: 'medium' as const,
          implementation: 'Replace type definitions with interface declarations'
        })
      }

      if (!content.includes('readonly') && content.includes('[]')) {
        suggestions.push({
          type: 'safety',
          description: 'Add readonly modifiers to prevent accidental mutations',
          impact: 'low' as const,
          implementation: 'Mark array and object properties as readonly where appropriate'
        })
      }
    }

    const reasoning = `Analysis based on configuration type (${configFile.type}), content structure, and performance metrics. ${suggestions.length} optimization opportunities identified.`

    return { suggestions, confidence, reasoning }
  }
}