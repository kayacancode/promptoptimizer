import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Server-side authentication helper
async function authenticateRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return { authorized: false, error: 'Authorization header missing' };
    }

    // For BestMate API keys, extract the key directly
    let apiKey: string;
    if (authHeader.startsWith('Bearer bm_')) {
      apiKey = authHeader.substring(7); // Remove 'Bearer '
    } else {
      return { authorized: false, error: 'Invalid API key format' };
    }

    // Validate API key against database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userData, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('bestmate_api_key', apiKey)
      .single();
    
    if (error || !userData) {
      return { authorized: false, error: 'Invalid API key' };
    }

    return {
      authorized: true,
      userId: userData.id,
      user: userData
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { authorized: false, error: 'Authentication failed' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({
        error: auth.error || 'Unauthorized'
      }, { status: 401 });
    }

    const { prompt, context, criteria } = await request.json();

    if (!prompt) {
      return NextResponse.json({
        error: 'Prompt is required'
      }, { status: 400 });
    }

    // Generate evaluation ID
    const evaluationId = `eval_${randomBytes(16).toString('hex')}`;

    // Mock evaluation results - integrate with your existing evaluation logic
    const mockEvaluation = {
      id: evaluationId,
      prompt: prompt,
      scores: {
        clarity: Math.round((0.7 + Math.random() * 0.3) * 100) / 100, // 0.7-1.0
        effectiveness: Math.round((0.6 + Math.random() * 0.4) * 100) / 100, // 0.6-1.0
        specificity: Math.round((0.5 + Math.random() * 0.5) * 100) / 100, // 0.5-1.0
        overall: Math.round((0.65 + Math.random() * 0.35) * 100) / 100 // 0.65-1.0
      },
      feedback: `This prompt demonstrates strong foundational elements with clear role definition. The instruction to act as a "world-class Prompt Engineering Evaluator Agent" establishes authority and expertise context effectively.

**Strengths:**
- Clear role and expertise specification
- Specific task objectives (assess, rewrite, optimize)
- Defined output requirements (copy-paste ready)
- Target platform specification (ChatGPT, Claude)

**Areas for Enhancement:**
- Could benefit from more structured formatting
- Success criteria could be more explicit
- Process steps could be more detailed
- Output format specifications could be clearer

**Recommendation:**
Consider adding structured formatting, clear success metrics, and step-by-step process guidance to improve LLM adherence and output consistency.`,
      suggestions: [
        'Add structured formatting with headers and bullet points',
        'Include specific success criteria or evaluation metrics',
        'Break down the task into clear, sequential steps',
        'Specify desired output format and structure',
        'Add context about target audience or use case'
      ]
    };

    return NextResponse.json(mockEvaluation);

  } catch (error) {
    console.error('Error in evaluate endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}