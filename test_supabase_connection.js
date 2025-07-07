const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔑 Anon Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT FOUND');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    console.log('🏓 Testing basic connection...');
    const { data, error, count } = await supabase.from('user_tokens').select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return;
    }
    
    console.log('✅ Connection successful!');
    console.log('📊 Total user_tokens records:', count || 0);
    
    // Test other tables
    const tables = ['users', 'user_prompts', 'user_sessions'];
    for (const table of tables) {
      try {
        const { data: tableData, error: tableError, count: tableCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (tableError) {
          console.log(`⚠️  Table ${table}: ${tableError.message}`);
        } else {
          console.log(`✅ Table ${table}: ${tableCount || 0} records`);
        }
      } catch (err) {
        console.log(`⚠️  Table ${table}: ${err.message}`);
      }
    }
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testSupabaseConnection();