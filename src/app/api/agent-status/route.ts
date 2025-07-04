import { NextRequest, NextResponse } from 'next/server'
import { ServerAgentOrchestrator } from '@/lib/server/agent-orchestrator-server'

export async function GET() {
  try {
    const agentStatus = ServerAgentOrchestrator.getAgentStatus()
    const currentTask = ServerAgentOrchestrator.getCurrentTask()
    const taskQueue = ServerAgentOrchestrator.getTaskQueue()

    return NextResponse.json({
      success: true,
      data: {
        agents: agentStatus,
        currentTask,
        taskQueue,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Agent status error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}