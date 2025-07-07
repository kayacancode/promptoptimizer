// Test script for the new authentication system
// Run with: node test_auth.js

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuth() {
  console.log('🧪 Testing User Authentication System')
  console.log('=====================================')
  
  const testEmail = 'test@example.com'
  const testPassword = 'testpassword123'
  
  try {
    // Test 1: Sign up
    console.log('1. Testing sign up...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })
    
    if (signUpError) {
      console.log('❌ Sign up failed:', signUpError.message)
      if (signUpError.message.includes('already registered')) {
        console.log('✅ User already exists, proceeding to sign in test')
      } else {
        return
      }
    } else {
      console.log('✅ Sign up successful')
    }
    
    // Test 2: Sign in
    console.log('2. Testing sign in...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })
    
    if (signInError) {
      console.log('❌ Sign in failed:', signInError.message)
      return
    } else {
      console.log('✅ Sign in successful')
    }
    
    // Test 3: Get current user
    console.log('3. Testing get current user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('❌ Get user failed:', userError.message)
      return
    } else {
      console.log('✅ Get user successful:', user?.email)
    }
    
    // Test 4: Test database tables exist
    console.log('4. Testing database tables...')
    
    // Check if user_tokens table exists and has data
    const { data: tokensData, error: tokensError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', user.id)
    
    if (tokensError) {
      console.log('❌ User tokens table error:', tokensError.message)
      console.log('💡 Make sure you\'ve run the migration script in Supabase')
    } else if (tokensData && tokensData.length > 0) {
      console.log('✅ User tokens found:', tokensData[0])
    } else {
      console.log('⚠️  No tokens found - this might be expected for new users')
    }
    
    // Test 5: Sign out
    console.log('5. Testing sign out...')
    const { error: signOutError } = await supabase.auth.signOut()
    
    if (signOutError) {
      console.log('❌ Sign out failed:', signOutError.message)
    } else {
      console.log('✅ Sign out successful')
    }
    
    console.log('🎉 Authentication system tests completed!')
    console.log('=====================================')
    console.log('Next steps:')
    console.log('1. Run the migration script in your Supabase SQL editor')
    console.log('2. Update your environment variables')
    console.log('3. Start your development server with: npm run dev')
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

testAuth()