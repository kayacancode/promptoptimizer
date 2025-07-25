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

    // Generate a session ID for tracking
    const sessionId = `session_${randomBytes(16).toString('hex')}`;

    // Store the configuration for later retrieval
    const config = {
      model,
      temperature,
      optimization_type,
      context,
      domain
    };

    // For now, return a mock response - you can integrate with your existing optimization logic
    return NextResponse.json({
      sessionId,
      status: 'processing',
      message: 'Prompt submitted for optimization',
      config
    });

  } catch (error) {
    console.error('Error in optimize endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}