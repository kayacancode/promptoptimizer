export interface ConfigFile {
  name: string
  type: 'yaml' | 'json' | 'typescript' | 'python' | 'javascript' | 'markdown'
  content: string
  size: number
  extractedPrompts?: ExtractedPrompt[]
}

export interface ExtractedPrompt {
  id: string
  content: string
  context: string
  lineNumber: number
  type: 'system_prompt' | 'user_prompt' | 'template' | 'instruction'
}

export interface OptimizationResult {
  originalContent: string
  optimizedContent: string
  explanation: string
  changes: OptimizationChange[]
  confidence: number
  confidenceExplanation?: {
    factors: {
      changeComplexity: number
      claudeResponseQuality: number
      validationResults: number
      structuralImprovements: number
      riskFactors: number
    }
    reasoning: string[]
    riskLevel: 'low' | 'medium' | 'high'
  }
  advancedFeatures?: {
    safetyEvaluation?: SafetyEvaluationResult
    apeResults?: APEResult
    lmsysPatterns?: LMSYSAnalysisResult
  }
  iterationHistory?: OptimizationIteration[]
  timestamp: string
}

export interface SafetyEvaluationResult {
  overall: 'safe' | 'warning' | 'unsafe'
  biasScore: number
  toxicityScore: number
  privacyScore: number
  complianceScore: number
  explainabilityScore: number
  details: {
    biasAnalysis: string[]
    toxicityAnalysis: string[]
    privacyAnalysis: string[]
    complianceAnalysis: string[]
    explainabilityAnalysis: string[]
  }
  complianceFrameworks?: string[]
  recommendations: string[]
}

export interface APEResult {
  iterations: number
  finalPrompt: string
  performanceGain: number
  reinforcementScore?: number
}

export interface LMSYSAnalysisResult {
  patternMatches: number
  averageQuality: number
  suggestedImprovements: string[]
}

export interface OptimizationChange {
  type: 'addition' | 'deletion' | 'modification'
  line: number
  original?: string
  optimized?: string
  reason: string
  description?: string
  reasoning?: string
}

export interface OptimizationIteration {
  iteration: number
  content: string
  evaluation: EvaluationResult
  targetsMet: boolean
  improvement: number
  cost: number
  timestamp: string
  stoppingReason?: 'targets_met' | 'max_iterations' | 'diminishing_returns' | 'budget_exceeded'
}

export interface OptimizationTargets {
  structureCompliance?: number
  hallucinationRate?: number
  responseQuality?: number
  overall?: number
  passRate?: number
  customMetrics?: Record<string, number>
}

export interface OptimizationConfig {
  maxIterations?: number
  budget?: number
  costPerIteration?: number
  targets?: OptimizationTargets
  diminishingReturnsThreshold?: number
  enableContinuousMonitoring?: boolean
}

export interface EvaluationResult {
  beforeScore: EvaluationScore
  afterScore: EvaluationScore
  improvement: number
  testCases: TestCase[]
  metrics: EvaluationMetrics
  timestamp: string
}

export interface EvaluationScore {
  structureCompliance: number
  hallucinationRate: number
  responseQuality: number
  overall: number
}

export interface TestCase {
  input: string
  beforeOutput: string
  afterOutput: string
  passed: boolean
  score: number
  metadata?: {
    domain?: string
    useCase?: string
    source?: 'generated' | 'lmsys' | 'user_provided'
    conversationId?: string
    originalRating?: number
    [key: string]: any
  }
}

export interface EvaluationMetrics {
  totalTests: number
  passedTests: number
  averageImprovement: number
  executionTime: number
}

