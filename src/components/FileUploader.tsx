'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { ConfigFile } from '@/types'

interface FileUploaderProps {
  onFileUpload: (file: ConfigFile) => void
}

export function FileUploader({ onFileUpload }: FileUploaderProps) {
  const [pastedContent, setPastedContent] = useState('')
  const [selectedFileType, setSelectedFileType] = useState<'yaml' | 'json' | 'typescript'>('yaml')
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectFileType = (filename: string, content: string): 'yaml' | 'json' | 'typescript' => {
    const extension = filename.split('.').pop()?.toLowerCase()
    
    if (extension === 'ts' || extension === 'tsx') return 'typescript'
    if (extension === 'json') return 'json'
    if (extension === 'yaml' || extension === 'yml') return 'yaml'
    
    // Try to detect by content
    try {
      JSON.parse(content)
      return 'json'
    } catch {
      if (content.includes('export') || content.includes('interface') || content.includes('type')) {
        return 'typescript'
      }
      return 'yaml'
    }
  }

  const validateContent = (content: string, type: 'yaml' | 'json' | 'typescript'): boolean => {
    if (!content.trim()) return false
    
    if (type === 'json') {
      try {
        JSON.parse(content)
        return true
      } catch {
        return false
      }
    }
    
    return true // For YAML and TypeScript, we'll do basic validation
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleFileInput = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const type = detectFileType(file.name, content)
      
      if (!validateContent(content, type)) {
        setError(`Invalid ${type.toUpperCase()} content`)
        return
      }

      const configFile: ConfigFile = {
        name: file.name,
        type,
        content,
        size: file.size
      }
      
      onFileUpload(configFile)
    }
    reader.readAsText(file)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setError(null)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileInput(files[0])
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileInput(files[0])
    }
  }

  const handlePasteUpload = () => {
    if (!pastedContent.trim()) {
      setError('Please paste some content')
      return
    }

    if (!validateContent(pastedContent, selectedFileType)) {
      setError(`Invalid ${selectedFileType.toUpperCase()} content`)
      return
    }

    const configFile: ConfigFile = {
      name: `pasted-config.${selectedFileType === 'typescript' ? 'ts' : selectedFileType}`,
      type: selectedFileType,
      content: pastedContent,
      size: pastedContent.length
    }
    
    onFileUpload(configFile)
  }

  return (
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload">Upload File</TabsTrigger>
        <TabsTrigger value="paste">Paste Content</TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload" className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${dragActive 
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' 
                  : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
                  Drop your config file here
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  or click to browse (YAML, JSON, TypeScript)
                </p>
              </div>
              <input
                type="file"
                accept=".yaml,.yml,.json,.ts,.tsx"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button asChild className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Browse Files
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="paste" className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Select file type:</span>
              <select 
                value={selectedFileType}
                                 onChange={(e) => setSelectedFileType(e.target.value as 'yaml' | 'json' | 'typescript')}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="yaml">YAML</option>
                <option value="json">JSON</option>
                <option value="typescript">TypeScript</option>
              </select>
            </div>
            
            <Textarea
              placeholder="Paste your configuration content here..."
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            
            <Button 
              onClick={handlePasteUpload}
              disabled={!pastedContent.trim()}
              className="w-full"
            >
              Process Pasted Content
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
      
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </Tabs>
  )
} 