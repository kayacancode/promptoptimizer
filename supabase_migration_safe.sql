-- Safe migration script to replace access_keys with user_tokens system
-- This script handles existing objects and won't fail if they already exist

-- First, backup existing access_keys data if needed
-- CREATE TABLE IF NOT EXISTS access_keys_backup AS SELECT * FROM access_keys;

-- Create the new user_tokens table
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_tokens INTEGER DEFAULT 10,
  daily_optimizations INTEGER DEFAULT 0,
  total_optimizations INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_last_reset_date ON user_tokens(last_reset_date);

-- Ensure the users table has the correct structure (only add columns if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
    ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
    ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
  END IF;
END $$;

-- Create indexes for users table (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Ensure the user_prompts table exists
CREATE TABLE IF NOT EXISTS user_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  response_text TEXT,
  model_used TEXT DEFAULT 'unknown',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for user_prompts table
CREATE INDEX IF NOT EXISTS idx_user_prompts_user_id ON user_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prompts_created_at ON user_prompts(created_at);

-- Ensure the user_sessions table exists
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for user_sessions table
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Function to update the updated_at timestamp (only create if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_user_tokens_updated_at ON user_tokens;
CREATE TRIGGER update_user_tokens_updated_at BEFORE UPDATE ON user_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) 
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts, then recreate them
DROP POLICY IF EXISTS "Users can view their own tokens" ON user_tokens;
CREATE POLICY "Users can view their own tokens" ON user_tokens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tokens" ON user_tokens;
CREATE POLICY "Users can update their own tokens" ON user_tokens
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own prompts" ON user_prompts;
CREATE POLICY "Users can view their own prompts" ON user_prompts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own prompts" ON user_prompts;
CREATE POLICY "Users can insert their own prompts" ON user_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
CREATE POLICY "Users can update their own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sessions" ON user_sessions;
CREATE POLICY "Users can insert their own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to initialize user tokens when a user signs up
CREATE OR REPLACE FUNCTION initialize_user_tokens()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_tokens (user_id, usage_tokens, daily_optimizations, total_optimizations, last_reset_date)
  VALUES (NEW.id, 10, 0, 0, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate the trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_tokens();

-- Function to reset daily tokens
CREATE OR REPLACE FUNCTION reset_daily_tokens()
RETURNS void AS $$
BEGIN
  UPDATE user_tokens 
  SET usage_tokens = 10, 
      daily_optimizations = 0, 
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ language 'plpgsql';

-- Add unique constraint to user_tokens if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'user_tokens' AND constraint_name = 'user_tokens_user_id_key'
  ) THEN
    ALTER TABLE user_tokens ADD CONSTRAINT user_tokens_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE user_tokens IS 'Stores user token usage and daily limits';
COMMENT ON TABLE users IS 'Additional user profile information';
COMMENT ON TABLE user_prompts IS 'Stores user prompt history';
COMMENT ON TABLE user_sessions IS 'Stores user session data';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully! Tables created:';
  RAISE NOTICE '- user_tokens: Token usage tracking';
  RAISE NOTICE '- users: User profiles';
  RAISE NOTICE '- user_prompts: Prompt history';
  RAISE NOTICE '- user_sessions: Session data';
END $$;