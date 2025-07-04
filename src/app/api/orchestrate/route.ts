import { NextRequest, NextResponse } from 'next/server'
import { OptimizationEngine } from '@/lib/optimization'
import { ConfigFile, APIResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const configFile: ConfigFile = await request.json()

    if (!configFile || !configFile.content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid config file provided'
        } as APIResponse,
        { status: 400 }
      )
    }

    // Use the agent orchestration system
    const result = await OptimizationEngine.generateOptimizationSuggestions(configFile)

    return NextResponse.json({
      success: true,
      data: result
    } as APIResponse)

  } catch (error) {
    console.error('Orchestration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Orchestration failed'
      } as APIResponse,
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Start continuous monitoring
    const searchParams = request.nextUrl.searchParams
    const configDirectory = searchParams.get('directory') || 'configs'

    await OptimizationEngine.startContinuousOptimization(configDirectory)

    return NextResponse.json({
      success: true,
      message: `Started continuous optimization monitoring for ${configDirectory}`
    } as APIResponse)

  } catch (error) {
    console.error('Continuous optimization error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start monitoring'
      } as APIResponse,
      { status: 500 }
    )
  }
}