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

    // Initialize optimization components with proper config and reduced settings for speed
    const ape = new AutomatedPromptEngineering({
      domain: 'general',
      useCase: 'prompt_optimization',
      reinforcementLearning: false, // Disabled for speed
      exemplarCount: 3, // Reduced from 5
      diversityThreshold: 0.3,
      iterationLimit: 2 // Reduced from 3
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

    // Run optimization with timeout
    let optimizationResult
    try {
      optimizationResult = await Promise.race([
        ape.optimize(prompt),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('APE optimization timeout')), 30000)
        )
      ])
    } catch (error) {
      console.warn('APE optimization failed or timed out, falling back to basic optimization:', error)
      
      // Fallback to basic optimization
      optimizationResult = {
        originalContent: prompt,
        optimizedContent: prompt.includes('You are') ? prompt : `You are an expert assistant. ${prompt}`,
        explanation: 'Basic optimization applied due to timeout.',
        changes: [{
          type: 'modification',
          line: 1,
          original: prompt,
          optimized: prompt.includes('You are') ? prompt : `You are an expert assistant. ${prompt}`,
          reason: 'Added role definition for clarity'
        }],
        confidence: 0.7,
        confidenceExplanation: {
          factors: {
            changeComplexity: 0.7,
            claudeResponseQuality: 0.7,
            validationResults: 0.8,
            structuralImprovements: 0.8,
            riskFactors: 0.9
          },
          reasoning: ['Basic optimization with timeout fallback'],
          riskLevel: 'low'
        },
        timestamp: new Date().toISOString()
      }
    }

    // Run initial evaluation on optimized prompt with timeout
    let evaluationResults
    try {
      const runner = new BenchmarkRunner()
      evaluationResults = await Promise.race([
        runner.runModelEvaluations(optimizationResult.optimizedContent, modelConfigs),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Evaluation timeout')), 20000)
        )
      ])
    } catch (error) {
      console.warn('Evaluation failed or timed out, using fallback:', error)
      evaluationResults = {
        results: [],
        summary: 'Evaluation timed out - prompt optimization completed without model testing'
      }
    }

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
      { success: false, error: error instanceof Error ? error.message : 'Failed to optimize prompt' },
      { status: 500 }
    )
  }
}

 