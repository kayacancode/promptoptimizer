import { NextRequest, NextResponse } from 'next/server'
import { BenchmarkRunner } from '@/lib/benchmarks/benchmark-runner'

interface ModelConfig {
  name: string
  enabled: boolean
  temperature?: number
  maxTokens?: number
}

export async function POST(request: NextRequest) {
  try {
    const { 
      originalPrompt,
      optimizedPrompt,
      modelConfigs
    } = await request.json()
    
    if (!originalPrompt || !optimizedPrompt) {
      return NextResponse.json(
        { success: false, error: 'Original and optimized prompts are required' },
        { status: 400 }
      )
    }

    const runner = new BenchmarkRunner()

    // Run evaluations on both prompts
    const originalResults = await runner.runModelEvaluations(originalPrompt, modelConfigs)
    const optimizedResults = await runner.runModelEvaluations(optimizedPrompt, modelConfigs)

    // Calculate improvements
    const improvements: Record<string, number> = {}
    let totalImprovement = 0
    let improvementCount = 0

    for (const model of modelConfigs.filter((m: ModelConfig) => m.enabled)) {
      const originalResult = originalResults.find(r => r.model === model.name)
      const optimizedResult = optimizedResults.find(r => r.model === model.name)
      
      if (originalResult && optimizedResult) {
        // Calculate weighted improvement across metrics
        const weights = {
          hallucinationRate: 0.4,  // Lower is better
          structureScore: 0.3,     // Higher is better
          consistencyScore: 0.3    // Higher is better
        }

        const hallucinationImprovement = ((originalResult.hallucinationRate - optimizedResult.hallucinationRate) / originalResult.hallucinationRate) * 100
        const structureImprovement = ((optimizedResult.structureScore - originalResult.structureScore) / originalResult.structureScore) * 100
        const consistencyImprovement = ((optimizedResult.consistencyScore - originalResult.consistencyScore) / originalResult.consistencyScore) * 100

        const improvement = (
          hallucinationImprovement * weights.hallucinationRate +
          structureImprovement * weights.structureScore +
          consistencyImprovement * weights.consistencyScore
        )

        improvements[model.name] = improvement
        totalImprovement += improvement
        improvementCount++
      }
    }

    const overallImprovement = improvementCount > 0 ? totalImprovement / improvementCount : 0

    const response = {
      originalPromptResults: originalResults,
      optimizedPromptResults: optimizedResults,
      improvements,
      overallImprovement,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Evaluation API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to evaluate prompts' },
      { status: 500 }
    )
  }
}
