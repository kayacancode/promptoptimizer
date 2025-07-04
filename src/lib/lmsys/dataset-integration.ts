import { TestCase } from '@/types'

// LMSYS-Chat-1M dataset types
export interface LMSYSConversation {
  conversation_id: string
  model: string
  timestamp: string
  conversation: Array<{
    content: string
    role: 'user' | 'assistant'
    turn: number
  }>
  language: string
  redacted: boolean
  rating?: number
  tags?: string[]
  domain?: string
}

export interface LMSYSDatasetQuery {
  domain?: string
  language?: string
  minRating?: number
  maxConversations?: number
  models?: string[]
  tags?: string[]
}

export class LMSYSDatasetIntegration {
  /**
   * Fetch real-world conversations from LMSYS-Chat-1M dataset
   * Note: Currently using curated examples. To use the full dataset:
   * 1. Download from https://huggingface.co/datasets/lmsys/lmsys-chat-1m
   * 2. Process and index the data
   * 3. Update this method to query your local index
   */
  static async fetchConversations(query: LMSYSDatasetQuery): Promise<LMSYSConversation[]> {
    // For now, return high-quality curated examples
    // In production, this would query a local index of the LMSYS dataset
    return this.getMockConversations(query)
  }

  /**
   * Convert LMSYS conversations to PromptLoop test cases
   */
  static conversationsToTestCases(
    conversations: LMSYSConversation[], 
    targetDomain?: string
  ): TestCase[] {
    return conversations.map((conv, index) => {
      const userTurn = conv.conversation.find(turn => turn.role === 'user')
      const assistantTurn = conv.conversation.find(turn => turn.role === 'assistant')

      return {
        input: userTurn?.content || `Query ${index + 1}`,
        beforeOutput: '', // Will be filled during evaluation
        afterOutput: '', // Will be filled during evaluation
        passed: false,
        score: 0,
        metadata: {
          source: 'lmsys',
          conversationId: conv.conversation_id,
          originalModel: conv.model,
          originalRating: conv.rating,
          domain: conv.domain || targetDomain || 'general',
          useCase: this.inferUseCase(userTurn?.content || ''),
          language: conv.language,
          timestamp: conv.timestamp,
          tags: conv.tags
        }
      }
    })
  }

  /**
   * Generate domain-specific test cases using LMSYS data
   */
  static async generateDomainTestCases(
    domain: string, 
    count: number = 10
  ): Promise<TestCase[]> {
    const conversations = await this.fetchConversations({
      domain,
      maxConversations: count * 2, // Fetch more to filter
      minRating: 3, // Only high-quality conversations
      language: 'en'
    })

    const testCases = this.conversationsToTestCases(conversations, domain)
    return testCases.slice(0, count)
  }

  /**
   * Analyze conversation patterns for prompt optimization insights
   */
  static async analyzeConversationPatterns(domain: string): Promise<{
    commonPatterns: string[]
    successfulPrompts: string[]
    failureIndicators: string[]
    recommendedStructure: string
  }> {
    const conversations = await this.fetchConversations({
      domain,
      maxConversations: 100,
      minRating: 4
    })

    // Analyze patterns in high-rated conversations
    const userMessages = conversations.map(conv => 
      conv.conversation.filter(turn => turn.role === 'user').map(turn => turn.content)
    ).flat()

    const commonPatterns = this.extractPatterns(userMessages)
    const successfulPrompts = this.identifySuccessfulPrompts(conversations)
    
    return {
      commonPatterns,
      successfulPrompts,
      failureIndicators: ['too vague', 'missing context', 'unclear intent'],
      recommendedStructure: this.generateRecommendedStructure(commonPatterns)
    }
  }

