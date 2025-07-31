import { createClient } from '@supabase/supabase-js'
import { LogEntry } from './log-monitor'

export interface PerformanceMetric {
  id?: string
  userId: string
  appIdentifier: string
  metricType: string
  metricValue: number
  timestamp: Date
  metadata?: Record<string, any>
}

export interface PerformanceSnapshot {
  timestamp: Date
  responseTime: {
    avg: number
    p50: number
    p90: number
    p95: number
    p99: number
  }
  errorRate: number
  throughput: number // requests per minute
  issueRate: number // issues per request
  qualityScore: number // 0-100 overall quality score
  tokenUsage: {
    avg: number
    total: number
  }
}

export interface PerformanceTrend {
  metricType: string
  timeWindow: string
  dataPoints: Array<{
    timestamp: string
    value: number
  }>
  trend: 'improving' | 'stable' | 'degrading'
  changePercentage: number
}

export interface PerformanceAlert {
  id: string
  type: 'threshold_exceeded' | 'anomaly_detected' | 'trend_degradation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metricType: string
  currentValue: number
  threshold?: number
  timestamp: Date
  acknowledged: boolean
}

export class PerformanceTracker {
  private supabase
  private metricsBuffer: Map<string, PerformanceMetric[]> = new Map()
  private flushInterval: NodeJS.Timeout
  private thresholds: Map<string, { warning: number; critical: number }>

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Initialize performance thresholds
    this.thresholds = new Map([
      ['response_time_avg', { warning: 3000, critical: 10000 }], // milliseconds
      ['error_rate', { warning: 5, critical: 15 }], // percentage
      ['issue_rate', { warning: 10, critical: 25 }], // percentage
      ['quality_score', { warning: 70, critical: 50 }], // score below threshold
      ['token_usage_avg', { warning: 1000, critical: 2000 }] // tokens per request
    ])

