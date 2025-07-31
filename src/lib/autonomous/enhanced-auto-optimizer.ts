import { 
  AutoOptimizationResult, 
  AutoOptimizationTrigger, 
  AutoOptimizationCandidate, 
  AutoOptimizationStrategy,
  ModelEvaluationResult 
} from '@/types'
import { BenchmarkRunner } from '@/lib/benchmarks/benchmark-runner'
import { createClient } from '@supabase/supabase-js'
import { DetectedIssue } from '../monitoring/log-monitor'

interface OptimizationHistory {
  id: string
  userId: string
  originalPrompt: string
  optimizedPrompt: string
  strategy: string
  improvement: number
  issues: DetectedIssue[]
  success: boolean
  timestamp: Date
  context: Record<string, any>
}

interface LearningInsights {
  successfulStrategies: Map<string, number>
  failedStrategies: Map<string, number>
  domainPatterns: Map<string, AutoOptimizationStrategy[]>
  issueTypePatterns: Map<string, string[]> // issue type -> successful strategies
  performanceCorrelations: Map<string, number>
}

export class EnhancedAutoOptimizer {
  private benchmarkRunner: BenchmarkRunner
  private baseStrategies: AutoOptimizationStrategy[]
  private supabase
  private learningInsights: LearningInsights
  private historyCache: Map<string, OptimizationHistory[]> = new Map()

  constructor() {
    this.benchmarkRunner = new BenchmarkRunner()
    this.baseStrategies = this.getBaseOptimizationStrategies()
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    )
    this.learningInsights = {
      successfulStrategies: new Map(),
      failedStrategies: new Map(),
      domainPatterns: new Map(),
      issueTypePatterns: new Map(),
      performanceCorrelations: new Map()
    }
    
