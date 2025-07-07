'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Brain, Target, CheckCircle, Settings, Code, FileText, Users, Zap, AlertTriangle } from 'lucide-react'
import { BenchmarkConfig } from '@/types'

interface BenchmarkSelectorProps {
  configs: BenchmarkConfig[]
  onChange: (configs: BenchmarkConfig[]) => void
  isRunning?: boolean
  promptContext?: string // Add prompt context to suggest relevant benchmarks
}

// Enhanced benchmark configurations with domain-specific options
const AVAILABLE_BENCHMARKS: (BenchmarkConfig & { 
  domain: string[], 
  description: string,
  icon: any,
  recommended?: boolean 
})[] = [
  // General Knowledge & Reasoning
  {
    name: 'MMLU',
    enabled: false,
    sampleSize: 20,
    fullDataset: false,
    domain: ['knowledge', 'academic', 'reasoning', 'qa'],
    description: 'Tests knowledge across 57 academic subjects',
    icon: Brain
  },
  {
    name: 'HellaSwag',
    enabled: false,
    sampleSize: 20,
    fullDataset: false,
    domain: ['reasoning', 'commonsense', 'completion'],
    description: 'Tests commonsense reasoning abilities',
    icon: Target
  },
  {
    name: 'TruthfulQA',
    enabled: false,
    sampleSize: 20,
    fullDataset: false,
    domain: ['factual', 'truthfulness', 'qa'],
    description: 'Measures truthfulness and avoidance of misconceptions',
    icon: CheckCircle
  },
  
  // Code-specific benchmarks
  {
    name: 'HumanEval',
    enabled: false,
    sampleSize: 20,
    fullDataset: false,
    domain: ['code', 'programming', 'python'],
    description: 'Python programming tasks and function completion',
    icon: Code
  },
  {
    name: 'MBPP',
    enabled: false,
    sampleSize: 20,
    fullDataset: false,
    domain: ['code', 'programming', 'basic'],
    description: 'Mostly Basic Python Programming problems',
    icon: Code
  },
  
  // Text generation benchmarks
  {
    name: 'WritingBench',
    enabled: false,
    sampleSize: 20,
    fullDataset: false,
    domain: ['creative', 'writing', 'text-generation'],
    description: 'Creative writing and text generation quality',
    icon: FileText
  },
  
  // Conversational benchmarks
  {
    name: 'ConvBench',
    enabled: false,
    sampleSize: 20,
    fullDataset: false,
    domain: ['conversation', 'chat', 'dialogue'],
    description: 'Conversational AI and dialogue quality',
    icon: Users
  },
  
  // Safety benchmarks
  {
    name: 'SafetyBench',
    enabled: false,
    sampleSize: 20,
    fullDataset: false,
    domain: ['safety', 'bias', 'toxicity'],
    description: 'Safety, bias, and harmful content detection',
    icon: AlertTriangle
  }
];

// Function to analyze prompt and suggest relevant benchmarks
const analyzePromptDomain = (prompt: string): string[] => {
  const domains: string[] = [];
  const lowerPrompt = prompt.toLowerCase();
  
  // Code-related keywords
  if (lowerPrompt.includes('code') || lowerPrompt.includes('program') || 
      lowerPrompt.includes('function') || lowerPrompt.includes('debug') ||
      lowerPrompt.includes('python') || lowerPrompt.includes('javascript')) {
    domains.push('code', 'programming');
  }
  
  // Creative writing keywords
  if (lowerPrompt.includes('write') || lowerPrompt.includes('story') || 
      lowerPrompt.includes('creative') || lowerPrompt.includes('essay') ||
      lowerPrompt.includes('article')) {
    domains.push('creative', 'writing', 'text-generation');
  }
  
  // Conversational keywords
  if (lowerPrompt.includes('chat') || lowerPrompt.includes('conversation') || 
      lowerPrompt.includes('dialogue') || lowerPrompt.includes('respond') ||
      lowerPrompt.includes('customer')) {
    domains.push('conversation', 'chat', 'dialogue');
  }
  
  // Knowledge/QA keywords
  if (lowerPrompt.includes('question') || lowerPrompt.includes('answer') || 
      lowerPrompt.includes('explain') || lowerPrompt.includes('knowledge') ||
      lowerPrompt.includes('academic')) {
    domains.push('knowledge', 'academic', 'qa', 'reasoning');
  }
  
  // Safety keywords
  if (lowerPrompt.includes('safe') || lowerPrompt.includes('appropriate') || 
      lowerPrompt.includes('bias') || lowerPrompt.includes('harmful')) {
    domains.push('safety', 'bias');
  }
  
  // Default to general reasoning if no specific domain detected
  if (domains.length === 0) {
    domains.push('reasoning', 'commonsense');
  }
  
  return domains;
};

