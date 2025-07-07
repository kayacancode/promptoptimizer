-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create access_keys table
CREATE TABLE access_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(255) UNIQUE NOT NULL,
    tier VARCHAR(20) DEFAULT 'trial' CHECK (tier IN ('trial', 'premium', 'unlimited')),
    daily_limit INTEGER DEFAULT 5,
    daily_usage INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_prompts table
CREATE TABLE user_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_access_keys_user_id ON access_keys(user_id);
CREATE INDEX idx_access_keys_key ON access_keys(key);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_prompts_user_id ON user_prompts(user_id);
CREATE INDEX idx_user_prompts_created_at ON user_prompts(created_at);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_access_keys_updated_at
    BEFORE UPDATE ON access_keys
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own access keys" ON access_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own prompts" ON user_prompts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompts" ON user_prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow service role to bypass RLS for server-side operations
CREATE POLICY "Service role can manage all data" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all access keys" ON access_keys
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all sessions" ON user_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all prompts" ON user_prompts
    FOR ALL USING (auth.role() = 'service_role');