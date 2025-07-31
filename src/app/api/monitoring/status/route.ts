import { NextRequest, NextResponse } from 'next/server'
import { logMonitor } from '@/lib/monitoring/log-monitor'
import { createClient } from '@supabase/supabase-js'

/**
 * Get monitoring status and dashboard data
 * GET /api/monitoring/status?appIdentifier=<app>&hours=<hours>
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
    const { searchParams } = new URL(request.url)
    const appIdentifier = searchParams.get('appIdentifier')
    const hours = parseInt(searchParams.get('hours') || '24')
    
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

    if (!appIdentifier) {
      return NextResponse.json(
        { error: 'appIdentifier parameter is required' },
        { status: 400 }
      )
    }

    // Get monitoring statistics
    const stats = await logMonitor.getMonitoringStats(user.id, appIdentifier, hours)
    
    // Get recent logs with issues
    const recentIssues = await logMonitor.getLogsWithIssues(user.id, appIdentifier)
    
    // Get system health metrics
    const systemHealth = await getSystemHealthMetrics(user.id, appIdentifier, hours)
    
    // Get trend data
    const trends = await getTrendData(user.id, appIdentifier, hours)

    return NextResponse.json({
      success: true,
      appIdentifier,
      timeWindow: `${hours} hours`,
      timestamp: new Date().toISOString(),
      stats,
      recentIssues: recentIssues.slice(0, 10), // Limit to 10 recent issues
      systemHealth,
      trends
    })

  } catch (error) {
    console.error('Error fetching monitoring status:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch monitoring status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get system health metrics
 */
async function getSystemHealthMetrics(
  userId: string, 
  appIdentifier: string, 
  hours: number
): Promise<{
  status: 'healthy' | 'warning' | 'critical'
  uptime: number
  lastActivity: string | null
  issueRate: number
  performanceScore: number
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
  )

  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  // Get recent logs
  const { data: logs, error } = await supabase
    .from('monitoring_logs')
    .select('created_at, log_level, detected_issues, context')
    .eq('user_id', userId)
    .eq('app_identifier', appIdentifier)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch health metrics: ${error.message}`)
  }

  const totalLogs = logs?.length || 0
  const issuesCount = logs?.filter(log => 
    log.detected_issues && Array.isArray(log.detected_issues) && log.detected_issues.length > 0
  ).length || 0

  const errorLogs = logs?.filter(log => log.log_level === 'error').length || 0
  
  // Calculate metrics
  const issueRate = totalLogs > 0 ? (issuesCount / totalLogs) * 100 : 0
  const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0
  
  // Calculate average response time if available
  const responseTimes = logs
    ?.map(log => log.context?.responseTime)
    .filter(time => typeof time === 'number' && time > 0) || []
  
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0

  // Performance score (0-100)
  let performanceScore = 100
  if (errorRate > 5) performanceScore -= 30
  if (issueRate > 10) performanceScore -= 25
  if (avgResponseTime > 5000) performanceScore -= 20
  if (avgResponseTime > 10000) performanceScore -= 25

  performanceScore = Math.max(0, performanceScore)

  // Determine overall status
  let status: 'healthy' | 'warning' | 'critical' = 'healthy'
  if (performanceScore < 50 || errorRate > 10) status = 'critical'
  else if (performanceScore < 75 || errorRate > 5 || issueRate > 15) status = 'warning'

  // Calculate uptime (simplified - based on regular log activity)
  const uptime = totalLogs > 0 ? Math.min(100, (totalLogs / Math.max(1, hours)) * 10) : 0

  const lastActivity = logs && logs.length > 0 ? logs[0].created_at : null

  return {
    status,
    uptime,
    lastActivity,
    issueRate,
    performanceScore
  }
}

/**
 * Get trend data for visualization
 */
async function getTrendData(
  userId: string, 
  appIdentifier: string, 
  hours: number
): Promise<{
  logVolume: Array<{ timestamp: string; count: number }>
  errorRate: Array<{ timestamp: string; rate: number }>
  issueTypes: Record<string, number>
  responseTimePercentiles: {
    p50: number
    p90: number
    p95: number
  }
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
  )

  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  // Get logs for trend analysis
  const { data: logs, error } = await supabase
    .from('monitoring_logs')
    .select('created_at, log_level, detected_issues, context')
    .eq('user_id', userId)
    .eq('app_identifier', appIdentifier)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch trend data: ${error.message}`)
  }

  if (!logs || logs.length === 0) {
    return {
      logVolume: [],
      errorRate: [],
      issueTypes: {},
      responseTimePercentiles: { p50: 0, p90: 0, p95: 0 }
    }
  }

  // Calculate hourly buckets
  const bucketSize = Math.max(1, Math.floor(hours / 12)) // Up to 12 data points
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const timestamp = new Date(since.getTime() + i * bucketSize * 60 * 60 * 1000)
    return {
      timestamp: timestamp.toISOString(),
      logs: [] as any[]
    }
  })

  // Group logs into buckets
  logs.forEach(log => {
    const logTime = new Date(log.created_at)
    const bucketIndex = Math.floor((logTime.getTime() - since.getTime()) / (bucketSize * 60 * 60 * 1000))
    if (bucketIndex >= 0 && bucketIndex < buckets.length) {
      buckets[bucketIndex].logs.push(log)
    }
  })

  // Calculate log volume trend
  const logVolume = buckets.map(bucket => ({
    timestamp: bucket.timestamp,
    count: bucket.logs.length
  }))

  // Calculate error rate trend
  const errorRate = buckets.map(bucket => {
    const total = bucket.logs.length
    const errors = bucket.logs.filter(log => log.log_level === 'error').length
    return {
      timestamp: bucket.timestamp,
      rate: total > 0 ? (errors / total) * 100 : 0
    }
  })

  // Calculate issue types distribution
  const issueTypes: Record<string, number> = {}
  logs.forEach(log => {
    if (log.detected_issues && Array.isArray(log.detected_issues)) {
      log.detected_issues.forEach((issue: any) => {
        if (issue.type) {
          issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1
        }
      })
    }
  })

  // Calculate response time percentiles
  const responseTimes = logs
    .map(log => log.context?.responseTime)
    .filter(time => typeof time === 'number' && time > 0)
    .sort((a, b) => a - b)

  let responseTimePercentiles = { p50: 0, p90: 0, p95: 0 }
  if (responseTimes.length > 0) {
    const p50Index = Math.floor(responseTimes.length * 0.5)
    const p90Index = Math.floor(responseTimes.length * 0.9)
    const p95Index = Math.floor(responseTimes.length * 0.95)
    
    responseTimePercentiles = {
      p50: responseTimes[p50Index] || 0,
      p90: responseTimes[p90Index] || 0,
      p95: responseTimes[p95Index] || 0
    }
  }

  return {
    logVolume,
    errorRate,
    issueTypes,
    responseTimePercentiles
  }
}