export function BenchmarkSelector({ configs, onChange, isRunning = false, promptContext }: BenchmarkSelectorProps) {
  // Analyze prompt context to suggest relevant benchmarks
  const promptDomains = promptContext ? analyzePromptDomain(promptContext) : [];
  
  // Get available benchmarks with recommendations based on prompt analysis
  const availableBenchmarks = AVAILABLE_BENCHMARKS.map(benchmark => ({
    ...benchmark,
    recommended: promptDomains.some(domain => benchmark.domain.includes(domain))
  }));
  
  // Initialize with available benchmarks if configs is empty
  const initialConfigs = configs.length > 0 ? configs : 
    availableBenchmarks.slice(0, 3).map(b => ({ // Start with first 3 for backwards compatibility
      name: b.name,
      enabled: b.recommended || false,
      sampleSize: b.sampleSize,
      fullDataset: b.fullDataset
    }));
  
  const [localConfigs, setLocalConfigs] = useState<BenchmarkConfig[]>(initialConfigs);

  const getBenchmarkInfo = (benchmarkName: string) => {
    const benchmark = availableBenchmarks.find(b => b.name === benchmarkName);
    return {
      icon: benchmark?.icon || Settings,
      description: benchmark?.description || 'Benchmark evaluation',
      recommended: benchmark?.recommended || false,
      domain: benchmark?.domain || []
    };
  };



  const updateConfig = (index: number, updates: Partial<BenchmarkConfig>) => {
    const newConfigs = [...localConfigs]
    newConfigs[index] = { ...newConfigs[index], ...updates }
    setLocalConfigs(newConfigs)
    onChange(newConfigs)
  }

  const totalQuestions = localConfigs
    .filter(c => c.enabled)
    .reduce((sum, c) => sum + (c.fullDataset ? 100 : c.sampleSize), 0) // Approximate for full dataset

  const estimatedTime = Math.ceil(totalQuestions * 2 / 60) // ~2 seconds per question, convert to minutes

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Benchmark Configuration</CardTitle>
          </div>
          <Badge variant="outline">
            {localConfigs.filter(c => c.enabled).length} enabled
          </Badge>
        </div>
        <CardDescription>
          Configure which benchmarks to run and their evaluation settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt Analysis Display */}
        {promptContext && promptDomains.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                Smart Benchmark Recommendations
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
              Based on your prompt analysis, we detected: <strong>{promptDomains.join(', ')}</strong> domains
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Recommended benchmarks are highlighted below and automatically enabled.
            </p>
          </div>
        )}

        {availableBenchmarks.map((benchmark, index) => {
          const config = localConfigs.find(c => c.name === benchmark.name) || {
            name: benchmark.name,
            enabled: benchmark.recommended || false,
            sampleSize: benchmark.sampleSize,
            fullDataset: benchmark.fullDataset
          };
          const configIndex = localConfigs.findIndex(c => c.name === benchmark.name);
          
          return (
            <div key={config.name} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(enabled: boolean) => {
                      if (configIndex >= 0) {
                        updateConfig(configIndex, { enabled });
                      } else {
                        // Add new config if it doesn't exist
                        const newConfigs = [...localConfigs, { ...config, enabled }];
                        setLocalConfigs(newConfigs);
                        onChange(newConfigs);
                      }
                    }}
                    disabled={isRunning}
                  />
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const info = getBenchmarkInfo(config.name);
                      const Icon = info.icon;
                      return <Icon className="h-4 w-4 text-primary" />;
                    })()}
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {config.name}
                        {getBenchmarkInfo(config.name).recommended && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getBenchmarkInfo(config.name).description}
                      </div>
                    </div>
                  </div>
                </div>
                {config.enabled && (
                  <Badge variant={config.fullDataset ? 'default' : 'secondary'}>
                    {config.fullDataset ? 'Full Dataset' : `${config.sampleSize} questions`}
                  </Badge>
                )}
              </div>

              {config.enabled && (
                <div className="flex items-center space-x-4 ml-8">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Mode:</span>
                    <Select
                      value={config.fullDataset ? 'full' : 'sample'}
                      onValueChange={(value) => {
                        if (configIndex >= 0) {
                          updateConfig(configIndex, { 
                            fullDataset: value === 'full',
                            sampleSize: value === 'full' ? config.sampleSize : config.sampleSize
                          });
                        }
                      }}
                      disabled={isRunning}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sample">Sample</SelectItem>
                        <SelectItem value="full">Full Dataset</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {!config.fullDataset && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Sample Size:</span>
                      <Select
                        value={config.sampleSize.toString()}
                        onValueChange={(value) => {
                          if (configIndex >= 0) {
                            updateConfig(configIndex, { sampleSize: parseInt(value) });
                          }
                        }}
                        disabled={isRunning}
                      >
                        <SelectTrigger className="w-[80px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Summary */}
        {localConfigs.some(c => c.enabled) && (
          <div className="bg-secondary rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="space-y-1">
                <div className="font-medium">Evaluation Summary</div>
                <div className="text-muted-foreground">
                  {localConfigs.filter(c => c.enabled).length} benchmarks, ~{totalQuestions} questions
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="font-medium">Estimated Time</div>
                <div className="text-muted-foreground">
                  {estimatedTime < 1 ? '<1 min' : `~${estimatedTime} min`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Presets */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Quick Presets</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const quickConfigs = localConfigs.map(c => ({ 
                  ...c, 
                  enabled: true, 
                  fullDataset: false, 
                  sampleSize: 10 
                }))
                setLocalConfigs(quickConfigs)
                onChange(quickConfigs)
              }}
              disabled={isRunning}
            >
              Quick Test (10 each)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const standardConfigs = localConfigs.map(c => ({ 
                  ...c, 
                  enabled: true, 
                  fullDataset: false, 
                  sampleSize: 20 
                }))
                setLocalConfigs(standardConfigs)
                onChange(standardConfigs)
              }}
              disabled={isRunning}
            >
              Standard (20 each)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const comprehensiveConfigs = localConfigs.map(c => ({ 
                  ...c, 
                  enabled: true, 
                  fullDataset: false, 
                  sampleSize: 50 
                }))
                setLocalConfigs(comprehensiveConfigs)
                onChange(comprehensiveConfigs)
              }}
              disabled={isRunning}
            >
              Comprehensive (50 each)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 