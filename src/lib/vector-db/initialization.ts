import { globalPromptService } from './global-prompt-service'
import { promptMigrator } from './prompt-migrator'

export interface InitializationStats {
  success: boolean
  indexInitialized: boolean
  totalPromptsImported: number
  error?: string
}

export class VectorDatabaseInitializer {
  static async initializeSystem(): Promise<InitializationStats> {
    try {
      console.log('Initializing PromptLoop vector database system...')
      
      // Initialize the vector database
      await globalPromptService.initialize()
      console.log('✓ Pinecone index initialized')
      
      // Import sample prompts for testing (optional)
      const samplePrompts = this.generateSamplePrompts()
      if (samplePrompts.length > 0) {
        await globalPromptService.bulkImportPrompts(samplePrompts)
        console.log(`✓ Imported ${samplePrompts.length} sample prompts`)
      }
      
      return {
        success: true,
        indexInitialized: true,
        totalPromptsImported: samplePrompts.length
      }
    } catch (error) {
      console.error('Failed to initialize vector database system:', error)
      return {
        success: false,
        indexInitialized: false,
        totalPromptsImported: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async checkSystemHealth(): Promise<{
    pineconeConnected: boolean
    openaiConnected: boolean
    totalPrompts: number
    error?: string
  }> {
    try {
      const stats = await globalPromptService.getGlobalStats()
      
      return {
        pineconeConnected: true,
        openaiConnected: true,
        totalPrompts: stats.totalPrompts
      }
    } catch (error) {
      console.error('System health check failed:', error)
      return {
        pineconeConnected: false,
        openaiConnected: false,
        totalPrompts: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private static generateSamplePrompts() {
    return [
      {
        userId: 'system',
        content: 'You are a helpful assistant. Please provide clear, accurate, and well-structured responses. Be specific in your answers and ask for clarification if the question is ambiguous.',
        metadata: {
          domain: 'general',
          language: 'english',
          complexity: 'low' as const,
          tags: ['assistant', 'helpful', 'clear'],
          type: 'system_prompt' as const
        }
      },
      {
        userId: 'system',
        content: 'Review the following code for bugs, performance issues, and best practices. Provide specific recommendations for improvement with code examples.',
        metadata: {
          domain: 'software-development',
          language: 'general',
          complexity: 'medium' as const,
          tags: ['code-review', 'debugging', 'best-practices'],
          type: 'user_prompt' as const
        }
      },
      {
        userId: 'system',
        content: 'Analyze the provided dataset and create a comprehensive report including:\n1. Data quality assessment\n2. Key insights and patterns\n3. Visualization recommendations\n4. Actionable business recommendations',
        metadata: {
          domain: 'data-analysis',
          language: 'general',
          complexity: 'high' as const,
          tags: ['data-analysis', 'reporting', 'insights'],
          type: 'template' as const
        }
      },
      {
        userId: 'system',
        content: 'Write a compelling blog post about [TOPIC]. Include:\n- Engaging introduction with a hook\n- 3-5 main points with supporting evidence\n- Practical examples and actionable advice\n- Strong conclusion with call-to-action\n\nTarget audience: [AUDIENCE]\nTone: [TONE]',
        metadata: {
          domain: 'content-creation',
          language: 'english',
          complexity: 'medium' as const,
          tags: ['blog', 'writing', 'content'],
          type: 'template' as const
        }
      },
      {
        userId: 'system',
        content: 'Help the customer resolve their issue by:\n1. Acknowledging their concern empathetically\n2. Asking clarifying questions if needed\n3. Providing step-by-step solutions\n4. Following up to ensure satisfaction\n\nMaintain a professional, helpful tone throughout.',
        metadata: {
          domain: 'customer-support',
          language: 'english',
          complexity: 'medium' as const,
          tags: ['customer-service', 'support', 'problem-solving'],
          type: 'instruction' as const
        }
      }
    ]
  }

  static async migrateExistingPrompts(prompts: Array<{
    content: string
    userId: string
    domain?: string
    language?: string
    complexity?: 'low' | 'medium' | 'high'
  }>): Promise<number> {
    let importedCount = 0
    
    for (const prompt of prompts) {
      try {
        await promptMigrator.migratePromptContent(prompt.content, {
          userId: prompt.userId,
          domain: prompt.domain || 'general',
          language: prompt.language || 'english',
          complexity: prompt.complexity || 'medium'
        })
        importedCount++
      } catch (error) {
        console.error(`Failed to migrate prompt for user ${prompt.userId}:`, error)
      }
    }
    
    return importedCount
  }
}

export const vectorDatabaseInitializer = VectorDatabaseInitializer