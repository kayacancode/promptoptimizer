import { NextRequest, NextResponse } from 'next/server'
import { BenchmarkRunner } from '@/lib/benchmarks/benchmark-runner'
import { UserAuthManager } from '@/lib/user-auth'
import { AutoOptimizer } from '@/lib/autonomous/auto-optimizer'
import { createClient } from '@supabase/supabase-js'

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

    // Get user token from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Validate user and consume token
    try {
      // Create Supabase client and get user from token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)
      
      if (userError || !user) {
        console.error('User validation error:', userError)
        return NextResponse.json(
          { success: false, error: 'Invalid authentication token' },
          { status: 401 }
        )
      }
      
      console.log('User ID extracted from token:', user.id)
      
      // Now consume the token using the user ID
      const tokenResult = await UserAuthManager.useToken(user.id)
      if (!tokenResult.success) {
        return NextResponse.json(
          { success: false, error: tokenResult.error },
          { status: 400 }
        )
      }
      
      console.log('Token consumed successfully, remaining tokens:', tokenResult.remainingTokens)
    } catch (error) {
      console.error('Token validation error:', error)
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Step 1: Optimize the prompt using AutoOptimizer
    const autoOptimizer = new AutoOptimizer()
    
    // First get baseline score for the original prompt
    const benchmarkRunner = new BenchmarkRunner()
    const models = [
      { name: 'claude-3-haiku', enabled: true },
      { name: 'gpt-4o', enabled: true }
    ]
    
    let optimizationResult
    try {
      // Evaluate original prompt
      const originalResults = await benchmarkRunner.runModelEvaluations(prompt, models, 1)
      const originalScore = calculateOverallScore(originalResults)
      
      console.log(`[DEBUG] Original prompt score: ${originalScore}%`)
      
      // Use AutoOptimizer to detect and optimize if needed
      const autoResult = await autoOptimizer.detectAndOptimize(prompt, originalScore, 70)
      
      if (autoResult && autoResult.status === 'success' && autoResult.selectedCandidate) {
        optimizationResult = {
          optimizedPrompt: autoResult.selectedCandidate.prompt,
          explanation: `Applied ${autoResult.strategy} strategy. Improved score from ${originalScore}% to ${autoResult.selectedCandidate.score}% (+${autoResult.improvement.toFixed(1)}%)`,
          changes: autoResult.selectedCandidate.strategy.promptModifications.map(mod => ({
            type: 'improvement',
            description: mod,
            reasoning: `${autoResult.strategy} optimization strategy`
          })),
          confidence: autoResult.selectedCandidate.score ? autoResult.selectedCandidate.score / 100 : 0.5
        }
      } else {
        // Fallback to Claude-based optimization if auto-optimization doesn't improve
        optimizationResult = await optimizePrompt(prompt, requirements)
      }
    } catch (error) {
      console.error('[DEBUG] AutoOptimizer failed, falling back to basic optimization:', error)
      optimizationResult = await optimizePrompt(prompt, requirements)
    }

    // Step 2: Return optimization results (evaluation will happen separately)
    console.log(`[DEBUG] Optimization confidence: ${optimizationResult.confidence * 100}%`)

    const response = {
      originalPrompt: prompt,
      optimizedPrompt: optimizationResult.optimizedPrompt,
      explanation: optimizationResult.explanation,
      improvements: optimizationResult.changes,
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
 * Calculate overall score from model evaluation results
 */
function calculateOverallScore(results: any[]): number {
  if (results.length === 0) return 0

  const avgHallucinationRate = results.reduce((sum, r) => sum + r.hallucinationRate, 0) / results.length
  const avgStructureScore = results.reduce((sum, r) => sum + r.structureScore, 0) / results.length
  const avgConsistencyScore = results.reduce((sum, r) => sum + r.consistencyScore, 0) / results.length

  const hallucinationScore = (1 - avgHallucinationRate) * 100
  const structurePercentage = avgStructureScore * 100
  const consistencyPercentage = avgConsistencyScore * 100

  return (hallucinationScore * 0.4 + structurePercentage * 0.3 + consistencyPercentage * 0.3)
}

/**
 * Simple prompt optimization function
 */
async function optimizePrompt(originalPrompt: string, requirements: string) {
  console.log('[DEBUG] Starting prompt optimization')
  
  try {
    // Try Claude Opus 4  optimization first
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('[DEBUG] Using Claude Opus 4 for AI-powered optimization')
      
      const Anthropic = await import('@anthropic-ai/sdk')
      const anthropic = new Anthropic.default({
        apiKey: process.env.ANTHROPIC_API_KEY
      })
      
      const optimizationPrompt = `You are acting as a world-class Prompt Engineering Evaluator Agent.

      Your role: Assess, rewrite, and optimize the provided user prompt so it can be directly used in a production LLM workflow by another user. The optimized prompt must be copy-paste ready for tools like ChatGPT, Claude, or similar models. Prioritize clear task instructions, output formatting guidance, and adaptability to real-world inputs.
      
      Original Prompt:
      ${JSON.stringify(originalPrompt)}
      
      Additional Context or Requirements:
      ${JSON.stringify(requirements)}
      
      Evaluation Checklist:
      1. CLARITY & DIRECTNESS — Instructions must be unambiguous and specific.
      2. ITERATIVE MINDSET — Prompt should encourage testing and model self-assessment if applicable.
      3. OUTCOME-DRIVEN — Must include clear success criteria and expected output format.
      4. HANDLES EDGE CASES — Instructions for missing, malformed, or unclear input must be included.
      5. USES EXAMPLES THOUGHTFULLY — Provide helpful examples without overfitting.
      6. LEVERAGES MODEL STRENGTHS — Provide rich, relevant context where needed.
      7. TRANSPARENT & MAINTAINABLE — Structure must be easy for other humans to understand and reuse.
      8. EMPATHETIC COMMUNICATION — Intent must be clear for both the model and human readers.
      9. USES THE MODEL AS A COLLABORATOR — Where relevant, include instructions for the model to reflect or critique.
      10. FOCUSES ON GENERALIZATION — Prompt should work reliably across varied real-world inputs.
      
      Important: This optimized prompt is meant for another user to put into their own LLM workflow. Ensure language is instructional, structured, and formatted appropriately for copy-paste use.
      
      ✅ Respond with ONLY valid JSON in this format:
      {
        "optimizedPrompt": "Final optimized prompt text, ready to use in an LLM system.",
        "evaluationChecklist": [
          {
            "category": "Clarity & Directness",
            "score": 1-5,
            "feedback": "Specific feedback for this category."
          },
          {
            "category": "Iterative Mindset",
            "score": 1-5,
            "feedback": "Specific feedback for this category."
          }
          // Continue for all 10 categories
        ],
        "summaryFeedback": "Clear, outcome-driven summary of key changes and improvements.",
        "exampleSchema": {
          "input": "Realistic input example a user might provide.",
          "optimizedPrompt": "How the optimized prompt would appear for that input.",
          "expectedOutputFormat": "Markdown, JSON, plain text, etc."
        }
      }
      
      Important Rules:
      - Respond with ONLY valid JSON. No commentary or extra explanation outside the JSON object.
      - Use language and formatting suitable for direct use in production LLM workflows.
      - Be as specific and actionable as possible. Avoid vague statements.
      `;

      // Add timeout to Claude call
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Claude optimization timeout')), 60000)
      )
      
      const optimizationPromise = anthropic.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 1500,
        temperature: 0.3,
        messages: [{ role: 'user', content: optimizationPrompt }]
      })
      
      const result = await Promise.race([optimizationPromise, timeoutPromise])
      
      if (result.content[0].type === 'text') {
        const response = result.content[0].text
        console.log('[DEBUG] Claude optimization response received')
        
        // Parse JSON response with robust error handling
        console.log('[DEBUG] Full Claude response:', response)
        
        try {
          // Find the JSON block more carefully
          const jsonStart = response.indexOf('{')
          const jsonEnd = response.lastIndexOf('}')
          
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            let jsonString = response.substring(jsonStart, jsonEnd + 1)
            console.log('[DEBUG] Extracted JSON string:', jsonString)
            
            // Properly handle JSON string - avoid over-escaping
            jsonString = jsonString.trim()
            
            const parsed = JSON.parse(jsonString)
            console.log('[DEBUG] Successfully parsed Claude response')
            return {
              optimizedPrompt: parsed.optimizedPrompt || originalPrompt,
              explanation: parsed.explanation || 'Prompt optimized using Claude 3.5 Sonnet with expert prompt engineering principles.',
              changes: parsed.changes || [],
              confidence: 0.95
            }
          }
        } catch (parseError) {
          console.error('[DEBUG] JSON parse error:', parseError)
          
          // Manual extraction as fallback
          try {
            // Extract optimizedPrompt using simple string extraction
            const promptStart = response.indexOf('"optimizedPrompt":"') + '"optimizedPrompt":"'.length
            const promptEnd = response.indexOf('","', promptStart)
            const explanationStart = response.indexOf('"explanation":"') + '"explanation":"'.length
            const explanationEnd = response.indexOf('","', explanationStart)
            
            if (promptStart !== -1 && promptEnd !== -1 && promptEnd > promptStart) {
              // Extract and unescape the content
              const optimizedPrompt = response.substring(promptStart, promptEnd)
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
              
              const explanation = explanationStart !== -1 && explanationEnd !== -1 && explanationEnd > explanationStart
                ? response.substring(explanationStart, explanationEnd)
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\')
                : 'Prompt optimized using Claude Opus 4.'
              
              console.log('[DEBUG] Manual extraction successful')
              return {
                optimizedPrompt,
                explanation,
                changes: [],
                confidence: 0.90
              }
            }
          } catch (extractError) {
            console.error('[DEBUG] Manual extraction failed:', extractError)
          }
        }
      }
    } else {
      console.log('[DEBUG] No Anthropic API key found')
    }
  } catch (error) {
    console.error('[DEBUG] Claude optimization error:', error)
    console.error('[DEBUG] Error details:', error instanceof Error ? error.message : 'Unknown error')
  }
  
  // Fallback to rule-based optimization
  console.log('[DEBUG] Falling back to rule-based optimization')
  return basicOptimization(originalPrompt, requirements)
}

