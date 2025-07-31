import { createClient } from '@supabase/supabase-js'
import { EventEmitter } from 'events'

export interface LogEntry {
  id?: string
  userId: string
  appIdentifier: string
  logContent: string
  timestamp: Date
  logLevel: 'info' | 'warn' | 'error' | 'debug'
  context?: {
    model?: string
    promptId?: string
    responseTime?: number
    tokenCount?: number
    requestId?: string
  }
  detectedIssues?: DetectedIssue[]
}

export interface DetectedIssue {
  type: 'hallucination' | 'structure_error' | 'accuracy_issue' | 'performance_degradation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  confidence: number
  metadata?: Record<string, any>
}

export interface MonitoringConfig {
  userId: string
  appIdentifier: string
  enableRealTimeProcessing: boolean
  issueDetectionThresholds: {
    hallucinationConfidence: number
    performanceThreshold: number
    errorRateThreshold: number
  }
  notificationSettings: {
    webhookUrl?: string
    emailAlerts: boolean
    slackWebhook?: string
  }
}

export class LogMonitor extends EventEmitter {
  private supabase
  private isProcessing: boolean = false
  private configs: Map<string, MonitoringConfig> = new Map()
  private processingQueue: LogEntry[] = []

  constructor() {
    super()
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Start background processing
    this.startBackgroundProcessing()
  }

  /**
   * Add monitoring configuration for a user/app
   */
  async addMonitoringConfig(config: MonitoringConfig): Promise<void> {
    const key = `${config.userId}-${config.appIdentifier}`
    this.configs.set(key, config)
    
    // Save config to database
    await this.supabase
      .from('monitoring_configs')
      .upsert({
        user_id: config.userId,
        app_identifier: config.appIdentifier,
        config: config,
        created_at: new Date().toISOString()
      })
  }

  /**
   * Remove monitoring for a user/app
   */
  async removeMonitoringConfig(userId: string, appIdentifier: string): Promise<void> {
    const key = `${userId}-${appIdentifier}`
    this.configs.delete(key)
    
    await this.supabase
      .from('monitoring_configs')
      .delete()
      .eq('user_id', userId)
      .eq('app_identifier', appIdentifier)
  }

  /**
   * Ingest a log entry for processing
   */
  async ingestLogEntry(logEntry: LogEntry): Promise<void> {
    try {
      // Add to processing queue
      this.processingQueue.push(logEntry)
      
      // Get monitoring config
      const key = `${logEntry.userId}-${logEntry.appIdentifier}`
      const config = this.configs.get(key)
      
      if (!config) {
        console.warn(`No monitoring config found for ${key}`)
        return
      }

      // Process immediately if real-time is enabled
      if (config.enableRealTimeProcessing) {
        await this.processLogEntry(logEntry, config)
      }
      
      // Always save to database for later analysis
      await this.saveLogEntry(logEntry)
      
    } catch (error) {
      console.error('Error ingesting log entry:', error)
      this.emit('error', error)
    }
  }

  /**
   * Process multiple log entries at once
   */
  async ingestBatch(logEntries: LogEntry[]): Promise<void> {
    const promises = logEntries.map(entry => this.ingestLogEntry(entry))
    await Promise.all(promises)
  }

