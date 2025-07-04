import { GoogleGenerativeAI } from '@google/generative-ai'

// Simple rate limiter
class RateLimiter {
  private queue: Array<() => void> = []
  private processing = false
  private lastRequestTime = 0
  private minDelay = 6000 // 6 seconds between requests for free tier (10 req/min)

  async throttle(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve)
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    const delay = Math.max(0, this.minDelay - timeSinceLastRequest)
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    const resolve = this.queue.shift()
    if (resolve) {
      this.lastRequestTime = Date.now()
      resolve()
    }
    
    this.processing = false
    
    // Process next item in queue
    if (this.queue.length > 0) {
      this.processQueue()
    }
  }
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI
  private model: any
  private rateLimiter = new RateLimiter()

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
    // Using Gemini 2.0 Flash - the latest and most capable model
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
  }

  async generateContent(prompt: string, systemPrompt?: string): Promise<string> {
    // Apply rate limiting
    await this.rateLimiter.throttle()
    
    try {
      // Combine system prompt and user prompt if provided
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`
        : prompt

      const result = await this.model.generateContent(fullPrompt)
      const response = await result.response
      return response.text()
    } catch (error: any) {
      // Handle rate limit errors with retry
      if (error.status === 429) {
        console.log('Rate limit hit, waiting before retry...')
        const retryDelay = this.extractRetryDelay(error) || 20000 // Default 20s
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        
        // Retry once
        return this.generateContent(prompt, systemPrompt)
      }
      
      console.error('Gemini API error:', error)
      throw error
    }
  }

  async generateContentWithParams(params: {
    prompt: string
    systemPrompt?: string
    temperature?: number
    maxTokens?: number
  }): Promise<string> {
    // Apply rate limiting
    await this.rateLimiter.throttle()
    
    try {
      const { prompt, systemPrompt, temperature = 0.7, maxTokens = 1000 } = params
      
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`
        : prompt

      const generationConfig = {
        temperature,
        maxOutputTokens: maxTokens,
      }

      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp',
        generationConfig 
      })

      // Add timeout to prevent hanging
      const result = await Promise.race([
        model.generateContent(fullPrompt),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Gemini API timeout')), 15000)
        )
      ])
      
      const response = await result.response
      return response.text()
    } catch (error: any) {
      // Handle rate limit errors with retry
      if (error.status === 429) {
        console.log('Rate limit hit, waiting before retry...')
        const retryDelay = this.extractRetryDelay(error) || 20000 // Default 20s
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        
        // Retry once
        return this.generateContentWithParams(params)
      }
      
      console.error('Gemini API error:', error)
      throw error
    }
  }

  // Extract retry delay from error response
  private extractRetryDelay(error: any): number {
    try {
      const errorDetails = error.errorDetails || []
      for (const detail of errorDetails) {
        if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
          const retryDelay = detail.retryDelay
          if (retryDelay && retryDelay.endsWith('s')) {
            return parseInt(retryDelay) * 1000 // Convert seconds to milliseconds
          }
        }
      }
    } catch (e) {
      console.error('Failed to extract retry delay:', e)
    }
    return 20000 // Default 20 seconds
  }

  // Convert Anthropic-style messages to Gemini format
  static convertAnthropicToGemini(params: {
    model: string
    max_tokens: number
    temperature: number
    system?: string
    messages: Array<{ role: string; content: string }>
  }): {
    prompt: string
    systemPrompt?: string
    temperature: number
    maxTokens: number
  } {
    const systemPrompt = params.system
    const userMessage = params.messages.find(m => m.role === 'user')?.content || ''
    
    return {
      prompt: userMessage,
      systemPrompt,
      temperature: params.temperature,
      maxTokens: params.max_tokens
    }
  }
} 