export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Agent System Types
export interface AgentTask {
  id: string
  type: 'feedback' | 'implementation' | 'qa' | 'evaluation'
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  dependencies?: string[]
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface AgentResult {
  taskId: string
  success: boolean
  data?: any
  error?: string
  logs: string[]
  metrics?: Record<string, number>
  suggestions?: string[]
}

export interface GitOperation {
  type: 'read' | 'write' | 'commit' | 'branch' | 'merge' | 'revert'
  files: string[]
  message?: string
  branch?: string
  changes?: FileChange[]
}

export interface FileChange {
  path: string
  operation: 'create' | 'update' | 'delete'
  content?: string
  oldContent?: string
  reason: string
}

export interface CodebaseMapping {
  files: Record<string, FileMetadata>
  dependencies: DependencyGraph
  testFiles: string[]
  configFiles: string[]
  lastUpdated: string
}

export interface FileMetadata {
  path: string
  type: 'source' | 'test' | 'config' | 'documentation'
  language: string
  size: number
  lastModified: string
  dependencies: string[]
  testCoverage?: number
}

export interface DependencyGraph {
  nodes: Record<string, DependencyNode>
  edges: DependencyEdge[]
}

export interface DependencyNode {
  id: string
  path: string
  type: string
}

export interface DependencyEdge {
  from: string
  to: string
  type: 'imports' | 'calls' | 'extends' | 'implements'
}

export interface SafetyGuard {
  id: string
  name: string
  type: 'pre_commit' | 'post_commit' | 'evaluation' | 'rollback'
  condition: string
  action: 'block' | 'warn' | 'rollback' | 'notify'
  threshold?: number
  enabled: boolean
}

export interface ExecutionEnvironment {
  id: string
  type: 'sandbox' | 'staging' | 'production'
  isolated: boolean
  resources: {
    cpu: number
    memory: number
    timeout: number
  }
  restrictions: string[]
}

export interface EvaluationMetrics {
  totalTests: number
  passedTests: number
  averageImprovement: number
  executionTime: number
  bleuScore?: number
  rougeScore?: number
  factualityScore?: number
  humanEvalScore?: number
}

export interface ChangeProposal {
  id: string
  title: string
  description: string
  changes: FileChange[]
  reasoning: string
  impact: 'low' | 'medium' | 'high'
  testResults?: TestResult[]
  reviewStatus: 'pending' | 'approved' | 'rejected'
  autoApprove?: boolean
}

export interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  duration: number
  error?: string
  coverage?: number
}

// Benchmark Types
export interface BenchmarkConfig {
  name: 'MMLU' | 'HellaSwag' | 'TruthfulQA' | 'HumanEval' | 'MBPP' | 'WritingBench' | 'ConvBench' | 'SafetyBench'
  enabled: boolean
  sampleSize: number
  fullDataset?: boolean
}

export interface BenchmarkQuestion {
  id: string
  question: string
  options?: string[]
  correct_answer: string | number
  category?: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

export interface BenchmarkResponse {
  questionId: string
  question: string
  userResponse: string
  correctAnswer: string
  isCorrect: boolean
  confidence?: number
  responseTime?: number
}

export interface BenchmarkResult {
  benchmark: 'MMLU' | 'HellaSwag' | 'TruthfulQA' | 'HumanEval' | 'MBPP' | 'WritingBench' | 'ConvBench' | 'SafetyBench'
  totalQuestions: number
  correctAnswers: number
  accuracy: number
  responses: BenchmarkResponse[]
  averageConfidence?: number
  averageResponseTime?: number
  categoryBreakdown?: Record<string, { correct: number; total: number; accuracy: number }>
}

export interface BenchmarkEvaluationResult {
  originalPromptResults: BenchmarkResult[]
  optimizedPromptResults: BenchmarkResult[]
  improvements: Record<string, number>
  overallImprovement: number
  timestamp: string
  configuration: BenchmarkConfig[]
}

// Extended Evaluation Metrics with Benchmark Data
export interface ExtendedEvaluationMetrics extends EvaluationMetrics {
  benchmarkResults?: BenchmarkEvaluationResult
  mmluScore?: number
  hellaSwagScore?: number
  truthfulQAScore?: number
} 