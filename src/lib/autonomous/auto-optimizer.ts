import { 
  AutoOptimizationResult, 
  AutoOptimizationTrigger, 
  AutoOptimizationCandidate, 
  AutoOptimizationStrategy,
  ModelEvaluationResult 
} from '@/types'
import { BenchmarkRunner } from '@/lib/benchmarks/benchmark-runner'

export class AutoOptimizer {
  private benchmarkRunner: BenchmarkRunner
  private strategies: AutoOptimizationStrategy[]

  constructor() {
    this.benchmarkRunner = new BenchmarkRunner()
    this.strategies = this.getOptimizationStrategies()
  }

  async detectAndOptimize(
    prompt: string,
    currentScore: number,
    threshold: number = 70
  ): Promise<AutoOptimizationResult | null> {
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
      const candidates = await this.generateCandidates(prompt)
      const evaluatedCandidates = await this.evaluateCandidates(candidates)
      const bestCandidate = this.selectBestCandidate(evaluatedCandidates)

      if (!bestCandidate || (bestCandidate.score || 0) <= currentScore) {
        return {
          trigger,
          originalPrompt: prompt,
          originalScore: currentScore,
          candidates: evaluatedCandidates,
          selectedCandidate: bestCandidate || evaluatedCandidates[0],
          improvement: 0,
          strategy: 'none',
          executionTime: 0,
          status: 'no_improvement',
          timestamp: new Date().toISOString()
        }
      }

      const improvement = ((bestCandidate.score || 0) - currentScore)
      
      return {
        trigger,
        originalPrompt: prompt,
        originalScore: currentScore,
        candidates: evaluatedCandidates,
        selectedCandidate: bestCandidate,
        improvement,
        strategy: bestCandidate.strategy.name,
        executionTime: 0,
        status: 'success',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Auto-optimization failed:', error)
      return {
        trigger,
        originalPrompt: prompt,
        originalScore: currentScore,
        candidates: [],
        selectedCandidate: {
          id: 'fallback',
          prompt,
          strategy: this.strategies[0],
          generatedAt: new Date().toISOString()
        },
        improvement: 0,
        strategy: 'error',
        executionTime: 0,
        status: 'failed',
        timestamp: new Date().toISOString()
      }
    }
  }

  private async generateCandidates(prompt: string): Promise<AutoOptimizationCandidate[]> {
    const candidates: AutoOptimizationCandidate[] = []

    for (const strategy of this.strategies.slice(0, 3)) {
      const optimizedPrompt = await this.applyStrategy(prompt, strategy)
      candidates.push({
        id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        prompt: optimizedPrompt,
        strategy,
        generatedAt: new Date().toISOString()
      })
    }

    return candidates
  }

  private async applyStrategy(prompt: string, strategy: AutoOptimizationStrategy): Promise<string> {
    switch (strategy.focus) {
      case 'clarity':
        return this.improveClarityStrategy(prompt)
      case 'examples':
        return this.addExamplesStrategy(prompt)
      case 'structure':
        return this.improveStructureStrategy(prompt)
      case 'constraints':
        return this.addConstraintsStrategy(prompt)
      default:
        return this.hybridStrategy(prompt)
    }
  }

  private improveClarityStrategy(prompt: string): string {
    const improvements = [
      'Be specific about what you want',
      'Clarify the expected output format',
      'Remove ambiguous language'
    ]
    
    return `${prompt}\n\nPlease be precise and specific in your response. Focus on clarity and avoid ambiguous language.`
  }

  private addExamplesStrategy(prompt: string): string {
    return `${prompt}\n\nExample format:\n- Provide concrete examples\n- Show the expected structure\n- Demonstrate the desired tone and style`
  }

  private improveStructureStrategy(prompt: string): string {
    return `You are an expert assistant. Your task is to:\n\n1. Understand the request: ${prompt}\n2. Provide a structured response\n3. Ensure completeness and accuracy\n\nPlease follow this structure in your response.`
  }

  private addConstraintsStrategy(prompt: string): string {
    return `${prompt}\n\nConstraints:\n- Keep responses concise yet comprehensive\n- Use professional tone\n- Verify accuracy before responding\n- Structure information logically`
  }

  private hybridStrategy(prompt: string): string {
    return `Context: You are a helpful AI assistant focused on providing accurate, well-structured responses.\n\nTask: ${prompt}\n\nInstructions:\n1. Analyze the request carefully\n2. Provide a clear, structured response\n3. Include relevant examples if helpful\n4. Ensure accuracy and completeness`
  }

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

  private selectBestCandidate(candidates: AutoOptimizationCandidate[]): AutoOptimizationCandidate | null {
    return candidates.length > 0 ? candidates[0] : null
  }

  private getOptimizationStrategies(): AutoOptimizationStrategy[] {
    return [
      {
        id: 'clarity-focus',
        name: 'Clarity Enhancement',
        description: 'Improve prompt clarity and specificity',
        focus: 'clarity',
        promptModifications: [
          'Add specific instructions',
          'Remove ambiguous language',
          'Clarify expected output format'
        ]
      },
      {
        id: 'example-driven',
        name: 'Example Integration',
        description: 'Add examples and demonstrations',
        focus: 'examples',
        promptModifications: [
          'Include concrete examples',
          'Show expected format',
          'Demonstrate desired style'
        ]
      },
      {
        id: 'structure-optimization',
        name: 'Structure Improvement',
        description: 'Enhance prompt organization and flow',
        focus: 'structure',
        promptModifications: [
          'Add clear role definition',
          'Structure with numbered steps',
          'Organize information logically'
        ]
      }
    ]
  }
}