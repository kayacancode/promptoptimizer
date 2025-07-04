import { BaseAgent } from './base-agent'
import { AgentTask, AgentResult, TestResult, SafetyGuard } from '@/types'
import { GitManager } from '../git-manager'

export class QAAgent extends BaseAgent {
  private gitManager: GitManager
  private safetyGuards: SafetyGuard[]

  constructor() {
    super('qa-agent', 'QA Agent', ['qa'])
    this.gitManager = new GitManager()
    this.safetyGuards = this.initializeSafetyGuards()
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    const logs: string[] = []
    
    try {
      this.log(`Starting QA validation for task: ${task.description}`)
      logs.push('Beginning comprehensive QA validation')

      const { changeProposal, testConfig } = task.metadata || {}
      
      if (!changeProposal) {
        throw new Error('No change proposal provided for QA validation')
      }

      // Run pre-commit safety checks
      const safetyResults = await this.runSafetyChecks(changeProposal)
      logs.push(`Safety checks completed: ${safetyResults.passed}/${safetyResults.total} passed`)

      if (safetyResults.criticalFailures > 0) {
        throw new Error(`Critical safety failures detected: ${safetyResults.criticalFailures}`)
      }

      // Run automated tests
      const testResults = await this.runTests(changeProposal, testConfig)
      logs.push(`Test execution completed: ${testResults.passed}/${testResults.total} tests passed`)

      // Run regression tests
      const regressionResults = await this.runRegressionTests(changeProposal)
      logs.push(`Regression tests completed: ${regressionResults.passed}/${regressionResults.total} passed`)

      // Validate code quality
      const qualityResults = await this.validateCodeQuality(changeProposal)
      logs.push(`Code quality validation completed with score: ${qualityResults.score}/100`)

      const overallSuccess = safetyResults.criticalFailures === 0 && 
                           testResults.passed >= testResults.total * 0.8 && 
                           regressionResults.passed >= regressionResults.total * 0.9 &&
                           qualityResults.score >= 70

      const qaReport = {
        safetyResults,
        testResults,
        regressionResults,
        qualityResults,
        overallSuccess,
        recommendation: overallSuccess ? 'APPROVE' : 'REJECT',
        issues: this.collectIssues(safetyResults, testResults, regressionResults, qualityResults)
      }

      const metrics = {
        validationTime: Date.now() - new Date(task.createdAt).getTime(),
        testsRun: testResults.total + regressionResults.total,
        testsPassed: testResults.passed + regressionResults.passed,
        qualityScore: qualityResults.score,
        safetyScore: (safetyResults.passed / safetyResults.total) * 100
      }

      return this.createResult(task.id, overallSuccess, qaReport, undefined, logs, metrics)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.log(`QA validation failed: ${errorMessage}`, 'error')
      return this.createResult(task.id, false, undefined, errorMessage, logs)
    }
  }

  private initializeSafetyGuards(): SafetyGuard[] {
    return [
      {
        id: 'no-secrets',
        name: 'Secret Detection',
        type: 'pre_commit',
        condition: 'content.includes("password") || content.includes("api_key") || content.includes("secret")',
        action: 'block',
        enabled: true
      },
      {
        id: 'max-changes',
        name: 'Change Limit',
        type: 'pre_commit',
        condition: 'changes.length > 10',
        action: 'warn',
        threshold: 10,
        enabled: true
      },
      {
        id: 'test-coverage',
        name: 'Test Coverage',
        type: 'post_commit',
        condition: 'coverage < 80',
        action: 'warn',
        threshold: 80,
        enabled: true
      },
      {
        id: 'performance-regression',
        name: 'Performance Guard',
        type: 'evaluation',
        condition: 'performance_delta < -20',
        action: 'rollback',
        threshold: -20,
        enabled: true
      }
    ]
  }

  private async runSafetyChecks(changeProposal: any): Promise<{
    passed: number
    total: number
    criticalFailures: number
    results: Array<{ guard: string; passed: boolean; message?: string }>
  }> {
    const results = []
    let passed = 0
    let criticalFailures = 0

    for (const guard of this.safetyGuards.filter(g => g.enabled && g.type === 'pre_commit')) {
      const result = await this.evaluateGuard(guard, changeProposal)
      results.push(result)
      
      if (result.passed) {
        passed++
      } else if (guard.action === 'block') {
        criticalFailures++
      }
    }

    return {
      passed,
      total: this.safetyGuards.filter(g => g.enabled && g.type === 'pre_commit').length,
      criticalFailures,
      results
    }
  }

