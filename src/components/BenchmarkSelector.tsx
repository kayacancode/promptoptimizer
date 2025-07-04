'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Brain, Target, CheckCircle, Settings } from 'lucide-react'
import { BenchmarkConfig } from '@/types'

interface BenchmarkSelectorProps {
  configs: BenchmarkConfig[]
  onChange: (configs: BenchmarkConfig[]) => void
  isRunning?: boolean
}

export function BenchmarkSelector({ configs, onChange, isRunning = false }: BenchmarkSelectorProps) {
  const [localConfigs, setLocalConfigs] = useState<BenchmarkConfig[]>(configs)

  const getBenchmarkIcon = (benchmark: string) => {
    switch (benchmark) {
      case 'MMLU': return <Brain className="h-4 w-4 text-primary" />
      case 'HellaSwag': return <Target className="h-4 w-4 text-primary" />
      case 'TruthfulQA': return <CheckCircle className="h-4 w-4 text-primary" />
      default: return <Settings className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getBenchmarkDescription = (benchmark: string) => {
    switch (benchmark) {
      case 'MMLU': return 'Tests knowledge across 57 academic subjects'
      case 'HellaSwag': return 'Tests commonsense reasoning abilities'
      case 'TruthfulQA': return 'Measures truthfulness and avoidance of misconceptions'
      default: return 'Benchmark evaluation'
    }
  }

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
        {localConfigs.map((config, index) => (
          <div key={config.name} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                                                  <Switch
                   checked={config.enabled}
                   onCheckedChange={(enabled: boolean) => updateConfig(index, { enabled })}
                   disabled={isRunning}
                 />
                <div className="flex items-center space-x-2">
                  {getBenchmarkIcon(config.name)}
                  <div>
                    <div className="font-medium">{config.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getBenchmarkDescription(config.name)}
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
                    onValueChange={(value) => 
                      updateConfig(index, { 
                        fullDataset: value === 'full',
                        sampleSize: value === 'full' ? config.sampleSize : config.sampleSize
                      })
                    }
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
                      onValueChange={(value) => 
                        updateConfig(index, { sampleSize: parseInt(value) })
                      }
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
        ))}

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