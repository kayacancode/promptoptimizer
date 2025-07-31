import { NextRequest, NextResponse } from 'next/server'
import { logMonitor, LogEntry } from '@/lib/monitoring/log-monitor'
import { createClient } from '@supabase/supabase-js'

interface WebhookPayload {
  apiKey?: string
  appIdentifier: string
  logs: Array<{
    content: string
    level?: 'debug' | 'info' | 'warn' | 'error'
    timestamp?: string
    context?: {
      model?: string
      promptId?: string
      responseTime?: number
      tokenCount?: number
      requestId?: string
      [key: string]: any
    }
  }>
  batchId?: string
}

/**
 * Webhook endpoint for receiving logs from user applications
 * POST /api/monitoring/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json()

    // Validate required fields
    if (!payload.appIdentifier || !payload.logs || !Array.isArray(payload.logs)) {
      return NextResponse.json(
        { error: 'Missing required fields: appIdentifier and logs array' },
        { status: 400 }
      )
    }

    // Authenticate the request
    const authResult = await authenticateWebhookRequest(request, payload)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    const userId = authResult.userId!

    // Validate logs array
    if (payload.logs.length === 0) {
      return NextResponse.json(
        { error: 'Logs array cannot be empty' },
        { status: 400 }
      )
    }

    if (payload.logs.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 logs per request' },
        { status: 400 }
      )
    }

    // Convert payload logs to LogEntry format
    const logEntries: LogEntry[] = payload.logs.map((log, index) => ({
      userId,
      appIdentifier: payload.appIdentifier,
      logContent: log.content,
      logLevel: log.level || 'info',
      timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
      context: log.context || {}
    }))

    // Validate each log entry
    const validationErrors = validateLogEntries(logEntries)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid log entries', 
          details: validationErrors.slice(0, 5) // Limit error details
        },
        { status: 400 }
      )
    }

    // Ingest logs through the monitoring system
    await logMonitor.ingestBatch(logEntries)

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully ingested ${logEntries.length} log entries`,
      batchId: payload.batchId,
      processedCount: logEntries.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Webhook ingestion error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to verify webhook connectivity
 * GET /api/monitoring/webhook
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Authorization header required' },
      { status: 401 }
    )
  }

  const authResult = await authenticateWebhookRequest(request, {})
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    )
  }

  return NextResponse.json({
    status: 'healthy',
    message: 'BestMate monitoring webhook is ready to receive logs',
    timestamp: new Date().toISOString(),
    endpoints: {
      ingestion: '/api/monitoring/webhook',
      connect: '/api/monitoring/connect',
      status: '/api/monitoring/status'
    }
  })
}

/**
 * Authenticate webhook requests using API key or Bearer token
 */
async function authenticateWebhookRequest(
  request: NextRequest, 
  payload: any
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const authHeader = request.headers.get('authorization')
  const apiKey = payload.apiKey || request.headers.get('x-api-key')

  // Try Bearer token authentication first
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (error || !user) {
        return { success: false, error: 'Invalid Bearer token' }
      }
      
      return { success: true, userId: user.id }
    } catch (error) {
      return { success: false, error: 'Bearer token validation failed' }
    }
  }

  // Try API key authentication
  if (apiKey) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
      )

      // Check for BestMate API key
      if (apiKey.startsWith('bm_')) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, email')
          .eq('bestmate_api_key', apiKey)
          .single()
        
        if (error || !userData) {
          return { success: false, error: 'Invalid BestMate API key' }
        }
        
        return { success: true, userId: userData.id }
      }

      // Check for monitoring-specific API key
      const { data: configData, error: configError } = await supabase
        .from('monitoring_configs')
        .select('user_id')
        .eq('config->api_key', apiKey)
        .single()

      if (configError || !configData) {
        return { success: false, error: 'Invalid monitoring API key' }
      }

      return { success: true, userId: configData.user_id }

    } catch (error) {
      return { success: false, error: 'API key validation failed' }
    }
  }

  return { success: false, error: 'No valid authentication provided' }
}

/**
 * Validate log entries for required fields and data types
 */
function validateLogEntries(logEntries: LogEntry[]): string[] {
  const errors: string[] = []

  logEntries.forEach((entry, index) => {
    // Check required fields
    if (!entry.logContent || typeof entry.logContent !== 'string') {
      errors.push(`Log ${index}: content is required and must be a string`)
    }

    if (entry.logContent && entry.logContent.length > 10000) {
      errors.push(`Log ${index}: content exceeds maximum length of 10,000 characters`)
    }

    if (!entry.userId || typeof entry.userId !== 'string') {
      errors.push(`Log ${index}: userId is required`)
    }

    if (!entry.appIdentifier || typeof entry.appIdentifier !== 'string') {
      errors.push(`Log ${index}: appIdentifier is required`)
    }

    // Validate log level
    const validLevels = ['debug', 'info', 'warn', 'error']
    if (entry.logLevel && !validLevels.includes(entry.logLevel)) {
      errors.push(`Log ${index}: invalid log level '${entry.logLevel}'. Must be one of: ${validLevels.join(', ')}`)
    }

    // Validate timestamp
    if (!(entry.timestamp instanceof Date) || isNaN(entry.timestamp.getTime())) {
      errors.push(`Log ${index}: invalid timestamp`)
    }

    // Validate context if provided
    if (entry.context) {
      if (typeof entry.context !== 'object') {
        errors.push(`Log ${index}: context must be an object`)
      } else {
        // Validate specific context fields
        if (entry.context.responseTime && (typeof entry.context.responseTime !== 'number' || entry.context.responseTime < 0)) {
          errors.push(`Log ${index}: responseTime must be a positive number`)
        }

        if (entry.context.tokenCount && (typeof entry.context.tokenCount !== 'number' || entry.context.tokenCount < 0)) {
          errors.push(`Log ${index}: tokenCount must be a positive number`)
        }
      }
    }
  })

  return errors
}

/**
 * OPTIONS handler for CORS support
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  })
}