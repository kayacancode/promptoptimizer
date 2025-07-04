'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Sparkles } from 'lucide-react'

interface ProjectContext {
  domain?: string
  useCase?: string
  targetAudience?: string
  keyTopics?: string[]
  complexity?: 'beginner' | 'intermediate' | 'expert'
}

interface TestCaseCustomizerProps {
  onGenerateTestCases: (context: ProjectContext, count: number) => Promise<void>
  isGenerating?: boolean
}

interface OptionData {
  domains: Array<{ value: string; label: string; description: string }>
  useCases: Array<{ value: string; label: string; description: string }>
  targetAudiences: Array<{ value: string; label: string; description: string }>
  complexityLevels: Array<{ value: string; label: string; description: string }>
}

export function TestCaseCustomizer({ 
  onGenerateTestCases, 
  isGenerating = false
}: TestCaseCustomizerProps) {
  const [context, setContext] = useState<ProjectContext>({
    complexity: 'intermediate'
  })
  const [testCaseCount, setTestCaseCount] = useState(8)
  const [customTopics, setCustomTopics] = useState('')
  const [options, setOptions] = useState<OptionData | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async () => {
    try {
      const response = await fetch('/api/test-cases/generate')
      if (response.ok) {
        const result = await response.json()
        setOptions(result.data)
      }
    } catch (error) {
      console.error('Failed to load options:', error)
    } finally {
      setLoadingOptions(false)
    }
  }

  const updateContext = (field: keyof ProjectContext, value: string | string[]) => {
    setContext(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addCustomTopics = () => {
    if (customTopics.trim()) {
      const topics = customTopics.split(',').map(t => t.trim()).filter(Boolean)
      updateContext('keyTopics', [...(context.keyTopics || []), ...topics])
      setCustomTopics('')
    }
  }

  const removeTopic = (index: number) => {
    const newTopics = [...(context.keyTopics || [])]
    newTopics.splice(index, 1)
    updateContext('keyTopics', newTopics)
  }

  const handleGenerate = async () => {
    await onGenerateTestCases(context, testCaseCount)
  }

  const getPresetContexts = () => [
    {
      name: 'Customer Support Bot',
      context: {
        domain: 'customer_service',
        useCase: 'customer_support',
        targetAudience: 'customers',
        keyTopics: ['troubleshooting', 'refunds', 'product_info'],
        complexity: 'intermediate' as const
      }
    },
    {
      name: 'Educational Tutor',
      context: {
        domain: 'education',
        useCase: 'tutoring',
        targetAudience: 'students',
        keyTopics: ['explanation', 'examples', 'practice'],
        complexity: 'beginner' as const
      }
    },
    {
      name: 'Code Review Assistant',
      context: {
        domain: 'coding',
        useCase: 'code_review',
        targetAudience: 'developers',
        keyTopics: ['best_practices', 'security', 'performance'],
        complexity: 'expert' as const
      }
    }
  ]

  if (loadingOptions) {
    return <div className="animate-pulse">Loading customization options...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <CardTitle>Test Case Customization</CardTitle>
        </div>
        <CardDescription>
          Customize your project context to generate more relevant test cases
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Presets */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Presets</label>
          <div className="flex flex-wrap gap-2">
            {getPresetContexts().map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setContext(preset.context)}
                disabled={isGenerating}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Domain Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Domain</label>
            <Select
              value={context.domain}
              onValueChange={(value) => updateContext('domain', value)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {options?.domains.map((domain) => (
                  <SelectItem key={domain.value} value={domain.value}>
                    <div>
                      <div>{domain.label}</div>
                      <div className="text-xs text-slate-500">{domain.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Use Case</label>
            <Select
              value={context.useCase}
              onValueChange={(value) => updateContext('useCase', value)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select use case" />
              </SelectTrigger>
              <SelectContent>
                {options?.useCases.map((useCase) => (
                  <SelectItem key={useCase.value} value={useCase.value}>
                    <div>
                      <div>{useCase.label}</div>
                      <div className="text-xs text-slate-500">{useCase.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Target Audience & Complexity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Audience</label>
            <Select
              value={context.targetAudience}
              onValueChange={(value) => updateContext('targetAudience', value)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select audience" />
              </SelectTrigger>
              <SelectContent>
                {options?.targetAudiences.map((audience) => (
                  <SelectItem key={audience.value} value={audience.value}>
                    <div>
                      <div>{audience.label}</div>
                      <div className="text-xs text-slate-500">{audience.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Complexity Level</label>
            <Select
              value={context.complexity}
              onValueChange={(value) => updateContext('complexity', value)}
              disabled={isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select complexity" />
              </SelectTrigger>
              <SelectContent>
                {options?.complexityLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div>
                      <div>{level.label}</div>
                      <div className="text-xs text-slate-500">{level.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Topics */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Key Topics</label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Add topics (comma-separated)"
              value={customTopics}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomTopics(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addCustomTopics()}
              disabled={isGenerating}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button onClick={addCustomTopics} disabled={isGenerating || !customTopics.trim()}>
              Add
            </Button>
          </div>
          {context.keyTopics && context.keyTopics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {context.keyTopics.map((topic, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => !isGenerating && removeTopic(index)}
                >
                  {topic} {!isGenerating && '×'}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Test Case Count */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Number of Test Cases</label>
          <Select
            value={testCaseCount.toString()}
            onValueChange={(value) => setTestCaseCount(parseInt(value))}
            disabled={isGenerating}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 test cases</SelectItem>
              <SelectItem value="8">8 test cases (recommended)</SelectItem>
              <SelectItem value="10">10 test cases</SelectItem>
              <SelectItem value="15">15 test cases</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Context Summary */}
        {(context.domain || context.useCase) && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Context Summary</h4>
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              {context.domain && <div>• Domain: {context.domain.replace('_', ' ')}</div>}
              {context.useCase && <div>• Use Case: {context.useCase.replace('_', ' ')}</div>}
              {context.targetAudience && <div>• Audience: {context.targetAudience.replace('_', ' ')}</div>}
              {context.complexity && <div>• Complexity: {context.complexity}</div>}
              {context.keyTopics && context.keyTopics.length > 0 && (
                <div>• Topics: {context.keyTopics.join(', ')}</div>
              )}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !context.domain}
          className="w-full"
          size="lg"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {isGenerating ? 'Generating Test Cases...' : `Generate ${testCaseCount} Test Cases`}
        </Button>
      </CardContent>
    </Card>
  )
} 