  /**
   * Extract common patterns from user messages
   */
  private static extractPatterns(messages: string[]): string[] {
    const patterns = new Map<string, number>()
    
    // Simple pattern extraction - look for common phrase structures
    messages.forEach(message => {
      // Extract question patterns
      if (message.toLowerCase().includes('how to')) {
        patterns.set('how-to-questions', (patterns.get('how-to-questions') || 0) + 1)
      }
      if (message.toLowerCase().includes('what is')) {
        patterns.set('definition-requests', (patterns.get('definition-requests') || 0) + 1)
      }
      if (message.toLowerCase().includes('explain')) {
        patterns.set('explanation-requests', (patterns.get('explanation-requests') || 0) + 1)
      }
      if (message.toLowerCase().includes('example')) {
        patterns.set('example-requests', (patterns.get('example-requests') || 0) + 1)
      }
    })

    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern]) => pattern)
  }

  /**
   * Identify successful prompt structures from high-rated conversations
   */
  private static identifySuccessfulPrompts(conversations: LMSYSConversation[]): string[] {
    return conversations
      .filter(conv => (conv.rating || 0) >= 4)
      .map(conv => conv.conversation.find(turn => turn.role === 'user')?.content)
      .filter(Boolean)
      .slice(0, 10) as string[]
  }

  /**
   * Generate recommended prompt structure based on patterns
   */
  private static generateRecommendedStructure(patterns: string[]): string {
    const structures = {
      'how-to-questions': 'Structure: "How to [specific task] in [context]? Please provide [specific format/detail level]."',
      'definition-requests': 'Structure: "What is [concept] in the context of [domain]? Include [examples/applications]."',
      'explanation-requests': 'Structure: "Explain [topic] by [approach/method]. Focus on [specific aspects]."',
      'example-requests': 'Structure: "Provide [number] examples of [concept] that [criteria]. Include [details]."'
    }

    if (patterns.length > 0) {
      return structures[patterns[0] as keyof typeof structures] || 'Use specific, contextual language with clear expectations.'
    }

    return 'Use specific, contextual language with clear expectations.'
  }

  /**
   * Infer use case from user input
   */
  private static inferUseCase(input: string): string {
    const lowerInput = input.toLowerCase()
    
    if (lowerInput.includes('code') || lowerInput.includes('programming')) return 'coding'
    if (lowerInput.includes('write') || lowerInput.includes('essay')) return 'writing'
    if (lowerInput.includes('analyze') || lowerInput.includes('data')) return 'analysis'
    if (lowerInput.includes('explain') || lowerInput.includes('learn')) return 'education'
    if (lowerInput.includes('help') || lowerInput.includes('assist')) return 'assistance'
    
    return 'general'
  }

  /**
   * Mock conversations for development (when API is not available)
   */
  private static getMockConversations(query: LMSYSDatasetQuery): LMSYSConversation[] {
    return [
      {
        conversation_id: 'mock-1',
        model: 'gpt-4',
        timestamp: new Date().toISOString(),
        conversation: [
          { content: 'How do I optimize prompts for better AI responses?', role: 'user' as const, turn: 1 },
          { content: 'Here are some key strategies for prompt optimization...', role: 'assistant' as const, turn: 2 }
        ],
        language: 'en',
        redacted: false,
        rating: 4,
        domain: query.domain || 'ai-development',
        tags: ['prompt-engineering', 'optimization']
      },
      {
        conversation_id: 'mock-2',
        model: 'claude-3',
        timestamp: new Date().toISOString(),
        conversation: [
          { content: 'What are the best practices for writing clear instructions?', role: 'user' as const, turn: 1 },
          { content: 'Clear instructions should be specific, contextual, and include examples...', role: 'assistant' as const, turn: 2 }
        ],
        language: 'en',
        redacted: false,
        rating: 5,
        domain: query.domain || 'communication',
        tags: ['instructions', 'clarity']
      }
    ].slice(0, query.maxConversations || 10)
  }

  /**
   * Infer domain from user input
   */
  private static inferDomain(input: string): string {
    const lowerInput = input.toLowerCase()
    
    if (lowerInput.includes('code') || lowerInput.includes('programming')) return 'coding'
    if (lowerInput.includes('write') || lowerInput.includes('essay')) return 'writing'
    if (lowerInput.includes('analyze') || lowerInput.includes('data')) return 'analysis'
    if (lowerInput.includes('explain') || lowerInput.includes('learn')) return 'education'
    if (lowerInput.includes('help') || lowerInput.includes('assist')) return 'assistance'
    
    return 'general'
  }
}