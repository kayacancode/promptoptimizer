import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Server-side authentication helper
async function authenticateRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authorized: false, error: 'Authorization header missing or invalid' };
    }

    const token = authHeader.substring(7);
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { authorized: false, error: 'Invalid authentication token' };
    }

    return {
      authorized: true,
      userId: user.id,
      user
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
        success: false,
        error: auth.error || 'Unauthorized'
      }, { status: 401 });
    }

    // Generate a new BestMate API key
    const apiKey = `bm_${randomBytes(32).toString('hex')}`;

    // Create server-side Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update user's BestMate API key in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ bestmate_api_key: apiKey })
      .eq('id', auth.userId);

    if (updateError) {
      console.error('Error updating BestMate API key:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate API key' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      apiKey,
      message: 'BestMate API key generated successfully'
    });

  } catch (error) {
    console.error('Error in BestMate API key generation:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}