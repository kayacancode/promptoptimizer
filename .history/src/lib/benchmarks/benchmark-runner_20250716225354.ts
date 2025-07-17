import { ModelEvaluationResult } from '@/types'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GeminiClient } from '@/lib/llm/gemini-client'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

const gemini = new GeminiClient(process.env.GOOGLE_GEMINI_API_KEY || '')

export class BenchmarkRunner {
  /**
   * Run evaluations across multiple models in parallel
   */
  async runModelEvaluations(
    prompt: string,
    models: { name: string; enabled: boolean }[],
    sampleSize: number = 1
  ): Promise<ModelEvaluationResult[]> {
    const enabledModels = models.filter(m => m.enabled)
    
    // Run all model evaluations in parallel
    const results = await Promise.all(
      enabledModels.map(model => 
        this.evaluateWithModel(prompt, model.name, sampleSize)
      )
    )

    return results
  }

  /**
   * Evaluate a prompt with a specific model
   */
  private async evaluateWithModel(
    prompt: string,
    modelName: string,
    sampleSize: number
  ): Promise<ModelEvaluationResult> {
    try {
      // Generate multiple responses in parallel
      const responses = await Promise.all(
        Array(sampleSize).fill(null).map(() => 
          this.generateModelResponse(prompt, modelName)
        )
      )

      // Calculate metrics
      const hallucinationRate = this.calculateHallucinationRate(responses)
      const structureScore = this.calculateStructureScore(responses)
      const consistencyScore = this.calculateConsistencyScore(responses)

      return {
        model: modelName,
        hallucinationRate,
        structureScore,
        consistencyScore,
        totalSamples: sampleSize,
        responses: responses  // Store the actual responses
      }
    } catch (error) {
      console.error(`Error evaluating model ${modelName}:`, error)
      return {
        model: modelName,
        hallucinationRate: 0,
        structureScore: 0,
        consistencyScore: 0,
        totalSamples: 0,
        responses: []  // Empty responses for failed models
      }
    }
  }

  /**
   * Generate a response from a specific model with timeout
   */
  private async generateModelResponse(prompt: string, modelName: string): Promise<string> {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Model response timeout')), 30000)
      )

      const responsePromise = this.callModel(prompt, modelName)
      const response = await Promise.race([responsePromise, timeoutPromise])
      