  private async evaluateGuard(guard: SafetyGuard, changeProposal: any): Promise<{
    guard: string
    passed: boolean
    message?: string
  }> {
    try {
      // Simulate guard evaluation
      // In a real implementation, this would execute the guard condition
      switch (guard.id) {
        case 'no-secrets':
          const hasSecrets = changeProposal.changes?.some((change: any) => 
            change.content?.toLowerCase().includes('password') ||
            change.content?.toLowerCase().includes('secret') ||
            change.content?.toLowerCase().includes('api_key')
          )
          return {
            guard: guard.name,
            passed: !hasSecrets,
            message: hasSecrets ? 'Potential secrets detected in changes' : undefined
          }
          
        case 'max-changes':
          const changeCount = changeProposal.changes?.length || 0
          return {
            guard: guard.name,
            passed: changeCount <= (guard.threshold || 10),
            message: changeCount > (guard.threshold || 10) ? 
              `Too many changes: ${changeCount} > ${guard.threshold}` : undefined
          }
          
        default:
          return { guard: guard.name, passed: true }
      }
    } catch (error) {
      return {
        guard: guard.name,
        passed: false,
        message: `Guard evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async runTests(changeProposal: any, testConfig?: any): Promise<{
    passed: number
    total: number
    results: TestResult[]
  }> {
    const results: TestResult[] = []
    
    // Simulate running tests for each changed file
    for (const change of changeProposal.changes || []) {
      const testResult: TestResult = {
        name: `Test for ${change.path}`,
        status: Math.random() > 0.2 ? 'pass' : 'fail', // 80% pass rate
        duration: Math.floor(Math.random() * 1000) + 100,
        coverage: Math.floor(Math.random() * 40) + 60
      }
      
      if (testResult.status === 'fail') {
        testResult.error = `Test failed for ${change.path}: Mock test failure`
      }
      
      results.push(testResult)
    }

    const passed = results.filter(r => r.status === 'pass').length
    
    return {
      passed,
      total: results.length,
      results
    }
  }

  private async runRegressionTests(changeProposal: any): Promise<{
    passed: number
    total: number
    results: TestResult[]
  }> {
    const results: TestResult[] = []
    
    // Simulate regression tests
    const regressionTests = [
      'System integration test',
      'Performance regression test',
      'API compatibility test',
      'Data integrity test'
    ]
    
    for (const testName of regressionTests) {
      const testResult: TestResult = {
        name: testName,
        status: Math.random() > 0.1 ? 'pass' : 'fail', // 90% pass rate
        duration: Math.floor(Math.random() * 2000) + 500
      }
      
      if (testResult.status === 'fail') {
        testResult.error = `Regression test failed: ${testName}`
      }
      
      results.push(testResult)
    }

    const passed = results.filter(r => r.status === 'pass').length
    
    return {
      passed,
      total: results.length,
      results
    }
  }

  private async validateCodeQuality(changeProposal: any): Promise<{
    score: number
    issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>
  }> {
    const issues = []
    let score = 100
    
    // Simulate code quality checks
    for (const change of changeProposal.changes || []) {
      // Check for common quality issues
      if (change.content?.length > 10000) {
        issues.push({
          type: 'file_size',
          message: `File ${change.path} is very large`,
          severity: 'medium' as const
        })
        score -= 10
      }
      
      if (change.content && !change.content.includes('//') && !change.content.includes('/*')) {
        issues.push({
          type: 'documentation',
          message: `File ${change.path} lacks comments`,
          severity: 'low' as const
        })
        score -= 5
      }
      
      // Random quality issues for simulation
      if (Math.random() < 0.3) {
        issues.push({
          type: 'complexity',
          message: `Potential complexity issue in ${change.path}`,
          severity: 'medium' as const
        })
        score -= 5
      }
    }
    
    return { score: Math.max(0, score), issues }
  }

  private collectIssues(safetyResults: any, testResults: any, regressionResults: any, qualityResults: any): string[] {
    const issues = []
    
    // Collect safety issues
    for (const result of safetyResults.results || []) {
      if (!result.passed && result.message) {
        issues.push(`Safety: ${result.message}`)
      }
    }
    
    // Collect test failures
    for (const result of testResults.results || []) {
      if (result.status === 'fail' && result.error) {
        issues.push(`Test: ${result.error}`)
      }
    }
    
    // Collect regression failures
    for (const result of regressionResults.results || []) {
      if (result.status === 'fail' && result.error) {
        issues.push(`Regression: ${result.error}`)
      }
    }
    
    // Collect quality issues
    for (const issue of qualityResults.issues || []) {
      issues.push(`Quality: ${issue.message}`)
    }
    
    return issues
  }
}