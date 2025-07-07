import { NextRequest, NextResponse } from 'next/server'
import { BenchmarkConfig } from '@/types'
import { BenchmarkRunner } from '@/lib/benchmarks/benchmark-runner'

export async function POST(request: NextRequest) {
  try {
    const { 
      prompt,
      benchmarks = ['MMLU', 'HellaSwag', 'TruthfulQA']
    } = await request.json()
    
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const runner = new BenchmarkRunner()
    
    // Create configs for full dataset evaluation
    const configs: BenchmarkConfig[] = benchmarks.map((name: string) => ({
      name: name as 'MMLU' | 'HellaSwag' | 'TruthfulQA' | 'HumanEval' | 'MBPP' | 'WritingBench' | 'ConvBench' | 'SafetyBench',
      enabled: true,
      sampleSize: 0, // Not used for full dataset
      fullDataset: true
    }))

    const results = await runner.runMultipleBenchmarks(prompt, configs)
    
    // Calculate overall metrics
    const totalQuestions = results.reduce((sum, r) => sum + r.totalQuestions, 0)
    const totalCorrect = results.reduce((sum, r) => sum + r.correctAnswers, 0)
    const overallAccuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0
    
    const response = {
      results,
      summary: {
        totalQuestions,
        totalCorrect,
        overallAccuracy,
        benchmarksRun: results.length,
        completedAt: new Date().toISOString()
      }
    }
    
    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Full benchmark API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to run full benchmark evaluation' },
      { status: 500 }
    )
  }
} 