  /**
   * Get recent logs for a user/app
   */
  async getRecentLogs(
    userId: string, 
    appIdentifier: string, 
    limit: number = 100,
    since?: Date
  ): Promise<LogEntry[]> {
    let query = this.supabase
      .from('monitoring_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('app_identifier', appIdentifier)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (since) {
      query = query.gte('created_at', since.toISOString())
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch logs: ${error.message}`)
    }

    return data?.map(this.mapDbToLogEntry) || []
  }

  /**
   * Get logs with issues
   */
  async getLogsWithIssues(userId: string, appIdentifier: string): Promise<LogEntry[]> {
    const { data, error } = await this.supabase
      .from('monitoring_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('app_identifier', appIdentifier)
      .not('detected_issues', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      throw new Error(`Failed to fetch logs with issues: ${error.message}`)
    }

    return data?.map(this.mapDbToLogEntry) || []
  }

  /**
   * Process a single log entry for issues
   */
  private async processLogEntry(logEntry: LogEntry, config: MonitoringConfig): Promise<void> {
    try {
      // Import issue detector dynamically to avoid circular dependencies
      const { IssueDetector } = await import('./issue-detector')
      const detector = new IssueDetector()
      
      // Detect issues in the log entry
      const issues = await detector.detectIssues(logEntry, config.issueDetectionThresholds)
      
      if (issues.length > 0) {
        logEntry.detectedIssues = issues
        
        // Update the database with detected issues
        await this.updateLogWithIssues(logEntry)
        
        // Emit event for real-time notifications
        this.emit('issuesDetected', {
          logEntry,
          issues,
          config
        })
        
        // Send notifications if configured
        await this.sendNotifications(logEntry, issues, config)
      }
      
    } catch (error) {
      console.error('Error processing log entry:', error)
    }
  }

  /**
   * Save log entry to database
   */
  private async saveLogEntry(logEntry: LogEntry): Promise<void> {
    const { error } = await this.supabase
      .from('monitoring_logs')
      .insert({
        user_id: logEntry.userId,
        app_identifier: logEntry.appIdentifier,
        log_content: logEntry.logContent,
        log_level: logEntry.logLevel,
        context: logEntry.context || {},
        detected_issues: logEntry.detectedIssues || [],
        severity: this.calculateMaxSeverity(logEntry.detectedIssues),
        created_at: logEntry.timestamp.toISOString()
      })

    if (error) {
      throw new Error(`Failed to save log entry: ${error.message}`)
    }
  }

  /**
   * Update log entry with detected issues
   */
  private async updateLogWithIssues(logEntry: LogEntry): Promise<void> {
    const { error } = await this.supabase
      .from('monitoring_logs')
      .update({
        detected_issues: logEntry.detectedIssues || [],
        severity: this.calculateMaxSeverity(logEntry.detectedIssues)
      })
      .eq('user_id', logEntry.userId)
      .eq('app_identifier', logEntry.appIdentifier)
      .eq('created_at', logEntry.timestamp.toISOString())

    if (error) {
      console.error('Failed to update log with issues:', error)
    }
  }

  /**
   * Send notifications based on detected issues
   */
  private async sendNotifications(
    logEntry: LogEntry, 
    issues: DetectedIssue[], 
    config: MonitoringConfig
  ): Promise<void> {
    const criticalIssues = issues.filter(issue => issue.severity === 'critical')
    const highIssues = issues.filter(issue => issue.severity === 'high')
    
    // Only notify for high/critical issues
    if (criticalIssues.length === 0 && highIssues.length === 0) {
      return
    }

    try {
      // Webhook notification
      if (config.notificationSettings.webhookUrl) {
        await this.sendWebhookNotification(
          config.notificationSettings.webhookUrl,
          logEntry,
          issues
        )
      }

      // Slack notification
      if (config.notificationSettings.slackWebhook) {
        await this.sendSlackNotification(
          config.notificationSettings.slackWebhook,
          logEntry,
          issues
        )
      }

      // Email notifications would be handled by a separate service
      if (config.notificationSettings.emailAlerts) {
        this.emit('emailAlert', {
          userId: logEntry.userId,
          appIdentifier: logEntry.appIdentifier,
          issues,
          logEntry
        })
      }

    } catch (error) {
      console.error('Error sending notifications:', error)
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    webhookUrl: string,
    logEntry: LogEntry,
    issues: DetectedIssue[]
  ): Promise<void> {
    const payload = {
      timestamp: new Date().toISOString(),
      event: 'issues_detected',
      app: logEntry.appIdentifier,
      issues: issues.map(issue => ({
        type: issue.type,
        severity: issue.severity,
        description: issue.description,
        confidence: issue.confidence
      })),
      logContent: logEntry.logContent.substring(0, 500) // Truncate for webhook
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BestMate-Monitor/1.0'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.statusText}`)
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    slackWebhook: string,
    logEntry: LogEntry,
    issues: DetectedIssue[]
  ): Promise<void> {
    const criticalCount = issues.filter(i => i.severity === 'critical').length
    const highCount = issues.filter(i => i.severity === 'high').length
    
    const color = criticalCount > 0 ? 'danger' : 'warning'
    const emoji = criticalCount > 0 ? '🚨' : '⚠️'
    
    const payload = {
      attachments: [{
        color,
        title: `${emoji} BestMate Issues Detected`,
        fields: [
          {
            title: 'Application',
            value: logEntry.appIdentifier,
            short: true
          },
          {
            title: 'Severity',
            value: `${criticalCount} Critical, ${highCount} High`,
            short: true
          },
          {
            title: 'Issues',
            value: issues.map(i => `• ${i.description}`).join('\n'),
            short: false
          }
        ],
        timestamp: logEntry.timestamp.toISOString()
      }]
    }

    const response = await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`)
    }
  }

  /**
   * Background processing of queued logs
   */
  private startBackgroundProcessing(): void {
    setInterval(async () => {
      if (this.isProcessing || this.processingQueue.length === 0) {
        return
      }

      this.isProcessing = true
      
      try {
        const batch = this.processingQueue.splice(0, 10) // Process 10 at a time
        
        for (const logEntry of batch) {
          const key = `${logEntry.userId}-${logEntry.appIdentifier}`
          const config = this.configs.get(key)
          
          if (config && !config.enableRealTimeProcessing) {
            await this.processLogEntry(logEntry, config)
          }
        }
      } catch (error) {
        console.error('Background processing error:', error)
      } finally {
        this.isProcessing = false
      }
    }, 5000) // Process every 5 seconds
  }

  /**
   * Calculate maximum severity from issues
   */
  private calculateMaxSeverity(issues?: DetectedIssue[]): string {
    if (!issues || issues.length === 0) return 'info'
    
    const severityOrder = ['low', 'medium', 'high', 'critical']
    const maxSeverity = issues.reduce((max, issue) => {
      const currentIndex = severityOrder.indexOf(issue.severity)
      const maxIndex = severityOrder.indexOf(max)
      return currentIndex > maxIndex ? issue.severity : max
    }, 'low')
    
    return maxSeverity
  }

  /**
   * Map database record to LogEntry
   */
  private mapDbToLogEntry(dbRecord: any): LogEntry {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      appIdentifier: dbRecord.app_identifier,
      logContent: dbRecord.log_content,
      timestamp: new Date(dbRecord.created_at),
      logLevel: dbRecord.log_level,
      context: dbRecord.context,
      detectedIssues: dbRecord.detected_issues
    }
  }

  /**
   * Get monitoring statistics
   */
  async getMonitoringStats(userId: string, appIdentifier: string, hours: number = 24): Promise<{
    totalLogs: number
    issueCount: number
    criticalIssues: number
    averageResponseTime?: number
    errorRate: number
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    const { data, error } = await this.supabase
      .from('monitoring_logs')
      .select('detected_issues, context, log_level')
      .eq('user_id', userId)
      .eq('app_identifier', appIdentifier)
      .gte('created_at', since.toISOString())

    if (error) {
      throw new Error(`Failed to fetch stats: ${error.message}`)
    }

    const totalLogs = data?.length || 0
    const logsWithIssues = data?.filter(log => log.detected_issues?.length > 0) || []
    const criticalIssues = logsWithIssues.filter(log => 
      log.detected_issues?.some((issue: DetectedIssue) => issue.severity === 'critical')
    ).length
    
    const errorLogs = data?.filter(log => log.log_level === 'error').length || 0
    const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0
    
    // Calculate average response time if available
    const logsWithResponseTime = data?.filter(log => log.context?.responseTime) || []
    const averageResponseTime = logsWithResponseTime.length > 0 
      ? logsWithResponseTime.reduce((sum, log) => sum + log.context.responseTime, 0) / logsWithResponseTime.length
      : undefined

    return {
      totalLogs,
      issueCount: logsWithIssues.length,
      criticalIssues,
      averageResponseTime,
      errorRate
    }
  }
}

// Singleton instance
export const logMonitor = new LogMonitor()