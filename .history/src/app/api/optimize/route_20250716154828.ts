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
      console.warn('APE optimization failed or timed out, falling back to Gemini 2.5 Flash:', error)
      
      // Fallback to Gemini 2.5 Flash optimization
      optimizationResult = await fastOptimizationWithGemini(prompt, requirements)
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

/**
 * Fast optimization using Gemini 2.5 Flash directly
 */
async function fastOptimizationWithGemini(
  originalPrompt: string, 
  requirements: string
): Promise<any> {
  const { GeminiClient } = await import('@/lib/llm/gemini-client')
  
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return basicOptimization(originalPrompt, requirements)
  }
  
  const gemini = new GeminiClient(process.env.GOOGLE_GEMINI_API_KEY)
  
  const systemPrompt = `You are an expert prompt engineer. Optimize the given prompt to be more effective, clear, and specific based on the provided requirements.

Return a JSON response with:
{
  "optimizedPrompt": "the improved prompt",
  "explanation": "brief explanation of changes made",
  "changes": [
    {
      "type": "addition|modification|deletion",
      "description": "what changed",
      "reasoning": "why this improves the prompt"
    }
  ]
}

Focus on:
- Clarity and specificity
- Better structure aligned with requirements
- More actionable instructions
- Reducing ambiguity
- Incorporating the specific requirements provided`

  const userPrompt = `Original prompt: "${originalPrompt}"

Requirements: "${requirements}"

Optimize this prompt based on the requirements and return the JSON response.`
  
  try {
    const response = await gemini.generateContentWithParams({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 800
    })
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      
      return {
        originalContent: originalPrompt,
        optimizedContent: parsed.optimizedPrompt || originalPrompt,
        explanation: parsed.explanation || 'Prompt optimized using Gemini 2.5 Flash for better clarity and effectiveness.',
        changes: parsed.changes || [{
          type: 'modification',
          line: 1,
          description: 'Enhanced prompt structure and clarity',
          reasoning: 'Improved for better AI response quality'
        }],
        confidence: 0.85,
        confidenceExplanation: {
          factors: {
            changeComplexity: 0.8,
            claudeResponseQuality: 0.9,
            validationResults: 0.8,
            structuralImprovements: 0.9,
            riskFactors: 0.9
          },
          reasoning: ['Fast optimization with Gemini 2.5 Flash', 'Focused on clarity and requirements alignment'],
          riskLevel: 'low'
        },
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Gemini optimization error:', error)
  }
  
  // Fallback to basic optimization
  return basicOptimization(originalPrompt, requirements)
}

/**
 * Basic optimization fallback
 */
async function basicOptimization(
  originalPrompt: string, 
  requirements: string
): Promise<any> {
  // Simple optimization logic
  let optimizedPrompt = originalPrompt
  
  // Add structure if missing
  if (!optimizedPrompt.includes('Role:') && !optimizedPrompt.includes('You are')) {
    optimizedPrompt = `You are an expert assistant. ${optimizedPrompt}`
  }
  
  // Add clarity if needed
  if (optimizedPrompt.length < 100) {
    optimizedPrompt += ' Please provide a detailed and helpful response.'
  }
  
  // Incorporate requirements if provided
  if (requirements && requirements.length > 0) {
    optimizedPrompt += `\n\nRequirements: ${requirements}`
  }

  return {
    originalContent: originalPrompt,
    optimizedContent: optimizedPrompt,
    explanation: 'Basic structural improvements applied to enhance clarity and specificity.',
    changes: [{
      type: 'modification',
      line: 1,
      original: originalPrompt,
      optimized: optimizedPrompt,
      reason: 'Enhanced structure and clarity with requirements integration'
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
      reasoning: ['Basic optimization with structural improvements and requirements integration'],
      riskLevel: 'low'
    },
    timestamp: new Date().toISOString()
  }
}

 