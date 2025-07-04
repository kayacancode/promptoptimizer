import { BaseAgent } from './base-agent'
import { AgentTask, AgentResult, EvaluationResult, EvaluationMetrics } from '@/types'
import { TestCaseGenerator } from '@/lib/test-case-generator'

export class EvaluatorAgent extends BaseAgent {
  constructor() {
    super('evaluator-agent', 'Evaluator Agent', ['evaluation'])
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const logs: string[] = []
    
    try {
      this.log(`Starting evaluation for task: ${task.description}`)
      logs.push('Beginning comprehensive evaluation of changes')

      const { beforeConfig, afterConfig, testCases } = task.metadata || {}
      
      if (!beforeConfig || !afterConfig) {
        throw new Error('Before and after configurations required for evaluation')
      }

      // Run multiple evaluation metrics
      const evaluationResult = await this.performEvaluation(beforeConfig, afterConfig, testCases)
      logs.push(`Evaluation completed with overall score: ${evaluationResult.afterScore.overall}`)

      // Calculate improvement metrics
      const improvement = this.calculateImprovement(evaluationResult.beforeScore, evaluationResult.afterScore)
      logs.push(`Performance improvement: ${improvement.toFixed(2)}%`)

      // Advanced metrics (BLEU, ROUGE, etc.)
      const advancedMetrics = await this.calculateAdvancedMetrics(beforeConfig, afterConfig, testCases)
      logs.push(`Advanced metrics calculated: BLEU=${advancedMetrics.bleuScore}, ROUGE=${advancedMetrics.rougeScore}`)

      const finalResult = {
        ...evaluationResult,
        improvement,
        metrics: {
          ...evaluationResult.metrics,
          ...advancedMetrics
        }
      }

      const metrics = {
        evaluationTime: Date.now() - new Date(task.createdAt).getTime(),
        testCasesEvaluated: testCases?.length || 0,
        improvementScore: improvement,
        overallScore: evaluationResult.afterScore.overall
      }

      return this.createResult(task.id, true, finalResult, undefined, logs, metrics)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`Evaluation failed: ${errorMessage}`, 'error')
      return this.createResult(task.id, false, undefined, errorMessage, logs)
    }
  }

  private async performEvaluation(beforeConfig: any, afterConfig: any, testCases?: any[]): Promise<EvaluationResult> {
    // Simulate evaluation process
    const beforeScore = await this.evaluateConfiguration(beforeConfig, testCases)
    const afterScore = await this.evaluateConfiguration(afterConfig, testCases)
    
    const improvement = this.calculateImprovement(beforeScore, afterScore)
    
    // Generate test cases if not provided
    const evaluatedTestCases = testCases || await this.generateTestCases(beforeConfig, afterConfig)
    
    return {
      beforeScore,
      afterScore,
      improvement,
      testCases: evaluatedTestCases,
      metrics: {
        totalTests: evaluatedTestCases.length,
        passedTests: evaluatedTestCases.filter(tc => tc.passed).length,
        averageImprovement: improvement,
        executionTime: Math.floor(Math.random() * 500) + 200
      },
      timestamp: new Date().toISOString()
    }
  }

  private async evaluateConfiguration(config: any, testCases?: any[]): Promise<{
    structureCompliance: number
    hallucinationRate: number
    responseQuality: number
    overall: number
  }> {
    // Simulate configuration evaluation
    const structureCompliance = this.evaluateStructure(config)
    const hallucinationRate = await this.evaluateHallucination(config, testCases)
    const responseQuality = await this.evaluateResponseQuality(config, testCases)
    
    const overall = (structureCompliance + (1 - hallucinationRate) + responseQuality) / 3
    
    return {
      structureCompliance,
      hallucinationRate,
      responseQuality,
      overall
    }
  }

  private evaluateStructure(config: any): number {
    let score = 0.5 // Base score
    
    try {
      const content = typeof config === 'string' ? config : JSON.stringify(config)
      
      // Check for system prompt
      if (content.includes('system') || content.includes('role')) {
        score += 0.2
      }
      
      // Check for clear instructions
      if (content.includes('instructions') || content.includes('guidelines')) {
        score += 0.15
      }
      
      // Check for format specification
      if (content.includes('format') || content.includes('output')) {
        score += 0.1
      }
      
      // Check for examples
      if (content.includes('example') || content.includes('sample')) {
        score += 0.05
      }
      
      return Math.min(1.0, score)
    } catch {
      return 0.3 // Fallback score for invalid configs
    }
  }

  private async evaluateHallucination(config: any, testCases?: any[]): Promise<number> {
    // Simulate hallucination detection
    let hallucinationRate = 0.2 // Base rate
    
    const content = typeof config === 'string' ? config : JSON.stringify(config)
    
    // Lower hallucination if config has fact-checking instructions
    if (content.includes('fact') || content.includes('verify') || content.includes('source')) {
      hallucinationRate -= 0.1
    }
    
    // Lower hallucination if config has constraints
    if (content.includes('constraint') || content.includes('rule') || content.includes('must not')) {
      hallucinationRate -= 0.05
    }
    
    // Simulate test-based hallucination detection
    if (testCases && testCases.length > 0) {
      const failedTests = testCases.filter(tc => !tc.passed).length
      const testHallucinationRate = failedTests / testCases.length * 0.3
      hallucinationRate += testHallucinationRate
    }
    
    return Math.max(0, Math.min(1.0, hallucinationRate))
  }

  private async evaluateResponseQuality(config: any, testCases?: any[]): Promise<number> {
    let qualityScore = 0.6 // Base score
    
    const content = typeof config === 'string' ? config : JSON.stringify(config)
    
    // Check for quality indicators
    if (content.includes('clear') || content.includes('specific')) {
      qualityScore += 0.1
    }
    
    if (content.includes('structured') || content.includes('organized')) {
      qualityScore += 0.1
    }
    
    if (content.includes('detailed') || content.includes('comprehensive')) {
      qualityScore += 0.1
    }
    
    // Simulate test-based quality evaluation
    if (testCases && testCases.length > 0) {
      const avgTestScore = testCases.reduce((sum, tc) => sum + (tc.score || 0.5), 0) / testCases.length
      qualityScore = (qualityScore + avgTestScore) / 2
    }
    
    return Math.min(1.0, qualityScore)
  }

  private calculateImprovement(beforeScore: any, afterScore: any): number {
    return ((afterScore.overall - beforeScore.overall) / beforeScore.overall) * 100
  }

  private async generateTestCases(beforeConfig: any, afterConfig: any): Promise<any[]> {
    try {
      // Create a mock ConfigFile for the TestCaseGenerator
      const configFile = {
        name: 'evaluation-config',
        type: 'markdown' as const,
        content: typeof beforeConfig === 'string' ? beforeConfig : JSON.stringify(beforeConfig),
        size: 0
      }

      // Generate project-specific test cases
      const projectTestCases = await TestCaseGenerator.generateProjectSpecificTestCases(configFile)
      
      // Convert to the format expected by the evaluator
      return projectTestCases.map(testCase => ({
        input: testCase.input,
        beforeOutput: testCase.beforeOutput,
        afterOutput: testCase.afterOutput,
        passed: testCase.passed,
        score: testCase.score,
        metadata: testCase.metadata
      }))
    } catch (error) {
      console.error('Failed to generate project-specific test cases in evaluator agent:', error)
      
      // Fallback to generic test cases
      const testInputs = [
        "What is the capital of France?",
        "Explain quantum computing in simple terms",
        "List the top 5 programming languages in 2024",
        "How do I bake a chocolate cake?",
        "What are the benefits of renewable energy?",
        "Compare machine learning and deep learning",
        "Describe the process of photosynthesis",
        "What are the main causes of climate change?"
      ]

      return testInputs.map((input, index) => ({
        input,
        beforeOutput: `Before: ${this.simulateResponse(input, beforeConfig)}`,
        afterOutput: `After: ${this.simulateResponse(input, afterConfig)}`,
        passed: Math.random() > 0.2, // 80% pass rate
        score: 0.5 + Math.random() * 0.5, // Score between 0.5 and 1.0
        metadata: {
          source: 'generated',
          domain: 'general'
        }
      }))
    }
  }

  private simulateResponse(input: string, config: any): string {
    const configContent = typeof config === 'string' ? config : JSON.stringify(config)
    
    // Simulate different response quality based on config
    if (configContent.includes('structured') || configContent.includes('format')) {
      return `Structured response to "${input}" with clear formatting and organization.`
    } else if (configContent.includes('detailed') || configContent.includes('comprehensive')) {
      return `Detailed response to "${input}" with comprehensive information and examples.`
    } else {
      return `Basic response to "${input}".`
    }
  }

  private async calculateAdvancedMetrics(beforeConfig: any, afterConfig: any, testCases?: any[]): Promise<{
    bleuScore?: number
    rougeScore?: number
    factualityScore?: number
    humanEvalScore?: number
  }> {
    // Simulate advanced NLP metrics calculation
    
    // BLEU Score (0-1, higher is better for translation/generation quality)
    const bleuScore = 0.6 + Math.random() * 0.3
    
    // ROUGE Score (0-1, higher is better for summarization quality)
    const rougeScore = 0.5 + Math.random() * 0.4
    
    // Factuality Score (0-1, higher is better for factual accuracy)
    const factualityScore = 0.7 + Math.random() * 0.25
    
    // Human Evaluation Score (simulated, 0-1)
    const humanEvalScore = 0.65 + Math.random() * 0.3
    
    return {
      bleuScore: Math.round(bleuScore * 1000) / 1000,
      rougeScore: Math.round(rougeScore * 1000) / 1000,
      factualityScore: Math.round(factualityScore * 1000) / 1000,
      humanEvalScore: Math.round(humanEvalScore * 1000) / 1000
    }
  }
}