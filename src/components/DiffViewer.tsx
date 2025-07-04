'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, GitCommit, Undo2, Lightbulb, Info } from 'lucide-react'
import { ConfigFile, OptimizationResult } from '@/types'

interface DiffViewerProps {
  originalConfig: ConfigFile
  optimizedResult: OptimizationResult
  onApplyPatch: () => void
  onUndo: () => void
  isApplying: boolean
}

export function DiffViewer({ 
  originalConfig, 
  optimizedResult, 
  onApplyPatch, 
  onUndo, 
  isApplying 
}: DiffViewerProps) {
  const [selectedTab, setSelectedTab] = useState('diff')

  const renderDiffLine = (line: string, type: 'added' | 'removed' | 'unchanged', lineNumber: number) => {
    const bgColor = type === 'added' ? 'bg-green-50 dark:bg-green-950' : 
                   type === 'removed' ? 'bg-red-50 dark:bg-red-950' : 
                   'bg-transparent'
    const textColor = type === 'added' ? 'text-green-800 dark:text-green-200' : 
                     type === 'removed' ? 'text-red-800 dark:text-red-200' : 
                     'text-slate-700 dark:text-slate-300'
    const prefix = type === 'added' ? '+' : type === 'removed' ? '-' : ' '

    return (
      <div key={`${type}-${lineNumber}`} className={`flex ${bgColor}`}>
        <div className="w-12 text-xs text-slate-400 text-right pr-2 py-1 select-none">
          {lineNumber}
        </div>
        <div className="w-4 text-xs text-center py-1 select-none">
          {prefix}
        </div>
        <div className={`flex-1 py-1 px-2 font-mono text-sm ${textColor}`}>
          {line}
        </div>
      </div>
    )
  }

  const generateDiffView = () => {
    const originalLines = optimizedResult.originalContent.split('\n')
    const optimizedLines = optimizedResult.optimizedContent.split('\n')
    
    // Simple diff algorithm (in a real app, you'd use a proper diff library)
    const diffLines: React.ReactElement[] = []
    let originalIndex = 0
    let optimizedIndex = 0
    
    // This is a simplified diff - in production you'd use a proper diff algorithm
    const maxLines = Math.max(originalLines.length, optimizedLines.length)
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[originalIndex]
      const optimizedLine = optimizedLines[optimizedIndex]
      
      if (originalLine === optimizedLine) {
        diffLines.push(renderDiffLine(originalLine || '', 'unchanged', i + 1))
        originalIndex++
        optimizedIndex++
      } else if (originalLine && !optimizedLine) {
        diffLines.push(renderDiffLine(originalLine, 'removed', i + 1))
        originalIndex++
      } else if (!originalLine && optimizedLine) {
        diffLines.push(renderDiffLine(optimizedLine, 'added', i + 1))
        optimizedIndex++
      } else {
        // Both lines exist but are different
        diffLines.push(renderDiffLine(originalLine, 'removed', i + 1))
        diffLines.push(renderDiffLine(optimizedLine, 'added', i + 1))
        originalIndex++
        optimizedIndex++
      }
    }
    
    return diffLines
  }

  return (
    <div className="space-y-6">
      {/* Explanation Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <CardTitle>Optimization Explanation</CardTitle>
              <Badge variant="secondary">
                Confidence: {Math.round(optimizedResult.confidence * 100)}%
              </Badge>
            </div>
            <div className="text-xs text-slate-500">
              {optimizedResult.timestamp}
            </div>
          </div>
          <CardDescription>
            Claude analyzed your configuration and suggested the following improvements:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-slate-700 dark:text-slate-300">
              {optimizedResult.explanation}
            </p>
          </div>
          
          {/* Confidence Score Details */}
          {optimizedResult.confidenceExplanation && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Confidence Analysis</span>
                <Badge variant={
                  optimizedResult.confidenceExplanation.riskLevel === 'low' ? 'default' :
                  optimizedResult.confidenceExplanation.riskLevel === 'medium' ? 'secondary' :
                  'destructive'
                }>
                  {optimizedResult.confidenceExplanation.riskLevel} risk
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="space-y-2">
                  <div className="text-xs text-slate-600 dark:text-slate-400">Confidence Factors:</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Change Complexity</span>
                      <span>{Math.round(optimizedResult.confidenceExplanation.factors.changeComplexity * 100)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Response Quality</span>
                      <span>{Math.round(optimizedResult.confidenceExplanation.factors.claudeResponseQuality * 100)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Validation</span>
                      <span>{Math.round(optimizedResult.confidenceExplanation.factors.validationResults * 100)}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs text-slate-600 dark:text-slate-400">Assessment:</div>
                  <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                    {optimizedResult.confidenceExplanation.reasoning.map((reason, index) => (
                      <li key={index} className="flex items-start space-x-1">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {optimizedResult.changes.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Key Changes:</h4>
              <div className="space-y-2">
                {optimizedResult.changes.map((change, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      change.type === 'addition' ? 'bg-green-500' :
                      change.type === 'deletion' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium capitalize">{change.type}</div>
                      <div className="text-slate-600 dark:text-slate-400">{change.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diff Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GitCommit className="h-5 w-5" />
            <span>Configuration Diff</span>
          </CardTitle>
          <CardDescription>
            Review the changes before applying the optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="diff">Unified Diff</TabsTrigger>
              <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
            </TabsList>
            
            <TabsContent value="diff" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b text-sm font-medium">
                  {originalConfig.name}
                </div>
                <div className="max-h-96 overflow-auto">
                  {generateDiffView()}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="side-by-side" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-red-50 dark:bg-red-950 px-4 py-2 border-b text-sm font-medium">
                    Original
                  </div>
                  <div className="max-h-96 overflow-auto">
                    <pre className="p-4 text-xs font-mono text-slate-700 dark:text-slate-300">
                      {optimizedResult.originalContent}
                    </pre>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-green-50 dark:bg-green-950 px-4 py-2 border-b text-sm font-medium">
                    Optimized
                  </div>
                  <div className="max-h-96 overflow-auto">
                    <pre className="p-4 text-xs font-mono text-slate-700 dark:text-slate-300">
                      {optimizedResult.optimizedContent}
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onUndo}>
          <Undo2 className="mr-2 h-4 w-4" />
          Undo Changes
        </Button>
        
        <Button 
          onClick={onApplyPatch}
          disabled={isApplying}
          className="bg-green-600 hover:bg-green-700"
        >
          {isApplying ? (
            <>
              <GitCommit className="mr-2 h-4 w-4 animate-spin" />
              Applying & Evaluating...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Apply Patch & Run Evaluation
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 