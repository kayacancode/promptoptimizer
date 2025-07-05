import { NextRequest, NextResponse } from 'next/server'
import { globalPromptService } from '@/lib/vector-db/global-prompt-service'
import { APIResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { 
      query, 
      userId, 
      options = {} 
    }: {
      query: string
      userId: string
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

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      } as APIResponse, { status: 400 })
    }

    console.log(`Searching global prompts for query: "${query}" by user: ${userId}`)
    
    await globalPromptService.initialize()
    const results = await globalPromptService.searchGlobalPrompts(query, userId, options)
    
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
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const domain = searchParams.get('domain')
    const type = searchParams.get('type')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      } as APIResponse, { status: 400 })
    }

    console.log(`Getting prompt patterns for domain: ${domain}, type: ${type}`)
    
    await globalPromptService.initialize()
    
    let results
    if (domain) {
      results = await globalPromptService.getPromptPatterns(domain, userId, type || undefined)
    } else {
      // Get general statistics
      const stats = await globalPromptService.getGlobalStats()
      return NextResponse.json({
        success: true,
        data: stats,
        message: 'Global prompt statistics retrieved'
      } as APIResponse)
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