/**
 * World-class prompt engineering optimization based on expert best practices
 */
function basicOptimization(originalPrompt: string, requirements: string) {
  let optimizedPrompt = originalPrompt.trim()
  const changes = []
  
  // 1. CLARITY AND DIRECTNESS - Always add role definition if missing
  if (!optimizedPrompt.toLowerCase().includes('you are') && !optimizedPrompt.toLowerCase().includes('role:') && !optimizedPrompt.toLowerCase().includes('act as')) {
    optimizedPrompt = `You are an expert assistant specializing in the requested task. ${optimizedPrompt}`
    changes.push({
      type: 'addition',
      description: 'Added clear role definition',
      reasoning: 'Clarity principle: Instructions written for competent outsider with no prior context'
    })
  }

  // 2. OUTCOME-DRIVEN - Always add requirements if provided
  if (requirements && requirements.trim()) {
    optimizedPrompt += `\n\n**Requirements & Success Criteria:**\n${requirements.trim()}`
    changes.push({
      type: 'addition', 
      description: 'Added explicit requirements and success criteria',
      reasoning: 'Outcome-driven principle: Clear, empirical success criteria for evaluation'
    })
  }

  // 3. HANDLES EDGE CASES - Always add edge case handling
  if (!optimizedPrompt.toLowerCase().includes('unclear') && !optimizedPrompt.toLowerCase().includes('missing') && !optimizedPrompt.toLowerCase().includes('if you need')) {
    optimizedPrompt += `\n\n**Edge Case Handling:**\nIf the request is unclear or information is missing, explicitly state what clarification you need before proceeding.`
    changes.push({
      type: 'addition',
      description: 'Added edge case handling instructions', 
      reasoning: 'Edge case principle: Explicit instructions for unusual or unclear inputs'
    })
  }

  // 4. LEVERAGES MODEL STRENGTHS - Add reasoning instructions
  if (!optimizedPrompt.toLowerCase().includes('step-by-step') && !optimizedPrompt.toLowerCase().includes('think through') && !optimizedPrompt.toLowerCase().includes('reasoning')) {
    optimizedPrompt += `\n\n**Approach:**\nProvide a comprehensive, thoughtful response. Think step-by-step and explain your reasoning when helpful.`
    changes.push({
      type: 'addition',
      description: 'Added reasoning and step-by-step guidance',
      reasoning: 'Model strength principle: Encourage detailed thinking and explanation'
    })
  }

  // 5. OUTPUT FORMAT - Add output format guidance if missing
  if (!optimizedPrompt.toLowerCase().includes('format') && !optimizedPrompt.toLowerCase().includes('structure') && optimizedPrompt.length > 50) {
    optimizedPrompt += `\n\n**Output Format:**\nStructure your response clearly with appropriate headings or bullet points when helpful.`
    changes.push({
      type: 'addition',
      description: 'Added output format guidance',
      reasoning: 'Transparency principle: Clear structure improves readability and usability'
    })
  }

  // 6. QUALITY CHECK - Always add quality assurance
  optimizedPrompt += `\n\n**Quality Assurance:**\nEnsure your response directly addresses the core request and provides actionable, accurate information.`
  changes.push({
    type: 'addition',
    description: 'Added quality assurance instruction',
    reasoning: 'Quality principle: Explicit instruction for response relevance and accuracy'
  })

  return {
    optimizedPrompt,
    explanation: 'Applied essential prompt engineering principles: role clarity, requirements specification, edge case handling, reasoning guidance, output formatting, and quality assurance. These improvements make the prompt more effective and reliable.',
    changes,
    confidence: 0.85
  }
}

 