    // Start background flushing of metrics
    this.flushInterval = setInterval(() => {
      this.flushMetricsBuffer()
    }, 30000) // Flush every 30 seconds
  }

  /**
   * Track performance metrics from log entries
   */
  async trackFromLogEntry(logEntry: LogEntry): Promise<void> {
    const metrics: PerformanceMetric[] = []
    const now = logEntry.timestamp || new Date()

    // Response time metric
    if (logEntry.context?.responseTime) {
      metrics.push({
        userId: logEntry.userId,
        appIdentifier: logEntry.appIdentifier,
        metricType: 'response_time',
        metricValue: logEntry.context.responseTime,
        timestamp: now,
        metadata: {
          model: logEntry.context.model,
          requestId: logEntry.context.requestId
        }
      })
    }

    // Token usage metric
    if (logEntry.context?.tokenCount) {
      metrics.push({
        userId: logEntry.userId,
        appIdentifier: logEntry.appIdentifier,
        metricType: 'token_usage',
        metricValue: logEntry.context.tokenCount,
        timestamp: now,
        metadata: {
          model: logEntry.context.model,
          requestId: logEntry.context.requestId
        }
      })
    }

    // Error tracking
    if (logEntry.logLevel === 'error') {
      metrics.push({
        userId: logEntry.userId,
        appIdentifier: logEntry.appIdentifier,
        metricType: 'error_count',
        metricValue: 1,
        timestamp: now,
        metadata: {
          errorContent: logEntry.logContent.substring(0, 500)
        }
      })
    }

    // Issue tracking
    if (logEntry.detectedIssues && logEntry.detectedIssues.length > 0) {
      metrics.push({
        userId: logEntry.userId,
        appIdentifier: logEntry.appIdentifier,
        metricType: 'issue_count',
        metricValue: logEntry.detectedIssues.length,
        timestamp: now,
        metadata: {
          issueTypes: logEntry.detectedIssues.map(i => i.type),
          severityLevels: logEntry.detectedIssues.map(i => i.severity)
        }
      })

      // Track individual issue types
      logEntry.detectedIssues.forEach(issue => {
        metrics.push({
          userId: logEntry.userId,
          appIdentifier: logEntry.appIdentifier,
          metricType: `issue_${issue.type}`,
          metricValue: 1,
          timestamp: now,
          metadata: {
            severity: issue.severity,
            confidence: issue.confidence,
            description: issue.description
          }
        })
      })
    }

    // Request count (for throughput calculation)
    metrics.push({
      userId: logEntry.userId,
      appIdentifier: logEntry.appIdentifier,
      metricType: 'request_count',
      metricValue: 1,
      timestamp: now,
      metadata: {
        model: logEntry.context?.model,
        level: logEntry.logLevel
      }
    })

    // Buffer metrics for batch insertion
    await this.bufferMetrics(metrics)
  }

  /**
   * Track custom performance metric
   */
  async trackCustomMetric(
    userId: string,
    appIdentifier: string,
    metricType: string,
    value: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const metric: PerformanceMetric = {
      userId,
      appIdentifier,
      metricType,
      metricValue: value,
      timestamp: new Date(),
      metadata
    }

    await this.bufferMetrics([metric])
  }

  /**
   * Get performance snapshot for a time period
   */
  async getPerformanceSnapshot(
    userId: string,
    appIdentifier: string,
    hours: number = 1
  ): Promise<PerformanceSnapshot> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    // Get metrics for the time period
    const { data: metrics, error } = await this.supabase
      .from('performance_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('app_identifier', appIdentifier)
      .gte('timestamp', since.toISOString())

    if (error) {
      throw new Error(`Failed to fetch performance metrics: ${error.message}`)
    }

    const metricsData = metrics || []

    // Calculate response time statistics
    const responseTimes = metricsData
      .filter(m => m.metric_type === 'response_time')
      .map(m => m.metric_value)
      .sort((a, b) => a - b)

    const responseTime = {
      avg: responseTimes.length > 0 ? responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length : 0,
      p50: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.5)] : 0,
      p90: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.9)] : 0,
      p95: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] : 0,
      p99: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] : 0
    }

    // Calculate error rate
    const requestCount = metricsData.filter(m => m.metric_type === 'request_count').length
    const errorCount = metricsData.filter(m => m.metric_type === 'error_count').length
    const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0

    // Calculate throughput (requests per minute)
    const throughput = (requestCount / (hours * 60))

    // Calculate issue rate
    const issueCount = metricsData.filter(m => m.metric_type === 'issue_count').reduce((sum, m) => sum + m.metric_value, 0)
    const issueRate = requestCount > 0 ? (issueCount / requestCount) * 100 : 0

    // Calculate quality score (inverse of error rate and issue rate)
    const qualityScore = Math.max(0, 100 - (errorRate * 2) - (issueRate * 1.5))

    // Calculate token usage
    const tokenUsages = metricsData
      .filter(m => m.metric_type === 'token_usage')
      .map(m => m.metric_value)

    const tokenUsage = {
      avg: tokenUsages.length > 0 ? tokenUsages.reduce((sum, val) => sum + val, 0) / tokenUsages.length : 0,
      total: tokenUsages.reduce((sum, val) => sum + val, 0)
    }

    return {
      timestamp: new Date(),
      responseTime,
      errorRate,
      throughput,
      issueRate,
      qualityScore,
      tokenUsage
    }
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(
    userId: string,
    appIdentifier: string,
    metricType: string,
    hours: number = 24,
    buckets: number = 12
  ): Promise<PerformanceTrend> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    const bucketSize = hours / buckets

    // Get metrics for the time period
    const { data: metrics, error } = await this.supabase
      .from('performance_metrics')
      .select('metric_value, timestamp')
      .eq('user_id', userId)
      .eq('app_identifier', appIdentifier)
      .eq('metric_type', metricType)
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch performance trends: ${error.message}`)
    }

    const metricsData = metrics || []

    // Create time buckets
    const bucketData: Array<{ timestamp: string; values: number[] }> = []
    
    for (let i = 0; i < buckets; i++) {
      const bucketStart = new Date(since.getTime() + i * bucketSize * 60 * 60 * 1000)
      const bucketEnd = new Date(since.getTime() + (i + 1) * bucketSize * 60 * 60 * 1000)
      
      const bucketMetrics = metricsData.filter(m => {
        const timestamp = new Date(m.timestamp)
        return timestamp >= bucketStart && timestamp < bucketEnd
      })

      bucketData.push({
        timestamp: bucketStart.toISOString(),
        values: bucketMetrics.map(m => m.metric_value)
      })
    }

    // Calculate average for each bucket
    const dataPoints = bucketData.map(bucket => ({
      timestamp: bucket.timestamp,
      value: bucket.values.length > 0 
        ? bucket.values.reduce((sum, val) => sum + val, 0) / bucket.values.length 
        : 0
    }))

    // Calculate trend direction
    let trend: 'improving' | 'stable' | 'degrading' = 'stable'
    let changePercentage = 0

    if (dataPoints.length >= 2) {
      const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2))
      const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2))

      const firstAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length

      if (firstAvg > 0) {
        changePercentage = ((secondAvg - firstAvg) / firstAvg) * 100

        // For error rates and response times, lower is better
        const lowerIsBetter = ['error_rate', 'response_time', 'issue_count'].some(type => 
          metricType.includes(type)
        )

        if (lowerIsBetter) {
          if (changePercentage < -10) trend = 'improving'
          else if (changePercentage > 10) trend = 'degrading'
        } else {
          if (changePercentage > 10) trend = 'improving'
          else if (changePercentage < -10) trend = 'degrading'
        }
      }
    }

    return {
      metricType,
      timeWindow: `${hours} hours`,
      dataPoints,
      trend,
      changePercentage: Math.abs(changePercentage)
    }
  }

  /**
   * Check for performance alerts
   */
  async checkPerformanceAlerts(
    userId: string,
    appIdentifier: string
  ): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = []
    const snapshot = await this.getPerformanceSnapshot(userId, appIdentifier, 1)

    // Check response time
    const responseTimeThreshold = this.thresholds.get('response_time_avg')!
    if (snapshot.responseTime.avg > responseTimeThreshold.critical) {
      alerts.push({
        id: `alert_${Date.now()}_response_time`,
        type: 'threshold_exceeded',
        severity: 'critical',
        message: `Average response time (${snapshot.responseTime.avg.toFixed(0)}ms) exceeds critical threshold`,
        metricType: 'response_time_avg',
        currentValue: snapshot.responseTime.avg,
        threshold: responseTimeThreshold.critical,
        timestamp: new Date(),
        acknowledged: false
      })
    } else if (snapshot.responseTime.avg > responseTimeThreshold.warning) {
      alerts.push({
        id: `alert_${Date.now()}_response_time`,
        type: 'threshold_exceeded',
        severity: 'medium',
        message: `Average response time (${snapshot.responseTime.avg.toFixed(0)}ms) exceeds warning threshold`,
        metricType: 'response_time_avg',
        currentValue: snapshot.responseTime.avg,
        threshold: responseTimeThreshold.warning,
        timestamp: new Date(),
        acknowledged: false
      })
    }

    // Check error rate
    const errorRateThreshold = this.thresholds.get('error_rate')!
    if (snapshot.errorRate > errorRateThreshold.critical) {
      alerts.push({
        id: `alert_${Date.now()}_error_rate`,
        type: 'threshold_exceeded',
        severity: 'critical',
        message: `Error rate (${snapshot.errorRate.toFixed(1)}%) exceeds critical threshold`,
        metricType: 'error_rate',
        currentValue: snapshot.errorRate,
        threshold: errorRateThreshold.critical,
        timestamp: new Date(),
        acknowledged: false
      })
    } else if (snapshot.errorRate > errorRateThreshold.warning) {
      alerts.push({
        id: `alert_${Date.now()}_error_rate`,
        type: 'threshold_exceeded',
        severity: 'medium',
        message: `Error rate (${snapshot.errorRate.toFixed(1)}%) exceeds warning threshold`,
        metricType: 'error_rate',
        currentValue: snapshot.errorRate,
        threshold: errorRateThreshold.warning,
        timestamp: new Date(),
        acknowledged: false
      })
    }

    // Check issue rate
    const issueRateThreshold = this.thresholds.get('issue_rate')!
    if (snapshot.issueRate > issueRateThreshold.critical) {
      alerts.push({
        id: `alert_${Date.now()}_issue_rate`,
        type: 'threshold_exceeded',
        severity: 'critical',
        message: `Issue rate (${snapshot.issueRate.toFixed(1)}%) exceeds critical threshold`,
        metricType: 'issue_rate',
        currentValue: snapshot.issueRate,
        threshold: issueRateThreshold.critical,
        timestamp: new Date(),
        acknowledged: false
      })
    }

    // Check quality score
    const qualityThreshold = this.thresholds.get('quality_score')!
    if (snapshot.qualityScore < qualityThreshold.critical) {
      alerts.push({
        id: `alert_${Date.now()}_quality_score`,
        type: 'threshold_exceeded',
        severity: 'critical',
        message: `Quality score (${snapshot.qualityScore.toFixed(1)}) below critical threshold`,
        metricType: 'quality_score',
        currentValue: snapshot.qualityScore,
        threshold: qualityThreshold.critical,
        timestamp: new Date(),
        acknowledged: false
      })
    }

    // Check for trend degradation
    const trends = await Promise.all([
      this.getPerformanceTrends(userId, appIdentifier, 'response_time', 24),
      this.getPerformanceTrends(userId, appIdentifier, 'error_count', 24),
      this.getPerformanceTrends(userId, appIdentifier, 'issue_count', 24)
    ])

    trends.forEach(trend => {
      if (trend.trend === 'degrading' && trend.changePercentage > 25) {
        alerts.push({
          id: `alert_${Date.now()}_trend_${trend.metricType}`,
          type: 'trend_degradation',
          severity: trend.changePercentage > 50 ? 'high' : 'medium',
          message: `${trend.metricType} showing degrading trend (${trend.changePercentage.toFixed(1)}% increase)`,
          metricType: trend.metricType,
          currentValue: trend.changePercentage,
          timestamp: new Date(),
          acknowledged: false
        })
      }
    })

    return alerts
  }

  /**
   * Get comprehensive performance dashboard data
   */
  async getPerformanceDashboard(
    userId: string,
    appIdentifier: string,
    hours: number = 24
  ): Promise<{
    snapshot: PerformanceSnapshot
    trends: PerformanceTrend[]
    alerts: PerformanceAlert[]
    topIssues: Array<{ type: string; count: number; impact: string }>
    recommendations: string[]
  }> {
    const [snapshot, alerts] = await Promise.all([
      this.getPerformanceSnapshot(userId, appIdentifier, 1),
      this.checkPerformanceAlerts(userId, appIdentifier)
    ])

    const trends = await Promise.all([
      this.getPerformanceTrends(userId, appIdentifier, 'response_time', hours),
      this.getPerformanceTrends(userId, appIdentifier, 'error_count', hours),
      this.getPerformanceTrends(userId, appIdentifier, 'issue_count', hours),
      this.getPerformanceTrends(userId, appIdentifier, 'token_usage', hours)
    ])

    // Get top issues
    const topIssues = await this.getTopIssues(userId, appIdentifier, hours)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(snapshot, trends, alerts)

    return {
      snapshot,
      trends,
      alerts,
      topIssues,
      recommendations
    }
  }

  /**
   * Buffer metrics for batch insertion
   */
  private async bufferMetrics(metrics: PerformanceMetric[]): Promise<void> {
    for (const metric of metrics) {
      const key = `${metric.userId}-${metric.appIdentifier}`
      const buffer = this.metricsBuffer.get(key) || []
      buffer.push(metric)
      this.metricsBuffer.set(key, buffer)
    }

    // Check if any buffer is getting too large
    for (const [key, buffer] of this.metricsBuffer.entries()) {
      if (buffer.length >= 50) {
        await this.flushBuffer(key, buffer)
        this.metricsBuffer.set(key, [])
      }
    }
  }

  /**
   * Flush all metrics buffers to database
   */
  private async flushMetricsBuffer(): Promise<void> {
    const promises: Promise<void>[] = []

    for (const [key, buffer] of this.metricsBuffer.entries()) {
      if (buffer.length > 0) {
        promises.push(this.flushBuffer(key, buffer))
        this.metricsBuffer.set(key, [])
      }
    }

    await Promise.all(promises)
  }

  /**
   * Flush a specific buffer to database
   */
  private async flushBuffer(key: string, buffer: PerformanceMetric[]): Promise<void> {
    try {
      const records = buffer.map(metric => ({
        user_id: metric.userId,
        app_identifier: metric.appIdentifier,
        metric_type: metric.metricType,
        metric_value: metric.metricValue,
        timestamp: metric.timestamp.toISOString(),
        metadata: metric.metadata || {}
      }))

      const { error } = await this.supabase
        .from('performance_metrics')
        .insert(records)

      if (error) {
        console.error(`Failed to flush metrics buffer for ${key}:`, error)
        // Re-add to buffer for retry
        const currentBuffer = this.metricsBuffer.get(key) || []
        this.metricsBuffer.set(key, [...currentBuffer, ...buffer])
      }

    } catch (error) {
      console.error(`Error flushing metrics buffer for ${key}:`, error)
    }
  }

  /**
   * Get top issues by frequency and impact
   */
  private async getTopIssues(
    userId: string,
    appIdentifier: string,
    hours: number
  ): Promise<Array<{ type: string; count: number; impact: string }>> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const { data: issueMetrics, error } = await this.supabase
      .from('performance_metrics')
      .select('metric_type, metric_value, metadata')
      .eq('user_id', userId)
      .eq('app_identifier', appIdentifier)
      .like('metric_type', 'issue_%')
      .gte('timestamp', since.toISOString())

    if (error || !issueMetrics) {
      return []
    }

    const issueCounts: Record<string, number> = {}
    
    issueMetrics.forEach(metric => {
      const issueType = metric.metric_type.replace('issue_', '')
      issueCounts[issueType] = (issueCounts[issueType] || 0) + metric.metric_value
    })

    return Object.entries(issueCounts)
      .map(([type, count]) => ({
        type,
        count,
        impact: count > 10 ? 'high' : count > 5 ? 'medium' : 'low'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    snapshot: PerformanceSnapshot,
    trends: PerformanceTrend[],
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = []

    // Response time recommendations
    if (snapshot.responseTime.avg > 5000) {
      recommendations.push('Consider optimizing your prompts for faster response times')
    }
    if (snapshot.responseTime.p95 > snapshot.responseTime.avg * 3) {
      recommendations.push('High response time variance detected - investigate outliers')
    }

    // Error rate recommendations
    if (snapshot.errorRate > 5) {
      recommendations.push('Error rate is elevated - review recent logs for patterns')
    }

    // Issue rate recommendations
    if (snapshot.issueRate > 15) {
      recommendations.push('High issue rate detected - enable autonomous optimization')
    }

    // Quality score recommendations
    if (snapshot.qualityScore < 75) {
      recommendations.push('Quality score below optimal - consider prompt optimization')
    }

    // Token usage recommendations
    if (snapshot.tokenUsage.avg > 1500) {
      recommendations.push('High token usage - optimize prompts for efficiency')
    }

    // Trend-based recommendations
    trends.forEach(trend => {
      if (trend.trend === 'degrading' && trend.changePercentage > 20) {
        recommendations.push(`${trend.metricType} is degrading - investigate recent changes`)
      }
    })

    // Alert-based recommendations
    if (alerts.some(a => a.severity === 'critical')) {
      recommendations.push('Critical alerts detected - immediate attention required')
    }

    return recommendations.slice(0, 5) // Limit to top 5 recommendations
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    // Flush any remaining metrics
    this.flushMetricsBuffer()
  }
}

// Singleton instance
export const performanceTracker = new PerformanceTracker()