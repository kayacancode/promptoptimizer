import { BenchmarkConfig, BenchmarkEvaluationResult, EvaluationResult, ExtendedEvaluationMetrics } from '@/types'
import { BenchmarkRunner } from './benchmark-runner'

export class BenchmarkEvaluationService {
  private benchmarkRunner: BenchmarkRunner

  constructor() {
    this.benchmarkRunner = new BenchmarkRunner()
  }

  /**
   * Run benchmark evaluation as part of the standard evaluation pipeline
   */
  async evaluateWithBenchmarks(
    originalPrompt: string,
    optimizedPrompt: string,
    baseEvaluationResult: EvaluationResult,
    benchmarkConfigs?: BenchmarkConfig[]
  ): Promise<EvaluationResult & { metrics: ExtendedEvaluationMetrics }> {
    // Default benchmark configuration
    const defaultConfigs: BenchmarkConfig[] = [
      { name: 'MMLU', enabled: true, sampleSize: 20, fullDataset: false },
      { name: 'HellaSwag', enabled: true, sampleSize: 20, fullDataset: false },
      { name: 'TruthfulQA', enabled: true, sampleSize: 20, fullDataset: false }
    ]

    const configs = benchmarkConfigs || defaultConfigs

    try {
      // Run benchmark evaluation
      const benchmarkResult = await this.runBenchmarkComparison(
        originalPrompt,
        optimizedPrompt,
        configs
      )

      // Extract individual benchmark scores
      const mmluResult = benchmarkResult.optimizedPromptResults.find(r => r.benchmark === 'MMLU')
      const hellaSwagResult = benchmarkResult.optimizedPromptResults.find(r => r.benchmark === 'HellaSwag')
      const truthfulQAResult = benchmarkResult.optimizedPromptResults.find(r => r.benchmark === 'TruthfulQA')

      // Create extended metrics
      const extendedMetrics: ExtendedEvaluationMetrics = {
        ...baseEvaluationResult.metrics,
        benchmarkResults: benchmarkResult,
        mmluScore: mmluResult?.accuracy,
        hellaSwagScore: hellaSwagResult?.accuracy,
        truthfulQAScore: truthfulQAResult?.accuracy
      }

      // Enhanced evaluation result with benchmark data
      return {
        ...baseEvaluationResult,
        metrics: extendedMetrics
      }
    } catch (error) {
      console.error('Benchmark evaluation failed:', error)
      
      // Return original evaluation if benchmarks fail
      const extendedMetrics: ExtendedEvaluationMetrics = {
        ...baseEvaluationResult.metrics,
        benchmarkResults: undefined,
        mmluScore: undefined,
        hellaSwagScore: undefined,
        truthfulQAScore: undefined
      }

      return {
        ...baseEvaluationResult,
        metrics: extendedMetrics
      }
    }
  }

