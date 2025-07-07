import { NextRequest, NextResponse } from 'next/server'
import { TestCase } from '@/types'
import { authenticateRequest } from '@/lib/auth-middleware'
import { SupabaseAccessKeyManager } from '@/lib/supabase-access-keys'

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request)
    if (!auth.authorized) {
      return NextResponse.json({
        success: false,
        error: auth.error || 'Unauthorized'
      }, { status: 401 })
    }

    const { testCases } = await request.json()
    
    if (!testCases || !Array.isArray(testCases)) {
      return NextResponse.json(
        { success: false, error: 'Test cases must be an array' },
        { status: 400 }
      )
    }

    const validation = validateTestCases(testCases)
    
    // Save the test case upload session to Supabase
    if (auth.userId && validation.isValid) {
      try {
        const sessionData = {
          action: 'test-cases-upload',
          uploadedCount: testCases.length,
          validatedCount: validation.testCases.length,
          validation: {
            errors: validation.errors,
            warnings: validation.warnings,
            statistics: validation.statistics
          },
          timestamp: new Date().toISOString()
        }
        
        await SupabaseAccessKeyManager.saveSession(auth.userId, sessionData)
      } catch (error) {
        console.error('Failed to save test case upload session to Supabase:', error)
        // Continue execution - don't fail the request if saving fails
      }
    }
    
    return NextResponse.json({
      success: validation.isValid,
      data: validation
    })
  } catch (error) {
    console.error('Test case upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process test cases' },
      { status: 500 }
    )
  }
}

function validateTestCases(uploadedCases: any[]) {
  const errors: string[] = []
  const warnings: string[] = []
  const testCases: TestCase[] = []

  uploadedCases.forEach((uploaded, index) => {
    const rowNum = index + 1

    if (!uploaded.input || typeof uploaded.input !== 'string') {
      errors.push(`Row ${rowNum}: 'input' field is required`)
      return
    }

    const testCase: TestCase = {
      input: uploaded.input.trim(),
      beforeOutput: uploaded.beforeOutput || '',
      afterOutput: uploaded.afterOutput || '',
      passed: uploaded.passed !== undefined ? Boolean(uploaded.passed) : true,
      score: uploaded.score ? Math.max(0, Math.min(1, Number(uploaded.score))) : 0,
      metadata: {
        source: 'user_provided',
        domain: uploaded.domain || 'user_defined',
        useCase: uploaded.category || 'custom'
      }
    }

    if (!testCase.beforeOutput) {
      warnings.push(`Row ${rowNum}: No expected output - will be generated during evaluation`)
    }

    testCases.push(testCase)
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    testCases,
    statistics: {
      total: testCases.length,
      withExpectedOutput: testCases.filter(tc => tc.beforeOutput).length,
      domains: [...new Set(testCases.map(tc => tc.metadata?.domain))],
      avgScore: testCases.reduce((sum, tc) => sum + tc.score, 0) / testCases.length
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'
  
  const template = [
    {
      input: "What is the capital of France?",
      beforeOutput: "The capital of France is Paris.",
      passed: true,
      score: 0.9,
      domain: "geography"
    }
  ]

  if (format === 'csv') {
    const csv = 'input,beforeOutput,passed,score,domain\n"What is the capital of France?","The capital of France is Paris.",true,0.9,"geography"'
    return new Response(csv, {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="template.csv"' }
    })
  }

  return NextResponse.json(template)
} 