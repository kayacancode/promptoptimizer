import { NextRequest, NextResponse } from 'next/server'
import { BenchmarkRunner } from '@/lib/benchmarks/benchmark-runner'

export async function POST(request: NextRequest) {
  try {
    const { 
      prompt,
      modelConfigs
    } = await request.json()
    
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const runner = new BenchmarkRunner()
    
    // Run model evaluations
    const results = await runner.runModelEvaluations(prompt, modelConfigs)
    
    // Calculate overall metrics
    const totalSamples = results.reduce((sum, r) => sum + r.totalSamples, 0)
    const avgHallucination = results.reduce((sum, r) => sum + r.hallucinationRate, 0) / results.length
    const avgStructure = results.reduce((sum, r) => sum + r.structureScore, 0) / results.length
    const avgConsistency = results.reduce((sum, r) => sum + r.consistencyScore, 0) / results.length
    
    const response = {
      results,
      summary: {
        totalSamples,
        averageMetrics: {
          hallucinationRate: avgHallucination,
          structureScore: avgStructure,
          consistencyScore: avgConsistency
        },
        modelsEvaluated: results.length,
        completedAt: new Date().toISOString()
      }
    }
    
    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Model evaluation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to run model evaluation' },
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
      name: name as 'MMLU' | 'HellaSwag' | 'TruthfulQA' | 'HumanEval' | 'MBPP' | 'WritingBench' | 'ConvBench' | 'SafetyBench',
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