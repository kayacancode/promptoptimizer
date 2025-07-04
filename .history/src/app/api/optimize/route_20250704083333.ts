import { NextRequest, NextResponse } from 'next/server'
import { ConfigFile, OptimizationResult, APIResponse } from '@/types'
import { OptimizationEngine } from '@/lib/optimization'
import { PromptExtractor } from '@/lib/prompt-extractor'
import { ContextAnalyzer } from '@/lib/context-analyzer'
import { LLMProvider } from '@/lib/llm/llm-provider'

const llmProvider = new LLMProvider()

export async function POST(request: NextRequest) {
  try {
    const { configFile, includeContext, useSimpleMode = false }: {
      configFile: ConfigFile
      includeContext: boolean
      useSimpleMode?: boolean
    } = await request.json()

    if (!configFile) {
      return NextResponse.json(
        { success: false, error: 'Configuration file is required' } as APIResponse,
        { status: 400 }
      )
    }

    // Extract prompts from code files if not already done
    if (!configFile.extractedPrompts && ['python', 'javascript', 'typescript', 'markdown'].includes(configFile.type)) {
      configFile.extractedPrompts = PromptExtractor.extractPrompts(configFile)
    }

    let optimizationResult: OptimizationResult

    if (useSimpleMode) {
      // Simple mode: Single API call for optimization
      console.log('Using simple optimization mode (fewer API calls)...')
      
      const promptToOptimize = configFile.extractedPrompts && configFile.extractedPrompts.length > 0
        ? configFile.extractedPrompts[0].content
        : configFile.content

      const response = await llmProvider.generateContent({
        model: 'gemini-2.5-flash',
        max_tokens: 1000,
        temperature: 0.7,
        system: `You are an expert prompt engineer. Optimize the following prompt to be clearer, more specific, and more effective. Return ONLY the optimized prompt without any explanation.`,
        messages: [{
          role: 'user',
          content: promptToOptimize
        }]
      })

      optimizationResult = {
        originalContent: promptToOptimize,
        optimizedContent: response.content,
        explanation: 'Prompt optimized for clarity, specificity, and effectiveness.',
        changes: [{
          type: 'modification',
          line: 1,
          original: promptToOptimize,
          optimized: response.content,
          reason: 'Comprehensive optimization applied'
        }],
        confidence: 0.85,
        timestamp: new Date().toISOString()
      }
    } else {
      // Full optimization with context analysis
      let contextInfo = ''
      if (includeContext && configFile.extractedPrompts && configFile.extractedPrompts.length > 0) {
        const contexts = ContextAnalyzer.analyzePromptContext(configFile)
        contextInfo = ContextAnalyzer.generateContextSummary(contexts)
      }

      optimizationResult = await OptimizationEngine.optimize(configFile, {
        includeContext,
        contextInfo
      })
    }

    return NextResponse.json({
      success: true,
      data: optimizationResult,
      message: 'Prompt optimization completed successfully'
    } as APIResponse)

  } catch (error) {
    console.error('Optimization error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Optimization failed'
      } as APIResponse,
      { status: 500 }
    )
  }
}

 