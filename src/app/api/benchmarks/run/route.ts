import { NextRequest, NextResponse } from 'next/server'
import { BenchmarkConfig, BenchmarkEvaluationResult } from '@/types'
import { BenchmarkRunner } from '@/lib/benchmarks/benchmark-runner'

export async function POST(request: NextRequest) {
  try {
    const { 
      originalPrompt,
      optimizedPrompt,
      benchmarkConfigs
    } = await request.json()
    
    if (!originalPrompt || !optimizedPrompt || !benchmarkConfigs) {
      return NextResponse.json(
        { success: false, error: 'Missing required data: originalPrompt, optimizedPrompt, and benchmarkConfigs are required' },
        { status: 400 }
      )
    }

    const runner = new BenchmarkRunner()

    // Run benchmarks on both prompts
    const originalPromptResults = await runner.runMultipleBenchmarks(originalPrompt, benchmarkConfigs)
    
    const optimizedPromptResults = await runner.runMultipleBenchmarks(optimizedPrompt, benchmarkConfigs)

    // Calculate improvements
    const improvements: Record<string, number> = {}
    let totalImprovement = 0
    let improvementCount = 0

    for (const config of benchmarkConfigs.filter((c: BenchmarkConfig) => c.enabled)) {
      const originalResult = originalPromptResults.find(r => r.benchmark === config.name)
      const optimizedResult = optimizedPromptResults.find(r => r.benchmark === config.name)
      
      if (originalResult && optimizedResult) {
        const improvement = ((optimizedResult.accuracy - originalResult.accuracy) / originalResult.accuracy) * 100
        improvements[config.name] = improvement
        totalImprovement += improvement
        improvementCount++
      }
    }

    const overallImprovement = improvementCount > 0 ? totalImprovement / improvementCount : 0

    const result: BenchmarkEvaluationResult = {
      originalPromptResults,
      optimizedPromptResults,
      improvements,
      overallImprovement,
      timestamp: new Date().toISOString(),
      configuration: benchmarkConfigs
    }
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Benchmark API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to run benchmarks' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const prompt = searchParams.get('prompt')
    const benchmarks = searchParams.get('benchmarks')?.split(',') || ['MMLU', 'HellaSwag', 'TruthfulQA']
    const sampleSize = parseInt(searchParams.get('sampleSize') || '20')
    
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt parameter is required' },
        { status: 400 }
      )
    }

    const runner = new BenchmarkRunner()
    const configs: BenchmarkConfig[] = benchmarks.map(name => ({
      name: name as 'MMLU' | 'HellaSwag' | 'TruthfulQA',
      enabled: true,
      sampleSize,
      fullDataset: false
    }))

    const results = await runner.runMultipleBenchmarks(prompt, configs)
    
    return NextResponse.json({
      success: true,
      data: results
    })
  } catch (error) {
    console.error('Benchmark API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to run benchmark evaluation' },
      { status: 500 }
    )
  }
} 