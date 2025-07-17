import React, { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { 
  FileText, 
  MessageSquare, 
  Settings, 
  Zap, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight,
  Code2,
  Brain,
  Sparkles,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react'

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

interface PromptOptimizationFlowProps {
  onOptimizationComplete?: (success: boolean) => void
}

export function PromptOptimizationFlow({ onOptimizationComplete }: PromptOptimizationFlowProps = {}) {
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
    // { name: 'gpt-4', enabled: true, temperature: 0.7, maxTokens: 1000 },
    { name: 'gemini-2.5-flash', enabled: true, temperature: 0.7, maxTokens: 1000 }
  ])
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleModelConfigChange = (name: string, field: keyof ModelConfig, value: any) => {
    setModelConfigs(configs => {
      // If enabling a model, check if we already have 2 enabled
      if (field === 'enabled' && value === true) {
        const enabledCount = configs.filter(config => config.enabled).length
        if (enabledCount >= 2) {
          // Don't allow enabling more than 2 models
          return configs
        }
      }
      
      return configs.map(config => 
        config.name === name ? { ...config, [field]: value } : config
      )
    })
  }

  const steps = [
    { id: 'input', name: 'Input Prompt', icon: FileText, description: 'Enter your prompt' },
    { id: 'clarify', name: 'Clarify Requirements', icon: MessageSquare, description: 'Define your goals' },
    { id: 'configure', name: 'Configure Settings', icon: Settings, description: 'Set up optimization' },
    { id: 'optimize', name: 'Optimize Prompt', icon: Zap, description: 'AI enhancement' },
    { id: 'evaluate', name: 'Run Evaluation', icon: BarChart3, description: 'Test performance' },
    { id: 'results', name: 'View Results', icon: TrendingUp, description: 'Review improvements' }
  ]

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === activeStep)
  const currentStepIndex = getCurrentStepIndex()

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
      setIsLoading(false)
    } catch (error) {
      console.error('Base test error:', error)
      setIsLoading(false)
    }
  }

  const optimizePrompt = async () => {
    setIsLoading(true)
    try {
      // Get user token from localStorage or session
      const token = localStorage.getItem('user_token') || sessionStorage.getItem('user_token')
      
      if (!token) {
        console.error('No authentication token found')
        alert('No authentication token found. Please log in again.')
        setIsLoading(false)
        return
      }
      
      console.log('Starting optimization with token:', token.substring(0, 20) + '...')

      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt,
          requirements,
          modelConfigs: modelConfigs.filter(c => c.enabled)
        })
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Optimization failed')
      }
      
      setOptimizationResult(data.data)
      setIsLoading(false)
      
      // Call completion callback to refresh token balance
      onOptimizationComplete?.(data.success)
    } catch (error) {
      console.error('Optimization error:', error)
      alert('Optimization failed: ' + error.message)
      setIsLoading(false)
      
      // Call completion callback with failure
      onOptimizationComplete?.(false)
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
      setOptimizationResult(prev => ({ ...prev, ...data.data }))
      setIsLoading(false)
    } catch (error) {
      console.error('Evaluation error:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1d1d1f]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">    
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Transform your prompts with AI-powered optimization across multiple models
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === activeStep
              const isCompleted = index < currentStepIndex
              const isAccessible = index <= currentStepIndex

              return (
                <div key={step.id} className="flex flex-col items-center relative">
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-1/2 top-6 w-full h-0.5 bg-gray-700 -translate-x-1/2 z-0">
                      <div 
                        className={`h-full bg-white transition-all duration-500 ${
                          index < currentStepIndex ? 'w-full' : 'w-0'
                        }`}
                      />
                    </div>
                  )}
                  
                  {/* Step Circle */}
                  <button
                    onClick={() => isAccessible && setActiveStep(step.id)}
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-white text-black shadow-lg scale-110' 
                        : isCompleted 
                          ? 'bg-white text-black' 
                          : 'bg-gray-800 border-2 border-gray-600 text-gray-400'
                    } ${isAccessible ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}`}
                    disabled={!isAccessible}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </button>
                  
                  {/* Step Label */}
                  <div className="mt-3 text-center">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-white' : isCompleted ? 'text-white' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {step.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeStep} onValueChange={setActiveStep}>
            <TabsList className="hidden" /> {/* Hide default tabs list */}

            {/* Input Prompt Tab */}
            <TabsContent value="input" className="mt-0">
              <Card className="shadow-lg border-0">
                <CardHeader className=" rounded-t-lg">
                  <CardTitle className="flex items-center text-2xl">
                    <FileText className="h-6 w-6 mr-3 text-black" />
                    Input Your Prompt
                  </CardTitle>
                  <CardDescription className="text-lg">
                    Enter the prompt you'd like to optimize for better performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="prompt" className="text-lg font-medium mb-3 block">
                        Your Prompt
                      </Label>
                      <Textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Enter your prompt here... For example: 'You are a helpful assistant that provides clear, concise answers to user questions.'"
                        className="min-h-[200px] text-base resize-none border-2 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 border-t">
                      <div className="text-sm text-gray-500">
                        {prompt.length} characters
                      </div>
                      <Button 
                        onClick={() => setActiveStep('clarify')}
                        disabled={!prompt.trim()}
                        className="bg-black px-8 py-3 text-lg"
                      >
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Clarify Requirements Tab */}
            <TabsContent value="clarify" className="mt-0">
              <Card className="shadow-lg border-0 bg-gray-900 border border-gray-800">
                <CardHeader className="rounded-t-lg bg-gray-900">
                  <CardTitle className="flex items-center text-2xl text-white">
                    <MessageSquare className="h-6 w-6 mr-3 text-white" />
                    Clarify Requirements
                  </CardTitle>
                  <CardDescription className="text-lg text-gray-400">
                    Define your specific goals and constraints for optimization
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 bg-gray-900">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="requirements" className="text-lg font-medium mb-3 block text-white">
                        Optimization Goals
                      </Label>
                      <Textarea
                        id="requirements"
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                        placeholder="Describe what you want to achieve... For example: 'I want the prompt to be more specific, reduce hallucinations, and improve response consistency across different models.'"
                        className="min-h-[200px] text-base resize-none border-2 bg-gray-800 border-gray-700 text-white focus:border-white transition-colors"
                      />
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <h4 className="font-medium text-white mb-2">💡 Optimization Tips</h4>
                      <ul className="text-sm text-gray-400 space-y-1">
                        <li>• Be specific about desired output format</li>
                        <li>• Mention any constraints or limitations</li>
                        <li>• Describe your target audience or use case</li>
                        <li>• Note any performance issues you're experiencing</li>
                      </ul>
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 border-t">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveStep('input')}
                        className="px-6 py-2"
                      >
                        Back
                      </Button>
                      <Button 
                        onClick={() => setActiveStep('configure')}
                        disabled={!requirements.trim()}
                        className="bg-black  px-8 py-3 text-lg"
                      >
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Configure Settings Tab */}
            <TabsContent value="configure" className="mt-0">
              <Card className="shadow-lg border-0 bg-gray-900 border border-gray-800">
                <CardHeader className="bg-gray-900 rounded-t-lg">
                  <CardTitle className="flex items-center text-2xl text-white">
                    <Settings className="h-6 w-6 mr-3 text-white" />
                    Configure Settings
                  </CardTitle>
                  <CardDescription className="text-lg text-gray-400">
                    Set up your optimization preferences and model configurations
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8 bg-gray-900">
                  {/* Code Context Analysis */}
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Code2 className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <h3 className="text-xl font-semibold text-blue-900">Code Context Analysis</h3>
                          <p className="text-blue-700 mt-1">Analyze surrounding code for better optimization</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Recommended
                        </Badge>
                        <Switch
                          checked={settings.codeContextEnabled}
                          onCheckedChange={(checked) => 
                            setSettings(prev => ({ ...prev, codeContextEnabled: checked }))
                          }
                          className="data-[state=checked]:bg-blue-600"
                        />
                      </div>
                    </div>

                    {settings.codeContextEnabled && (
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-3">Analysis includes:</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center text-sm text-blue-800">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                            Functions and variables
                          </div>
                          <div className="flex items-center text-sm text-blue-800">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                            Usage patterns
                          </div>
                          <div className="flex items-center text-sm text-blue-800">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                            Import statements
                          </div>
                          <div className="flex items-center text-sm text-blue-800">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                            Control flow context
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Model Configuration */}
                  <div>
                    <h3 className="text-xl text-orange-600 font-semibold mb-4 flex items-center">
                      <Brain className="h-6 w-6 mr-2 text-orange-600" />
                      Model Configuration
                    </h3>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-4">
                        Select up to 2 models for optimization (currently {modelConfigs.filter(c => c.enabled).length}/2 selected)
                      </p>
                    </div>
                    <div className="grid gap-4">
                      {modelConfigs.map((config) => {
                        const enabledCount = modelConfigs.filter(c => c.enabled).length
                        const isDisabled = !config.enabled && enabledCount >= 2
                        
                        return (
                          <div key={config.name} className={`bg-gray-800 rounded-lg border p-6 ${isDisabled ? 'border-gray-600 opacity-50' : 'border-gray-700'}`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3">
                                  <Brain className="h-5 w-5 text-black" />
                                </div>
                                <div>
                                  <Label className="text-lg font-medium text-white">{config.name}</Label>
                                  <p className="text-sm text-gray-400">
                                    AI Language Model {isDisabled ? '(Limit reached)' : ''}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                checked={config.enabled}
                                onCheckedChange={(checked) => 
                                  handleModelConfigChange(config.name, 'enabled', checked)
                                }
                                disabled={isDisabled}
                                className="data-[state=checked]:bg-white"
                              />
                            </div>
                            
                            {config.enabled && (
                              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                                <div>
                                  <Label className="text-sm font-medium text-gray-300">Temperature</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    value={config.temperature}
                                    onChange={(e) => 
                                      handleModelConfigChange(config.name, 'temperature', parseFloat(e.target.value))
                                    }
                                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                                  />
                                  <p className="text-xs text-gray-400 mt-1">Controls creativity (0-1)</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-300">Max Tokens</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={2000}
                                    value={config.maxTokens}
                                    onChange={(e) => 
                                      handleModelConfigChange(config.name, 'maxTokens', parseInt(e.target.value))
                                    }
                                    className="mt-1 bg-gray-700 border-gray-600 text-white"
                                  />
                                  <p className="text-xs text-gray-400 mt-1">Maximum response length</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Optimization Settings */}
                  <div>
                    <h3 className="text-xl text-orange-600  font-semibold mb-4 flex items-center">
                      <Target className="h-6 w-6 mr-2 text-orange-600" />
                      Optimization Settings
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg border-2 border-gray-100 p-4">
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Sample Size</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={settings.sampleSize}
                          onChange={(e) => 
                            setSettings(prev => ({ ...prev, sampleSize: parseInt(e.target.value) }))
                          }
                          className="text-center text-lg font-semibold"
                        />
                        <p className="text-xs text-gray-500 mt-2">Tests per model for consistency</p>
                      </div>
                      <div className="bg-white rounded-lg border-2 border-gray-100 p-4">
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Minimum Score</Label>
                        <Input
                          type="number"
                          min={0}
                          max={1}
                          step={0.1}
                          value={settings.minScore}
                          onChange={(e) => 
                            setSettings(prev => ({ ...prev, minScore: parseFloat(e.target.value) }))
                          }
                          className="text-center text-lg font-semibold"
                        />
                        <p className="text-xs text-gray-500 mt-2">Quality threshold (0-1)</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveStep('clarify')}
                      className="px-6 py-2"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={() => {
                        setActiveStep('optimize')
                        optimizePrompt()
                      }}
                      disabled={!modelConfigs.some(c => c.enabled)}
                      className="bg-white text-black hover:bg-gray-200 px-8 py-3 text-lg"
                    >
                      Start Optimization
                      <Zap className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Optimize Prompt Tab */}
            <TabsContent value="optimize" className="mt-0">
              <Card className="shadow-lg border-0">
                <CardHeader className=" rounded-t-lg">
                  <CardTitle className="flex items-center text-2xl">
                    <Zap className="h-6 w-6 mr-3 text-yellow-600" />
                    Optimize Prompt
                  </CardTitle>
                  <CardDescription className="text-lg">
                    AI is enhancing your prompt for better performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <Sparkles className="h-8 w-8 text-black" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-white">Generating...</h3>
                      <p className="text-gray-400 mb-6">AI is analyzing and improving your prompt...</p>
                      <Progress value={75} className="w-full max-w-md mx-auto mb-4" />
                      <p className="text-sm text-gray-400">This may take a few moments</p>
                    </div>
                  ) : optimizationResult ? (
                    <div className="space-y-6">
                      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                        <div className="flex items-center mb-4">
                          <CheckCircle2 className="h-6 w-6 text-green-600 mr-3" />
                          <h3 className="text-xl font-semibold text-green-900">Optimization Complete!</h3>
                        </div>
                        <p className="text-green-800">Your prompt has been successfully optimized for better performance.</p>
                      </div>

                      <div>
                        <Label className="text-lg font-medium mb-3 block">Optimized Prompt</Label>
                        <Textarea
                          value={optimizationResult.optimizedPrompt}
                          readOnly
                          className="min-h-[200px] text-base bg-gray-50 border-2"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveStep('configure')}
                          className="px-6 py-2"
                        >
                          Back to Settings
                        </Button>
                        <Button 
                          onClick={() => {
                            setActiveStep('evaluate')
                            runModelEvaluation()
                          }}
                          className="bg-white text-black hover:bg-gray-200 px-8 py-3 text-lg"
                        >
                          Run Evaluation
                          <BarChart3 className="ml-2 h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Zap className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600">No optimization results yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Run Evaluation Tab */}
            <TabsContent value="evaluate" className="mt-0">
              <Card className="shadow-lg border-0">
                <CardHeader className=" rounded-t-lg">
                  <CardTitle className="flex items-center text-2xl">
                    <BarChart3 className="h-6 w-6 mr-3 text-indigo-600" />
                    Run Evaluation
                  </CardTitle>
                  <CardDescription className="text-lg">
                    Testing your optimized prompt across different models
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <BarChart3 className="h-8 w-8 text-black" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-white">Generating...</h3>
                      <p className="text-gray-400 mb-6">Testing performance across models...</p>
                      <Progress value={90} className="w-full max-w-md mx-auto mb-4" />
                      <p className="text-sm text-gray-400">Analyzing results...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-900 mb-2">Evaluation Ready</h3>
                        <p className="text-blue-800">Your optimized prompt is ready for comprehensive testing.</p>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveStep('optimize')}
                          className="px-6 py-2"
                        >
                          Back to Optimization
                        </Button>
                        <Button 
                          onClick={() => setActiveStep('results')}
                          className="bg-white text-black hover:bg-gray-200 px-8 py-3 text-lg"
                        >
                          View Results
                          <TrendingUp className="ml-2 h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* View Results Tab */}
            <TabsContent value="results" className="mt-0">
              <Card className="shadow-lg border-0">
                <CardHeader className="rounded-t-lg">
                  <CardTitle className="flex items-center text-2xl">
                    <TrendingUp className="h-6 w-6 mr-3 text-emerald-600" />
                    Evaluation Results
                  </CardTitle>
                  <CardDescription className="text-lg">
                    Performance analysis and improvement metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  {optimizationResult ? (
                    <div className="space-y-8">
                      {/* Overall Improvement */}
                      <div className="text-center bg-gray-800 rounded-xl p-8 border border-gray-700">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                          <TrendingUp className="h-10 w-10 text-black" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Overall Improvement</h3>
                        <div className="text-6xl font-bold text-white mb-2">
                          {optimizationResult.overallImprovement ? optimizationResult.overallImprovement.toFixed(1) : '0'}%
                        </div>
                        <p className="text-gray-400">Performance increase across all models</p>
                        
                        {/* Show top performing model */}
                        {optimizationResult.improvements && (
                          <div className="mt-4 pt-4 border-t border-emerald-200">
                            {(() => {
                              const improvements = optimizationResult.improvements;
                              const validImprovements = Object.entries(improvements).filter(([_, value]) => 
                                value !== null && value !== undefined && typeof value === 'number' && !isNaN(value)
                              );
                              
                              if (validImprovements.length > 0) {
                                const topModel = validImprovements.reduce((best, current) => 
                                  (current[1] as number) > (best[1] as number) ? current : best
                                );
                                
                                return (
                                  <div className="text-center">
                                    <p className="text-sm text-emerald-700 mb-1">🏆 Top Model Performance</p>
                                    <p className="font-semibold text-emerald-900">{topModel[0]}</p>
                                    <p className="text-xs text-emerald-600">{(topModel[1] as number).toFixed(1)}% improvement</p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                      
                      {/* Scoring Methodology */}
                      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                          📊 How We Calculate Improvement Scores
                        </h3>
                        <div className="text-sm text-blue-800 space-y-2">
                          <p><strong>Improvement Percentage</strong> combines traditional metrics (70%) + semantic analysis (30%):</p>
                          
                          <div className="mt-3">
                            <p className="font-semibold text-blue-900 mb-2">Traditional Metrics (70% weight):</p>
                            <ul className="list-disc list-inside ml-4 space-y-1">
                              <li><strong>Hallucination Rate (40%):</strong> Fewer factual errors</li>
                              <li><strong>Structure Score (30%):</strong> Better organization, formatting</li>
                              <li><strong>Consistency Score (30%):</strong> More consistent responses</li>
                            </ul>
                          </div>

                          <div className="mt-3">
                            <p className="font-semibold text-blue-900 mb-2">Semantic Analysis (30% weight):</p>
                            <ul className="list-disc list-inside ml-4 space-y-1">
                              <li><strong>Semantic Preservation:</strong> Intent preservation via OpenAI embeddings</li>
                              <li><strong>Response Relevance:</strong> Prompt-response alignment (vector similarity)</li>
                              <li><strong>Semantic Coherence:</strong> Internal consistency using sentence vectors</li>
                              <li><strong>Quality Vectors:</strong> Comparison against high-quality responses in Pinecone</li>
                            </ul>
                          </div>
                          
                          <p className="text-xs mt-2 text-blue-600">
                            <strong>Powered by:</strong> OpenAI text-embedding-3-small + Pinecone vector database
                          </p>
                        </div>
                      </div>

                      {/* Model-Specific Results */}
                      <div>
                        <h3 className="text-xl font-semibold mb-6 flex items-center">
                          <Brain className="h-6 w-6 mr-2 text-purple-600" />
                          Model Performance Results
                        </h3>
                        <div className="grid gap-6">
                          {(optimizationResult.modelResults || optimizationResult.optimizedPromptResults)?.length > 0 ? 
                            (optimizationResult.modelResults || optimizationResult.optimizedPromptResults).map((result) => (
                            <div key={result.model} className="bg-white rounded-lg border-2 border-gray-100 p-6">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-lg font-semibold flex items-center">
                                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                                    <Brain className="h-4 w-4 text-white" />
                                  </div>
                                  {result.model}
                                </h4>
                                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                  AI Model
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4">
                                {/* Show improvement percentage if it's evaluation results, otherwise show raw metrics */}
                                {optimizationResult.improvements ? (
                                  <>
                                    <div className="col-span-3 text-center bg-emerald-50 rounded-lg p-6">
                                      <div className="text-4xl font-bold text-emerald-600 mb-2">
                                        {optimizationResult.improvements[result.model] != null 
                                          ? `${optimizationResult.improvements[result.model].toFixed(1)}%`
                                          : 'N/A'
                                        }
                                      </div>
                                      <div className="text-lg text-emerald-700 font-medium">Overall Improvement</div>
                                      <div className="text-sm text-emerald-600 mt-1">Compared to original prompt</div>
                                    </div>
                                    
                                    {/* Show comparison of original vs optimized responses */}
                                    {result.responses && result.responses.length > 0 && (
                                      <div className="col-span-3 mt-6">
                                        <h5 className="text-sm font-medium text-gray-700 mb-3">Response Comparison:</h5>
                                        <div className="grid grid-cols-2 gap-4">
                                          {/* Original Response */}
                                          <div>
                                            <div className="text-xs text-gray-500 mb-2 flex items-center">
                                              <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                                              Original Prompt Response
                                            </div>
                                            {optimizationResult.originalPromptResults?.find(r => r.model === result.model)?.responses?.[0] ? (
                                              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                                                <div className="text-sm text-gray-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                                  {optimizationResult.originalPromptResults.find(r => r.model === result.model)?.responses?.[0]}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
                                                No original response available
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Optimized Response */}
                                          <div>
                                            <div className="text-xs text-gray-500 mb-2 flex items-center">
                                              <div className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></div>
                                              Optimized Prompt Response
                                            </div>
                                            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                                              <div className="text-sm text-gray-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                                {result.responses[0]}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div className="text-center bg-red-50 rounded-lg p-4">
                                      <div className="text-2xl font-bold text-red-600 mb-1">
                                        {(result.hallucinationRate * 100).toFixed(1)}%
                                      </div>
                                      <div className="text-sm text-red-700 font-medium">Hallucination Rate</div>
                                      <div className="text-xs text-red-600 mt-1">Lower is better</div>
                                    </div>
                                    <div className="text-center bg-blue-50 rounded-lg p-4">
                                      <div className="text-2xl font-bold text-blue-600 mb-1">
                                        {(result.structureScore * 100).toFixed(1)}%
                                      </div>
                                      <div className="text-sm text-blue-700 font-medium">Structure Score</div>
                                      <div className="text-xs text-blue-600 mt-1">Higher is better</div>
                                    </div>
                                    <div className="text-center bg-green-50 rounded-lg p-4">
                                      <div className="text-2xl font-bold text-green-600 mb-1">
                                        {(result.consistencyScore * 100).toFixed(1)}%
                                      </div>
                                      <div className="text-sm text-green-700 font-medium">Consistency Score</div>
                                      <div className="text-xs text-green-600 mt-1">Higher is better</div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )) : (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Brain className="h-8 w-8 text-gray-400" />
                              </div>
                              <p className="text-gray-600">No model results available</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveStep('evaluate')}
                          className="px-6 py-2"
                        >
                          Back to Evaluation
                        </Button>
                        <Button 
                          onClick={() => {
                            setPrompt(optimizationResult.optimizedPrompt)
                            setActiveStep('input')
                          }}
                          className="bg-white text-black hover:bg-gray-200 px-8 py-3 text-lg"
                        >
                          Start New Optimization
                          <Sparkles className="ml-2 h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <TrendingUp className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600">No evaluation results yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 