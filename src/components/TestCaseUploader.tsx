'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  AlertCircle,
  FileSpreadsheet,
  Code
} from 'lucide-react'
import { TestCase } from '@/types'

interface TestCaseUploaderProps {
  testCases: TestCase[]
  onTestCasesChange: (testCases: TestCase[]) => void
  onRunTests?: () => void
  isRunning?: boolean
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  preview: TestCase[]
}

interface UploadedTestCase {
  input: string
  beforeOutput?: string
  afterOutput?: string
  expected_output?: string
  passed?: boolean
  score?: number
  domain?: string
  category?: string
  useCase?: string
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export function TestCaseUploader({ 
  testCases, 
  onTestCasesChange, 
  onRunTests,
  isRunning = false 
}: TestCaseUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [newTestCase, setNewTestCase] = useState<Partial<TestCase>>({
    input: '',
    beforeOutput: '',
    afterOutput: '',
    passed: false,
    score: 0
  })

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text()
      let parsedData: UploadedTestCase[]

      // Parse based on file extension
      if (file.name.endsWith('.json')) {
        parsedData = JSON.parse(text) as UploadedTestCase[]
      } else if (file.name.endsWith('.csv')) {
        parsedData = parseCSV(text)
      } else {
        throw new Error('Unsupported file format. Please use JSON or CSV.')
      }

      // Validate and convert to TestCase format
      const validation = validateTestCases(parsedData)
      setValidationResult(validation)

      if (validation.isValid) {
        onTestCasesChange([...testCases, ...validation.preview])
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        errors: [`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        preview: []
      })
    }
  }

  const parseCSV = (csvText: string): UploadedTestCase[] => {
    const lines = csvText.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const obj: Record<string, unknown> = {}
      headers.forEach((header, index) => {
        obj[header] = values[index] || ''
      })
      return obj as unknown as UploadedTestCase
    })
  }

  const validateTestCases = (data: UploadedTestCase[]): ValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []
    const preview: TestCase[] = []

    if (!Array.isArray(data)) {
      errors.push('Data must be an array of test cases')
      return { isValid: false, errors, warnings, preview }
    }

    data.forEach((item, index) => {
      if (!item.input || typeof item.input !== 'string') {
        errors.push(`Row ${index + 1}: Missing or invalid 'input' field`)
        return
      }

      // Convert to TestCase format
      const testCase: TestCase = {
        input: item.input,
        beforeOutput: item.beforeOutput || item.expected_output || '',
        afterOutput: item.afterOutput || '',
        passed: item.passed !== undefined ? Boolean(item.passed) : true,
        score: item.score !== undefined ? Math.max(0, Math.min(1, Number(item.score))) : 1,
        metadata: {
          source: 'user_provided',
          domain: item.domain || 'user_defined',
          useCase: item.useCase || item.category || 'custom',
          ...item.metadata
        }
      }

      // Warnings for missing optional fields
      if (!testCase.beforeOutput) {
        warnings.push(`Row ${index + 1}: No 'beforeOutput' provided - will be generated during evaluation`)
      }
      if (!testCase.afterOutput) {
        warnings.push(`Row ${index + 1}: No 'afterOutput' provided - will be generated during evaluation`)
      }

      preview.push(testCase)
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      preview
    }
  }

  const addNewTestCase = () => {
    if (!newTestCase.input?.trim()) return

    const testCase: TestCase = {
      input: newTestCase.input,
      beforeOutput: newTestCase.beforeOutput || '',
      afterOutput: newTestCase.afterOutput || '',
      passed: newTestCase.passed || false,
      score: newTestCase.score || 0,
      metadata: {
        source: 'user_provided',
        domain: 'user_defined',
        useCase: 'custom'
      }
    }

    onTestCasesChange([...testCases, testCase])
    setNewTestCase({ input: '', beforeOutput: '', afterOutput: '', passed: false, score: 0 })
  }

  const removeTestCase = (index: number) => {
    const updated = testCases.filter((_, i) => i !== index)
    onTestCasesChange(updated)
  }

  const editTestCase = (index: number, updatedCase: TestCase) => {
    const updated = [...testCases]
    updated[index] = updatedCase
    onTestCasesChange(updated)
    setEditingIndex(null)
  }

  const downloadTemplate = (format: 'json' | 'csv') => {
    const template = [
      {
        input: "What is the capital of France?",
        beforeOutput: "I think it might be London or Paris.",
        afterOutput: "The capital of France is Paris.",
        passed: true,
        score: 0.9,
        domain: "geography",
        category: "factual_questions"
      },
      {
        input: "How do I debug a React component?",
        beforeOutput: "Try using console.log statements.",
        afterOutput: "Use React DevTools to inspect component state and props. Set breakpoints in your code and check the browser console for errors. Also consider using console.log strategically.",
        passed: true,
        score: 0.85,
        domain: "coding",
        category: "debugging"
      }
    ]

    let content: string
    let filename: string

    if (format === 'json') {
      content = JSON.stringify(template, null, 2)
      filename = 'test-cases-template.json'
    } else {
      const headers = ['input', 'beforeOutput', 'afterOutput', 'passed', 'score', 'domain', 'category']
      const csvRows = [
        headers.join(','),
        ...template.map(row => 
          headers.map(header => `&quot;${(row as Record<string, unknown>)[header] || ''}&quot;`).join(',')
        )
      ]
      content = csvRows.join('\n')
      filename = 'test-cases-template.csv'
    }

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle>Upload Test Cases</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate('json')}
              >
                <Code className="mr-2 h-4 w-4" />
                JSON Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate('csv')}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV Template
              </Button>
            </div>
          </div>
          <CardDescription>
            Upload your own test cases (JSON or CSV format) or create them manually
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-muted-foreground'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Drop your test cases here</p>
                <p className="text-sm text-muted-foreground">or click to browse files</p>
              </div>
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer">
                  Choose File
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {validationResult.isValid ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span>Validation Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationResult.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Errors</h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {validationResult.warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Warnings</h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  {validationResult.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationResult.isValid && (
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <p className="text-green-800 dark:text-green-200">
                  ✅ Successfully loaded {validationResult.preview.length} test cases
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Cases Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Test Cases ({testCases.length})</CardTitle>
            <div className="flex items-center space-x-2">
              {testCases.length > 0 && onRunTests && (
                <Button 
                  onClick={onRunTests} 
                  disabled={isRunning}
                  className="btn-primary"
                >
                  {isRunning ? 'Running...' : 'Run Tests'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList>
              <TabsTrigger value="list">Test List</TabsTrigger>
              <TabsTrigger value="add">Add New</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="space-y-4">
              {testCases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No test cases uploaded yet. Upload a file or add them manually.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {testCases.map((testCase, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              Test {index + 1}
                            </Badge>
                            {testCase.metadata?.source && (
                              <Badge variant="secondary" className="text-xs">
                                {testCase.metadata.source === 'user_provided' ? 'User' : testCase.metadata.source}
                              </Badge>
                            )}
                            {testCase.metadata?.domain && (
                              <Badge variant="outline" className="text-xs">
                                {testCase.metadata.domain}
                              </Badge>
                            )}
                          </div>
                          
                          {editingIndex === index ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={testCase.input}
                                onChange={(e) => editTestCase(index, { ...testCase, input: e.target.value })}
                                className="w-full p-2 border rounded text-sm"
                                placeholder="Test input..."
                              />
                              <div className="flex space-x-2">
                                <Button size="sm" onClick={() => setEditingIndex(null)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditingIndex(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-medium mb-1">Input:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {testCase.input}
                              </p>
                              {testCase.beforeOutput && (
                                <p className="text-xs text-gray-500">
                                  Has expected output defined
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingIndex(index)}
                            disabled={editingIndex !== null}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTestCase(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="add">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Test Input *</label>
                  <textarea
                    value={newTestCase.input}
                    onChange={(e) => setNewTestCase({ ...newTestCase, input: e.target.value })}
                    placeholder="Enter the input/question for this test case..."
                    className="w-full p-3 border rounded-md h-24 resize-none"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Expected Output (Optional)</label>
                  <textarea
                    value={newTestCase.beforeOutput}
                    onChange={(e) => setNewTestCase({ ...newTestCase, beforeOutput: e.target.value })}
                    placeholder="Expected response (leave empty to generate during evaluation)..."
                    className="w-full p-3 border rounded-md h-20 resize-none"
                  />
                </div>
                
                <Button 
                  onClick={addNewTestCase}
                  disabled={!newTestCase.input?.trim()}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Test Case
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 