'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Target
} from 'lucide-react'
import { EvaluationResult, ExtendedEvaluationMetrics } from '@/types'
import { BenchmarkResults } from './BenchmarkResults'
import { ProjectContextDisplay } from './ProjectContextDisplay'

interface EvalResultsProps {
  result: EvaluationResult & { metrics?: ExtendedEvaluationMetrics }
  onRunAgain: () => void
  onRunFullBenchmark?: () => void
}

export function EvalResults({ result, onRunAgain, onRunFullBenchmark }: EvalResultsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 0.8) return 'default'
    if (score >= 0.6) return 'secondary'
    return 'destructive'
  }

  const formatScore = (score: number) => (score * 100).toFixed(1)

  const improvementPercentage = ((result.afterScore.overall - result.beforeScore.overall) / result.beforeScore.overall * 100)

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Evaluation Results</CardTitle>
              <Badge variant={improvementPercentage > 0 ? 'default' : 'destructive'}>
                {improvementPercentage > 0 ? '+' : ''}{improvementPercentage.toFixed(1)}% overall
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {result.timestamp}
            </div>
          </div>
          <CardDescription>
            Performance comparison between original and optimized configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-secondary rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {result.metrics.totalTests}
              </div>
              <div className="text-xs text-muted-foreground">Total Tests</div>
            </div>
            <div className="text-center p-3 bg-secondary rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {result.metrics.passedTests}
              </div>
              <div className="text-xs text-muted-foreground">Passed</div>
            </div>
            <div className="text-center p-3 bg-secondary rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {result.metrics.averageImprovement.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Avg Improvement</div>
            </div>
            <div className="text-center p-3 bg-secondary rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {result.metrics.executionTime}ms
              </div>
              <div className="text-xs text-muted-foreground">Execution Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Score Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Structure Compliance */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full" />
                <span className="font-medium">Structure Compliance</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-muted-foreground">
                  {formatScore(result.beforeScore.structureCompliance)}%
                </div>
                <div className="flex items-center space-x-1">
                  {result.afterScore.structureCompliance > result.beforeScore.structureCompliance ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`font-medium ${getScoreColor(result.afterScore.structureCompliance)}`}>
                    {formatScore(result.afterScore.structureCompliance)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Hallucination Rate */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="font-medium">Hallucination Rate</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-muted-foreground">
                  {formatScore(result.beforeScore.hallucinationRate)}%
                </div>
                <div className="flex items-center space-x-1">
                  {result.afterScore.hallucinationRate < result.beforeScore.hallucinationRate ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`font-medium ${getScoreColor(1 - result.afterScore.hallucinationRate)}`}>
                    {formatScore(result.afterScore.hallucinationRate)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Response Quality */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="font-medium">Response Quality</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-muted-foreground">
                  {formatScore(result.beforeScore.responseQuality)}%
                </div>
                <div className="flex items-center space-x-1">
                  {result.afterScore.responseQuality > result.beforeScore.responseQuality ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`font-medium ${getScoreColor(result.afterScore.responseQuality)}`}>
                    {formatScore(result.afterScore.responseQuality)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Overall Score */}
            <div className="flex items-center justify-between p-4 border-2 border-primary/20 bg-primary/5 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-primary rounded-full" />
                <span className="font-bold">Overall Score</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-muted-foreground">
                  {formatScore(result.beforeScore.overall)}%
                </div>
                <div className="flex items-center space-x-1">
                  {result.afterScore.overall > result.beforeScore.overall ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`text-lg font-bold ${getScoreColor(result.afterScore.overall)}`}>
                    {formatScore(result.afterScore.overall)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark Results */}
      {result.metrics?.benchmarkResults && (
        <BenchmarkResults
          results={result.metrics.benchmarkResults}
          onRunFullBenchmark={onRunFullBenchmark}
        />
      )}

      {/* Advanced Metrics */}
      {result.metrics && (result.metrics.bleuScore || result.metrics.mmluScore) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Advanced Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Benchmark Scores */}
              {result.metrics.mmluScore && (
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {(result.metrics.mmluScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">MMLU</div>
                </div>
              )}
              {result.metrics.hellaSwagScore && (
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {(result.metrics.hellaSwagScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">HellaSwag</div>
                </div>
              )}
              {result.metrics.truthfulQAScore && (
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {(result.metrics.truthfulQAScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">TruthfulQA</div>
                </div>
              )}

              {/* Traditional NLP Metrics */}
              {result.metrics.bleuScore && (
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {(result.metrics.bleuScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">BLEU Score</div>
                </div>
              )}
              {result.metrics.rougeScore && (
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {(result.metrics.rougeScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">ROUGE Score</div>
                </div>
              )}
              {result.metrics.factualityScore && (
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {(result.metrics.factualityScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Factuality</div>
                </div>
              )}
              {result.metrics.humanEvalScore && (
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {(result.metrics.humanEvalScore * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Human Eval</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Context Analysis */}
      {result.testCases.some(tc => tc.metadata?.domain) && (
        <ProjectContextDisplay
          context={{
            domain: result.testCases.find(tc => tc.metadata?.domain)?.metadata?.domain || 'general',
            useCase: result.testCases.find(tc => tc.metadata?.useCase)?.metadata?.useCase || 'assistant',
            targetAudience: 'general_users',
            keyTopics: [],
            complexity: 'intermediate'
          }}
          testCasesGenerated={result.testCases.length}
          lmsysExamplesUsed={result.testCases.filter(tc => tc.metadata?.source === 'lmsys').length}
        />
      )}

      {/* Test Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Project-Specific Test Cases</CardTitle>
          <CardDescription>
            Contextual test results based on your project domain and real-world user interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.testCases.map((testCase, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {testCase.passed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">Test {index + 1}</span>
                    <Badge variant={getScoreBadgeVariant(testCase.score)}>
                      {formatScore(testCase.score)}%
                    </Badge>
                    {testCase.metadata?.domain && (
                      <Badge variant="outline" className="text-xs">
                        {testCase.metadata.domain}
                      </Badge>
                    )}
                    {testCase.metadata?.source && (
                      <Badge variant="secondary" className="text-xs">
                        {testCase.metadata.source === 'lmsys' ? 'Real User' : 
                         testCase.metadata.source === 'generated' ? 'Project-Specific' : 
                         testCase.metadata.source}
                      </Badge>
                    )}
                  </div>
                  {testCase.metadata?.originalRating && (
                    <div className="text-xs text-muted-foreground">
                      Original Rating: {testCase.metadata.originalRating}/5
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-foreground bg-secondary p-2 rounded">
                  <strong>Input:</strong> {testCase.input}
                </div>
                
                <Tabs defaultValue="comparison" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="comparison">Comparison</TabsTrigger>
                    <TabsTrigger value="outputs">Full Outputs</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="comparison" className="mt-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-red-50 border border-red-200 p-2 rounded">
                        <div className="font-medium text-red-800 mb-1">Before</div>
                        <div className="text-red-700 line-clamp-2">
                          {testCase.beforeOutput.substring(0, 100)}...
                        </div>
                      </div>
                      <div className="bg-green-50 border border-green-200 p-2 rounded">
                        <div className="font-medium text-green-800 mb-1">After</div>
                        <div className="text-green-700 line-clamp-2">
                          {testCase.afterOutput.substring(0, 100)}...
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="outputs" className="mt-2">
                    <div className="space-y-2 text-sm">
                      <div className="bg-secondary p-2 rounded">
                        <div className="font-medium mb-1">Before:</div>
                        <div className="text-foreground">
                          {testCase.beforeOutput}
                        </div>
                      </div>
                      <div className="bg-secondary p-2 rounded">
                        <div className="font-medium mb-1">After:</div>
                        <div className="text-foreground">
                          {testCase.afterOutput}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center">
        <Button onClick={onRunAgain} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Run Another Optimization
        </Button>
      </div>
    </div>
  )
} 