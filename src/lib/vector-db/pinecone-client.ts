import { Pinecone } from '@pinecone-database/pinecone'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface VectorPrompt {
  id: string
  userId: string
  content: string
  title?: string
  type: 'system_prompt' | 'user_prompt' | 'template' | 'instruction'
  metadata: {
    domain?: string
    language?: string
    framework?: string
    complexity?: 'low' | 'medium' | 'high'
    tags?: string[]
    createdAt: string
    updatedAt: string
  }
  embedding?: number[]
}

export interface SimilarPrompt {
  id: string
  userId: string
  content: string
  title?: string
  type: string
  metadata: any
  score: number
}

export class PineconeClient {
  private pinecone: Pinecone
  private genAI: GoogleGenerativeAI
  private indexName: string
  private embeddingModel: string

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    })
    
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)
    
    this.indexName = process.env.PINECONE_INDEX_NAME || 'promptloop-prompts'
    this.embeddingModel = 'text-embedding-004'
  }

  async initializeIndex(): Promise<void> {
    try {
      const indexes = await this.pinecone.listIndexes()
      const existingIndex = indexes.indexes?.find(index => index.name === this.indexName)
      
      if (!existingIndex) {
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 768, // text-embedding-004 dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        })
        
        // Wait for index to be ready
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
    } catch (error) {
      console.error('Error initializing Pinecone index:', error)
      throw error
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.embeddingModel 
      })
      
      const result = await model.embedContent(text)
      
      if (!result.embedding?.values) {
        throw new Error('No embedding values returned from Google AI')
      }
      
      return result.embedding.values
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw error
    }
  }

  async upsertPrompt(prompt: VectorPrompt): Promise<void> {
    try {
      const index = this.pinecone.Index(this.indexName)
      
      // Generate embedding if not provided
      if (!prompt.embedding) {
        prompt.embedding = await this.generateEmbedding(prompt.content)
      }
      
      await index.upsert([
        {
          id: prompt.id,
          values: prompt.embedding,
          metadata: {
            userId: prompt.userId,
            content: prompt.content,
            title: prompt.title || '',
            type: prompt.type,
            domain: prompt.metadata.domain || '',
            language: prompt.metadata.language || '',
            framework: prompt.metadata.framework || '',
            complexity: prompt.metadata.complexity || 'medium',
            tags: prompt.metadata.tags?.join(',') || '',
            createdAt: prompt.metadata.createdAt,
            updatedAt: prompt.metadata.updatedAt
          }
        }
      ])
    } catch (error) {
      console.error('Error upserting prompt:', error)
      throw error
    }
  }

  async batchUpsertPrompts(prompts: VectorPrompt[]): Promise<void> {
    try {
      const index = this.pinecone.Index(this.indexName)
      const batchSize = 100
      
      for (let i = 0; i < prompts.length; i += batchSize) {
        const batch = prompts.slice(i, i + batchSize)
        
        // Generate embeddings for prompts that don't have them
        const promptsWithEmbeddings = await Promise.all(
          batch.map(async (prompt) => {
            if (!prompt.embedding) {
              prompt.embedding = await this.generateEmbedding(prompt.content)
            }
            return prompt
          })
        )
        
        const vectors = promptsWithEmbeddings.map(prompt => ({
          id: prompt.id,
          values: prompt.embedding!,
          metadata: {
            userId: prompt.userId,
            content: prompt.content,
            title: prompt.title || '',
            type: prompt.type,
            domain: prompt.metadata.domain || '',
            language: prompt.metadata.language || '',
            framework: prompt.metadata.framework || '',
            complexity: prompt.metadata.complexity || 'medium',
            tags: prompt.metadata.tags?.join(',') || '',
            createdAt: prompt.metadata.createdAt,
            updatedAt: prompt.metadata.updatedAt
          }
        }))
        
        await index.upsert(vectors)
      }
    } catch (error) {
      console.error('Error batch upserting prompts:', error)
      throw error
    }
  }

  async searchSimilarPrompts(
    queryText: string,
    limit: number = 10,
    filter?: {
      userId?: string
      type?: string
      domain?: string
      complexity?: string
      excludeUserId?: string
    }
  ): Promise<SimilarPrompt[]> {
    try {
      const index = this.pinecone.Index(this.indexName)
      
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(queryText)
      
      // Build filter
      const pineconeFilter: any = {}
      if (filter?.userId) {
        pineconeFilter.userId = filter.userId
      }
      if (filter?.type) {
        pineconeFilter.type = filter.type
      }
      if (filter?.domain) {
        pineconeFilter.domain = filter.domain
      }
      if (filter?.complexity) {
        pineconeFilter.complexity = filter.complexity
      }
      if (filter?.excludeUserId) {
        pineconeFilter.userId = { $ne: filter.excludeUserId }
      }
      
      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true,
        filter: Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined
      })
      
      return queryResponse.matches?.map(match => ({
        id: match.id,
        userId: match.metadata?.userId as string,
        content: match.metadata?.content as string,
        title: match.metadata?.title as string,
        type: match.metadata?.type as string,
        metadata: {
          domain: match.metadata?.domain,
          language: match.metadata?.language,
          framework: match.metadata?.framework,
          complexity: match.metadata?.complexity,
          tags: match.metadata?.tags ? (match.metadata.tags as string).split(',') : [],
          createdAt: match.metadata?.createdAt,
          updatedAt: match.metadata?.updatedAt
        },
        score: match.score || 0
      })) || []
    } catch (error) {
      console.error('Error searching similar prompts:', error)
      throw error
    }
  }

  async searchGlobalPrompts(
    queryText: string,
    limit: number = 10,
    excludeUserId?: string
  ): Promise<SimilarPrompt[]> {
    return this.searchSimilarPrompts(queryText, limit, {
      excludeUserId
    })
  }

  async deletePrompt(promptId: string): Promise<void> {
    try {
      const index = this.pinecone.Index(this.indexName)
      await index.deleteOne(promptId)
    } catch (error) {
      console.error('Error deleting prompt:', error)
      throw error
    }
  }

  async getPromptStats(): Promise<{
    totalPrompts: number
    totalUsers: number
    domains: string[]
    types: string[]
  }> {
    try {
      const index = this.pinecone.Index(this.indexName)
      const stats = await index.describeIndexStats()
      
      // Note: This is a simplified version. In production, you'd want to
      // maintain separate metadata about the index for better statistics
      return {
        totalPrompts: stats.totalVectorCount || 0,
        totalUsers: 0, // Would need to query and aggregate
        domains: [], // Would need to query and aggregate
        types: [] // Would need to query and aggregate
      }
    } catch (error) {
      console.error('Error getting prompt stats:', error)
      throw error
    }
  }
}

export const pineconeClient = new PineconeClient()