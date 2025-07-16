'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { GitBranch, FileText, ArrowRight } from 'lucide-react'
import { GitHubConnection } from '@/components/GitHubConnection'
import { ConfigFile } from '@/types'

interface PromptInputProps {
  onFileSelect: (file: ConfigFile) => void
}

export function PromptInput({ onFileSelect }: PromptInputProps) {
  const [inputMode, setInputMode] = useState<'github' | 'manual'>('manual')
  const [promptText, setPromptText] = useState('')
  const [promptFormat, setPromptFormat] = useState<'text' | 'json' | 'yaml'>('text')

  const handleManualSubmit = () => {
    if (!promptText.trim()) return

    const configFile: ConfigFile = {
      name: `prompt.${promptFormat === 'text' ? 'txt' : promptFormat}`,
      type: promptFormat === 'text' ? 'markdown' : promptFormat,
      content: promptText,
      size: promptText.length
    }

    onFileSelect(configFile)
  }

  const formatPromptForDisplay = (text: string, format: string) => {
    switch (format) {
      case 'json':
        try {
          return JSON.stringify(JSON.parse(text), null, 2)
        } catch {
          return text
        }
      case 'yaml':
        return text
      default:
        return text
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Mode Selection */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Choose Input Method</h3>
            <p className="text-sm text-muted-foreground">
              Connect to GitHub to browse your repository files or manually enter your prompt
            </p>
          </div>
          
          <div className="flex gap-4">
            <Button 
              variant={inputMode === 'manual' ? 'default' : 'outline'}
              onClick={() => setInputMode('manual')}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Manual Input
            </Button>
            <Button 
              variant={inputMode === 'github' ? 'default' : 'outline'}
              onClick={() => setInputMode('github')}
              className="flex-1"
            >
              <GitBranch className="h-4 w-4 mr-2" />
              GitHub Connection
            </Button>
          </div>
        </div>
      </Card>

      {/* Content based on selected mode */}
      {inputMode === 'manual' ? (
        <Card>
          <CardHeader>
            <CardTitle>Manual Prompt Input</CardTitle>
            <CardDescription>
              Enter your prompt directly in text, JSON, or YAML format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select  value={promptFormat} onValueChange={(value: 'text' | 'json' | 'yaml') => setPromptFormat(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className='bg-white'>
                  <SelectItem value="text">Plain Text</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="yaml">YAML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt Content</Label>
              <Textarea
                id="prompt"
                placeholder={
                  promptFormat === 'json' 
                    ? '{\n  "role": "assistant",\n  "content": "You are a helpful assistant..."\n}'
                    : promptFormat === 'yaml'
                    ? 'role: assistant\ncontent: |\n  You are a helpful assistant...'
                    : 'You are a helpful assistant that provides clear, accurate responses...'
                }
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="min-h-32 font-mono text-sm"
                rows={8}
              />
            </div>

            {promptText && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="p-3 bg-secondary rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">
                    {formatPromptForDisplay(promptText, promptFormat)}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                onClick={handleManualSubmit}
                disabled={!promptText.trim()}
                className="btn-primary"
              >
                Use This Prompt
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <GitHubConnection onFileSelect={onFileSelect} />
      )}
    </div>
  )
}