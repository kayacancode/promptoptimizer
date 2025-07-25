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

    const { 
      prompt, 
      context, 
      domain, 
      model = 'claude-4-opus',
      temperature = 0.3,
      optimization_type = 'comprehensive'
    } = await request.json();

    if (!prompt) {
      return NextResponse.json({
        error: 'Prompt is required'
      }, { status: 400 });
    }

    // Create Supabase client for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check user's token balance and update usage
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_tokens')
      .select('usage_tokens, daily_optimizations, total_optimizations')
      .eq('user_id', auth.userId)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({
        error: 'Unable to verify token balance'
      }, { status: 400 });
    }

    if (tokenData.usage_tokens <= 0) {
      return NextResponse.json({
        error: 'Insufficient tokens. Please upgrade your plan.'
      }, { status: 403 });
    }

    // Generate a session ID for tracking
    const sessionId = `session_${randomBytes(16).toString('hex')}`;

    // Store the configuration for later retrieval
    const config = {
      model,
      temperature,
      optimization_type,
      context,
      domain,
      source: 'mcp'
    };

    // Create optimization session in database
    const { data: optimizationSession, error: sessionError } = await supabase
      .from('optimization_sessions')
      .insert({
        user_id: auth.userId,
        session_name: `MCP Optimization - ${model}`,
        original_prompt: prompt,
        requirements_text: context,
        evaluation_input: domain,
        optimized_prompt: prompt, // Will be updated when results are ready
        explanation: 'Processing via MCP...',
        settings_used: config,
        is_completed: false
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating optimization session:', sessionError);
      return NextResponse.json({
        error: 'Failed to create optimization session'
      }, { status: 500 });
    }

    // Update user token usage
    const { error: updateError } = await supabase
      .from('user_tokens')
      .update({
        usage_tokens: tokenData.usage_tokens - 1,
        daily_optimizations: tokenData.daily_optimizations + 1,
        total_optimizations: tokenData.total_optimizations + 1
      })
      .eq('user_id', auth.userId);

    if (updateError) {
      console.error('Error updating token usage:', updateError);
    }

    return NextResponse.json({
      sessionId,
      optimizationSessionId: optimizationSession.id,
      status: 'processing',
      message: 'Prompt submitted for optimization',
      config,
      tokensRemaining: tokenData.usage_tokens - 1
    });

  } catch (error) {
    console.error('Error in optimize endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}