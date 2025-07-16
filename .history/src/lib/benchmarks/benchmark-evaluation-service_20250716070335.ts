import { BenchmarkConfig, BenchmarkEvaluationResult, EvaluationResult, ExtendedEvaluationMetrics } from '@/types'
import { BenchmarkRunner } from './benchmark-runner'

export class BenchmarkEvaluationService {
  private benchmarkRunner: BenchmarkRunner

  constructor() {
    this.benchmarkRunner = new BenchmarkRunner()
  }

  /**
   * Run prompt evaluation across different models
   */
  async evaluateWithModels(
    originalPrompt: string,
    optimizedPrompt: string,
    baseEvaluationResult: EvaluationResult,
    modelConfigs?: { name: string; enabled: boolean }[]
  ): Promise<EvaluationResult & { metrics: ExtendedEvaluationMetrics }> {
    // Default model configuration
    const defaultModels = [
      { name: 'claude-3-haiku', enabled: true },
      { name: 'claude-3-sonnet', enabled: true },
      { name: 'gpt-4', enabled: true },
      { name: 'gemini-pro', enabled: true }
    ]

    const models = modelConfigs || defaultModels

    try {
      // Run model evaluations
      const evaluationResult = await this.runModelComparison(
        originalPrompt,
        optimizedPrompt,
        models
      )

      // Extract individual model scores
      const haikuResult = evaluationResult.optimizedPromptResults.find(r => r.model === 'claude-3-haiku')
      const sonnetResult = evaluationResult.optimizedPromptResults.find(r => r.model === 'claude-3-sonnet')
      const gpt4Result = evaluationResult.optimizedPromptResults.find(r => r.model === 'gpt-4')
      const geminiResult = evaluationResult.optimizedPromptResults.find(r => r.model === 'gemini-pro')

      // Create extended metrics
      const extendedMetrics: ExtendedEvaluationMetrics = {
        ...baseEvaluationResult.metrics,
        modelResults: evaluationResult,
        hallucinationRates: {
          haiku: haikuResult?.hallucinationRate,
          sonnet: sonnetResult?.hallucinationRate,
          gpt4: gpt4Result?.hallucinationRate,
          gemini: geminiResult?.hallucinationRate
        },
        sentenceStructureScores: {
          haiku: haikuResult?.structureScore,
          sonnet: sonnetResult?.structureScore,
          gpt4: gpt4Result?.structureScore,
          gemini: geminiResult?.structureScore
        },
        responseConsistency: {
          haiku: haikuResult?.consistencyScore,
          sonnet: sonnetResult?.consistencyScore,
          gpt4: gpt4Result?.consistencyScore,
          gemini: geminiResult?.consistencyScore
        }
      }

      return {
        ...baseEvaluationResult,
        metrics: extendedMetrics
      }
    } catch (error) {
      console.error('Model evaluation failed:', error)
      
      // Return original evaluation if model testing fails
      const extendedMetrics: ExtendedEvaluationMetrics = {
        ...baseEvaluationResult.metrics,
        modelResults: undefined,
        hallucinationRates: {},
        sentenceStructureScores: {},
        responseConsistency: {}
      }

      return {
        ...baseEvaluationResult,
        metrics: extendedMetrics
      }
    }
  }

  /**
   * Run model comparison between original and optimized prompts
   */
  async runModelComparison(
    originalPrompt: string,
    optimizedPrompt: string,
    models: { name: string; enabled: boolean }[]
  ): Promise<BenchmarkEvaluationResult> {
    
    // Run evaluations on original prompt
    const originalPromptResults = await this.benchmarkRunner.runModelEvaluations(
      originalPrompt,
      models.filter(m => m.enabled)
    )

    // Run evaluations on optimized prompt
    const optimizedPromptResults = await this.benchmarkRunner.runModelEvaluations(
      optimizedPrompt,
      models.filter(m => m.enabled)
    )

    // Calculate improvements
    const improvements: Record<string, number> = {}
    let totalImprovement = 0
    let improvementCount = 0

    for (const model of models.filter(m => m.enabled)) {
      const originalResult = originalPromptResults.find(r => r.model === model.name)
      const optimizedResult = optimizedPromptResults.find(r => r.model === model.name)
      
      if (originalResult && optimizedResult) {
        // Calculate overall improvement across metrics
        const improvement = this.calculateOverallImprovement(originalResult, optimizedResult)
        improvements[model.name] = improvement
        totalImprovement += improvement
        improvementCount++
      }
    }

    const overallImprovement = improvementCount > 0 ? totalImprovement / improvementCount : 0

    return {
      originalPromptResults,
      optimizedPromptResults,
      improvements,
      overallImprovement,
      timestamp: new Date().toISOString(),
      configuration: models
    }
  }

