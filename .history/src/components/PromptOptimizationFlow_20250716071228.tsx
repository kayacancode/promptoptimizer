import React, { useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Progress } from './ui/progress'

interface ModelConfig {
  name: string
  enabled: boolean
  temperature?: number
  maxTokens?: number
}

interface OptimizationResult {
  originalPrompt: string
  optimizedPrompt: string
  modelResults: {
    model: string
    hallucinationRate: number
    structureScore: number
    consistencyScore: number
  }[]
  improvements: Record<string, number>
  overallImprovement: number
}

export function PromptOptimizationFlow() {
  const [activeStep, setActiveStep] = useState('input')
  const [prompt, setPrompt] = useState('')
  const [requirements, setRequirements] = useState('')
  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>([
    { name: 'claude-3-haiku', enabled: true, temperature: 0.7, maxTokens: 1000 },
    { name: 'claude-3-sonnet', enabled: true, temperature: 0.7, maxTokens: 1000 },
    { name: 'gpt-4', enabled: true, temperature: 0.7, maxTokens: 1000 }
  ])
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleModelConfigChange = (name: string, field: keyof ModelConfig, value: any) => {
    setModelConfigs(configs => 
      configs.map(config => 
        config.name === name ? { ...config, [field]: value } : config
      )
    )
  }

  const runBaseTest = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/benchmarks/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          modelConfigs: modelConfigs.filter(c => c.enabled)
        })
      })
      const data = await response.json()
      // Store base test results
      setIsLoading(false)
    } catch (error) {
      console.error('Base test error:', error)
      setIsLoading(false)
    }
  }

  const optimizePrompt = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          requirements,
          modelConfigs: modelConfigs.filter(c => c.enabled)
        })
      })
      const data = await response.json()
      setOptimizationResult(data)
      setIsLoading(false)
    } catch (error) {
      console.error('Optimization error:', error)
      setIsLoading(false)
    }
  }

  const runModelEvaluation = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrompt: prompt,
          optimizedPrompt: optimizationResult?.optimizedPrompt,
          modelConfigs: modelConfigs.filter(c => c.enabled)
        })
      })
      const data = await response.json()
      setOptimizationResult(prev => ({ ...prev, ...data }))
      setIsLoading(false)
    } catch (error) {
      console.error('Evaluation error:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Tabs value={activeStep} onValueChange={setActiveStep}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="input">Input Prompt</TabsTrigger>
          <TabsTrigger value="clarify">Clarify Requirements</TabsTrigger>
          <TabsTrigger value="configure">Configure Models</TabsTrigger>
          <TabsTrigger value="test">Test Base Prompt</TabsTrigger>
          <TabsTrigger value="optimize">Optimize Prompt</TabsTrigger>
          <TabsTrigger value="results">View Results</TabsTrigger>
        </TabsList>

        <TabsContent value="input">
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4">Input Your Prompt</h2>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              className="min-h-[200px]"
            />
            <Button 
              onClick={() => setActiveStep('clarify')}
              className="mt-4"
              disabled={!prompt}
            >
              Continue
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="clarify">
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4">Clarify Requirements</h2>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Enter specific requirements, constraints, or goals..."
              className="min-h-[200px]"
            />
            <Button 
              onClick={() => setActiveStep('configure')}
              className="mt-4"
              disabled={!requirements}
            >
              Continue
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="configure">
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4">Configure Models</h2>
            {modelConfigs.map((config) => (
              <div key={config.name} className="mb-4 p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <Label>{config.name}</Label>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => 
                      handleModelConfigChange(config.name, 'enabled', checked)
                    }
                  />
                </div>
                {config.enabled && (
                  <div className="space-y-2">
                    <div>
                      <Label>Temperature</Label>
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.1}
                        value={config.temperature}
                        onChange={(e) => 
                          handleModelConfigChange(config.name, 'temperature', parseFloat(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <Label>Max Tokens</Label>
                      <Input
                        type="number"
                        min={1}
                        max={2000}
                        value={config.maxTokens}
                        onChange={(e) => 
                          handleModelConfigChange(config.name, 'maxTokens', parseInt(e.target.value))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Button 
              onClick={() => {
                setActiveStep('test')
                runBaseTest()
              }}
              className="mt-4"
              disabled={!modelConfigs.some(c => c.enabled)}
            >
              Continue
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4">Test Base Prompt</h2>
            {isLoading ? (
              <div className="text-center">
                <Progress value={45} className="w-full mb-2" />
                <p>Running base tests...</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Base Metrics:</h3>
                  {/* Display base test results here */}
                </div>
                <Button 
                  onClick={() => {
                    setActiveStep('optimize')
                    optimizePrompt()
                  }}
                  className="mt-4"
                >
                  Continue to Optimization
                </Button>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="optimize">
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4">Optimize Prompt</h2>
            {isLoading ? (
              <div className="text-center">
                <Progress value={75} className="w-full mb-2" />
                <p>Optimizing prompt...</p>
              </div>
            ) : optimizationResult ? (
              <>
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Optimized Prompt:</h3>
                  <Textarea
                    value={optimizationResult.optimizedPrompt}
                    readOnly
                    className="min-h-[200px]"
                  />
                </div>
                <Button 
                  onClick={() => {
                    setActiveStep('results')
                    runModelEvaluation()
                  }}
                  className="mt-4"
                >
                  Run Evaluation
                </Button>
              </>
            ) : (
              <p>No optimization results yet</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4">Evaluation Results</h2>
            {isLoading ? (
              <div className="text-center">
                <Progress value={90} className="w-full mb-2" />
                <p>Running final evaluation...</p>
              </div>
            ) : optimizationResult ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Overall Improvement:</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {optimizationResult.overallImprovement.toFixed(1)}%
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Model-Specific Results:</h3>
                  {optimizationResult.modelResults.map((result) => (
                    <div key={result.model} className="mb-4 p-4 border rounded">
                      <h4 className="font-semibold">{result.model}</h4>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <p className="text-sm text-gray-600">Hallucination Rate</p>
                          <p className="font-semibold">{(result.hallucinationRate * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Structure Score</p>
                          <p className="font-semibold">{(result.structureScore * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Consistency Score</p>
                          <p className="font-semibold">{(result.consistencyScore * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={() => {
                    setPrompt(optimizationResult.optimizedPrompt)
                    setActiveStep('input')
                  }}
                  className="mt-4"
                >
                  Start New Optimization
                </Button>
              </div>
            ) : (
              <p>No evaluation results yet</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 