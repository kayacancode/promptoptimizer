import { NextRequest, NextResponse } from 'next/server'
import { vectorDatabaseInitializer } from '@/lib/vector-db/initialization'
import { APIResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { force = false }: { force?: boolean } = await request.json()
    
    console.log('Initializing vector database system...')
    const result = await vectorDatabaseInitializer.initializeSystem()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result,
        message: 'Vector database system initialized successfully'
      } as APIResponse)
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to initialize vector database system'
      } as APIResponse, { status: 500 })
    }
  } catch (error) {
    console.error('Vector database initialization error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Initialization failed'
    } as APIResponse, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log('Checking vector database system health...')
    const health = await vectorDatabaseInitializer.checkSystemHealth()
    
    return NextResponse.json({
      success: true,
      data: health,
      message: 'System health check completed'
    } as APIResponse)
  } catch (error) {
    console.error('System health check error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    } as APIResponse, { status: 500 })
  }
}