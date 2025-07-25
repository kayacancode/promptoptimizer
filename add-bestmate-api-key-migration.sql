-- Add BestMate API key to users table
ALTER TABLE users ADD COLUMN bestmate_api_key VARCHAR(255);

-- Create index for API key lookups
CREATE INDEX idx_users_bestmate_api_key ON users(bestmate_api_key) WHERE bestmate_api_key IS NOT NULL;

-- Update RLS policies to allow users to update their own API key
CREATE POLICY "Users can update their own BestMate API key" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);