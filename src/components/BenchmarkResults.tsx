'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Brain,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Activity
} from 'lucide-react'
import { BenchmarkEvaluationResult, BenchmarkResult } from '@/types'

interface BenchmarkResultsProps {
  results: BenchmarkEvaluationResult
  onRunFullBenchmark?: () => void
}

export function BenchmarkResults({ results, onRunFullBenchmark }: BenchmarkResultsProps) {
  const formatAccuracy = (accuracy: number) => (accuracy * 100).toFixed(1)
  
  const getImprovementIcon = (improvement: number) => {
    if (improvement > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (improvement < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Activity className="h-4 w-4 text-gray-500" />
  }

  const getImprovementColor = (improvement: number) => {
    if (improvement > 5) return 'text-green-600'
    if (improvement > 0) return 'text-green-500'
    if (improvement < -5) return 'text-red-600'
    if (improvement < 0) return 'text-red-500'
    return 'text-gray-500'
  }

  const getBenchmarkIcon = (benchmark: string) => {
    switch (benchmark) {
      case 'MMLU': return <Brain className="h-5 w-5 text-primary" />
      case 'HellaSwag': return <Target className="h-5 w-5 text-primary" />
      case 'TruthfulQA': return <CheckCircle className="h-5 w-5 text-green-600" />
      default: return <BarChart3 className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getBenchmarkDescription = (benchmark: string) => {
    switch (benchmark) {
      case 'MMLU': return 'Massive Multitask Language Understanding - Tests knowledge across 57 academic subjects'
      case 'HellaSwag': return 'Commonsense Natural Language Inference - Tests common sense reasoning'
      case 'TruthfulQA': return 'Measures truthfulness and avoidance of false beliefs and misconceptions'
      default: return 'Benchmark evaluation'
    }
  }

  const renderBenchmarkCard = (result: BenchmarkResult, originalResult?: BenchmarkResult) => {
    const improvement = results.improvements[result.benchmark] || 0
    
    return (
      <Card key={result.benchmark} className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getBenchmarkIcon(result.benchmark)}
              <CardTitle className="text-lg">{result.benchmark}</CardTitle>
              <Badge variant={improvement > 0 ? 'default' : improvement < 0 ? 'destructive' : 'secondary'}>
                {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}%
              </Badge>
            </div>
            <div className="flex items-center space-x-1">
              {getImprovementIcon(improvement)}
              <span className={`text-2xl font-bold ${getImprovementColor(improvement)}`}>
                {formatAccuracy(result.accuracy)}%
              </span>
            </div>
          </div>
          <CardDescription className="text-sm">
            {getBenchmarkDescription(result.benchmark)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Accuracy Comparison */}
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">Before:</span>
                  <span className="font-medium">
                    {originalResult ? `${formatAccuracy(originalResult.accuracy)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-muted-foreground">After:</span>
                  <span className="font-medium">{formatAccuracy(result.accuracy)}%</span>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="text-muted-foreground">
                  {result.correctAnswers} / {result.totalQuestions}
                </div>
                <div className="text-xs text-muted-foreground">
                  {result.averageResponseTime ? `${result.averageResponseTime.toFixed(0)}ms avg` : ''}
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            {result.categoryBreakdown && Object.keys(result.categoryBreakdown).length > 1 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Category Performance</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(result.categoryBreakdown).map(([category, stats]) => (
                    <div key={category} className="text-xs p-2 bg-secondary rounded">
                      <div className="font-medium capitalize">{category.replace('_', ' ')}</div>
                      <div className="text-muted-foreground">
                        {(stats.accuracy * 100).toFixed(1)}% ({stats.correct}/{stats.total})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Benchmark Evaluation Results</CardTitle>
              <Badge variant={results.overallImprovement > 0 ? 'default' : 'destructive'}>
                {results.overallImprovement > 0 ? '+' : ''}{results.overallImprovement.toFixed(1)}% overall
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              {onRunFullBenchmark && (
                <Button variant="outline" size="sm" onClick={onRunFullBenchmark}>
                  Run Full Benchmark
                </Button>
              )}
              <div className="text-xs text-muted-foreground">
                {new Date(results.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
          <CardDescription>
            Comprehensive evaluation across industry-standard LLM benchmarks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {results.optimizedPromptResults.map(result => {
              const improvement = results.improvements[result.benchmark] || 0
              return (
                <div key={result.benchmark} className="text-center p-3 bg-secondary rounded-lg">
                  <div className="flex items-center justify-center space-x-1 mb-2">
                    {getBenchmarkIcon(result.benchmark)}
                    <span className="font-medium">{result.benchmark}</span>
                  </div>
                  <div className={`text-2xl font-bold ${getImprovementColor(improvement)}`}>
                    {formatAccuracy(result.accuracy)}%
                  </div>
                  <div className="flex items-center justify-center space-x-1 text-sm">
                    {getImprovementIcon(improvement)}
                    <span className={getImprovementColor(improvement)}>
                      {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="MMLU">MMLU</TabsTrigger>
          <TabsTrigger value="HellaSwag">HellaSwag</TabsTrigger>
          <TabsTrigger value="TruthfulQA">TruthfulQA</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.optimizedPromptResults.map(result => {
              const originalResult = results.originalPromptResults.find(r => r.benchmark === result.benchmark)
              return renderBenchmarkCard(result, originalResult)
            })}
          </div>
        </TabsContent>

        {results.optimizedPromptResults.map(result => {
          const originalResult = results.originalPromptResults.find(r => r.benchmark === result.benchmark)
          
          return (
            <TabsContent key={result.benchmark} value={result.benchmark}>
              <div className="space-y-4">
                {renderBenchmarkCard(result, originalResult)}
                
                {/* Sample Responses */}
                {result.responses && result.responses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Sample Responses</CardTitle>
                      <CardDescription>
                        Review individual question responses for detailed analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {result.responses.slice(0, 5).map((response, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="text-sm font-medium text-foreground">
                                Question {index + 1}
                              </div>
                              <div className="flex items-center space-x-2">
                                {response.isCorrect ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                )}
                                <Badge variant={response.isCorrect ? 'default' : 'destructive'}>
                                  {response.isCorrect ? 'Correct' : 'Incorrect'}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                              {response.question}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-medium">Response: </span>
                                <span className="text-muted-foreground">{response.userResponse}</span>
                              </div>
                              <div>
                                <span className="font-medium">Correct: </span>
                                <span className="text-muted-foreground">{response.correctAnswer}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
} 