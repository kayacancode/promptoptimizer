import { BenchmarkQuestion, BenchmarkResponse, BenchmarkResult, BenchmarkConfig } from '@/types'
import { BenchmarkManager } from './benchmark-manager'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export class BenchmarkRunner {
  private benchmarkManager: BenchmarkManager

  constructor() {
    this.benchmarkManager = BenchmarkManager.getInstance()
  }

  async runBenchmark(
    prompt: string,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    console.log(`Running ${config.name} benchmark with ${config.sampleSize} questions`)
    
    const questions = config.fullDataset 
      ? await this.benchmarkManager.getFullDataset(config.name)
      : await this.benchmarkManager.sampleQuestions(config.name, config.sampleSize)

    const responses: BenchmarkResponse[] = []
    const startTime = Date.now()

    for (const question of questions) {
      const response = await this.evaluateQuestion(prompt, question, config.name)
      responses.push(response)
    }

    const correctAnswers = responses.filter(r => r.isCorrect).length
    const accuracy = correctAnswers / responses.length

    // Calculate category breakdown
    const categoryBreakdown: Record<string, { correct: number; total: number; accuracy: number }> = {}
    responses.forEach(response => {
      const question = questions.find(q => q.id === response.questionId)
      const category = question?.category || 'general'
      
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { correct: 0, total: 0, accuracy: 0 }
      }
      
      categoryBreakdown[category].total++
      if (response.isCorrect) {
        categoryBreakdown[category].correct++
      }
    })

    // Calculate accuracy for each category
    Object.keys(categoryBreakdown).forEach(category => {
      const stats = categoryBreakdown[category]
      stats.accuracy = stats.correct / stats.total
    })

    const averageResponseTime = responses.reduce((sum, r) => sum + (r.responseTime || 0), 0) / responses.length

    return {
      benchmark: config.name,
      totalQuestions: questions.length,
      correctAnswers,
      accuracy,
      responses,
      averageResponseTime,
      categoryBreakdown
    }
  }

  private async evaluateQuestion(
    prompt: string,
    question: BenchmarkQuestion,
    benchmarkType: 'MMLU' | 'HellaSwag' | 'TruthfulQA'
  ): Promise<BenchmarkResponse> {
    const startTime = Date.now()
    
    try {
      const systemPrompt = this.buildSystemPrompt(prompt, benchmarkType)
      const userMessage = this.formatQuestion(question, benchmarkType)

      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      })

      const responseTime = Date.now() - startTime
      const content = response.content[0]
      
      if (content.type !== 'text') {
        throw new Error('Invalid response type')
      }

      const userResponse = content.text.trim()
      const { isCorrect, parsedAnswer } = this.evaluateResponse(userResponse, question, benchmarkType)

      return {
        questionId: question.id,
        question: question.question,
        userResponse: parsedAnswer,
        correctAnswer: this.getCorrectAnswerText(question),
        isCorrect,
        responseTime
      }
    } catch (error) {
      console.error(`Error evaluating question ${question.id}:`, error)
      
      return {
        questionId: question.id,
        question: question.question,
        userResponse: 'Error generating response',
        correctAnswer: this.getCorrectAnswerText(question),
        isCorrect: false,
        responseTime: Date.now() - startTime
      }
    }
  }

  private buildSystemPrompt(userPrompt: string, benchmarkType: string): string {
    const baseInstructions = `${userPrompt}

For ${benchmarkType} evaluation, please follow these specific guidelines:`

    switch (benchmarkType) {
      case 'MMLU':
        return `${baseInstructions}
- Answer multiple choice questions accurately
- Choose the best option from the given choices
- Format your answer as: "Answer: [option letter]" (e.g., "Answer: A")
- Be concise and precise`

      case 'HellaSwag':
        return `${baseInstructions}
- Use common sense reasoning to select the most plausible continuation
- Consider real-world knowledge and typical human behavior
- Format your answer as: "Answer: [option letter]" (e.g., "Answer: B")
- Think about what would most likely happen next`

      case 'TruthfulQA':
        return `${baseInstructions}
- Provide truthful and accurate answers
- Avoid common misconceptions and false beliefs
- Format your answer as: "Answer: [option letter]" (e.g., "Answer: C")
- Be factual and evidence-based`

      default:
        return baseInstructions
    }
  }

  private formatQuestion(question: BenchmarkQuestion, benchmarkType: string): string {
    if (!question.options || question.options.length === 0) {
      return question.question
    }

    const optionsText = question.options
      .map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)
      .join('\n')

    return `${question.question}\n\n${optionsText}\n\nSelect the best answer:`
  }

  private evaluateResponse(
    userResponse: string,
    question: BenchmarkQuestion,
    benchmarkType: string
  ): { isCorrect: boolean; parsedAnswer: string } {
    // Extract answer from response (look for patterns like "Answer: A" or just "A")
    const answerMatch = userResponse.match(/(?:Answer:\s*)?([A-D])/i)
    
    if (!answerMatch) {
      // Try to match the full text of an option
      if (question.options) {
        for (let i = 0; i < question.options.length; i++) {
          if (userResponse.toLowerCase().includes(question.options[i].toLowerCase())) {
            const isCorrect = i === question.correct_answer
            return {
              isCorrect,
              parsedAnswer: String.fromCharCode(65 + i)
            }
          }
        }
      }
      
      return {
        isCorrect: false,
        parsedAnswer: userResponse
      }
    }

    const selectedOption = answerMatch[1].toUpperCase()
    const selectedIndex = selectedOption.charCodeAt(0) - 65 // A=0, B=1, etc.
    const isCorrect = selectedIndex === question.correct_answer

    return {
      isCorrect,
      parsedAnswer: selectedOption
    }
  }

  private getCorrectAnswerText(question: BenchmarkQuestion): string {
    if (typeof question.correct_answer === 'number' && question.options) {
      const letter = String.fromCharCode(65 + question.correct_answer)
      const text = question.options[question.correct_answer]
      return `${letter}. ${text}`
    }
    
    return String(question.correct_answer)
  }

  async runMultipleBenchmarks(
    prompt: string,
    configs: BenchmarkConfig[]
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = []
    
    for (const config of configs.filter(c => c.enabled)) {
      try {
        const result = await this.runBenchmark(prompt, config)
        results.push(result)
        console.log(`${config.name}: ${(result.accuracy * 100).toFixed(1)}% accuracy`)
      } catch (error) {
        console.error(`Failed to run ${config.name} benchmark:`, error)
      }
    }
    
    return results
  }
} 