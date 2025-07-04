'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Upload, 
  FileText, 
  BarChart3, 
  Settings,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react'
import { TestCase, EvaluationResult, BenchmarkConfig, ConfigFile, OptimizationResult } from '@/types'
import { TestCaseUploader } from './TestCaseUploader'
import { BenchmarkSelector } from './BenchmarkSelector'
import { EvalResults } from './EvalResults'

interface EvaluationDashboardProps {
  originalConfig?: ConfigFile | null
  optimizationResult?: OptimizationResult | null
}

export function EvaluationDashboard({ originalConfig, optimizationResult }: EvaluationDashboardProps) {
  const [userTestCases, setUserTestCases] = useState<TestCase[]>([])
  const [benchmarkConfigs, setBenchmarkConfigs] = useState<BenchmarkConfig[]>([
    { name: 'MMLU', enabled: false, sampleSize: 20, fullDataset: false },
    { name: 'HellaSwag', enabled: false, sampleSize: 20, fullDataset: false },
    { name: 'TruthfulQA', enabled: false, sampleSize: 20, fullDataset: false }
  ])
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState('test-cases')

  const runEvaluation = async () => {
    if (!originalConfig || !optimizationResult) {
      alert('Please provide original config and optimization result first')
      return
    }

    setIsRunning(true)
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalConfig,
          optimizationResult,
          userTestCases: userTestCases.length > 0 ? userTestCases : undefined,
          includeBenchmarks: benchmarkConfigs.some(c => c.enabled),
          benchmarkConfigs: benchmarkConfigs.filter(c => c.enabled)
        })
      })

      const result = await response.json()
      if (result.success) {
        setEvaluationResult(result.data)
        setActiveTab('results')
      } else {
        alert('Evaluation failed: ' + result.error)
      }
    } catch (error) {
      console.error('Evaluation error:', error)
      alert('Evaluation failed')
    } finally {
      setIsRunning(false)
    }
  }

  const estimatedCost = () => {
    let cost = 0
    
    // User test cases: $0 (no API calls needed)
    if (userTestCases.length > 0) {
      cost += 0
    } else {
      // Generated test cases: ~$0.01 per test case
      cost += 8 * 0.01
    }
    
    // Benchmark costs
    const enabledBenchmarks = benchmarkConfigs.filter(c => c.enabled)
    enabledBenchmarks.forEach(config => {
      cost += config.sampleSize * 0.005 // ~$0.005 per benchmark question
    })
    
    return cost
  }

  const getEvaluationStrategy = () => {
    if (userTestCases.length > 0) {
      return {
        primary: 'User-Provided Test Cases',
        description: `${userTestCases.length} custom test cases`,
        icon: <Upload className="h-4 w-4 text-green-600" />,
        cost: '$0.00',
        accuracy: 'High (your scenarios)'
      }
    } else {
      return {
        primary: 'AI-Generated Test Cases',
        description: 'Project-specific generated tests',
        icon: <FileText className="h-4 w-4 text-blue-600" />,
        cost: '~$0.08',
        accuracy: 'Medium (inferred)'
      }
    }
  }

  const strategy = getEvaluationStrategy()
  const totalCost = estimatedCost()

  return (
    <div className="space-y-6">
      {/* Evaluation Strategy Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <CardTitle>Evaluation Strategy</CardTitle>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-medium">Est. Cost: ${totalCost.toFixed(2)}</span>
              </div>
              <Button 
                onClick={runEvaluation}
                disabled={isRunning || (!originalConfig || !optimizationResult)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRunning ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Evaluation
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {strategy.icon}
                <span className="font-medium">{strategy.primary}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{strategy.description}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">Cost: {strategy.cost}</span>
                <Badge variant="outline" className="text-xs">{strategy.accuracy}</Badge>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Settings className="h-4 w-4 text-purple-600" />
                <span className="font-medium">Benchmarks</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {benchmarkConfigs.filter(c => c.enabled).length} enabled
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">
                  Cost: ${(totalCost - (userTestCases.length > 0 ? 0 : 0.08)).toFixed(2)}
                </span>
                <Badge variant="outline" className="text-xs">Industry Standard</Badge>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Total Evaluation</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Complete before/after analysis
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">Total: ${totalCost.toFixed(2)}</span>
                <Badge variant="default" className="text-xs">Comprehensive</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Evaluation Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="test-cases" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Test Cases</span>
            {userTestCases.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {userTestCases.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="benchmarks" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Benchmarks</span>
            {benchmarkConfigs.some(c => c.enabled) && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {benchmarkConfigs.filter(c => c.enabled).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="results" disabled={!evaluationResult}>
            Results
            {evaluationResult && <CheckCircle className="ml-2 h-4 w-4 text-green-500" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test-cases">
          <TestCaseUploader
            testCases={userTestCases}
            onTestCasesChange={setUserTestCases}
            onRunTests={runEvaluation}
            isRunning={isRunning}
          />
        </TabsContent>

        <TabsContent value="benchmarks">
          <BenchmarkSelector
            configs={benchmarkConfigs}
            onChange={setBenchmarkConfigs}
            isRunning={isRunning}
          />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Settings</CardTitle>
              <CardDescription>
                Configure advanced evaluation options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Cost Optimization Tips</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Upload your own test cases to eliminate generation costs</li>
                  <li>• Start with smaller benchmark sample sizes (10-20 questions)</li>
                  <li>• Use user test cases for specific scenarios, benchmarks for general validation</li>
                  <li>• Generated test cases cost ~$0.01 each, benchmarks ~$0.005 per question</li>
                </ul>
              </div>
              
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">🎯 Accuracy Benefits</h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>• User test cases: Test your exact use cases and edge cases</li>
                  <li>• No API calls needed for user-provided tests</li>
                  <li>• Immediate feedback on scenarios you care about most</li>
                  <li>• Combine with benchmarks for comprehensive evaluation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          {evaluationResult ? (
            <EvalResults
              result={evaluationResult}
              onRunAgain={() => {
                setEvaluationResult(null)
                setActiveTab('test-cases')
              }}
              onRunFullBenchmark={() => {
                // Enable all benchmarks for full evaluation
                setBenchmarkConfigs(configs => 
                  configs.map(c => ({ ...c, enabled: true, fullDataset: true }))
                )
                setActiveTab('benchmarks')
              }}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No Results Yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Configure your test cases and benchmarks, then run evaluation
                  </p>
                  <Button onClick={() => setActiveTab('test-cases')}>
                    Get Started
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 