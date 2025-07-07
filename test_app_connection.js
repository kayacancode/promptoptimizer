const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testAppConnection() {
  console.log('🔍 Testing app connection with current configuration...');
  
  // Test 1: Environment variables
  console.log('\n1️⃣ Testing environment variables:');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
  
  // Test 2: Create supabase client and test connection
  console.log('\n2️⃣ Testing supabase client creation:');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error, count } = await supabase.from('user_tokens').select('*', { count: 'exact', head: true });
    if (error) {
      console.error('❌ Direct client error:', error.message);
    } else {
      console.log('✅ Direct client works - can access user_tokens table');
    }
  } catch (err) {
    console.error('❌ Direct client exception:', err.message);
  }
  
  // Test 3: Test all tables
  console.log('\n3️⃣ Testing all tables:');
  const tables = ['users', 'user_tokens', 'user_prompts', 'user_sessions'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: accessible (${count || 0} records)`);
      }
    } catch (err) {
      console.log(`❌ Table ${table}: ${err.message}`);
    }
  }
  
  // Test 4: Test auth functionality
  console.log('\n4️⃣ Testing auth functionality:');
  try {
    // Test getting current user (should be null without auth)
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.log('✅ Auth check works (no user logged in):', error.message);
    } else {
      console.log('✅ Auth check works:', user ? 'User found' : 'No user (expected)');
    }
    
  } catch (err) {
    console.error('❌ Auth error:', err.message);
  }
  
  // Test 5: Test database write access
  console.log('\n5️⃣ Testing database write access:');
  try {
    const crypto = require('crypto');
    const testUserId = crypto.randomUUID();
    const testEmail = 'test@example.com';
    
    // Try to insert a test user record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: testEmail,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (userError) {
      console.log('❌ Write test failed:', userError.message);
    } else {
      console.log('✅ Write test passed - can insert into users table');
      
      // Clean up test data
      await supabase.from('users').delete().eq('id', testUserId);
      console.log('✅ Test data cleaned up');
    }
  } catch (err) {
    console.log('❌ Write test exception:', err.message);
  }
  
  console.log('\n🎉 Connection test completed!');
}

testAppConnection().catch(console.error);