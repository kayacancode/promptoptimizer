import { PineconeClient, SimilarPrompt } from './pinecone-client'
import { PromptMigrator } from './prompt-migrator'
import { ExtractedPrompt } from '@/types'

export interface GlobalPromptSearchOptions {
  limit?: number
  minScore?: number
  excludeUserId?: string
  filterByDomain?: string
  filterByType?: string
  filterByComplexity?: 'low' | 'medium' | 'high'
  includeUserPrompts?: boolean
}

export interface PromptInsight {
  id: string
  content: string
  score: number
  userId: string
  metadata: {
    domain?: string
    complexity?: string
    tags?: string[]
    framework?: string
    language?: string
  }
  reason: string
}

export class GlobalPromptService {
  private pineconeClient: PineconeClient
  private promptMigrator: PromptMigrator

  constructor() {
    this.pineconeClient = new PineconeClient()
    this.promptMigrator = new PromptMigrator()
  }

  async initialize(): Promise<void> {
    await this.pineconeClient.initializeIndex()
  }

  async addPromptToGlobalPool(
    userId: string,
    content: string,
    metadata: {
      domain?: string
      language?: string
      framework?: string
      complexity?: 'low' | 'medium' | 'high'
      tags?: string[]
      type?: 'system_prompt' | 'user_prompt' | 'template' | 'instruction'
    }
  ): Promise<string> {
    return await this.promptMigrator.migratePromptContent(content, {
      userId,
      domain: metadata.domain,
      language: metadata.language,
      framework: metadata.framework,
      complexity: metadata.complexity,
      tags: metadata.tags
    }, metadata.type || 'user_prompt')
  }

  async searchGlobalPrompts(
    queryText: string,
    currentUserId: string,
    options: GlobalPromptSearchOptions = {}
  ): Promise<SimilarPrompt[]> {
    const {
      limit = 10,
      minScore = 0.7,
      excludeUserId,
      filterByDomain,
      filterByType,
      filterByComplexity,
      includeUserPrompts = false
    } = options

    const results = await this.pineconeClient.searchSimilarPrompts(
      queryText,
      limit * 2, // Get more results to filter
      {
        excludeUserId: includeUserPrompts ? excludeUserId : currentUserId,
        domain: filterByDomain,
        type: filterByType,
        complexity: filterByComplexity
      }
    )

    // Filter by minimum score and return top results
    return results
      .filter(result => result.score >= minScore)
      .slice(0, limit)
  }

  async getPromptInsights(
    queryText: string,
    currentUserId: string,
    options: GlobalPromptSearchOptions = {}
  ): Promise<PromptInsight[]> {
    const similarPrompts = await this.searchGlobalPrompts(queryText, currentUserId, {
      ...options,
      limit: 5
    })

    return similarPrompts.map(prompt => ({
      id: prompt.id,
      content: prompt.content,
      score: prompt.score,
      userId: prompt.userId,
      metadata: prompt.metadata,
      reason: this.generateInsightReason(prompt, queryText)
    }))
  }

  async getOptimizationExamples(
    queryText: string,
    currentUserId: string,
    domain?: string
  ): Promise<SimilarPrompt[]> {
    return await this.searchGlobalPrompts(queryText, currentUserId, {
      limit: 8,
      minScore: 0.6,
      filterByDomain: domain,
      filterByComplexity: 'medium' // Focus on well-optimized prompts
    })
  }

  async getPromptPatterns(
    domain: string,
    currentUserId: string,
    type?: string
  ): Promise<SimilarPrompt[]> {
    // Search for common patterns in the domain
    const domainQueries = {
      'software-development': 'code review debugging optimization programming',
      'data-analysis': 'data analysis visualization metrics statistics',
      'content-creation': 'write create generate content blog article',
      'customer-support': 'help support customer issue problem resolve',
      'education': 'learn teach explain understand concept tutorial',
      'business': 'business strategy marketing sales revenue growth',
      'research': 'research study investigate analyze findings hypothesis'
    }

    const query = domainQueries[domain as keyof typeof domainQueries] || domain

    return await this.searchGlobalPrompts(query, currentUserId, {
      limit: 10,
      minScore: 0.5,
      filterByDomain: domain,
      filterByType: type
    })
  }

  async getGlobalStats(): Promise<{
    totalPrompts: number
    totalUsers: number
    topDomains: string[]
    topFrameworks: string[]
    averageComplexity: string
  }> {
    const stats = await this.pineconeClient.getPromptStats()
    
    return {
      totalPrompts: stats.totalPrompts,
      totalUsers: stats.totalUsers,
      topDomains: stats.domains.slice(0, 5),
      topFrameworks: [], // Would need to implement aggregation
      averageComplexity: 'medium' // Would need to implement aggregation
    }
  }

  private generateInsightReason(prompt: SimilarPrompt, queryText: string): string {
    const reasons = []
    
    if (prompt.score > 0.9) {
      reasons.push('Very high similarity')
    } else if (prompt.score > 0.8) {
      reasons.push('High similarity')
    } else {
      reasons.push('Similar approach')
    }

    if (prompt.metadata.domain) {
      reasons.push(`from ${prompt.metadata.domain} domain`)
    }

    if (prompt.metadata.complexity === 'high') {
      reasons.push('complex implementation')
    } else if (prompt.metadata.complexity === 'low') {
      reasons.push('simple and clear')
    }

    if (prompt.metadata.tags && prompt.metadata.tags.length > 0) {
      reasons.push(`includes ${prompt.metadata.tags.slice(0, 2).join(', ')}`)
    }

    return reasons.join(', ')
  }

  async bulkImportPrompts(
    prompts: Array<{
      userId: string
      content: string
      metadata: {
        domain?: string
        language?: string
        framework?: string
        complexity?: 'low' | 'medium' | 'high'
        tags?: string[]
        type?: 'system_prompt' | 'user_prompt' | 'template' | 'instruction'
      }
    }>
  ): Promise<void> {
    const vectorPrompts = await Promise.all(
      prompts.map(async (prompt) => {
        const promptId = await this.promptMigrator.migratePromptContent(
          prompt.content,
          {
            userId: prompt.userId,
            domain: prompt.metadata.domain,
            language: prompt.metadata.language,
            framework: prompt.metadata.framework,
            complexity: prompt.metadata.complexity,
            tags: prompt.metadata.tags
          },
          prompt.metadata.type || 'user_prompt'
        )
        return promptId
      })
    )
    
    console.log(`Successfully imported ${vectorPrompts.length} prompts to global pool`)
  }

  async deleteUserPrompts(userId: string): Promise<void> {
    // Note: This would require implementing a user-specific deletion method
    // in PineconeClient that queries by userId and deletes all matches
    console.log(`Deleting all prompts for user: ${userId}`)
    // Implementation would depend on Pinecone's delete by filter capability
  }

  async updatePromptMetadata(
    promptId: string,
    metadata: {
      domain?: string
      language?: string
      framework?: string
      complexity?: 'low' | 'medium' | 'high'
      tags?: string[]
    }
  ): Promise<void> {
    // This would require re-upserting the prompt with updated metadata
    // Implementation depends on the ability to fetch current prompt data
    console.log(`Updating metadata for prompt: ${promptId}`, metadata)
  }
}

export const globalPromptService = new GlobalPromptService()