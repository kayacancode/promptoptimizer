import { DetectedIssue, LogEntry } from '../monitoring/log-monitor'
import { AutoOptimizer } from './auto-optimizer'
import { createClient } from '@supabase/supabase-js'
import { OptimizationResult } from '@/types'

export interface AutonomousConfig {
  userId: string
  appIdentifier: string
  enabled: boolean
  thresholds: {
    issueCount: number // Number of issues before triggering optimization
    errorRate: number // Error rate percentage (0-100)
    criticalIssueThreshold: number // Number of critical issues
    timeWindow: number // Time window in minutes
  }
  optimizationSettings: {
    maxOptimizationsPerHour: number
    requireApproval: boolean // For high-risk changes
    autoApply: boolean // Automatically apply optimizations
    backupEnabled: boolean // Create backups before changes
  }
  riskAssessment: {
    maxRiskLevel: 'low' | 'medium' | 'high' | 'critical'
    approvalRequired: boolean
    rollbackEnabled: boolean
  }
}

export interface OptimizationDecision {
  shouldOptimize: boolean
  reason: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  strategy: 'conservative' | 'moderate' | 'aggressive'
  estimatedImpact: number // 0-1 scale
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresApproval: boolean
  recommendedAction: 'optimize' | 'alert_only' | 'investigate' | 'rollback'
}

export interface OptimizationSession {
  id: string
  userId: string
  appIdentifier: string
  triggeredBy: 'issues' | 'performance' | 'schedule' | 'manual'
  issues: DetectedIssue[]
  decision: OptimizationDecision
  result?: OptimizationResult
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed' | 'rolled_back'
  createdAt: Date
  completedAt?: Date
}