  /**
   * Quick model check for single prompt
   */
  async quickModelCheck(
    prompt: string,
    sampleSize: number = 5
  ): Promise<{ [key: string]: { 
    hallucinationRate: number;
    structureScore: number;
    consistencyScore: number;
  } }> {
    const models = [
      { name: 'claude-3-haiku', enabled: true },
      { name: 'claude-3-sonnet', enabled: true },
      { name: 'gpt-4', enabled: true },
      { name: 'gemini-pro', enabled: true }
    ]

    const results = await this.benchmarkRunner.runModelEvaluations(prompt, models, sampleSize)
    
    const scores: { [key: string]: any } = {}
    results.forEach(result => {
      scores[result.model] = {
        hallucinationRate: result.hallucinationRate,
        structureScore: result.structureScore,
        consistencyScore: result.consistencyScore
      }
    })

    return scores
  }

  private calculateOverallImprovement(originalResult: any, optimizedResult: any): number {
    // Weight different metrics in the improvement calculation
    const weights = {
      hallucinationRate: 0.4,  // Lower is better
      structureScore: 0.3,     // Higher is better
      consistencyScore: 0.3    // Higher is better
    }

    const hallucinationImprovement = ((originalResult.hallucinationRate - optimizedResult.hallucinationRate) / originalResult.hallucinationRate) * 100
    const structureImprovement = ((optimizedResult.structureScore - originalResult.structureScore) / originalResult.structureScore) * 100
    const consistencyImprovement = ((optimizedResult.consistencyScore - originalResult.consistencyScore) / originalResult.consistencyScore) * 100

    return (
      hallucinationImprovement * weights.hallucinationRate +
      structureImprovement * weights.structureScore +
      consistencyImprovement * weights.consistencyScore
    )
  }

  /**
   * Generate evaluation report
   */
  generateEvaluationReport(evaluationResult: BenchmarkEvaluationResult): string {
    let report = `# Prompt Evaluation Report\n\n`
    report += `**Generated:** ${new Date(evaluationResult.timestamp).toLocaleString()}\n`
    report += `**Overall Improvement:** ${evaluationResult.overallImprovement.toFixed(1)}%\n\n`

    report += `## Model Performance Results\n\n`
    
    for (const result of evaluationResult.optimizedPromptResults) {
      const originalResult = evaluationResult.originalPromptResults.find(r => r.model === result.model)
      const improvement = evaluationResult.improvements[result.model] || 0
      
      report += `### ${result.model}\n`
      report += `- **Hallucination Rate:** ${(result.hallucinationRate * 100).toFixed(1)}%\n`
      report += `- **Structure Score:** ${(result.structureScore * 100).toFixed(1)}%\n`
      report += `- **Consistency Score:** ${(result.consistencyScore * 100).toFixed(1)}%\n`
      if (originalResult) {
        report += `- **Original Hallucination Rate:** ${(originalResult.hallucinationRate * 100).toFixed(1)}%\n`
        report += `- **Original Structure Score:** ${(originalResult.structureScore * 100).toFixed(1)}%\n`
        report += `- **Original Consistency Score:** ${(originalResult.consistencyScore * 100).toFixed(1)}%\n`
      }
      report += `- **Overall Improvement:** ${improvement.toFixed(1)}%\n\n`
    }

    // Add insights section
    report += `## Key Insights\n\n`
    const bestModel = Object.entries(evaluationResult.improvements)
      .reduce((best, [model, improvement]) => 
        improvement > best.improvement ? { model, improvement } : best,
        { model: '', improvement: -Infinity }
      )

    const worstModel = Object.entries(evaluationResult.improvements)
      .reduce((worst, [model, improvement]) => 
        improvement < worst.improvement ? { model, improvement } : worst,
        { model: '', improvement: Infinity }
      )

    if (bestModel.model) {
      report += `- **Best Performance:** ${bestModel.model} (+${bestModel.improvement.toFixed(1)}%)\n`
      if (worstModel.model && worstModel.improvement < 0) {
        report += `- **Needs Attention:** ${worstModel.model} (${worstModel.improvement.toFixed(1)}%)\n`
      }
    }

    return report
  }
} 