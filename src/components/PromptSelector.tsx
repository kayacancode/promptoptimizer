'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Code2, FileText, MessageSquare, Settings, ChevronRight } from 'lucide-react'
import { ConfigFile, ExtractedPrompt } from '@/types'

interface PromptSelectorProps {
  configFile: ConfigFile
  onPromptSelect: (selectedPrompt: string) => void
  onOptimize: () => void
  isOptimizing: boolean
}

export function PromptSelector({ configFile, onPromptSelect, onOptimize, isOptimizing }: PromptSelectorProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<ExtractedPrompt | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')

  const getPromptIcon = (type: string) => {
    switch (type) {
      case 'system_prompt':
        return <Settings className="h-4 w-4 text-blue-500" />
      case 'user_prompt':
        return <MessageSquare className="h-4 w-4 text-green-500" />
      case 'template':
        return <Code2 className="h-4 w-4 text-purple-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const handleSelectPrompt = (prompt: ExtractedPrompt) => {
    setSelectedPrompt(prompt)
    setCustomPrompt(prompt.content)
  }

  const handleOptimize = () => {
    const promptToOptimize = selectedPrompt ? customPrompt : configFile.content
    onPromptSelect(promptToOptimize)
    onOptimize()
  }

  // If no extracted prompts, show the whole file
  if (!configFile.extractedPrompts || configFile.extractedPrompts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Full File Content</CardTitle>
          <CardDescription>
            No prompts detected in {configFile.name}. You can optimize the entire file content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg max-h-40 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap">{configFile.content.substring(0, 500)}...</pre>
            </div>
            <Button 
              onClick={() => {
                onPromptSelect(configFile.content)
                onOptimize()
              }} 
              className="w-full"
              disabled={isOptimizing}
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize Entire File'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Extracted Prompts */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Prompts</CardTitle>
          <CardDescription>
            Found {configFile.extractedPrompts.length} prompts in {configFile.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {configFile.extractedPrompts.map((prompt, index) => (
              <div
                key={prompt.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedPrompt?.id === prompt.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => handleSelectPrompt(prompt)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getPromptIcon(prompt.type)}
                    <Badge variant="outline" className="text-xs">
                      {prompt.type.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-gray-500">Line {prompt.lineNumber}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                
                <div className="text-sm font-medium mb-1">{prompt.context}</div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  {prompt.content.length > 150 
                    ? `${prompt.content.substring(0, 150)}...` 
                    : prompt.content
                  }
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Prompt Editor */}
      {selectedPrompt && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Prompt</CardTitle>
            <CardDescription>
              Edit and optimize: {selectedPrompt.context}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Edit the prompt content..."
                className="min-h-32"
              />
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {customPrompt.length} characters
                </div>
                <Button onClick={handleOptimize} disabled={isOptimizing}>
                  {isOptimizing ? 'Optimizing...' : 'Optimize This Prompt'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                onPromptSelect(configFile.content)
                onOptimize()
              }}
              disabled={isOptimizing}
            >
              {isOptimizing ? 'Optimizing...' : 'Optimize Entire File'}
            </Button>
            
            {configFile.extractedPrompts.length > 1 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const allPrompts = configFile.extractedPrompts!
                    .map(p => `// ${p.context}\\n${p.content}`)
                    .join('\\n\\n')
                  onPromptSelect(allPrompts)
                  onOptimize()
                }}
                disabled={isOptimizing}
              >
                {isOptimizing ? 'Optimizing...' : 'Optimize All Prompts'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}