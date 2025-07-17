import OpenAI from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
})

export interface SemanticScores {
  semanticPreservation: number      // How well optimized prompt preserves original intent
  responseRelevance: number         // How well response matches prompt intent
  semanticCoherence: number         // Internal consistency of response
  qualityImprovement: number        // Overall semantic quality improvement
}

export class SemanticScorer {
  private index: any
  private initPromise: Promise<void>

  constructor() {
    this.initPromise = this.initializePinecone()
  }

  private async initializePinecone() {
    try {
      const indexName = 'prompt-embeddings'
      
      // Check if index exists, create if it doesn't
      const existingIndexes = await pinecone.listIndexes()
      const indexExists = existingIndexes.indexes?.some(idx => idx.name === indexName)
      
      if (!indexExists) {
        console.log(`Creating Pinecone index: ${indexName}`)
        await pinecone.createIndex({
          name: indexName,
          dimension: 1536, // text-embedding-3-small dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        })
        
        // Wait for index to be ready with status checking
        console.log('Waiting for index to be ready...')
        let attempts = 0
        const maxAttempts = 60 // 10 minutes max
        
        while (attempts < maxAttempts) {
          try {
            const testIndex = pinecone.index(indexName)
            await testIndex.describeIndexStats()
            console.log('Index is ready!')
            break
          } catch (error) {
            // Index not ready yet, continue waiting
          }
          
          await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
          attempts++
        }
        
        if (attempts >= maxAttempts) {
          throw new Error('Index creation timed out')
        }
      } else {
        console.log('Using existing Pinecone index')
      }
      
      this.index = pinecone.index(indexName)
      
      // Test the index to make sure it's working
      try {
        await this.index.describeIndexStats()
        console.log('Pinecone index initialized successfully')
      } catch (error) {
        console.error('Index not ready, setting to null:', error)
        this.index = null
      }
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error)
      // Set index to null so we can handle gracefully
      this.index = null
    }
  }

  /**
   * Generate embedding vector for text using OpenAI
   */
  async vectorizeText(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text.substring(0, 8000), // Limit input length
      })
      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw error
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i]
      normA += vectorA[i] * vectorA[i]
      normB += vectorB[i] * vectorB[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  /**
   * Calculate semantic preservation score
   * Measures how well optimized prompt preserves original intent
   */
  async calculateSemanticPreservation(originalPrompt: string, optimizedPrompt: string): Promise<number> {
    try {
      const [originalVector, optimizedVector] = await Promise.all([
        this.vectorizeText(originalPrompt),
        this.vectorizeText(optimizedPrompt)
      ])

      const similarity = this.cosineSimilarity(originalVector, optimizedVector)
      
      // Convert similarity (-1 to 1) to score (0 to 100)
      return Math.max(0, Math.min(100, (similarity + 1) * 50))
    } catch (error) {
      console.error('Error calculating semantic preservation:', error)
      return 0
    }
  }

  /**
   * Calculate response relevance score
   * Measures how well response aligns with prompt intent
   */
  async calculateResponseRelevance(prompt: string, response: string): Promise<number> {
    try {
      const [promptVector, responseVector] = await Promise.all([
        this.vectorizeText(prompt),
        this.vectorizeText(response)
      ])

      const similarity = this.cosineSimilarity(promptVector, responseVector)
      
      // Convert to 0-100 scale
      return Math.max(0, Math.min(100, (similarity + 1) * 50))
    } catch (error) {
      console.error('Error calculating response relevance:', error)
      return 0
    }
  }

  /**
   * Calculate semantic coherence score
   * Measures internal consistency within a response
   */
  async calculateSemanticCoherence(response: string): Promise<number> {
    try {
      // Split response into sentences
      const sentences = response.split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10) // Filter out short fragments

      if (sentences.length < 2) {
        return 100 // Single sentence is perfectly coherent
      }

      // Get vectors for all sentences
      const sentenceVectors = await Promise.all(
        sentences.slice(0, 5).map(sentence => this.vectorizeText(sentence)) // Limit to 5 sentences for performance
      )

      // Calculate pairwise similarities
      let totalSimilarity = 0
      let comparisons = 0

      for (let i = 0; i < sentenceVectors.length; i++) {
        for (let j = i + 1; j < sentenceVectors.length; j++) {
          totalSimilarity += this.cosineSimilarity(sentenceVectors[i], sentenceVectors[j])
          comparisons++
        }
      }

      const averageSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0
      
      // Convert to 0-100 scale
      return Math.max(0, Math.min(100, (averageSimilarity + 1) * 50))
    } catch (error) {
      console.error('Error calculating semantic coherence:', error)
      return 0
    }
  }

  /**
   * Find similar high-quality responses from Pinecone
   */
  async findSimilarQualityResponses(responseVector: number[], topK: number = 5): Promise<any[]> {
    try {
      // Wait for initialization to complete
      await this.initPromise
      
      if (!this.index) {
        console.warn('Pinecone index not initialized, returning empty results')
        return []
      }

      const queryResponse = await this.index.query({
        vector: responseVector,
        topK,
        includeMetadata: true,
        filter: { quality: { $gte: 0.8 } } // Only high-quality responses
      })

      return queryResponse.matches || []
    } catch (error) {
      console.error('Error querying Pinecone:', error)
      // Return empty array to gracefully handle missing index
      return []
    }
  }

  /**
   * Calculate overall quality improvement using vector analysis
   */
  async calculateQualityImprovement(
    originalPrompt: string,
    optimizedPrompt: string,
    originalResponse: string,
    optimizedResponse: string
  ): Promise<number> {
    try {
      // Get vectors for all texts
      const [originalRespVector, optimizedRespVector] = await Promise.all([
        this.vectorizeText(originalResponse),
        this.vectorizeText(optimizedResponse)
      ])

      // Find similar high-quality responses for comparison
      const [originalSimilar, optimizedSimilar] = await Promise.all([
        this.findSimilarQualityResponses(originalRespVector),
        this.findSimilarQualityResponses(optimizedRespVector)
      ])

      // Calculate average similarity to high-quality responses
      const originalQualityScore = originalSimilar.length > 0
        ? originalSimilar.reduce((sum, match) => sum + match.score, 0) / originalSimilar.length
        : 0

      const optimizedQualityScore = optimizedSimilar.length > 0
        ? optimizedSimilar.reduce((sum, match) => sum + match.score, 0) / optimizedSimilar.length
        : 0

      // Calculate improvement percentage
      if (originalQualityScore === 0) return 0
      
      const improvement = ((optimizedQualityScore - originalQualityScore) / originalQualityScore) * 100
      return Math.max(-100, Math.min(300, improvement)) // Cap between -100% and 300%
    } catch (error) {
      console.error('Error calculating quality improvement:', error)
      return 0
    }
  }

  /**
   * Calculate all semantic scores for evaluation
   */
  async calculateSemanticScores(
    originalPrompt: string,
    optimizedPrompt: string,
    originalResponse: string,
    optimizedResponse: string
  ): Promise<SemanticScores> {
    try {
      // Wait for initialization to complete
      await this.initPromise
      const [semanticPreservation, originalRelevance, optimizedRelevance, originalCoherence, optimizedCoherence] = await Promise.all([
        this.calculateSemanticPreservation(originalPrompt, optimizedPrompt),
        this.calculateResponseRelevance(originalPrompt, originalResponse),
        this.calculateResponseRelevance(optimizedPrompt, optimizedResponse),
        this.calculateSemanticCoherence(originalResponse),
        this.calculateSemanticCoherence(optimizedResponse)
      ])

      // Calculate improvements
      const relevanceImprovement = optimizedRelevance - originalRelevance
      const coherenceImprovement = optimizedCoherence - originalCoherence

      // Calculate quality improvement (simplified version if Pinecone fails)
      let qualityImprovement = 0
      try {
        qualityImprovement = await this.calculateQualityImprovement(
          originalPrompt, optimizedPrompt, originalResponse, optimizedResponse
        )
      } catch (error) {
        // Fallback: average of other improvements
        qualityImprovement = (relevanceImprovement + coherenceImprovement) / 2
      }

      return {
        semanticPreservation,
        responseRelevance: relevanceImprovement,
        semanticCoherence: coherenceImprovement,
        qualityImprovement
      }
    } catch (error) {
      console.error('Error calculating semantic scores:', error)
      return {
        semanticPreservation: 0,
        responseRelevance: 0,
        semanticCoherence: 0,
        qualityImprovement: 0
      }
    }
  }

  /**
   * Store response vector in Pinecone for future quality comparisons
   */
  async storeResponseVector(response: string, metadata: any): Promise<void> {
    try {
      if (!this.index) return

      const vector = await this.vectorizeText(response)
      const id = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      await this.index.upsert([{
        id,
        values: vector,
        metadata: {
          ...metadata,
          text: response.substring(0, 1000), // Store truncated text
          timestamp: new Date().toISOString()
        }
      }])
    } catch (error) {
      console.error('Error storing response vector:', error)
    }
  }
}

export const semanticScorer = new SemanticScorer()