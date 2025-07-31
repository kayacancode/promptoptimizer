import { NextRequest, NextResponse } from 'next/server'
import { logMonitor } from '@/lib/monitoring/log-monitor'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

interface ConnectRequest {
  appIdentifier: string
  appName?: string
  description?: string
  webhookUrl?: string
  enableRealTimeProcessing?: boolean
  issueDetectionThresholds?: {
    hallucinationConfidence?: number
    performanceThreshold?: number
    errorRateThreshold?: number
  }
  notificationSettings?: {
    webhookUrl?: string
    emailAlerts?: boolean
    slackWebhook?: string
  }
}

/**
 * Connect a new application for monitoring
 * POST /api/monitoring/connect
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Bearer token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Authenticate user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const connectRequest: ConnectRequest = await request.json()

    // Validate request
    if (!connectRequest.appIdentifier) {
      return NextResponse.json(
        { error: 'appIdentifier is required' },
        { status: 400 }
      )
    }

    // Generate monitoring API key
    const monitoringApiKey = `bm_monitor_${randomBytes(32).toString('hex')}`

    // Create monitoring configuration
    const monitoringConfig = {
      userId: user.id,
      appIdentifier: connectRequest.appIdentifier,
      enableRealTimeProcessing: connectRequest.enableRealTimeProcessing ?? true,
      issueDetectionThresholds: {
        hallucinationConfidence: connectRequest.issueDetectionThresholds?.hallucinationConfidence ?? 0.7,
        performanceThreshold: connectRequest.issueDetectionThresholds?.performanceThreshold ?? 5000, // 5 seconds
        errorRateThreshold: connectRequest.issueDetectionThresholds?.errorRateThreshold ?? 10 // 10%
      },
      notificationSettings: {
        webhookUrl: connectRequest.notificationSettings?.webhookUrl,
        emailAlerts: connectRequest.notificationSettings?.emailAlerts ?? false,
        slackWebhook: connectRequest.notificationSettings?.slackWebhook
      }
    }

    // Add to monitoring system
    await logMonitor.addMonitoringConfig(monitoringConfig)

    // Store connection info in database
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    )

    await serviceSupabase
      .from('monitoring_connections')
      .upsert({
        user_id: user.id,
        app_identifier: connectRequest.appIdentifier,
        app_name: connectRequest.appName || connectRequest.appIdentifier,
        description: connectRequest.description,
        monitoring_api_key: monitoringApiKey,
        config: monitoringConfig,
        status: 'active',
        created_at: new Date().toISOString()
      })

    // Return connection details
    return NextResponse.json({
      success: true,
      message: 'Application connected for monitoring',
      connection: {
        appIdentifier: connectRequest.appIdentifier,
        appName: connectRequest.appName || connectRequest.appIdentifier,
        monitoringApiKey,
        webhookUrl: `${request.nextUrl.origin}/api/monitoring/webhook`,
        status: 'active',
        config: monitoringConfig
      },
      integration: {
        curl: generateCurlExample(request.nextUrl.origin, monitoringApiKey, connectRequest.appIdentifier),
        javascript: generateJavaScriptExample(request.nextUrl.origin, monitoringApiKey, connectRequest.appIdentifier),
        python: generatePythonExample(request.nextUrl.origin, monitoringApiKey, connectRequest.appIdentifier)
      }
    })

  } catch (error) {
    console.error('Monitoring connection error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to connect application for monitoring',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get monitoring connections for a user
 * GET /api/monitoring/connect
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Bearer token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Authenticate user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get user's monitoring connections
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: connections, error } = await serviceSupabase
      .from('monitoring_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch connections: ${error.message}`)
    }

    // Get monitoring stats for each connection
    const connectionsWithStats = await Promise.all(
      (connections || []).map(async (conn) => {
        try {
          const stats = await logMonitor.getMonitoringStats(user.id, conn.app_identifier, 24)
          return {
            ...conn,
            stats,
            monitoring_api_key: `${conn.monitoring_api_key.substring(0, 16)}...` // Truncate for security
          }
        } catch (error) {
          return {
            ...conn,
            stats: null,
            monitoring_api_key: `${conn.monitoring_api_key.substring(0, 16)}...`
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      connections: connectionsWithStats,
      total: connections?.length || 0
    })

  } catch (error) {
    console.error('Error fetching monitoring connections:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch monitoring connections',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Delete a monitoring connection
 * DELETE /api/monitoring/connect
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Bearer token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { appIdentifier } = await request.json()

    if (!appIdentifier) {
      return NextResponse.json(
        { error: 'appIdentifier is required' },
        { status: 400 }
      )
    }
    
    // Authenticate user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Remove from monitoring system
    await logMonitor.removeMonitoringConfig(user.id, appIdentifier)

    // Remove from database
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await serviceSupabase
      .from('monitoring_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('app_identifier', appIdentifier)

    if (error) {
      throw new Error(`Failed to delete connection: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: `Monitoring disconnected for ${appIdentifier}`
    })

  } catch (error) {
    console.error('Error deleting monitoring connection:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to disconnect monitoring',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Generate cURL example for integration
 */
