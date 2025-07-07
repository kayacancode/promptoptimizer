-- Migration script to replace access_keys with user_tokens system
-- Run this in your Supabase SQL editor

-- First, backup existing access_keys data if needed
-- CREATE TABLE access_keys_backup AS SELECT * FROM access_keys;

-- Drop the old access_keys table (WARNING: This will delete existing data)
-- DROP TABLE IF EXISTS access_keys;

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_last_reset_date ON user_tokens(last_reset_date);

-- Ensure the users table exists and has the correct structure
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for users table
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

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_tokens_updated_at BEFORE UPDATE ON user_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_tokens
CREATE POLICY "Users can view their own tokens" ON user_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" ON user_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for users
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- RLS policies for user_prompts
CREATE POLICY "Users can view their own prompts" ON user_prompts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompts" ON user_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to initialize user tokens when a user signs up
CREATE OR REPLACE FUNCTION initialize_user_tokens()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_tokens (user_id, usage_tokens, daily_optimizations, total_optimizations, last_reset_date)
  VALUES (NEW.id, 10, 0, 0, CURRENT_DATE);
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically initialize tokens for new users
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

-- You can schedule this function to run daily, or it will be checked when tokens are accessed
-- For example, you could set up a cron job or edge function to call this daily

COMMENT ON TABLE user_tokens IS 'Stores user token usage and daily limits';
COMMENT ON TABLE users IS 'Additional user profile information';
COMMENT ON TABLE user_prompts IS 'Stores user prompt history';
COMMENT ON TABLE user_sessions IS 'Stores user session data';