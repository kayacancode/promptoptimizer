import { NextRequest, NextResponse } from 'next/server'
import { ServerAgentOrchestrator } from '@/lib/server/agent-orchestrator-server'
import { OptimizationResult, ConfigFile, APIResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { optimizationResult, configFile }: { 
      optimizationResult: OptimizationResult
      configFile: ConfigFile 
    } = await request.json()

    if (!optimizationResult || !configFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Optimization result and config file are required'
        } as APIResponse,
        { status: 400 }
      )
    }

    // Create pull request using GitHub integration
    const prResult = await ServerAgentOrchestrator.createPullRequest(optimizationResult, configFile)

    if (prResult.success) {
      return NextResponse.json({
        success: true,
        data: {
          pullRequestUrl: prResult.pullRequestUrl,
          pullRequestNumber: prResult.pullRequestNumber,
          message: 'Pull request created successfully'
        }
      } as APIResponse)
    } else {
      throw new Error(prResult.error || 'Failed to create pull request')
    }

  } catch (error) {
    console.error('PR creation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create pull request'
      } as APIResponse,
      { status: 500 }
    )
  }
}