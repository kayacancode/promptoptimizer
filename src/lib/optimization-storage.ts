import { createSupabaseBrowserClient } from '../../utils/supabase/client'

export interface OptimizationSession {
  id?: string
  user_id: string
  session_name?: string
  original_prompt: string
  requirements_text?: string
  evaluation_input?: string
  optimized_prompt: string
  explanation: string
  overall_improvement_percentage?: number
  settings_used: {
    modelConfigs: Array<{
      name: string
      enabled: boolean
      temperature?: number
      maxTokens?: number
    }>
    sampleSize: number
    minScore: number
    codeContextEnabled: boolean
  }
  is_completed: boolean
  completion_timestamp?: string
  created_at?: string
  updated_at?: string
}

export interface OptimizationResult {
  id?: string
  session_id: string
  model_name: string
  hallucination_rate?: number
  structure_score?: number
  consistency_score?: number
  improvement_percentage?: number
  original_response?: string
  optimized_response?: string
  created_at?: string
}

export interface OptimizationSessionWithResults extends OptimizationSession {
  optimization_results?: OptimizationResult[]
}

export class OptimizationStorage {
  private supabase

  constructor() {
    this.supabase = createSupabaseBrowserClient()
  }

  // Create a new optimization session
  async createOptimizationSession(sessionData: Omit<OptimizationSession, 'id' | 'created_at' | 'updated_at'>): Promise<OptimizationSession | null> {
    try {
      const response = await fetch('/api/optimization-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: sessionData.user_id,
          session_name: sessionData.session_name,
          original_prompt: sessionData.original_prompt,
          requirements_text: sessionData.requirements_text,
          evaluation_input: sessionData.evaluation_input,
          optimized_prompt: sessionData.optimized_prompt,
          explanation: sessionData.explanation,
          overall_improvement_percentage: sessionData.overall_improvement_percentage,
          settings_used: sessionData.settings_used,
          is_completed: sessionData.is_completed,
          completion_timestamp: sessionData.completion_timestamp
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error creating optimization session:', errorData)
        return null
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error creating optimization session:', error)
      return null
    }
  }

  // Update an existing optimization session
  async updateOptimizationSession(sessionId: string, updates: Partial<OptimizationSession>): Promise<OptimizationSession | null> {
    try {
      const response = await fetch(`/api/optimization-sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_name: updates.session_name,
          requirements_text: updates.requirements_text,
          evaluation_input: updates.evaluation_input,
          optimized_prompt: updates.optimized_prompt,
          explanation: updates.explanation,
          overall_improvement_percentage: updates.overall_improvement_percentage,
          settings_used: updates.settings_used,
          is_completed: updates.is_completed,
          completion_timestamp: updates.completion_timestamp
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error updating optimization session:', errorData)
        return null
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error updating optimization session:', error)
      return null
    }
  }

  // Get optimization sessions for a user
  async getOptimizationSessions(userId: string, limit: number = 50): Promise<OptimizationSessionWithResults[]> {
    try {
      const response = await fetch(`/api/optimization-sessions?limit=${limit}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error fetching optimization sessions:', errorData)
        return []
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error fetching optimization sessions:', error)
      return []
    }
  }

  // Get a specific optimization session
  async getOptimizationSession(sessionId: string): Promise<OptimizationSessionWithResults | null> {
    try {
      console.log('Attempting to fetch session with ID:', sessionId)
      
      // Use Supabase directly instead of fetch to avoid server-side URL issues
      const { data, error } = await this.supabase
        .from('optimization_sessions')
        .select(`
          *,
          optimization_results (*)
        `)
        .eq('id', sessionId)
        .single()

      console.log('Supabase query result:', { data, error })

      if (error) {
        console.error('Error fetching optimization session:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching optimization session:', error)
      return null
    }
  }

  // Save optimization results for a session
  async saveOptimizationResults(sessionId: string, results: Omit<OptimizationResult, 'id' | 'session_id' | 'created_at'>[]): Promise<OptimizationResult[]> {
    try {
      const response = await fetch(`/api/optimization-sessions/${sessionId}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ results })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error saving optimization results:', errorData)
        return []
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error saving optimization results:', error)
      return []
    }
  }

  // Delete an optimization session
  async deleteOptimizationSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/optimization-sessions/${sessionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error deleting optimization session:', errorData)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting optimization session:', error)
      return false
    }
  }

  // Get user's optimization statistics
  async getUserOptimizationStats(userId: string): Promise<{
    totalSessions: number
    completedSessions: number
    averageImprovement: number
    totalOptimizations: number
  }> {
    try {
      const response = await fetch('/api/optimization-sessions/stats')
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error fetching optimization stats:', errorData)
        return {
          totalSessions: 0,
          completedSessions: 0,
          averageImprovement: 0,
          totalOptimizations: 0
        }
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Error fetching optimization stats:', error)
      return {
        totalSessions: 0,
        completedSessions: 0,
        averageImprovement: 0,
        totalOptimizations: 0
      }
    }
  }

  // Search optimization sessions
  async searchOptimizationSessions(
    userId: string, 
    query: string, 
    limit: number = 20
  ): Promise<OptimizationSessionWithResults[]> {
    try {
      const response = await fetch(`/api/optimization-sessions?search=${encodeURIComponent(query)}&limit=${limit}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error searching optimization sessions:', errorData)
        return []
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error searching optimization sessions:', error)
      return []
    }
  }

  // Export optimization session data
  async exportOptimizationSession(sessionId: string): Promise<string | null> {
    try {
      const session = await this.getOptimizationSession(sessionId)
      if (!session) return null

      const exportData = {
        session_info: {
          created_at: session.created_at,
          session_name: session.session_name,
          overall_improvement: session.overall_improvement_percentage
        },
        original_prompt: session.original_prompt,
        requirements: session.requirements_text,
        optimized_prompt: session.optimized_prompt,
        explanation: session.explanation,
        settings_used: session.settings_used,
        model_results: session.optimization_results || []
      }

      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error('Error exporting optimization session:', error)
      return null
    }
  }

  // Generate downloadable text file content
  async generateDownloadContent(sessionId: string): Promise<string | null> {
    try {
      const session = await this.getOptimizationSession(sessionId)
      if (!session) return null

      const content = `
# Prompt Optimization Session

**Created:** ${new Date(session.created_at!).toLocaleDateString()}
${session.session_name ? `**Session Name:** ${session.session_name}` : ''}
${session.overall_improvement_percentage ? `**Overall Improvement:** +${session.overall_improvement_percentage.toFixed(1)}%` : ''}

## Original Prompt
${session.original_prompt}

## Requirements
${session.requirements_text || 'No specific requirements provided'}

## Optimized Prompt
${session.optimized_prompt}

## Explanation
${session.explanation}

## Settings Used
- Models: ${session.settings_used.modelConfigs.filter(m => m.enabled).map(m => m.name).join(', ')}
- Sample Size: ${session.settings_used.sampleSize}
- Minimum Score: ${session.settings_used.minScore}
- Code Context: ${session.settings_used.codeContextEnabled ? 'Enabled' : 'Disabled'}

${session.optimization_results && session.optimization_results.length > 0 ? `
## Model Results
${session.optimization_results.map(result => `
### ${result.model_name}
- Improvement: ${result.improvement_percentage ? `+${result.improvement_percentage.toFixed(1)}%` : 'N/A'}
- Hallucination Rate: ${result.hallucination_rate ? `${(result.hallucination_rate * 100).toFixed(1)}%` : 'N/A'}
- Structure Score: ${result.structure_score ? `${(result.structure_score * 100).toFixed(1)}%` : 'N/A'}
- Consistency Score: ${result.consistency_score ? `${(result.consistency_score * 100).toFixed(1)}%` : 'N/A'}
`).join('')}` : ''}

---
Generated by bestmate - AI Prompt Optimization Tool
      `.trim()

      return content
    } catch (error) {
      console.error('Error generating download content:', error)
      return null
    }
  }
}

// Export a singleton instance
export const optimizationStorage = new OptimizationStorage()