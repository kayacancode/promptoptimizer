import { LogEntry, DetectedIssue } from './log-monitor'
import { LLMProvider } from '@/lib/llm/llm-provider'

export interface IssueDetectionThresholds {
  hallucinationConfidence: number
  performanceThreshold: number
  errorRateThreshold: number
}

export interface IssuePattern {
  pattern: RegExp
  type: DetectedIssue['type']
  severity: DetectedIssue['severity']
  description: string
  confidence: number
}

export class IssueDetector {
  private llmProvider: LLMProvider
  private patterns: IssuePattern[]

  constructor() {
    this.llmProvider = new LLMProvider()
    this.patterns = this.initializePatterns()
  }

  /**
   * Detect issues in a log entry
   */
  async detectIssues(
    logEntry: LogEntry,
    thresholds: IssueDetectionThresholds
  ): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = []

    try {
      // 1. Pattern-based detection (fast)
      const patternIssues = this.detectPatternIssues(logEntry)
      issues.push(...patternIssues)

      // 2. Performance issue detection
      const performanceIssues = this.detectPerformanceIssues(logEntry, thresholds)
      issues.push(...performanceIssues)

      // 3. Structure validation issues
      const structureIssues = this.detectStructureIssues(logEntry)
      issues.push(...structureIssues)

      // 4. AI-powered hallucination detection (for high-confidence issues)
      if (this.shouldRunAIDetection(logEntry)) {
        const aiIssues = await this.detectAIIssues(logEntry, thresholds)
        issues.push(...aiIssues)
      }

      // 5. Context-aware accuracy detection
      const accuracyIssues = await this.detectAccuracyIssues(logEntry)
      issues.push(...accuracyIssues)

      // Filter and deduplicate issues
      return this.filterAndRankIssues(issues, thresholds)

    } catch (error) {
      console.error('Error in issue detection:', error)
      return [{
        type: 'accuracy_issue',
        severity: 'low',
        description: 'Issue detection failed - manual review recommended',
        confidence: 0.5,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      }]
    }
  }

  /**
   * Pattern-based issue detection (fast heuristics)
   */
  private detectPatternIssues(logEntry: LogEntry): DetectedIssue[] {
    const issues: DetectedIssue[] = []
    const content = logEntry.logContent.toLowerCase()

    for (const pattern of this.patterns) {
      if (pattern.pattern.test(content)) {
        issues.push({
          type: pattern.type,
          severity: pattern.severity,
          description: pattern.description,
          confidence: pattern.confidence,
          metadata: {
            pattern: pattern.pattern.source,
            matchedText: content.match(pattern.pattern)?.[0]
          }
        })
      }
    }

    return issues
  }

  /**
   * Performance issue detection
   */
  private detectPerformanceIssues(
    logEntry: LogEntry,
    thresholds: IssueDetectionThresholds
  ): DetectedIssue[] {
    const issues: DetectedIssue[] = []
    const context = logEntry.context

    if (!context) return issues

    // Response time issues
    if (context.responseTime && context.responseTime > thresholds.performanceThreshold) {
      const severity = context.responseTime > thresholds.performanceThreshold * 2 
        ? 'high' : 'medium'
      
      issues.push({
        type: 'performance_degradation',
        severity,
        description: `Response time ${context.responseTime}ms exceeds threshold ${thresholds.performanceThreshold}ms`,
        confidence: 0.9,
        metadata: {
          responseTime: context.responseTime,
          threshold: thresholds.performanceThreshold
        }
      })
    }

    // Token count anomalies
    if (context.tokenCount) {
      if (context.tokenCount > 8000) { // Very high token usage
        issues.push({
          type: 'performance_degradation',
          severity: 'medium',
          description: `Unusually high token count: ${context.tokenCount}`,
          confidence: 0.8,
          metadata: { tokenCount: context.tokenCount }
        })
      }
      
      if (context.tokenCount < 10 && logEntry.logContent.length > 100) {
        issues.push({
          type: 'accuracy_issue',
          severity: 'medium',
          description: 'Suspiciously low token count for content length',
          confidence: 0.7,
          metadata: { 
            tokenCount: context.tokenCount,
            contentLength: logEntry.logContent.length
          }
        })
      }
    }

    return issues
  }

  /**
   * Structure validation issues
   */
  private detectStructureIssues(logEntry: LogEntry): DetectedIssue[] {
    const issues: DetectedIssue[] = []
    const content = logEntry.logContent

    // JSON structure issues
    if (content.includes('{') || content.includes('[')) {
      try {
        const jsonMatches = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/g)
        if (jsonMatches) {
          for (const jsonString of jsonMatches) {
            try {
              JSON.parse(jsonString)
            } catch (error) {
              issues.push({
                type: 'structure_error',
                severity: 'high',
                description: 'Invalid JSON structure detected',
                confidence: 0.95,
                metadata: {
                  jsonError: error instanceof Error ? error.message : 'Parse error',
                  malformedJson: jsonString.substring(0, 200)
                }
              })
            }
          }
        }
      } catch (error) {
        // Ignore regex errors
      }
    }

    // Markdown/XML structure issues
    const unclosedTags = this.findUnclosedTags(content)
    if (unclosedTags.length > 0) {
      issues.push({
        type: 'structure_error',
        severity: 'medium',
        description: `Unclosed markup tags detected: ${unclosedTags.join(', ')}`,
        confidence: 0.8,
        metadata: { unclosedTags }
      })
    }

    // Code block issues
    const codeBlockMatches = content.match(/```/g)
    if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
      issues.push({
        type: 'structure_error',
        severity: 'medium',
        description: 'Unclosed code block detected',
        confidence: 0.9,
        metadata: { codeBlockCount: codeBlockMatches.length }
      })
    }

    return issues
  }

  /**
   * AI-powered hallucination detection
   */
  private async detectAIIssues(
    logEntry: LogEntry,
    thresholds: IssueDetectionThresholds
  ): Promise<DetectedIssue[]> {
    try {
      const prompt = `You are an expert at detecting AI hallucinations and inaccuracies. Analyze this AI response for potential issues:

Response: "${logEntry.logContent}"

Check for:
1. Factual contradictions within the response
2. Confident statements about uncertain topics
3. Made-up facts, dates, or references
4. Self-contradictory statements
5. Nonsensical or illogical content

Return JSON format:
{
  "hasIssues": boolean,
  "issues": [
    {
      "type": "hallucination|accuracy_issue",
      "severity": "low|medium|high|critical",
      "description": "specific description",
      "confidence": 0.0-1.0,
      "evidence": "quote from text"
    }
  ]
}`

      const response = await this.llmProvider.generateContent({
        model: 'claude-3-haiku-20240307', // Use faster model for detection
        max_tokens: 1000,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }]
      })

      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0])
        
        if (analysis.hasIssues && Array.isArray(analysis.issues)) {
          return analysis.issues
            .filter((issue: any) => issue.confidence >= thresholds.hallucinationConfidence)
            .map((issue: any) => ({
              type: issue.type as DetectedIssue['type'],
              severity: issue.severity as DetectedIssue['severity'],
              description: issue.description,
              confidence: issue.confidence,
              metadata: {
                evidence: issue.evidence,
                aiDetection: true
              }
            }))
        }
      }

    } catch (error) {
      console.error('AI issue detection failed:', error)
    }

    return []
  }

  /**
   * Context-aware accuracy detection
   */
  private async detectAccuracyIssues(logEntry: LogEntry): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = []
    const content = logEntry.logContent.toLowerCase()

    // Check for confidence markers with suspicious claims
    const confidenceMarkers = [
      'definitely', 'absolutely', 'certainly', 'without a doubt',
      'guaranteed', 'always', 'never', 'impossible', 'proven fact'
    ]

    const suspiciousTopics = [
      'future events', 'stock prices', 'lottery numbers', 'personal information',
      'medical diagnosis', 'legal advice', 'real-time data', 'breaking news'
    ]

    for (const marker of confidenceMarkers) {
      if (content.includes(marker)) {
        for (const topic of suspiciousTopics) {
          if (content.includes(topic)) {
            issues.push({
              type: 'accuracy_issue',
              severity: 'high',
              description: `High confidence statement about uncertain topic: "${marker}" + "${topic}"`,
              confidence: 0.8,
              metadata: {
                confidenceMarker: marker,
                suspiciousTopic: topic
              }
            })
          }
        }
      }
    }

    // Check for made-up URLs or citations
    const urlPattern = /https?:\/\/[^\s]+/g
    const urls = content.match(urlPattern)
    if (urls) {
      for (const url of urls) {
        // Simple heuristic: if URL contains common placeholder patterns
        if (url.includes('example.com') || url.includes('placeholder') || 
            url.includes('dummy') || url.includes('[') || url.includes('INSERT_')) {
          issues.push({
            type: 'hallucination',
            severity: 'medium',
            description: 'Placeholder or example URL provided as real reference',
            confidence: 0.9,
            metadata: { suspiciousUrl: url }
          })
        }
      }
    }

    return issues
  }

  /**
   * Determine if AI detection should run (performance optimization)
   */
  private shouldRunAIDetection(logEntry: LogEntry): boolean {
    const content = logEntry.logContent

    // Run AI detection if:
    // 1. Content is substantial (worth analyzing)
    // 2. Contains factual claims or specific information
    // 3. Not already flagged with high-confidence pattern issues

    if (content.length < 100) return false // Too short
    if (content.length > 5000) return false // Too long (expensive)

    // Check for factual content indicators
    const factualIndicators = [
      /\d{4}/, // Years
      /\$\d+/, // Money amounts  
      /\d+%/, // Percentages
      /according to/, /studies show/, /research indicates/,
      /data shows/, /statistics reveal/, /proven that/
    ]

    return factualIndicators.some(pattern => pattern.test(content))
  }

  /**
   * Filter and rank issues by importance
   */
  private filterAndRankIssues(
    issues: DetectedIssue[],
    thresholds: IssueDetectionThresholds
  ): DetectedIssue[] {
    // Remove duplicates
    const uniqueIssues = issues.filter((issue, index, array) => 
      index === array.findIndex(i => 
        i.type === issue.type && 
        i.description === issue.description
      )
    )

    // Filter by confidence threshold
    const filteredIssues = uniqueIssues.filter(issue => 
      issue.confidence >= thresholds.hallucinationConfidence
    )

    // Sort by severity and confidence
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    
    return filteredIssues.sort((a, b) => {
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
      if (severityDiff !== 0) return severityDiff
      return b.confidence - a.confidence
    })
  }

  /**
   * Find unclosed markup tags
   */
  private findUnclosedTags(content: string): string[] {
    const unclosed: string[] = []
    
    // Check for unclosed XML/HTML-style tags
    const tagMatches = content.match(/<[^>]+>/g)
    if (tagMatches) {
      const tagStack: string[] = []
      
      for (const tag of tagMatches) {
        const cleanTag = tag.replace(/[<>]/g, '').split(' ')[0]
        
        if (tag.startsWith('</')) {
          // Closing tag
          const expectedTag = tagStack.pop()
          if (!expectedTag || expectedTag !== cleanTag.substring(1)) {
            unclosed.push(cleanTag)
          }
        } else if (!tag.endsWith('/>')) {
          // Opening tag
          tagStack.push(cleanTag)
        }
      }
      
      unclosed.push(...tagStack)
    }

    return [...new Set(unclosed)] // Remove duplicates
  }

  /**
   * Initialize pattern matching rules
   */
  private initializePatterns(): IssuePattern[] {
    return [
      // Hallucination patterns
      {
        pattern: /i apologize|i'm sorry|i don't actually|i cannot actually|i shouldn't have/i,
        type: 'hallucination',
        severity: 'medium',
        description: 'AI model expressing uncertainty or correcting itself',
        confidence: 0.7
      },
      {
        pattern: /as an ai|i am an ai|i'm an artificial intelligence/i,
        type: 'hallucination',
        severity: 'low',
        description: 'AI model breaking character or revealing its nature',
        confidence: 0.6
      },
      
      // Error patterns
      {
        pattern: /error|exception|failed|timeout|crashed/i,
        type: 'accuracy_issue',
        severity: 'high',
        description: 'Error indicators in response',
        confidence: 0.9
      },
      {
        pattern: /null|undefined|nan|infinity/i,
        type: 'structure_error',
        severity: 'medium',
        description: 'Programming error values in response',
        confidence: 0.8
      },
      
      // Contradiction patterns
      {
        pattern: /(yes.*no|no.*yes|true.*false|false.*true).{0,50}/i,
        type: 'hallucination',
        severity: 'high',
        description: 'Self-contradictory statements detected',
        confidence: 0.8
      },
      
      // Incomplete response patterns
      {
        pattern: /\.\.\.|to be continued|more details later|will update/i,
        type: 'accuracy_issue',
        severity: 'medium',
        description: 'Incomplete or placeholder response',
        confidence: 0.7
      },
      
      // Suspicious confidence patterns
      {
        pattern: /definitely.*probably|certainly.*maybe|absolutely.*might/i,
        type: 'hallucination',
        severity: 'medium',
        description: 'Contradictory confidence levels',
        confidence: 0.8
      }
    ]
  }

  /**
   * Get issue statistics for a time period
   */
  async getIssueStats(
    userId: string,
    appIdentifier: string,
    hoursBack: number = 24
  ): Promise<{
    totalIssues: number
    issuesByType: Record<string, number>
    issuesBySeverity: Record<string, number>
    averageConfidence: number
    trendDirection: 'improving' | 'degrading' | 'stable'
  }> {
    // This would query the database for historical issue data
    // For now, return mock structure
    return {
      totalIssues: 0,
      issuesByType: {},
      issuesBySeverity: {},
      averageConfidence: 0,
      trendDirection: 'stable'
    }
  }
}