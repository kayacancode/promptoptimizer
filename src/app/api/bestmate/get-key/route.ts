import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.authorized) {
      return NextResponse.json({
        success: false,
        error: auth.error || 'Unauthorized'
      }, { status: 401 });
    }

    // Create server-side Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user's BestMate API key
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('bestmate_api_key')
      .eq('id', auth.userId)
      .single();

    if (fetchError) {
      console.error('Error fetching BestMate API key:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch API key' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      apiKey: userData?.bestmate_api_key || null,
      hasApiKey: !!userData?.bestmate_api_key
    });

  } catch (error) {
    console.error('Error in BestMate API key fetch:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}