import { NextRequest, NextResponse } from 'next/server'
import { globalPromptService } from '@/lib/vector-db/global-prompt-service'
import { APIResponse } from '@/types'
import { authenticateRequest } from '@/lib/auth-middleware'
import { SupabaseAccessKeyManager } from '@/lib/supabase-access-keys'

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request)
    if (!auth.authorized) {
      return NextResponse.json({
        success: false,
        error: auth.error || 'Unauthorized'
      } as APIResponse, { status: 401 })
    }

    const { 
      query, 
      userId, 
      options = {} 
    }: {
      query: string
      userId?: string
      options?: {
        limit?: number
        minScore?: number
        filterByDomain?: string
        filterByType?: string
        filterByComplexity?: 'low' | 'medium' | 'high'
        includeUserPrompts?: boolean
      }
    } = await request.json()

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query text is required'
      } as APIResponse, { status: 400 })
    }

    // Use userId from auth if not provided in request
    const searchUserId = userId || auth.userId
    if (!searchUserId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      } as APIResponse, { status: 400 })
    }

    console.log(`Searching global prompts for query: "${query}" by user: ${searchUserId}`)
    
    await globalPromptService.initialize()
    const results = await globalPromptService.searchGlobalPrompts(query, searchUserId, options)
    
    // Save the search session to Supabase
    if (auth.userId) {
      try {
        const sessionData = {
          action: 'vector-search',
          query,
          results: results.length,
          timestamp: new Date().toISOString(),
          config: {
            options,
            searchUserId
          }
        }
        
        await SupabaseAccessKeyManager.saveSession(auth.userId, sessionData)
      } catch (error) {
        console.error('Failed to save vector search session to Supabase:', error)
        // Continue execution - don't fail the request if saving fails
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        query,
        results,
        total: results.length,
        options
      },
      message: `Found ${results.length} similar prompts`
    } as APIResponse)
  } catch (error) {
    console.error('Global prompt search error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed'
    } as APIResponse, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request)
    if (!auth.authorized) {
      return NextResponse.json({
        success: false,
        error: auth.error || 'Unauthorized'
      } as APIResponse, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const domain = searchParams.get('domain')
    const type = searchParams.get('type')

    // Use userId from auth if not provided in query params
    const searchUserId = userId || auth.userId
    if (!searchUserId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      } as APIResponse, { status: 400 })
    }

    console.log(`Getting prompt patterns for domain: ${domain}, type: ${type}`)
    
    await globalPromptService.initialize()
    
    let results
    if (domain) {
      results = await globalPromptService.getPromptPatterns(domain, searchUserId, type || undefined)
    } else {
      // Get general statistics
      const stats = await globalPromptService.getGlobalStats()
      
      // Save the stats request session to Supabase
      if (auth.userId) {
        try {
          const sessionData = {
            action: 'vector-stats',
            stats,
            timestamp: new Date().toISOString(),
            config: {
              searchUserId
            }
          }
          
          await SupabaseAccessKeyManager.saveSession(auth.userId, sessionData)
        } catch (error) {
          console.error('Failed to save vector stats session to Supabase:', error)
          // Continue execution - don't fail the request if saving fails
        }
      }
      
      return NextResponse.json({
        success: true,
        data: stats,
        message: 'Global prompt statistics retrieved'
      } as APIResponse)
    }

    // Save the patterns request session to Supabase
    if (auth.userId) {
      try {
        const sessionData = {
          action: 'vector-patterns',
          domain,
          type,
          results: results.length,
          timestamp: new Date().toISOString(),
          config: {
            searchUserId
          }
        }
        
        await SupabaseAccessKeyManager.saveSession(auth.userId, sessionData)
      } catch (error) {
        console.error('Failed to save vector patterns session to Supabase:', error)
        // Continue execution - don't fail the request if saving fails
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        domain,
        type,
        patterns: results,
        total: results.length
      },
      message: `Found ${results.length} prompt patterns`
    } as APIResponse)
  } catch (error) {
    console.error('Prompt patterns retrieval error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Pattern retrieval failed'
    } as APIResponse, { status: 500 })
  }
}