import { NextRequest, NextResponse } from 'next/server'
import { BenchmarkRunner } from '@/lib/benchmarks/benchmark-runner'
import { semanticScorer } from '@/lib/evaluation/semantic-scoring'

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

    // Calculate improvements (traditional metrics + semantic scoring)
    const improvements: Record<string, number> = {}
    const semanticScores: Record<string, any> = {}
    let totalImprovement = 0
    let improvementCount = 0

    for (const model of modelConfigs.filter((m: ModelConfig) => m.enabled)) {
      const originalResult = originalResults.find(r => r.model === model.name)
      const optimizedResult = optimizedResults.find(r => r.model === model.name)
      
      if (originalResult && optimizedResult && originalResult.totalSamples > 0 && optimizedResult.totalSamples > 0) {
        // Calculate weighted improvement across metrics
        const weights = {
          hallucinationRate: 0.4,  // Lower is better
          structureScore: 0.3,     // Higher is better
          consistencyScore: 0.3    // Higher is better
        }

        // Handle division by zero and calculate improvements safely
        const hallucinationImprovement = originalResult.hallucinationRate > 0 
          ? ((originalResult.hallucinationRate - optimizedResult.hallucinationRate) / originalResult.hallucinationRate) * 100
          : 0

        const structureImprovement = originalResult.structureScore > 0
          ? ((optimizedResult.structureScore - originalResult.structureScore) / originalResult.structureScore) * 100
          : 0

        const consistencyImprovement = originalResult.consistencyScore > 0
          ? ((optimizedResult.consistencyScore - originalResult.consistencyScore) / originalResult.consistencyScore) * 100
          : 0

        const improvement = (
          hallucinationImprovement * weights.hallucinationRate +
          structureImprovement * weights.structureScore +
          consistencyImprovement * weights.consistencyScore
        )

        // Ensure improvement is a valid number
        improvements[model.name] = isNaN(improvement) || !isFinite(improvement) ? 0 : improvement

        // Calculate semantic scores if responses are available
        if (originalResult.responses?.[0] && optimizedResult.responses?.[0]) {
          try {
            const semanticScore = await semanticScorer.calculateSemanticScores(
              originalPrompt,
              optimizedPrompt,
              originalResult.responses[0],
              optimizedResult.responses[0]
            )
            
            semanticScores[model.name] = semanticScore
            
            // Add semantic improvement to overall score (weighted)
            const semanticWeight = 0.3 // 30% weight for semantic scoring
            const traditionalWeight = 0.7 // 70% weight for traditional metrics
            
            const combinedImprovement = (improvement * traditionalWeight) + 
              (semanticScore.qualityImprovement * semanticWeight)
            
            improvements[model.name] = combinedImprovement
            
            // Store high-quality responses in Pinecone for future reference
            if (semanticScore.qualityImprovement > 10) {
              await semanticScorer.storeResponseVector(optimizedResult.responses[0], {
                model: model.name,
                quality: semanticScore.qualityImprovement / 100,
                prompt_type: 'optimized'
              })
            }
          } catch (error) {
            console.error(`Error calculating semantic scores for ${model.name}:`, error)
            semanticScores[model.name] = null
          }
        }

        totalImprovement += improvements[model.name]
        improvementCount++
      }
    }

    const overallImprovement = improvementCount > 0 ? totalImprovement / improvementCount : 0

    const response = {
      originalPromptResults: originalResults,
      optimizedPromptResults: optimizedResults,
      improvements,
      semanticScores,
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
