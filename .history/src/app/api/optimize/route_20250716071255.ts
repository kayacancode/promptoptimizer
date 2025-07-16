import { NextRequest, NextResponse } from 'next/server'
import { BenchmarkRunner } from '@/lib/benchmarks/benchmark-runner'
import { AutomatedPromptEngineering } from '@/lib/ape/automated-prompt-engineering'
import { globalPromptService } from '@/lib/vector-db/global-prompt-service'

export async function POST(request: NextRequest) {
  try {
    const { 
      prompt,
      requirements,
      modelConfigs
    } = await request.json()
    
    if (!prompt || !requirements) {
      return NextResponse.json(
        { success: false, error: 'Prompt and requirements are required' },
        { status: 400 }
      )
    }

    // Initialize optimization components
    const ape = new AutomatedPromptEngineering({
      domain: 'general',
      reinforcementLearning: true,
      exemplarCount: 5
    })

    // Find similar prompts for context
    const similarPrompts = await globalPromptService.searchGlobalPrompts(
      prompt,
      'system', // Using system as user ID for global search
      {
        limit: 5,
        minScore: 0.7
      }
    )

    // Run optimization with context
    const optimizationResult = await ape.optimize(prompt, {
      requirements,
      similarPrompts: similarPrompts.map(p => p.content),
      modelConfigs
    })

    // Run initial evaluation on optimized prompt
    const runner = new BenchmarkRunner()
    const evaluationResults = await runner.runModelEvaluations(
      optimizationResult.optimizedContent,
      modelConfigs
    )

    const response = {
      originalPrompt: prompt,
      optimizedPrompt: optimizationResult.optimizedContent,
      explanation: optimizationResult.explanation,
      modelResults: evaluationResults,
      improvements: optimizationResult.changes,
      overallImprovement: optimizationResult.confidence * 100,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error) {
    console.error('Optimization API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to optimize prompt' },
      { status: 500 }
    )
  }
}

 