  /**
   * Run benchmark comparison between original and optimized prompts
   */
  async runBenchmarkComparison(
    originalPrompt: string,
    optimizedPrompt: string,
    configs: BenchmarkConfig[]
  ): Promise<BenchmarkEvaluationResult> {
    
    // Run benchmarks on original prompt
    const originalPromptResults = await this.benchmarkRunner.runMultipleBenchmarks(
      originalPrompt,
      configs.filter(c => c.enabled)
    )

    // Run benchmarks on optimized prompt
    const optimizedPromptResults = await this.benchmarkRunner.runMultipleBenchmarks(
      optimizedPrompt,
      configs.filter(c => c.enabled)
    )

    // Calculate improvements
    const improvements: Record<string, number> = {}
    let totalImprovement = 0
    let improvementCount = 0

    for (const config of configs.filter(c => c.enabled)) {
      const originalResult = originalPromptResults.find(r => r.benchmark === config.name)
      const optimizedResult = optimizedPromptResults.find(r => r.benchmark === config.name)
      
      if (originalResult && optimizedResult) {
        // Calculate percentage improvement
        const improvement = originalResult.accuracy > 0 
          ? ((optimizedResult.accuracy - originalResult.accuracy) / originalResult.accuracy) * 100
          : 0
        
        improvements[config.name] = improvement
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
      configuration: configs
    }
  }

  /**
   * Quick benchmark check for single prompt
   */
  async quickBenchmarkCheck(
    prompt: string,
    sampleSize: number = 10
  ): Promise<{ [key: string]: number }> {
    const configs: BenchmarkConfig[] = [
      { name: 'MMLU', enabled: true, sampleSize, fullDataset: false },
      { name: 'HellaSwag', enabled: true, sampleSize, fullDataset: false },
      { name: 'TruthfulQA', enabled: true, sampleSize, fullDataset: false }
    ]

    const results = await this.benchmarkRunner.runMultipleBenchmarks(prompt, configs)
    
    const scores: { [key: string]: number } = {}
    results.forEach(result => {
      scores[result.benchmark] = result.accuracy
    })

    return scores
  }

  /**
   * Get benchmark performance summary
   */
  getBenchmarkSummary(benchmarkResult: BenchmarkEvaluationResult): {
    overallAccuracy: number
    bestImprovement: { benchmark: string; improvement: number }
    worstImprovement: { benchmark: string; improvement: number }
    totalQuestionsEvaluated: number
  } {
    const overallAccuracy = benchmarkResult.optimizedPromptResults.length > 0
      ? benchmarkResult.optimizedPromptResults.reduce((sum, r) => sum + r.accuracy, 0) / benchmarkResult.optimizedPromptResults.length
      : 0

    const improvements = Object.entries(benchmarkResult.improvements)
    const bestImprovement = improvements.reduce((best, [benchmark, improvement]) => 
      improvement > best.improvement ? { benchmark, improvement } : best,
      { benchmark: '', improvement: -Infinity }
    )

    const worstImprovement = improvements.reduce((worst, [benchmark, improvement]) => 
      improvement < worst.improvement ? { benchmark, improvement } : worst,
      { benchmark: '', improvement: Infinity }
    )

    const totalQuestionsEvaluated = benchmarkResult.optimizedPromptResults.reduce(
      (sum, r) => sum + r.totalQuestions, 0
    )

    return {
      overallAccuracy,
      bestImprovement,
      worstImprovement,
      totalQuestionsEvaluated
    }
  }

  /**
   * Generate benchmark report
   */
  generateBenchmarkReport(benchmarkResult: BenchmarkEvaluationResult): string {
    const summary = this.getBenchmarkSummary(benchmarkResult)
    
    let report = `# Benchmark Evaluation Report\n\n`
    report += `**Generated:** ${new Date(benchmarkResult.timestamp).toLocaleString()}\n`
    report += `**Overall Improvement:** ${benchmarkResult.overallImprovement.toFixed(1)}%\n`
    report += `**Questions Evaluated:** ${summary.totalQuestionsEvaluated}\n\n`

    report += `## Individual Benchmark Results\n\n`
    
    for (const result of benchmarkResult.optimizedPromptResults) {
      const originalResult = benchmarkResult.originalPromptResults.find(r => r.benchmark === result.benchmark)
      const improvement = benchmarkResult.improvements[result.benchmark] || 0
      
      report += `### ${result.benchmark}\n`
      report += `- **Accuracy:** ${(result.accuracy * 100).toFixed(1)}%\n`
      if (originalResult) {
        report += `- **Original Accuracy:** ${(originalResult.accuracy * 100).toFixed(1)}%\n`
      }
      report += `- **Improvement:** ${improvement.toFixed(1)}%\n`
      report += `- **Questions:** ${result.totalQuestions}\n`
      report += `- **Correct:** ${result.correctAnswers}\n\n`
    }

    if (summary.bestImprovement.benchmark) {
      report += `## Key Insights\n\n`
      report += `- **Best Performance:** ${summary.bestImprovement.benchmark} (+${summary.bestImprovement.improvement.toFixed(1)}%)\n`
      if (summary.worstImprovement.benchmark && summary.worstImprovement.improvement < 0) {
        report += `- **Needs Attention:** ${summary.worstImprovement.benchmark} (${summary.worstImprovement.improvement.toFixed(1)}%)\n`
      }
    }

    return report
  }
} 