import { NextRequest, NextResponse } from 'next/server'
import { BenchmarkRunner } from '@/lib/benchmarks/benchmark-runner'
import { semanticScorer } from '@/lib/evaluation/semantic-scoring'
import { AutoOptimizer } from '@/lib/autonomous/auto-optimizer'

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
      evaluationInput,
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
    let originalResults, optimizedResults
    
    if (evaluationInput && evaluationInput.trim()) {
      // Use the evaluation input to test both prompts with real context
      originalResults = await runner.runPromptWithInput(originalPrompt, evaluationInput, modelConfigs)
      optimizedResults = await runner.runPromptWithInput(optimizedPrompt, evaluationInput, modelConfigs)
    } else {
      // Fallback to standard evaluation without specific input
      originalResults = await runner.runModelEvaluations(originalPrompt, modelConfigs)
      optimizedResults = await runner.runModelEvaluations(optimizedPrompt, modelConfigs)
    }

    // Calculate improvements (traditional metrics + semantic scoring)
    let improvements: Record<string, number> = {}
    let semanticScores: Record<string, any> = {}
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

    let overallImprovement = improvementCount > 0 ? totalImprovement / improvementCount : 0

    // Calculate absolute performance scores for threshold checking
    const getAbsoluteScore = (results: any[]) => {
      if (results.length === 0) return 0
      let totalScore = 0
      let count = 0
      
      for (const result of results) {
        if (result.totalSamples > 0) {
          // Convert metrics to 0-100 scale
          const hallucinationScore = (1 - result.hallucinationRate) * 100
          const structureScore = result.structureScore * 100
          const consistencyScore = result.consistencyScore * 100
          
          // Weighted average
          const score = (hallucinationScore * 0.4) + (structureScore * 0.3) + (consistencyScore * 0.3)
          totalScore += score
          count++
        }
      }
      
      return count > 0 ? totalScore / count : 0
    }
    
    const optimizedAbsoluteScore = getAbsoluteScore(optimizedResults)
    console.log(`[DEBUG] Optimized absolute score: ${optimizedAbsoluteScore}%`)
    console.log(`[DEBUG] Relative improvement: ${overallImprovement}%`)
    
    // Check for auto-optimization based on absolute performance (not just improvement)
    let autoOptimizationResult = null
    const shouldTriggerAutoOptimization = optimizedAbsoluteScore < 40 // Use absolute score
    console.log(`[DEBUG] Should trigger auto-optimization: ${shouldTriggerAutoOptimization} (score: ${optimizedAbsoluteScore}%, threshold: 40%)`)
    
    if (shouldTriggerAutoOptimization) {
      console.log(`[DEBUG] Absolute score ${optimizedAbsoluteScore}% below threshold, triggering auto-optimization`)
      const autoOptimizer = new AutoOptimizer()
      autoOptimizationResult = await autoOptimizer.detectAndOptimize(
        optimizedPrompt,
        optimizedAbsoluteScore,
        40
      )
      console.log(`[DEBUG] Auto-optimization result:`, autoOptimizationResult)
      
      // If auto-optimization succeeded, re-run evaluation with the improved prompt
      if (autoOptimizationResult && autoOptimizationResult.status === 'success') {
        console.log(`[DEBUG] Re-running evaluation with auto-optimized prompt`)
        const autoOptimizedPrompt = autoOptimizationResult.selectedCandidate.prompt
        
        // Re-run evaluation with auto-optimized prompt
        let newOptimizedResults
        if (evaluationInput && evaluationInput.trim()) {
          newOptimizedResults = await runner.runPromptWithInput(autoOptimizedPrompt, evaluationInput, modelConfigs)
        } else {
          newOptimizedResults = await runner.runModelEvaluations(autoOptimizedPrompt, modelConfigs)
        }
        
        // Recalculate improvements with the auto-optimized prompt
        const newImprovements: Record<string, number> = {}
        let newTotalImprovement = 0
        let newImprovementCount = 0
        
        for (const model of modelConfigs.filter((m: ModelConfig) => m.enabled)) {
          const originalResult = originalResults.find(r => r.model === model.name)
          const newOptimizedResult = newOptimizedResults.find(r => r.model === model.name)
          
          if (originalResult && newOptimizedResult && originalResult.totalSamples > 0 && newOptimizedResult.totalSamples > 0) {
            const weights = {
              hallucinationRate: 0.4,
              structureScore: 0.3,
              consistencyScore: 0.3
            }

            const hallucinationImprovement = originalResult.hallucinationRate > 0 
              ? ((originalResult.hallucinationRate - newOptimizedResult.hallucinationRate) / originalResult.hallucinationRate) * 100
              : 0

            const structureImprovement = originalResult.structureScore > 0
              ? ((newOptimizedResult.structureScore - originalResult.structureScore) / originalResult.structureScore) * 100
              : 0

            const consistencyImprovement = originalResult.consistencyScore > 0
              ? ((newOptimizedResult.consistencyScore - originalResult.consistencyScore) / originalResult.consistencyScore) * 100
              : 0

            const improvement = (
              hallucinationImprovement * weights.hallucinationRate +
              structureImprovement * weights.structureScore +
              consistencyImprovement * weights.consistencyScore
            )

            newImprovements[model.name] = isNaN(improvement) || !isFinite(improvement) ? 0 : improvement
            newTotalImprovement += newImprovements[model.name]
            newImprovementCount++
          }
        }
        
        // Update results with auto-optimized data
        optimizedResults = newOptimizedResults
        improvements = newImprovements
        overallImprovement = newImprovementCount > 0 ? newTotalImprovement / newImprovementCount : 0
        
        console.log(`[DEBUG] Auto-optimization improved score from ${autoOptimizationResult.originalScore}% to ${overallImprovement}%`)
      }
    } else {
      console.log(`[DEBUG] Absolute score ${optimizedAbsoluteScore}% above threshold, no auto-optimization needed`)
    }

    const response = {
      originalPromptResults: originalResults,
      optimizedPromptResults: optimizedResults,
      improvements,
      semanticScores,
      overallImprovement,
      autoOptimization: autoOptimizationResult,
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
