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

interface OptimizationSettings {
  codeContextEnabled: boolean
  sampleSize: number
  minScore: number
}

export function PromptOptimizationFlow() {
  const [activeStep, setActiveStep] = useState('input')
  const [prompt, setPrompt] = useState('')
  const [requirements, setRequirements] = useState('')
  const [settings, setSettings] = useState<OptimizationSettings>({
    codeContextEnabled: true,
    sampleSize: 5,
    minScore: 0.7
  })
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
          <TabsTrigger value="configure">Configure Settings</TabsTrigger>
          <TabsTrigger value="optimize">Optimize Prompt</TabsTrigger>
          <TabsTrigger value="evaluate">Run Evaluation</TabsTrigger>
          <TabsTrigger value="results">View Results</TabsTrigger>
        </TabsList>

        {/* Input Prompt Tab */}
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

        {/* Clarify Requirements Tab */}
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

        {/* Configure Settings Tab */}
        <TabsContent value="configure">
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4">Configure Settings</h2>
            
            {/* Code Context Analysis */}
            <div className="mb-8 p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-md font-semibold flex items-center gap-2">
                    <code className="text-sm bg-gray-100 p-1 rounded">{'</>'}</code>
                    Code Context Analysis
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Recommended</span>
                  </h3>
                  <p className="text-sm text-gray-600">Analyze surrounding code to provide context-aware prompt optimizations</p>
                </div>
                <Switch
                  checked={settings.codeContextEnabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, codeContextEnabled: checked }))
                  }
                />
              </div>

              <div className="mt-4 pl-4 border-l-2 border-gray-200">
                <h4 className="text-sm font-medium mb-2">Context analysis will examine:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Functions and variables near your prompts</li>
                  <li>• How prompts are used in your code</li>
                  <li>• Import statements and dependencies</li>
                  <li>• Whether prompts are in loops or conditionals</li>
                </ul>
                <p className="text-sm text-gray-500 mt-2">This leads to more accurate, use-case specific optimizations</p>
              </div>
            </div>

            {/* Model Configuration */}
            <div className="mb-8">
              <h3 className="text-md font-semibold mb-4">Model Configuration</h3>
              <div className="space-y-4">
                {modelConfigs.map((config) => (
                  <div key={config.name} className="p-4 border rounded">
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
                      <div className="grid grid-cols-2 gap-4 mt-2">
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
                          <p className="text-xs text-gray-500 mt-1">Controls response creativity</p>
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
                          <p className="text-xs text-gray-500 mt-1">Maximum response length</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Optimization Settings */}
            <div className="mb-8">
              <h3 className="text-md font-semibold mb-4">Optimization Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Sample Size</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.sampleSize}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, sampleSize: parseInt(e.target.value) }))
                    }
                  />
                  <p className="text-sm text-gray-500 mt-1">Samples per model for consistency testing</p>
                </div>
                <div>
                  <Label>Minimum Score</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={settings.minScore}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, minScore: parseFloat(e.target.value) }))
                    }
                  />
                  <p className="text-sm text-gray-500 mt-1">Minimum acceptable quality score</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => {
                setActiveStep('optimize')
                optimizePrompt()
              }}
              className="mt-4"
              disabled={!modelConfigs.some(c => c.enabled)}
            >
              Continue
            </Button>
          </Card>
        </TabsContent>

        {/* Optimize Prompt Tab */}
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
                    setActiveStep('evaluate')
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

        {/* Run Evaluation Tab */}
        <TabsContent value="evaluate">
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4">Run Evaluation</h2>
            {isLoading ? (
              <div className="text-center">
                <Progress value={90} className="w-full mb-2" />
                <p>Running evaluation...</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Evaluation Progress:</h3>
                  <Progress value={0} className="w-full mb-2" />
                  <p className="text-sm text-gray-600">Ready to start evaluation</p>
                </div>
                <Button 
                  onClick={() => setActiveStep('results')}
                  className="mt-4"
                >
                  View Results
                </Button>
              </>
            )}
          </Card>
        </TabsContent>

        {/* View Results Tab */}
        <TabsContent value="results">
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4">Evaluation Results</h2>
            {optimizationResult ? (
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