      return response
    } catch (error) {
      console.error(`Error generating response from ${modelName}:`, error)
      return `Error: Failed to generate response from ${modelName}`
    }
  }

  /**
   * Call the specific model API
   */
  private async callModel(prompt: string, modelName: string): Promise<string> {
    switch (modelName) {
      case 'claude-3-haiku-20240307':
      case 'claude-3-5-sonnet-20240620':
      case 'claude-3-sonnet': // Map UI model name to actual model
      case 'claude-3-haiku': // Map UI model name to actual model
        const anthropicModelName = modelName === 'claude-3-sonnet' 
          ? 'claude-3-5-sonnet-20240620' 
          : modelName === 'claude-3-haiku' 
          ? 'claude-3-haiku-20240307' 
          : modelName
        const anthropicResponse = await anthropic.messages.create({
          model: anthropicModelName,
          max_tokens: 1000,
          temperature: 0.7,
          messages: [{ role: 'user', content: prompt }]
        })
        const content = anthropicResponse.content[0]
        if (content.type !== 'text') {
          throw new Error('Invalid response type')
        }
        return content.text

      // case 'gpt-4':
        const openaiResponse = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.7
        })
        return openaiResponse.choices[0].message.content || ''

      case 'gemini-2.5-flash':
      case 'gemini-flash': // Map UI model name
        // Use direct Gemini API without rate limiting
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
        
        const result = await geminiModel.generateContent(prompt)
        return result.response.text()

      default:
        throw new Error(`Unsupported model: ${modelName}`)
    }
  }

  /**
   * Calculate hallucination rate based on factual consistency and contradictions
   */
  private calculateHallucinationRate(responses: string[]): number {
    let hallucinationScore = 0

    for (const response of responses) {
      // Check for common hallucination indicators
      const hasUncertaintyMarkers = /maybe|probably|might|could be|i think|possibly/i.test(response)
      const hasFactualClaims = /definitely|always|never|must|absolutely/i.test(response)
      const hasContradictions = this.checkForContradictions(response)
      const hasSpecificDetails = /\d{4}|\d{2}\/\d{2}\/\d{4}|\$\d+|\d+%/g.test(response)

      // Increase score for concerning patterns
      if (hasUncertaintyMarkers && hasFactualClaims) hallucinationScore += 0.2
      if (hasContradictions) hallucinationScore += 0.3
      if (hasSpecificDetails && hasUncertaintyMarkers) hallucinationScore += 0.2
    }

    // Normalize score between 0 and 1
    return Math.min(1, hallucinationScore / responses.length)
  }

  /**
   * Calculate structure score based on response formatting and organization
   */
  private calculateStructureScore(responses: string[]): number {
    let structureScore = 0

    for (const response of responses) {
      // Check for good structure indicators
      const hasParagraphs = response.split('\n\n').length > 1
      const hasBulletPoints = /^[\s-]*•/m.test(response)
      const hasHeadings = /^#+\s+\w+/m.test(response)
      const hasCodeBlocks = /```[\s\S]*?```/.test(response)
      const hasSentenceVariety = this.checkSentenceVariety(response)

      // Increase score for good structure
      if (hasParagraphs) structureScore += 0.2
      if (hasBulletPoints) structureScore += 0.2
      if (hasHeadings) structureScore += 0.2
      if (hasCodeBlocks) structureScore += 0.2
      if (hasSentenceVariety) structureScore += 0.2
    }

    // Normalize score between 0 and 1
    return Math.min(1, structureScore / responses.length)
  }

  /**
   * Calculate consistency score based on response similarity
   */
  private calculateConsistencyScore(responses: string[]): number {
    if (responses.length < 2) return 1

    let consistencyScore = 0
    const totalComparisons = (responses.length * (responses.length - 1)) / 2

    // Compare each response with every other response
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculateStringSimilarity(responses[i], responses[j])
        consistencyScore += similarity
      }
    }

    // Normalize score between 0 and 1
    return consistencyScore / totalComparisons
  }

  /**
   * Check for contradictions within a response
   */
  private checkForContradictions(text: string): boolean {
    const sentences = text.split(/[.!?]+/).map(s => s.trim().toLowerCase())
    
    for (let i = 0; i < sentences.length; i++) {
      for (let j = i + 1; j < sentences.length; j++) {
        // Check for direct contradictions
        if (this.areContradictory(sentences[i], sentences[j])) {
          return true
        }
      }
    }
    
    return false
  }

  /**
   * Check for sentence variety in structure and length
   */
  private checkSentenceVariety(text: string): boolean {
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
    if (sentences.length < 2) return false

    const lengths = sentences.map(s => s.length)
    const avgLength = lengths.reduce((a, b) => a + b) / lengths.length
    const hasLengthVariety = lengths.some(l => Math.abs(l - avgLength) > avgLength * 0.5)

    const types = sentences.map(s => {
      if (s.endsWith('?')) return 'question'
      if (s.endsWith('!')) return 'exclamation'
      if (/^(if|when|while|because|although)/i.test(s)) return 'complex'
      return 'simple'
    })
    const hasTypeVariety = new Set(types).size > 1

    return hasLengthVariety && hasTypeVariety
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/))
    const words2 = new Set(str2.toLowerCase().split(/\s+/))
    
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size
  }

  /**
   * Check if two sentences are contradictory
   */
  private areContradictory(sent1: string, sent2: string): boolean {
    // Check for opposite statements
    const opposites = [
      ['always', 'never'],
      ['must', 'must not'],
      ['is', 'is not'],
      ['can', 'cannot'],
      ['will', 'will not'],
      ['should', 'should not']
    ]

    for (const [pos, neg] of opposites) {
      if ((sent1.includes(pos) && sent2.includes(neg)) ||
          (sent1.includes(neg) && sent2.includes(pos))) {
        // Check if they're talking about the same subject
        const words1 = sent1.split(' ')
        const words2 = sent2.split(' ')
        const commonWords = words1.filter(w => words2.includes(w))
        if (commonWords.length > 2) { // More than 2 words in common suggests same topic
          return true
        }
      }
    }

    return false
  }
} 