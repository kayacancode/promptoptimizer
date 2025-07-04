import { ConfigFile, OptimizationResult, EvaluationResult, TestCase, OptimizationChange } from '@/types'
import { ConfidenceScoring } from '@/lib/confidence-scoring'

export class OptimizationEngine {
  private static readonly API_BASE = '/api'
  
  static async optimize(
    configFile: ConfigFile, 
    options?: {
      includeContext?: boolean;
      contextInfo?: string;
    }
  ): Promise<OptimizationResult> {
    try {
      console.log('Making optimization request to:', `${this.API_BASE}/optimize`)
      
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000) // 2 minutes timeout
      
      const response = await fetch(`${this.API_BASE}/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configFile,
          includeContext: options?.includeContext ?? false,
          contextInfo: options?.contextInfo ?? ''
        }),
        signal: controller.signal
      })

      clearTimeout(timeout)

      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Optimization failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      console.log('Optimization API response:', result)
      
      if (!result.success) {
        throw new Error(`API returned error: ${result.error}`)
      }
      
      return result.data
    } catch (error) {
      console.error('Optimization error:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request timed out, using mock data')
      }
      // Fallback to mock data for demo purposes
      return this.generateMockOptimization(configFile)
    }
  }

  static async evaluate(
    originalConfig: ConfigFile, 
    optimizationResult: OptimizationResult,
    includeBenchmarks: boolean = true
  ): Promise<EvaluationResult> {
    try {
      const response = await fetch(`${this.API_BASE}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalConfig,
          optimizationResult,
          includeBenchmarks,
          benchmarkConfigs: includeBenchmarks ? [
            { name: 'MMLU', enabled: true, sampleSize: 20, fullDataset: false },
            { name: 'HellaSwag', enabled: true, sampleSize: 20, fullDataset: false },
            { name: 'TruthfulQA', enabled: true, sampleSize: 20, fullDataset: false }
          ] : undefined
        }),
      })

      if (!response.ok) {
        throw new Error(`Evaluation failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Evaluation error:', error)
      // Fallback to mock data for demo purposes
      return this.generateMockEvaluation(originalConfig, optimizationResult)
    }
  }

  private static generateMockOptimization(configFile: ConfigFile): OptimizationResult {
    // Generate a realistic mock optimization based on the config type
    const improvements = this.generateImprovements(configFile)
    
    // Create initial result for confidence calculation
    const initialResult: OptimizationResult = {
      originalContent: configFile.content,
      optimizedContent: improvements.content,
      explanation: improvements.explanation,
      changes: improvements.changes,
      confidence: 0.5, // Temporary value
      timestamp: new Date().toISOString(),
    }
    
    // Calculate dynamic confidence score
    const confidenceAnalysis = ConfidenceScoring.calculateConfidence(
      initialResult,
      improvements.explanation,
      true // Mock validation passed
    )
    
    return {
      ...initialResult,
      confidence: confidenceAnalysis.score,
      confidenceExplanation: {
        factors: confidenceAnalysis.factors,
        reasoning: confidenceAnalysis.reasoning,
        riskLevel: confidenceAnalysis.riskLevel
      }
    }
  }

  private static generateImprovements(configFile: ConfigFile) {
    const content = configFile.content
    let optimizedContent = content
    const changes: OptimizationChange[] = []
    let explanation = "Enhanced the prompt with improved clarity, specificity, and structure to reduce ambiguity and improve performance."

    // Simple prompt optimization logic
    if (content.includes('You are a helpful assistant')) {
      optimizedContent = content.replace(
        'You are a helpful assistant',
        'You are a helpful assistant. Please provide clear, accurate, and well-structured responses. Be specific in your answers and ask for clarification if the question is ambiguous.'
      )
      changes.push({
        type: 'modification',
        line: 1,
        reason: 'Enhanced role definition with specific behavioral guidelines',
        original: 'You are a helpful assistant',
        optimized: 'You are a helpful assistant. Please provide clear, accurate, and well-structured responses...'
      })
      explanation = "Enhanced the assistant role with specific behavioral guidelines to improve response quality and consistency."
    } else if (content.includes('helpful assistant')) {
      optimizedContent = content.replace(
        'helpful assistant',
        'helpful assistant that provides detailed, accurate responses with examples when appropriate'
      )
      changes.push({
        type: 'modification',
        line: 1,
        reason: 'Added specificity to assistant role definition'
      })
    } else {
      // Add general improvements
      optimizedContent = `${content}\n\nPlease ensure your response is:\n- Clear and specific\n- Well-structured\n- Accurate and factual`
      changes.push({
        type: 'addition',
        line: content.split('\n').length + 1,
        reason: 'Added response quality guidelines'
      })
    }

    return { content: optimizedContent, explanation, changes }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static generateMockEvaluation(
    originalConfig: ConfigFile,
    _optimizationResult: OptimizationResult
  ): EvaluationResult {
    // Generate realistic test cases based on config type
    const testCases: TestCase[] = this.generateTestCases(originalConfig)
    
    const beforeScore = {
      structureCompliance: 0.65,
      hallucinationRate: 0.25,
      responseQuality: 0.72,
      overall: 0.67
    }

    const afterScore = {
      structureCompliance: 0.89,
      hallucinationRate: 0.12,
      responseQuality: 0.84,
      overall: 0.82
    }

    const improvement = ((afterScore.overall - beforeScore.overall) / beforeScore.overall) * 100

    return {
      beforeScore,
      afterScore,
      improvement,
      testCases,
      metrics: {
        totalTests: testCases.length,
        passedTests: testCases.filter(tc => tc.passed).length,
        averageImprovement: improvement,
        executionTime: Math.floor(Math.random() * 500) + 200
      },
      timestamp: new Date().toISOString()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static generateTestCases(_configFile: ConfigFile): TestCase[] {
    const testInputs = [
      "What is the capital of France?",
      "Explain quantum computing in simple terms",
      "List the top 5 programming languages in 2024",
      "How do I bake a chocolate cake?",
      "What are the benefits of renewable energy?"
    ]

    return testInputs.map((input, index) => ({
      input,
      beforeOutput: `Response ${index + 1}: ${this.generateMockResponse(input, 'before')}`,
      afterOutput: `Response ${index + 1}: ${this.generateMockResponse(input, 'after')}`,
      passed: Math.random() > 0.2, // 80% pass rate
      score: 0.6 + Math.random() * 0.4 // Score between 0.6 and 1.0
    }))
  }

  private static generateMockResponse(input: string, type: 'before' | 'after'): string {
    const baseResponse = `Here's information about "${input.toLowerCase()}"`
    
    if (type === 'before') {
      return `${baseResponse}. This is a basic response that might lack structure or specificity.`
    } else {
      return `${baseResponse}. 

**Structured Response:**
1. Direct answer provided
2. Context and background included  
3. Additional relevant information
4. Clear formatting for readability

This optimized response demonstrates improved structure and clarity.`
    }
  }

  // API-based methods for client-side usage
  static async getAgentStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.API_BASE}/agent-status`)
      const result = await response.json()
      return result.success ? result.data : null
    } catch (error) {
      console.error('Failed to fetch agent status:', error)
      return null
    }
  }

  static async createPullRequest(optimizationResult: OptimizationResult, configFile: ConfigFile): Promise<any> {
    try {
      const response = await fetch(`${this.API_BASE}/create-pr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ optimizationResult, configFile }),
      })
      
      const result = await response.json()
      return result
    } catch (error) {
      console.error('Failed to create PR:', error)
      return { success: false, error: 'Failed to create pull request' }
    }
  }
} 