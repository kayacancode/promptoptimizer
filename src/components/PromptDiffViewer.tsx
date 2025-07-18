'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GitCommit, Copy, Download, Lightbulb, ArrowRight } from 'lucide-react'

interface PromptDiffViewerProps {
  originalPrompt: string
  optimizedPrompt: string
  explanation: string
  improvements?: any[]
  overallImprovement?: number
  onDownload?: () => void
  onContinue?: () => void
}

export function PromptDiffViewer({ 
  originalPrompt, 
  optimizedPrompt, 
  explanation,
  improvements = [],
  overallImprovement,
  onDownload,
  onContinue
}: PromptDiffViewerProps) {
  const [selectedTab, setSelectedTab] = useState('side-by-side')
  const [copySuccess, setCopySuccess] = useState('')

  const handleDirectDownload = () => {
    const timestamp = new Date().toISOString().split('T')[0]
    const content = optimizedPrompt
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `optimized-prompt-${timestamp}.txt`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleCopy = async (text: string, type: 'original' | 'optimized') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(type)
      setTimeout(() => setCopySuccess(''), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const renderDiffLine = (line: string, type: 'added' | 'removed' | 'unchanged', lineNumber: number) => {
    const bgColor = type === 'added' ? 'bg-green-50 dark:bg-green-950' : 
                   type === 'removed' ? 'bg-red-50 dark:bg-red-950' : 
                   'bg-transparent'
    const textColor = type === 'added' ? 'text-green-800 dark:text-green-200' : 
                     type === 'removed' ? 'text-red-800 dark:text-red-200' : 
                     'text-gray-700 dark:text-gray-300'
    const prefix = type === 'added' ? '+' : type === 'removed' ? '-' : ' '

    return (
      <div key={`${type}-${lineNumber}`} className={`flex ${bgColor} border-l-4 ${
        type === 'added' ? 'border-green-400' : 
        type === 'removed' ? 'border-red-400' : 
        'border-transparent'
      }`}>
        <div className="w-12 text-xs text-gray-400 text-right pr-2 py-2 select-none">
          {lineNumber}
        </div>
        <div className="w-6 text-xs text-center py-2 select-none font-mono">
          {prefix}
        </div>
        <div className={`flex-1 py-2 px-3 font-mono text-sm ${textColor}`}>
          {line}
        </div>
      </div>
    )
  }

  const generateDiffView = () => {
    const originalLines = originalPrompt.split('\n')
    const optimizedLines = optimizedPrompt.split('\n')
    
    // Simple diff algorithm
    const diffLines: React.ReactElement[] = []
    let originalIndex = 0
    let optimizedIndex = 0
    
    const maxLines = Math.max(originalLines.length, optimizedLines.length)
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[originalIndex]
      const optimizedLine = optimizedLines[optimizedIndex]
      
      if (originalLine === optimizedLine) {
        if (originalLine !== undefined) {
          diffLines.push(renderDiffLine(originalLine, 'unchanged', i + 1))
        }
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
        if (originalLine) {
          diffLines.push(renderDiffLine(originalLine, 'removed', i + 1))
        }
        if (optimizedLine) {
          diffLines.push(renderDiffLine(optimizedLine, 'added', i + 1))
        }
        originalIndex++
        optimizedIndex++
      }
    }
    
    return diffLines
  }

  return (
    <div className="space-y-6">
      {/* Improvement Summary */}
      {overallImprovement !== undefined && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-800 dark:text-green-200 flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />
                Optimization Results
              </CardTitle>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                +{overallImprovement.toFixed(1)}% improvement
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-green-700 dark:text-green-300 mb-4">
              {explanation}
            </p>
            {improvements.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-green-800 dark:text-green-200">Key Improvements:</h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  {improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diff Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <GitCommit className="h-5 w-5 mr-2" />
              <span>Prompt Comparison</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDirectDownload}
                className="flex items-center"
              >
                <Download className="h-4 w-4 mr-1" />
                Download Optimized Prompt
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Compare your original prompt with the optimized version
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
              <TabsTrigger value="unified">Unified Diff</TabsTrigger>
            </TabsList>
            
            <TabsContent value="side-by-side" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-black">Original Prompt</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleCopy(originalPrompt, 'original')}
                      className="flex items-center"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copySuccess === 'original' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-red-50 dark:bg-red-950 px-4 py-2 border-b text-sm font-medium text-red-800 dark:text-red-200">
                      Before Optimization
                    </div>
                    <div className="max-h-96 overflow-auto">
                      <pre className="p-4 text-sm font-mono text-black whitespace-pre-wrap">
                        {originalPrompt}
                      </pre>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-black">Optimized Prompt</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleCopy(optimizedPrompt, 'optimized')}
                      className="flex items-center"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      {copySuccess === 'optimized' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-green-50 dark:bg-green-950 px-4 py-2 border-b text-sm font-medium text-green-800 dark:text-green-200">
                      After Optimization
                    </div>
                    <div className="max-h-96 overflow-auto">
                      <pre className="p-4 text-sm font-mono text-black whitespace-pre-wrap">
                        {optimizedPrompt}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="unified" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b text-sm font-medium">
                  Unified Diff View
                </div>
                <div className="max-h-96 overflow-auto">
                  <div className="font-mono text-sm">
                    {generateDiffView()}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* Action Buttons */}
          <div className="flex justify-end mt-6">
            {onContinue && (
              <Button 
                onClick={onContinue}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Continue to Evaluation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}