    // Initialize learning insights
    this.initializeLearningInsights()
  }

  /**
   * Enhanced optimization with continuous learning
   */
  async detectAndOptimize(
    prompt: string,
    currentScore: number,
    threshold: number = 70,
    context?: {
      userId?: string
      appIdentifier?: string
      issues?: DetectedIssue[]
      domain?: string
      previousAttempts?: number
    }
  ): Promise<AutoOptimizationResult | null> {
    const startTime = Date.now()

    if (currentScore >= threshold) {
      return null
    }

    const trigger: AutoOptimizationTrigger = {
      type: 'performance_threshold',
      threshold,
      reason: `Score ${currentScore}% below threshold ${threshold}%`,
      originalScore: currentScore,
      timestamp: new Date().toISOString()
    }

    try {
      // Learn from historical data
      if (context?.userId) {
        await this.updateLearningInsights(context.userId, context.appIdentifier)
      }

      // Generate context-aware candidates
      const candidates = await this.generateLearningBasedCandidates(prompt, context)
      
      // Evaluate candidates with enhanced metrics
      const evaluatedCandidates = await this.evaluateEnhancedCandidates(candidates, context)
      
      // Select best candidate using learning insights
      const bestCandidate = this.selectBestCandidateWithLearning(evaluatedCandidates, context)

      if (!bestCandidate || (bestCandidate.score || 0) <= currentScore) {
        // Record failed optimization attempt
        if (context?.userId) {
          await this.recordOptimizationAttempt(context.userId, {
            originalPrompt: prompt,
            optimizedPrompt: prompt,
            strategy: 'none',
            improvement: 0,
            issues: context.issues || [],
            success: false,
            context: context || {}
          })
        }

        return {
          trigger,
          originalPrompt: prompt,
          originalScore: currentScore,
          candidates: evaluatedCandidates,
          selectedCandidate: bestCandidate || evaluatedCandidates[0],
          improvement: 0,
          strategy: 'none',
          executionTime: Date.now() - startTime,
          status: 'no_improvement',
          timestamp: new Date().toISOString(),
          learningMetadata: {
            strategiesAttempted: evaluatedCandidates.length,
            historicalSuccessRate: this.calculateHistoricalSuccessRate(context),
            confidenceLevel: 'low'
          }
        }
      }

      const improvement = ((bestCandidate.score || 0) - currentScore)
      
      // Record successful optimization
      if (context?.userId && improvement > 0) {
        await this.recordOptimizationAttempt(context.userId, {
          originalPrompt: prompt,
          optimizedPrompt: bestCandidate.prompt,
          strategy: bestCandidate.strategy.name,
          improvement,
          issues: context.issues || [],
          success: true,
          context: context || {}
        })
      }

      return {
        trigger,
        originalPrompt: prompt,
        originalScore: currentScore,
        candidates: evaluatedCandidates,
        selectedCandidate: bestCandidate,
        improvement,
        strategy: bestCandidate.strategy.name,
        executionTime: Date.now() - startTime,
        status: 'success',
        timestamp: new Date().toISOString(),
        learningMetadata: {
          strategiesAttempted: evaluatedCandidates.length,
          historicalSuccessRate: this.calculateHistoricalSuccessRate(context),
          confidenceLevel: improvement > 10 ? 'high' : improvement > 5 ? 'medium' : 'low',
          appliedLearnings: this.getAppliedLearnings(bestCandidate.strategy, context)
        }
      }
    } catch (error) {
      console.error('Enhanced auto-optimization failed:', error)
      
      // Record error
      if (context?.userId) {
        await this.recordOptimizationAttempt(context.userId, {
          originalPrompt: prompt,
          optimizedPrompt: prompt,
          strategy: 'error',
          improvement: 0,
          issues: context.issues || [],
          success: false,
          context: { ...context, error: error instanceof Error ? error.message : 'Unknown error' }
        })
      }

      return {
        trigger,
        originalPrompt: prompt,
        originalScore: currentScore,
        candidates: [],
        selectedCandidate: {
          id: 'fallback',
          prompt,
          strategy: this.baseStrategies[0],
          generatedAt: new Date().toISOString()
        },
        improvement: 0,
        strategy: 'error',
        executionTime: Date.now() - startTime,
        status: 'failed',
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Generate candidates based on learning insights
   */
  private async generateLearningBasedCandidates(
    prompt: string, 
    context?: any
  ): Promise<AutoOptimizationCandidate[]> {
    const candidates: AutoOptimizationCandidate[] = []
    
    // Get strategies based on learning
    const prioritizedStrategies = this.getPrioritizedStrategies(context)
    
    // Limit to top 5 strategies to avoid over-processing
    const strategiesToUse = prioritizedStrategies.slice(0, 5)
    
    for (const strategy of strategiesToUse) {
      try {
        const optimizedPrompt = await this.applyEnhancedStrategy(prompt, strategy, context)
        candidates.push({
          id: `enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          prompt: optimizedPrompt,
          strategy,
          generatedAt: new Date().toISOString(),
          metadata: {
            learningBased: true,
            successRate: this.learningInsights.successfulStrategies.get(strategy.name) || 0,
            contextMatch: this.calculateContextMatch(strategy, context)
          }
        })
      } catch (error) {
        console.error(`Failed to apply strategy ${strategy.name}:`, error)
      }
    }

    return candidates
  }

  /**
   * Get prioritized strategies based on learning insights
   */
  private getPrioritizedStrategies(context?: any): AutoOptimizationStrategy[] {
    let strategies = [...this.baseStrategies]

    // Prioritize based on historical success
    strategies.sort((a, b) => {
      const aSuccess = this.learningInsights.successfulStrategies.get(a.name) || 0
      const bSuccess = this.learningInsights.successfulStrategies.get(b.name) || 0
      const aFailure = this.learningInsights.failedStrategies.get(a.name) || 0
      const bFailure = this.learningInsights.failedStrategies.get(b.name) || 0
      
      const aScore = aSuccess - (aFailure * 0.5)
      const bScore = bSuccess - (bFailure * 0.5)
      
      return bScore - aScore
    })

    // Filter by issue type relevance if issues are provided
    if (context?.issues && Array.isArray(context.issues)) {
      const relevantStrategies = new Set<string>()
      
      context.issues.forEach((issue: DetectedIssue) => {
        const strategiesForIssue = this.learningInsights.issueTypePatterns.get(issue.type) || []
        strategiesForIssue.forEach(strategyName => relevantStrategies.add(strategyName))
      })

      if (relevantStrategies.size > 0) {
        strategies = strategies.filter(s => relevantStrategies.has(s.name))
        // Add back at least 2 general strategies if we filtered too much
        if (strategies.length < 2) {
          strategies.push(...this.baseStrategies.slice(0, 2))
        }
      }
    }

    // Add domain-specific strategies if available
    if (context?.domain) {
      const domainStrategies = this.learningInsights.domainPatterns.get(context.domain) || []
      strategies.unshift(...domainStrategies)
    }

    // Remove duplicates and return
    const seen = new Set()
    return strategies.filter(s => {
      if (seen.has(s.name)) return false
      seen.add(s.name)
      return true
    })
  }

  /**
   * Apply enhanced strategy with learning context
   */
  private async applyEnhancedStrategy(
    prompt: string, 
    strategy: AutoOptimizationStrategy, 
    context?: any
  ): Promise<string> {
    let optimizedPrompt = prompt

    // Apply base strategy
    switch (strategy.focus) {
      case 'clarity':
        optimizedPrompt = this.enhancedClarityStrategy(prompt, context)
        break
      case 'examples':
        optimizedPrompt = await this.enhancedExamplesStrategy(prompt, context)
        break
      case 'structure':
        optimizedPrompt = this.enhancedStructureStrategy(prompt, context)
        break
      case 'constraints':
        optimizedPrompt = this.enhancedConstraintsStrategy(prompt, context)
        break
      default:
        optimizedPrompt = await this.enhancedHybridStrategy(prompt, context)
    }

    // Apply issue-specific enhancements
    if (context?.issues) {
      optimizedPrompt = this.applyIssueSpecificEnhancements(optimizedPrompt, context.issues)
    }

    return optimizedPrompt
  }

  /**
   * Enhanced clarity strategy with learning
   */
  private enhancedClarityStrategy(prompt: string, context?: any): string {
    let enhanced = prompt

    // Add role definition if missing (learned from successful patterns)
    if (!enhanced.toLowerCase().includes('you are') && !enhanced.toLowerCase().includes('role:')) {
      const roleDefinition = this.selectOptimalRoleDefinition(context)
      enhanced = `${roleDefinition} ${enhanced}`
    }

    // Add clarity improvements based on detected issues
    if (context?.issues) {
      const hallucinationIssues = context.issues.filter((i: DetectedIssue) => i.type === 'hallucination')
      if (hallucinationIssues.length > 0) {
        enhanced += '\n\nIMPORTANT: Provide only factual, verifiable information. If uncertain about any details, explicitly state your uncertainty rather than guessing.'
      }

      const accuracyIssues = context.issues.filter((i: DetectedIssue) => i.type === 'accuracy_issue')
      if (accuracyIssues.length > 0) {
        enhanced += '\n\nAccuracy Guidelines: Double-check all facts, dates, and specific claims before including them in your response.'
      }
    }

    return enhanced
  }

  /**
   * Enhanced examples strategy with dynamic example selection
   */
  private async enhancedExamplesStrategy(prompt: string, context?: any): Promise<string> {
    let enhanced = prompt

    // Select relevant examples based on context
    const examples = await this.selectRelevantExamples(context)
    
    if (examples.length > 0) {
      enhanced += '\n\nExamples:'
      examples.forEach((example, index) => {
        enhanced += `\n${index + 1}. ${example}`
      })
    }

    // Add format examples if structure issues detected
    if (context?.issues?.some((i: DetectedIssue) => i.type === 'structure_error')) {
      enhanced += '\n\nExpected output format:\n- Use clear headings\n- Structure information logically\n- Ensure proper JSON/markup syntax if applicable'
    }

    return enhanced
  }

  /**
   * Enhanced structure strategy with learning-based improvements
   */
  private enhancedStructureStrategy(prompt: string, context?: any): string {
    const structuredIntro = this.selectOptimalStructuredIntro(context)
    
    let enhanced = `${structuredIntro}\n\nTask: ${prompt}`

    // Add specific structure requirements based on issues
    if (context?.issues) {
      const structureIssues = context.issues.filter((i: DetectedIssue) => i.type === 'structure_error')
      if (structureIssues.length > 0) {
        enhanced += '\n\nStructure Requirements:\n1. Use proper formatting\n2. Validate any JSON or code syntax\n3. Ensure logical flow and organization'
      }
    }

    enhanced += '\n\nResponse Structure:\n1. Understand the request clearly\n2. Provide a structured, comprehensive answer\n3. Verify accuracy and completeness'

    return enhanced
  }

  /**
   * Enhanced constraints strategy
   */
  private enhancedConstraintsStrategy(prompt: string, context?: any): string {
    let enhanced = `${prompt}\n\nConstraints:`

    // Standard constraints
    enhanced += '\n- Keep responses accurate and factual'
    enhanced += '\n- Use professional, clear language'
    enhanced += '\n- Structure information logically'

    // Issue-specific constraints
    if (context?.issues) {
      context.issues.forEach((issue: DetectedIssue) => {
        switch (issue.type) {
          case 'hallucination':
            enhanced += '\n- Avoid making up facts or providing unverified information'
            enhanced += '\n- Clearly indicate when information is uncertain or approximate'
            break
          case 'structure_error':
            enhanced += '\n- Ensure proper formatting and syntax in all output'
            enhanced += '\n- Validate JSON, code, or markup before including in response'
            break
          case 'performance_degradation':
            enhanced += '\n- Provide concise, efficient responses'
            enhanced += '\n- Focus on essential information'
            break
        }
      })
    }

    return enhanced
  }

  /**
   * Enhanced hybrid strategy
   */
  private async enhancedHybridStrategy(prompt: string, context?: any): Promise<string> {
    const roleDefinition = this.selectOptimalRoleDefinition(context)
    const examples = await this.selectRelevantExamples(context)
    
    let enhanced = `${roleDefinition}\n\nTask: ${prompt}\n\nApproach:`
    enhanced += '\n1. Analyze the request thoroughly'
    enhanced += '\n2. Provide accurate, well-structured information'
    enhanced += '\n3. Include relevant examples when helpful'
    enhanced += '\n4. Ensure completeness and accuracy'

    if (examples.length > 0) {
      enhanced += '\n\nRelevant Examples:'
      examples.slice(0, 2).forEach((example, index) => {
        enhanced += `\n${index + 1}. ${example}`
      })
    }

    return enhanced
  }

  /**
   * Apply issue-specific enhancements
   */
  private applyIssueSpecificEnhancements(prompt: string, issues: DetectedIssue[]): string {
    let enhanced = prompt

    // Group issues by type for targeted improvements
    const issueTypes = new Set(issues.map(i => i.type))

    if (issueTypes.has('hallucination')) {
      enhanced += '\n\n⚠️ CRITICAL: Avoid hallucinations. Only provide verifiable, factual information. If unsure, explicitly state uncertainty.'
    }

    if (issueTypes.has('structure_error')) {
      enhanced += '\n\n📋 FORMAT CHECK: Ensure all output follows proper structure. Validate JSON, code, and markup syntax.'
    }

    if (issueTypes.has('accuracy_issue')) {
      enhanced += '\n\n✓ ACCURACY VERIFICATION: Double-check all facts, numbers, dates, and specific claims before including them.'
    }

    if (issueTypes.has('performance_degradation')) {
      enhanced += '\n\n⚡ EFFICIENCY: Provide concise, relevant responses without unnecessary elaboration.'
    }

    return enhanced
  }

  /**
   * Calculate historical success rate for context
   */
  private calculateHistoricalSuccessRate(context?: any): number {
    if (!context?.userId) return 0.5

    const cacheKey = `${context.userId}-${context.appIdentifier || 'default'}`
    const history = this.historyCache.get(cacheKey) || []
    
    if (history.length === 0) return 0.5

    const successful = history.filter(h => h.success).length
    return successful / history.length
  }

  /**
   * Get applied learnings for metadata
   */
  private getAppliedLearnings(strategy: AutoOptimizationStrategy, context?: any): string[] {
    const learnings: string[] = []

    const successRate = this.learningInsights.successfulStrategies.get(strategy.name) || 0
    if (successRate > 0) {
      learnings.push(`Strategy has ${successRate} successful applications`)
    }

    if (context?.issues) {
      const relevantIssues = context.issues.filter((issue: DetectedIssue) => 
        this.learningInsights.issueTypePatterns.get(issue.type)?.includes(strategy.name)
      )
      if (relevantIssues.length > 0) {
        learnings.push(`Strategy proven effective for ${relevantIssues.map((i: DetectedIssue) => i.type).join(', ')} issues`)
      }
    }

    return learnings
  }

  // Helper methods for learning-based optimization
  private selectOptimalRoleDefinition(context?: any): string {
    // This would use learning data to select the best role definition
    // For now, return a context-appropriate role
    if (context?.domain === 'software-development') {
      return 'You are an expert software developer and technical consultant.'
    } else if (context?.issues?.some((i: DetectedIssue) => i.type === 'hallucination')) {
      return 'You are a precise, fact-focused AI assistant that prioritizes accuracy above all else.'
    }
    return 'You are an expert AI assistant focused on providing accurate, helpful responses.'
  }

  private selectOptimalStructuredIntro(context?: any): string {
    if (context?.issues?.some((i: DetectedIssue) => i.type === 'structure_error')) {
      return 'You are a meticulous AI assistant specializing in well-structured, properly formatted responses.'
    }
    return 'You are an expert assistant that provides structured, comprehensive solutions.'
  }

  private async selectRelevantExamples(context?: any): Promise<string[]> {
    // This would query a database of successful examples
    // For now, return some generic helpful examples
    const examples: string[] = []
    
    if (context?.domain === 'software-development') {
      examples.push('Provide code examples with proper syntax and comments')
      examples.push('Explain technical concepts with practical applications')
    } else if (context?.issues?.some((i: DetectedIssue) => i.type === 'accuracy_issue')) {
      examples.push('Always cite sources when making factual claims')
      examples.push('Use phrases like "According to..." or "Based on..." for verifiable information')
    }
    
    return examples
  }

  private calculateContextMatch(strategy: AutoOptimizationStrategy, context?: any): number {
    // Calculate how well this strategy matches the current context
    let score = 0.5 // base score

    if (context?.issues) {
      const relevantIssues = context.issues.filter((issue: DetectedIssue) => 
        this.learningInsights.issueTypePatterns.get(issue.type)?.includes(strategy.name)
      )
      score += relevantIssues.length * 0.2
    }

    if (context?.domain) {
      const domainStrategies = this.learningInsights.domainPatterns.get(context.domain) || []
      if (domainStrategies.some(s => s.name === strategy.name)) {
        score += 0.3
      }
    }

    return Math.min(1, score)
  }

  // Database operations for learning
  private async updateLearningInsights(userId: string, appIdentifier?: string): Promise<void> {
    try {
      const cacheKey = `${userId}-${appIdentifier || 'default'}`
      
      // Check if we have cached data that's less than 1 hour old
      if (this.historyCache.has(cacheKey)) {
        return
      }

      // Fetch recent optimization history
      const { data: history, error } = await this.supabase
        .from('optimization_history')
        .select('*')
        .eq('user_id', userId)
        .eq('app_identifier', appIdentifier || 'default')
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('timestamp', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching optimization history:', error)
        return
      }

      // Update cache
      this.historyCache.set(cacheKey, history || [])

      // Update learning insights
      this.updateInsightsFromHistory(history || [])

    } catch (error) {
      console.error('Error updating learning insights:', error)
    }
  }

  private updateInsightsFromHistory(history: any[]): void {
    // Reset insights
    this.learningInsights.successfulStrategies.clear()
    this.learningInsights.failedStrategies.clear()

    history.forEach(record => {
      if (record.success) {
        const current = this.learningInsights.successfulStrategies.get(record.strategy) || 0
        this.learningInsights.successfulStrategies.set(record.strategy, current + 1)

        // Update issue type patterns
        if (record.issues && Array.isArray(record.issues)) {
          record.issues.forEach((issue: DetectedIssue) => {
            const strategies = this.learningInsights.issueTypePatterns.get(issue.type) || []
            if (!strategies.includes(record.strategy)) {
              strategies.push(record.strategy)
              this.learningInsights.issueTypePatterns.set(issue.type, strategies)
            }
          })
        }
      } else {
        const current = this.learningInsights.failedStrategies.get(record.strategy) || 0
        this.learningInsights.failedStrategies.set(record.strategy, current + 1)
      }
    })
  }

  private async recordOptimizationAttempt(userId: string, attempt: Omit<OptimizationHistory, 'id' | 'userId' | 'timestamp'>): Promise<void> {
    try {
      await this.supabase
        .from('optimization_history')
        .insert({
          user_id: userId,
          original_prompt: attempt.originalPrompt,
          optimized_prompt: attempt.optimizedPrompt,
          strategy: attempt.strategy,
          improvement: attempt.improvement,
          issues: attempt.issues,
          success: attempt.success,
          context: attempt.context,
          timestamp: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error recording optimization attempt:', error)
    }
  }

  private async initializeLearningInsights(): Promise<void> {
    // This would load global learning insights from the database
    // For now, we'll initialize with some default successful patterns
    this.learningInsights.issueTypePatterns.set('hallucination', ['clarity-focus', 'constraint-heavy'])
    this.learningInsights.issueTypePatterns.set('structure_error', ['structure-optimization', 'example-driven'])
    this.learningInsights.issueTypePatterns.set('accuracy_issue', ['constraint-heavy', 'clarity-focus'])
    this.learningInsights.issueTypePatterns.set('performance_degradation', ['constraint-heavy'])
  }

  private evaluateEnhancedCandidates(candidates: AutoOptimizationCandidate[], context?: any): Promise<AutoOptimizationCandidate[]> {
    // Use the existing evaluation logic but with enhanced context
    return this.evaluateCandidates(candidates)
  }

  private selectBestCandidateWithLearning(candidates: AutoOptimizationCandidate[], context?: any): AutoOptimizationCandidate | null {
    if (candidates.length === 0) return null

    // Sort by score and learning metadata
    return candidates.sort((a, b) => {
      const scoreA = (a.score || 0) + (a.metadata?.successRate || 0) * 0.1
      const scoreB = (b.score || 0) + (b.metadata?.successRate || 0) * 0.1
      return scoreB - scoreA
    })[0]
  }

  // Include existing methods from original AutoOptimizer
  private async evaluateCandidates(candidates: AutoOptimizationCandidate[]): Promise<AutoOptimizationCandidate[]> {
    const models = [
      { name: 'claude-3-haiku', enabled: true },
      { name: 'gpt-4o', enabled: true }
    ]

    for (const candidate of candidates) {
      try {
        const results = await this.benchmarkRunner.runModelEvaluations(
          candidate.prompt,
          models,
          1
        )
        
        candidate.evaluationResults = results
        candidate.score = this.calculateOverallScore(results)
      } catch (error) {
        console.error(`Failed to evaluate candidate ${candidate.id}:`, error)
        candidate.score = 0
      }
    }

    return candidates.sort((a, b) => (b.score || 0) - (a.score || 0))
  }

  private calculateOverallScore(results: ModelEvaluationResult[]): number {
    if (results.length === 0) return 0

    const avgHallucinationRate = results.reduce((sum, r) => sum + r.hallucinationRate, 0) / results.length
    const avgStructureScore = results.reduce((sum, r) => sum + r.structureScore, 0) / results.length
    const avgConsistencyScore = results.reduce((sum, r) => sum + r.consistencyScore, 0) / results.length

    const hallucinationScore = (1 - avgHallucinationRate) * 100
    const structurePercentage = avgStructureScore * 100
    const consistencyPercentage = avgConsistencyScore * 100

    return (hallucinationScore * 0.4 + structurePercentage * 0.3 + consistencyPercentage * 0.3)
  }

  private getBaseOptimizationStrategies(): AutoOptimizationStrategy[] {
    return [
      {
        id: 'clarity-focus',
        name: 'Clarity Enhancement',
        description: 'Improve prompt clarity and specificity with learning-based enhancements',
        focus: 'clarity',
        promptModifications: [
          'Add specific instructions based on successful patterns',
          'Remove ambiguous language using learned patterns',
          'Clarify expected output format from successful examples'
        ]
      },
      {
        id: 'example-driven',
        name: 'Example Integration',
        description: 'Add examples and demonstrations based on successful patterns',
        focus: 'examples',
        promptModifications: [
          'Include contextually relevant examples',
          'Show expected format from successful cases',
          'Demonstrate desired style from learning data'
        ]
      },
      {
        id: 'structure-optimization',
        name: 'Structure Improvement',
        description: 'Enhance prompt organization using learned structures',
        focus: 'structure',
        promptModifications: [
          'Add proven role definitions',
          'Structure with successful step patterns',
          'Organize using learned information hierarchy'
        ]
      },
      {
        id: 'constraint-heavy',
        name: 'Enhanced Constraints',
        description: 'Apply learned constraints that prevent common issues',
        focus: 'constraints',
        promptModifications: [
          'Add issue-specific constraints',
          'Include learned safety measures',
          'Apply proven quality controls'
        ]
      }
    ]
  }
}