function generateCurlExample(origin: string, apiKey: string, appIdentifier: string): string {
  return `curl -X POST "${origin}/api/monitoring/webhook" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{
    "appIdentifier": "${appIdentifier}",
    "logs": [
      {
        "content": "User query processed successfully",
        "level": "info",
        "context": {
          "model": "gpt-4",
          "responseTime": 1250,
          "tokenCount": 150,
          "requestId": "req_123"
        }
      }
    ]
  }'`
}

/**
 * Generate JavaScript example for integration
 */
function generateJavaScriptExample(origin: string, apiKey: string, appIdentifier: string): string {
  return `// JavaScript/Node.js integration
const sendLogToBestMate = async (logData) => {
  try {
    const response = await fetch('${origin}/api/monitoring/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': '${apiKey}'
      },
      body: JSON.stringify({
        appIdentifier: '${appIdentifier}',
        logs: [{
          content: logData.content,
          level: logData.level || 'info',
          context: {
            model: logData.model,
            responseTime: logData.responseTime,
            tokenCount: logData.tokenCount,
            requestId: logData.requestId
          }
        }]
      })
    });
    
    const result = await response.json();
    console.log('Log sent to BestMate:', result);
  } catch (error) {
    console.error('Failed to send log to BestMate:', error);
  }
};

// Usage example
sendLogToBestMate({
  content: 'AI response generated',
  level: 'info',
  model: 'gpt-4',
  responseTime: 1500,
  tokenCount: 200,
  requestId: 'req_abc123'
});`
}

/**
 * Generate Python example for integration
 */
function generatePythonExample(origin: string, apiKey: string, appIdentifier: string): string {
  return `# Python integration
import requests
import json
from datetime import datetime

def send_log_to_bestmate(log_data):
    """Send log data to BestMate monitoring"""
    try:
        response = requests.post(
            '${origin}/api/monitoring/webhook',
            headers={
                'Content-Type': 'application/json',
                'X-API-Key': '${apiKey}'
            },
            json={
                'appIdentifier': '${appIdentifier}',
                'logs': [{
                    'content': log_data['content'],
                    'level': log_data.get('level', 'info'),
                    'timestamp': datetime.utcnow().isoformat(),
                    'context': {
                        'model': log_data.get('model'),
                        'responseTime': log_data.get('responseTime'),
                        'tokenCount': log_data.get('tokenCount'),
                        'requestId': log_data.get('requestId')
                    }
                }]
            }
        )
        
        result = response.json()
        print(f"Log sent to BestMate: {result}")
        return result
        
    except Exception as e:
        print(f"Failed to send log to BestMate: {e}")
        return None

# Usage example
send_log_to_bestmate({
    'content': 'AI model generated response with potential issues',
    'level': 'warn',
    'model': 'claude-3-opus',
    'responseTime': 2500,
    'tokenCount': 350,
    'requestId': 'req_xyz789'
})`
}