export class AutonomousDecisionEngine {
  private supabase
  private autoOptimizer: AutoOptimizer
  private configs: Map<string, AutonomousConfig> = new Map()

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    )
    this.autoOptimizer = new AutoOptimizer()
  }

  /**
   * Configure autonomous operation for a user/app
   */
  async setAutonomousConfig(config: AutonomousConfig): Promise<void> {
    const key = `${config.userId}-${config.appIdentifier}`
    this.configs.set(key, config)
    
    // Save to database
    await this.supabase
      .from('autonomous_configs')
      .upsert({
        user_id: config.userId,
        app_identifier: config.appIdentifier,
        config: config,
        updated_at: new Date().toISOString()
      })
  }

  /**
   * Get autonomous configuration
   */
  async getAutonomousConfig(userId: string, appIdentifier: string): Promise<AutonomousConfig | null> {
    const key = `${userId}-${appIdentifier}`
    
    // Check cache first
    let config = this.configs.get(key)
    if (config) return config

    // Load from database
    const { data, error } = await this.supabase
      .from('autonomous_configs')
      .select('config')
      .eq('user_id', userId)
      .eq('app_identifier', appIdentifier)
      .single()

    if (error || !data) return null

    config = data.config as AutonomousConfig
    this.configs.set(key, config)
    return config
  }

  /**
   * Evaluate whether optimization should be triggered based on issues
   */
  async evaluateOptimizationNeed(
    userId: string,
    appIdentifier: string,
    issues: DetectedIssue[],
    recentLogs: LogEntry[]
  ): Promise<OptimizationDecision> {
    const config = await this.getAutonomousConfig(userId, appIdentifier)
    
    if (!config || !config.enabled) {
      return {
        shouldOptimize: false,
        reason: 'Autonomous optimization disabled',
        priority: 'low',
        strategy: 'conservative',
        estimatedImpact: 0,
        riskLevel: 'low',
        requiresApproval: false,
        recommendedAction: 'alert_only'
      }
    }

    // Analyze current situation
    const analysis = await this.analyzeCurrentSituation(issues, recentLogs, config)
    
    // Make decision based on analysis
    return this.makeOptimizationDecision(analysis, config)
  }

  /**
   * Execute autonomous optimization if decision warrants it
   */
  async executeAutonomousOptimization(
    userId: string,
    appIdentifier: string,
    decision: OptimizationDecision,
    issues: DetectedIssue[]
  ): Promise<OptimizationSession> {
    // Create optimization session
    const session: OptimizationSession = {
      id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      appIdentifier,
      triggeredBy: 'issues',
      issues,
      decision,
      status: decision.requiresApproval ? 'pending' : 'approved',
      createdAt: new Date()
    }

    // Save session to database
    await this.saveOptimizationSession(session)

    // If approval required, notify user and wait
    if (decision.requiresApproval) {
      await this.requestApproval(session)
      return session
    }

    // Execute optimization immediately
    try {
      const result = await this.performOptimization(session)
      session.result = result
      session.status = 'completed'
      session.completedAt = new Date()
      
      await this.updateOptimizationSession(session)
      
      // Apply changes if auto-apply is enabled
      const config = await this.getAutonomousConfig(userId, appIdentifier)
      if (config?.optimizationSettings.autoApply) {
        await this.applyOptimization(session)
      }

    } catch (error) {
      session.status = 'failed'
      session.completedAt = new Date()
      await this.updateOptimizationSession(session)
      throw error
    }

    return session
  }

  /**
   * Analyze current situation based on issues and logs
   */
  private async analyzeCurrentSituation(
    issues: DetectedIssue[],
    recentLogs: LogEntry[],
    config: AutonomousConfig
  ): Promise<{
    issuesSeverity: 'low' | 'medium' | 'high' | 'critical'
    issueCount: number
    criticalIssueCount: number
    errorRate: number
    performanceTrend: 'improving' | 'stable' | 'degrading'
    patterns: string[]
    urgency: number // 0-1 scale
  }> {
    const criticalIssues = issues.filter(i => i.severity === 'critical')
    const highIssues = issues.filter(i => i.severity === 'high')
    const errorLogs = recentLogs.filter(l => l.logLevel === 'error')
    
    // Calculate error rate
    const errorRate = recentLogs.length > 0 
      ? (errorLogs.length / recentLogs.length) * 100 
      : 0

    // Determine overall severity
    let issuesSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (criticalIssues.length > 0) issuesSeverity = 'critical'
    else if (highIssues.length > 2) issuesSeverity = 'high'
    else if (issues.length > 5) issuesSeverity = 'medium'

    // Analyze performance trend (simplified)
    const performanceTrend = this.analyzePerformanceTrend(recentLogs)

    // Identify patterns
    const patterns = this.identifyIssuePatterns(issues)

    // Calculate urgency
    let urgency = 0
    if (criticalIssues.length > 0) urgency += 0.4
    if (errorRate > config.thresholds.errorRate) urgency += 0.3
    if (issues.length > config.thresholds.issueCount) urgency += 0.2
    if (performanceTrend === 'degrading') urgency += 0.1

    return {
      issuesSeverity,
      issueCount: issues.length,
      criticalIssueCount: criticalIssues.length,
      errorRate,
      performanceTrend,
      patterns,
      urgency: Math.min(1, urgency)
    }
  }

  /**
   * Make optimization decision based on analysis
   */
  private makeOptimizationDecision(
    analysis: any,
    config: AutonomousConfig
  ): OptimizationDecision {
    const {
      issuesSeverity,
      issueCount,
      criticalIssueCount,
      errorRate,
      urgency
    } = analysis

    // Check thresholds
    const exceedsIssueThreshold = issueCount >= config.thresholds.issueCount
    const exceedsErrorRate = errorRate >= config.thresholds.errorRate
    const hasCriticalIssues = criticalIssueCount >= config.thresholds.criticalIssueThreshold

    // Determine if optimization should occur
    const shouldOptimize = exceedsIssueThreshold || exceedsErrorRate || hasCriticalIssues

    if (!shouldOptimize) {
      return {
        shouldOptimize: false,
        reason: `Issues below threshold (${issueCount}/${config.thresholds.issueCount}, error rate: ${errorRate.toFixed(1)}%)`,
        priority: 'low',
        strategy: 'conservative',
        estimatedImpact: 0,
        riskLevel: 'low',
        requiresApproval: false,
        recommendedAction: 'alert_only'
      }
    }

    // Determine priority and strategy
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    let strategy: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium'

    if (issuesSeverity === 'critical' || criticalIssueCount > 0) {
      priority = 'critical'
      strategy = 'aggressive'
      riskLevel = 'high'
    } else if (issuesSeverity === 'high' || errorRate > config.thresholds.errorRate * 2) {
      priority = 'high'
      strategy = 'moderate'
      riskLevel = 'medium'
    }

    // Estimate impact
    const estimatedImpact = Math.min(1, urgency + (criticalIssueCount * 0.2))

    // Determine if approval is required
    const requiresApproval = 
      config.optimizationSettings.requireApproval ||
      riskLevel === 'high' ||
      riskLevel === 'critical' ||
      !config.optimizationSettings.autoApply

    // Determine recommended action
    let recommendedAction: 'optimize' | 'alert_only' | 'investigate' | 'rollback' = 'optimize'
    
    if (riskLevel === 'critical' && !config.optimizationSettings.autoApply) {
      recommendedAction = 'investigate'
    } else if (urgency < 0.3) {
      recommendedAction = 'alert_only'
    }

    const reasons = []
    if (exceedsIssueThreshold) reasons.push(`Issue count: ${issueCount}`)
    if (exceedsErrorRate) reasons.push(`Error rate: ${errorRate.toFixed(1)}%`)
    if (hasCriticalIssues) reasons.push(`Critical issues: ${criticalIssueCount}`)

    return {
      shouldOptimize: true,
      reason: `Thresholds exceeded: ${reasons.join(', ')}`,
      priority,
      strategy,
      estimatedImpact,
      riskLevel,
      requiresApproval,
      recommendedAction
    }
  }

  /**
   * Perform the actual optimization
   */
  private async performOptimization(session: OptimizationSession): Promise<OptimizationResult> {
    // Extract prompt from the logs/issues context
    const prompt = this.extractPromptFromIssues(session.issues)
    
    if (!prompt) {
      throw new Error('Unable to extract prompt for optimization')
    }

    // Get current performance baseline
    const baselineScore = await this.calculateBaselineScore(session.issues)
    
    // Use auto-optimizer with context from issues
    const optimizationContext = this.buildOptimizationContext(session.issues, session.decision)
    
    const result = await this.autoOptimizer.detectAndOptimize(
      prompt,
      baselineScore,
      70 // threshold
    )

    if (!result) {
      throw new Error('Auto-optimization failed to produce results')
    }

    // Enhance result with autonomous context
    return {
      ...result,
      originalContent: prompt,
      explanation: `${result.explanation}\n\nTriggered by autonomous system due to: ${session.decision.reason}`,
      confidence: result.improvement > 0 ? Math.min(0.95, result.improvement / 100 + 0.5) : 0.3,
      advancedFeatures: {
        autonomousContext: {
          triggeredBy: session.triggeredBy,
          issueCount: session.issues.length,
          criticalIssues: session.issues.filter(i => i.severity === 'critical').length,
          strategy: session.decision.strategy,
          riskLevel: session.decision.riskLevel
        }
      }
    }
  }

  /**
   * Apply optimization changes to user's configuration
   */
  private async applyOptimization(session: OptimizationSession): Promise<void> {
    if (!session.result) {
      throw new Error('No optimization result to apply')
    }

    const config = await this.getAutonomousConfig(session.userId, session.appIdentifier)
    if (!config) {
      throw new Error('No autonomous configuration found')
    }

    // Create backup if enabled
    if (config.optimizationSettings.backupEnabled) {
      await this.createConfigBackup(session)
    }

    // Apply the optimization to user's config files
    // This would integrate with the config manager to update actual files
    const { ConfigManager } = await import('../config-manager')
    const configManager = new ConfigManager()
    
    // For now, we'll save the optimization result to the database
    // In a full implementation, this would update actual config files
    await this.supabase
      .from('applied_optimizations')
      .insert({
        user_id: session.userId,
        app_identifier: session.appIdentifier,
        optimization_session_id: session.id,
        original_content: session.result.originalContent,
        optimized_content: session.result.optimizedContent,
        applied_at: new Date().toISOString(),
        backup_created: config.optimizationSettings.backupEnabled
      })
  }

  /**
   * Analyze performance trend from recent logs
   */
  private analyzePerformanceTrend(logs: LogEntry[]): 'improving' | 'stable' | 'degrading' {
    if (logs.length < 10) return 'stable'

    const recentHalf = logs.slice(0, Math.floor(logs.length / 2))
    const olderHalf = logs.slice(Math.floor(logs.length / 2))

    const recentErrors = recentHalf.filter(l => l.logLevel === 'error').length
    const olderErrors = olderHalf.filter(l => l.logLevel === 'error').length

    const recentErrorRate = recentErrors / recentHalf.length
    const olderErrorRate = olderErrors / olderHalf.length

    if (recentErrorRate > olderErrorRate * 1.2) return 'degrading'
    if (recentErrorRate < olderErrorRate * 0.8) return 'improving'
    return 'stable'
  }

  /**
   * Identify common patterns in issues
   */
  private identifyIssuePatterns(issues: DetectedIssue[]): string[] {
    const patterns: string[] = []
    const typeCount: Record<string, number> = {}

    issues.forEach(issue => {
      typeCount[issue.type] = (typeCount[issue.type] || 0) + 1
    })

    Object.entries(typeCount).forEach(([type, count]) => {
      if (count > 2) {
        patterns.push(`Recurring ${type} issues (${count} instances)`)
      }
    })

    return patterns
  }

  /**
   * Extract prompt from issues context
   */
  private extractPromptFromIssues(issues: DetectedIssue[]): string {
    // Try to find prompt from issue metadata
    for (const issue of issues) {
      if (issue.metadata?.prompt) {
        return issue.metadata.prompt
      }
      if (issue.metadata?.evidence && issue.metadata.evidence.length > 50) {
        return issue.metadata.evidence
      }
    }

    // Fallback: create a prompt based on the issues
    return `You are an AI assistant. Please provide accurate, well-structured responses without hallucinations or errors. Avoid the following issues that have been detected: ${issues.map(i => i.description).join(', ')}`
  }

  /**
   * Calculate baseline score from issues
   */
  private calculateBaselineScore(issues: DetectedIssue[]): number {
    if (issues.length === 0) return 85 // Good baseline

    const criticalCount = issues.filter(i => i.severity === 'critical').length
    const highCount = issues.filter(i => i.severity === 'high').length
    const mediumCount = issues.filter(i => i.severity === 'medium').length

    // Start with 100 and subtract points for issues
    let score = 100
    score -= criticalCount * 30
    score -= highCount * 15
    score -= mediumCount * 8
    score -= (issues.length - criticalCount - highCount - mediumCount) * 3

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Build optimization context from issues and decision
   */
  private buildOptimizationContext(issues: DetectedIssue[], decision: OptimizationDecision): string {
    const issueTypes = [...new Set(issues.map(i => i.type))]
    const severityLevels = [...new Set(issues.map(i => i.severity))]

    return `Optimization context:
- Detected issue types: ${issueTypes.join(', ')}
- Severity levels: ${severityLevels.join(', ')}
- Strategy: ${decision.strategy}
- Priority: ${decision.priority}
- Focus on addressing: ${issues.slice(0, 3).map(i => i.description).join('; ')}`
  }

  // Helper methods for database operations
  private async saveOptimizationSession(session: OptimizationSession): Promise<void> {
    await this.supabase
      .from('autonomous_optimization_sessions')
      .insert({
        id: session.id,
        user_id: session.userId,
        app_identifier: session.appIdentifier,
        triggered_by: session.triggeredBy,
        issues: session.issues,
        decision: session.decision,
        status: session.status,
        created_at: session.createdAt.toISOString()
      })
  }

  private async updateOptimizationSession(session: OptimizationSession): Promise<void> {
    await this.supabase
      .from('autonomous_optimization_sessions')
      .update({
        result: session.result,
        status: session.status,
        completed_at: session.completedAt?.toISOString()
      })
      .eq('id', session.id)
  }

  private async requestApproval(session: OptimizationSession): Promise<void> {
    // This would send notifications to the user requesting approval
    // For now, just emit an event
    console.log(`Approval requested for optimization session ${session.id}`)
  }

  private async createConfigBackup(session: OptimizationSession): Promise<void> {
    // Create backup of current configuration
    await this.supabase
      .from('config_backups')
      .insert({
        user_id: session.userId,
        app_identifier: session.appIdentifier,
        optimization_session_id: session.id,
        backup_data: {}, // Would contain actual config data
        created_at: new Date().toISOString()
      })
  }
}