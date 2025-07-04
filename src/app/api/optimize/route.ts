import { NextRequest, NextResponse } from 'next/server'
import { ConfigFile, OptimizationResult, APIResponse } from '@/types'
import { OptimizationEngine } from '@/lib/optimization'
import { PromptExtractor } from '@/lib/prompt-extractor'
import { ContextAnalyzer } from '@/lib/context-analyzer'
import { LLMProvider } from '@/lib/llm/llm-provider'

const llmProvider = new LLMProvider()

export async function POST(request: NextRequest) {
  try {
    const { configFile, includeContext, useSimpleMode = true }: {
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
        system: `You are a world-class prompt engineer. The best prompt engineers are clear, iterative, and relentlessly focused on outcomes.

Use this Ultimate Prompt Engineer Checklist to optimize the following prompt:

1. **Clarity and Directness**: Make the prompt unambiguous, specific, and leave no room for misinterpretation. Write instructions as if for a competent outsider with no prior context.

2. **Outcome-Driven**: Evaluate against clear, empirical success criteria. Ensure the prompt matches the intended result—not just "good enough."

3. **Handle Edge Cases**: Anticipate unusual, malformed, or unexpected inputs. Provide explicit instructions for what to do when the task is unclear or data is missing.

4. **Use Examples Thoughtfully**: When examples are included, make them illustrative, not repetitive. Choose examples that clarify the task, not overfit to narrow patterns.

5. **Leverage Model Strengths**: Trust the model's capabilities, provide rich context when needed. Avoid "babying" the model or dumbing down instructions unnecessarily.

6. **Transparent and Maintainable**: Make the prompt human-readable and easy to debug or adapt. Avoid unnecessary complexity, metaphors, or role-play unless they add clear value.

7. **Empathetic Communication**: "Externalize your brain," making intent legible to both the model and other humans. Imagine yourself as both the model and a naive user.

8. **Focus on Generalization**: Design the prompt to work across a wide range of real-world inputs, not just a curated test set. Avoid overfitting to specific examples.

Optimize the following prompt using these principles. Return ONLY the optimized prompt without any explanation.`,
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

 