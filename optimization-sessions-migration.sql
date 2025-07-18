-- Create optimization_sessions table to store complete optimization workflows
CREATE TABLE optimization_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_name VARCHAR(255), -- Optional user-provided name
    
    -- Original input data
    original_prompt TEXT NOT NULL,
    requirements_text TEXT,
    evaluation_input TEXT,
    
    -- Optimization results
    optimized_prompt TEXT NOT NULL,
    explanation TEXT,
    overall_improvement_percentage DECIMAL(5,2), -- e.g., 15.75 for 15.75%
    
    -- Settings used
    settings_used JSONB NOT NULL, -- Store model configs, sample size, etc.
    
    -- Session metadata
    is_completed BOOLEAN DEFAULT false,
    completion_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create optimization_results table to store individual model results within a session
CREATE TABLE optimization_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES optimization_sessions(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL,
    
    -- Model-specific results
    hallucination_rate DECIMAL(5,4), -- 0.0000 to 1.0000
    structure_score DECIMAL(5,4), -- 0.0000 to 1.0000
    consistency_score DECIMAL(5,4), -- 0.0000 to 1.0000
    improvement_percentage DECIMAL(5,2), -- Individual model improvement
    
    -- Responses for comparison
    original_response TEXT,
    optimized_response TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update user_prompts table to include session linkage
ALTER TABLE user_prompts ADD COLUMN session_id UUID REFERENCES optimization_sessions(id) ON DELETE SET NULL;
ALTER TABLE user_prompts ADD COLUMN is_optimization_result BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX idx_optimization_sessions_user_id ON optimization_sessions(user_id);
CREATE INDEX idx_optimization_sessions_created_at ON optimization_sessions(created_at);
CREATE INDEX idx_optimization_sessions_completed ON optimization_sessions(is_completed);
CREATE INDEX idx_optimization_results_session_id ON optimization_results(session_id);
CREATE INDEX idx_optimization_results_model_name ON optimization_results(model_name);
CREATE INDEX idx_user_prompts_session_id ON user_prompts(session_id);

-- Create or replace the update_updated_at_column function (in case it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to update updated_at column
CREATE TRIGGER update_optimization_sessions_updated_at
    BEFORE UPDATE ON optimization_sessions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security for optimization_sessions
ALTER TABLE optimization_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for optimization_sessions
CREATE POLICY "Users can view their own optimization sessions" ON optimization_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own optimization sessions" ON optimization_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own optimization sessions" ON optimization_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all optimization sessions" ON optimization_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for optimization_results
CREATE POLICY "Users can view their own optimization results" ON optimization_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM optimization_sessions 
            WHERE optimization_sessions.id = optimization_results.session_id 
            AND optimization_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own optimization results" ON optimization_results
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM optimization_sessions 
            WHERE optimization_sessions.id = optimization_results.session_id 
            AND optimization_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all optimization results" ON optimization_results
    FOR ALL USING (auth.role() = 'service_role');