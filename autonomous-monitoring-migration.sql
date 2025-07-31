-- Autonomous Monitoring and Decision Engine Database Schema
-- This migration adds tables for BestMate's autonomous monitoring capabilities

-- Create monitoring_configs table to store per-app monitoring settings
CREATE TABLE IF NOT EXISTS monitoring_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(255) NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, app_identifier)
);

-- Create monitoring_connections table to store app connection details
CREATE TABLE IF NOT EXISTS monitoring_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(255) NOT NULL,
    app_name VARCHAR(255) NOT NULL,
    description TEXT,
    monitoring_api_key VARCHAR(255) UNIQUE NOT NULL,
    config JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, app_identifier)
);

-- Create monitoring_logs table to store ingested application logs
CREATE TABLE IF NOT EXISTS monitoring_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(255) NOT NULL,
    log_content TEXT NOT NULL,
    log_level VARCHAR(20) DEFAULT 'info' CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
    context JSONB DEFAULT '{}',
    detected_issues JSONB DEFAULT '[]',
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create autonomous_configs table for autonomous operation settings
CREATE TABLE IF NOT EXISTS autonomous_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(255) NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, app_identifier)
);

-- Create autonomous_optimization_sessions table to track autonomous optimization sessions
CREATE TABLE IF NOT EXISTS autonomous_optimization_sessions (
    id VARCHAR(255) PRIMARY KEY, -- Custom format for session IDs
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(255) NOT NULL,
    triggered_by VARCHAR(50) NOT NULL CHECK (triggered_by IN ('issues', 'performance', 'schedule', 'manual')),
    issues JSONB NOT NULL DEFAULT '[]',
    decision JSONB NOT NULL,
    result JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed', 'rolled_back')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create issue_sessions table to track issue resolution workflows
CREATE TABLE IF NOT EXISTS issue_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(255) NOT NULL,
    issue_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_method VARCHAR(100),
    optimization_session_id VARCHAR(255) REFERENCES autonomous_optimization_sessions(id),
    metadata JSONB DEFAULT '{}'
);

-- Create performance_metrics table for tracking application performance
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(255) NOT NULL,
    metric_type VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create applied_optimizations table to track optimization deployments
CREATE TABLE IF NOT EXISTS applied_optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(255) NOT NULL,
    optimization_session_id VARCHAR(255) REFERENCES autonomous_optimization_sessions(id),
    original_content TEXT NOT NULL,
    optimized_content TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    backup_created BOOLEAN DEFAULT false,
    rollback_data JSONB
);

-- Create config_backups table for storing configuration backups
CREATE TABLE IF NOT EXISTS config_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(255) NOT NULL,
    optimization_session_id VARCHAR(255) REFERENCES autonomous_optimization_sessions(id),
    backup_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_logs table to track sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(255) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL, -- 'webhook', 'email', 'slack', etc.
    content JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT
);

-- Create optimization_history table for continuous learning
CREATE TABLE IF NOT EXISTS optimization_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(255) DEFAULT 'default',
    original_prompt TEXT NOT NULL,
    optimized_prompt TEXT NOT NULL,
    strategy VARCHAR(100) NOT NULL,
    improvement DECIMAL(6,2) NOT NULL, -- Can be negative for failed attempts
    issues JSONB DEFAULT '[]',
    success BOOLEAN NOT NULL,
    context JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auto_update_configs table for automated config file updates
CREATE TABLE IF NOT EXISTS auto_update_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_identifier VARCHAR(255) NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, app_identifier)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_user_app ON monitoring_logs(user_id, app_identifier);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_created_at ON monitoring_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_severity ON monitoring_logs(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_issues ON monitoring_logs USING GIN(detected_issues);

CREATE INDEX IF NOT EXISTS idx_autonomous_sessions_user_app ON autonomous_optimization_sessions(user_id, app_identifier);
CREATE INDEX IF NOT EXISTS idx_autonomous_sessions_status ON autonomous_optimization_sessions(status);
CREATE INDEX IF NOT EXISTS idx_autonomous_sessions_created_at ON autonomous_optimization_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_issue_sessions_user_app ON issue_sessions(user_id, app_identifier);
CREATE INDEX IF NOT EXISTS idx_issue_sessions_detected_at ON issue_sessions(detected_at);
CREATE INDEX IF NOT EXISTS idx_issue_sessions_severity ON issue_sessions(severity);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_app ON performance_metrics(user_id, app_identifier);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_applied_optimizations_user_app ON applied_optimizations(user_id, app_identifier);
CREATE INDEX IF NOT EXISTS idx_applied_optimizations_applied_at ON applied_optimizations(applied_at);

CREATE INDEX IF NOT EXISTS idx_optimization_history_user_app ON optimization_history(user_id, app_identifier);
CREATE INDEX IF NOT EXISTS idx_optimization_history_timestamp ON optimization_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_optimization_history_strategy ON optimization_history(strategy);
CREATE INDEX IF NOT EXISTS idx_optimization_history_success ON optimization_history(success);

-- Create or replace trigger function for updating updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS update_monitoring_configs_updated_at ON monitoring_configs;
CREATE TRIGGER update_monitoring_configs_updated_at
    BEFORE UPDATE ON monitoring_configs
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_autonomous_configs_updated_at ON autonomous_configs;
CREATE TRIGGER update_autonomous_configs_updated_at
    BEFORE UPDATE ON autonomous_configs
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security on all new tables
ALTER TABLE monitoring_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous_optimization_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE applied_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_update_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for monitoring_configs
CREATE POLICY "Users can view their own monitoring configs" ON monitoring_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own monitoring configs" ON monitoring_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monitoring configs" ON monitoring_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all monitoring configs" ON monitoring_configs
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for monitoring_connections
CREATE POLICY "Users can view their own monitoring connections" ON monitoring_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own monitoring connections" ON monitoring_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monitoring connections" ON monitoring_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monitoring connections" ON monitoring_connections
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all monitoring connections" ON monitoring_connections
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for monitoring_logs
CREATE POLICY "Users can view their own monitoring logs" ON monitoring_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monitoring logs" ON monitoring_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all monitoring logs" ON monitoring_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for autonomous_configs
CREATE POLICY "Users can view their own autonomous configs" ON autonomous_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own autonomous configs" ON autonomous_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own autonomous configs" ON autonomous_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all autonomous configs" ON autonomous_configs
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for autonomous_optimization_sessions
CREATE POLICY "Users can view their own optimization sessions" ON autonomous_optimization_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own optimization sessions" ON autonomous_optimization_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own optimization sessions" ON autonomous_optimization_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all optimization sessions" ON autonomous_optimization_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for issue_sessions
CREATE POLICY "Users can view their own issue sessions" ON issue_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own issue sessions" ON issue_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own issue sessions" ON issue_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all issue sessions" ON issue_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for performance_metrics
CREATE POLICY "Users can view their own performance metrics" ON performance_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance metrics" ON performance_metrics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all performance metrics" ON performance_metrics
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for applied_optimizations
CREATE POLICY "Users can view their own applied optimizations" ON applied_optimizations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applied optimizations" ON applied_optimizations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all applied optimizations" ON applied_optimizations
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for config_backups
CREATE POLICY "Users can view their own config backups" ON config_backups
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own config backups" ON config_backups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all config backups" ON config_backups
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for notification_logs
CREATE POLICY "Users can view their own notification logs" ON notification_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification logs" ON notification_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notification logs" ON notification_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for optimization_history
CREATE POLICY "Users can view their own optimization history" ON optimization_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own optimization history" ON optimization_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all optimization history" ON optimization_history
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for auto_update_configs
CREATE POLICY "Users can view their own auto-update configs" ON auto_update_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own auto-update configs" ON auto_update_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own auto-update configs" ON auto_update_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own auto-update configs" ON auto_update_configs
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all auto-update configs" ON auto_update_configs
    FOR ALL USING (auth.role() = 'service_role');

-- Create views for common queries
CREATE OR REPLACE VIEW user_monitoring_dashboard AS
SELECT 
    ml.user_id,
    ml.app_identifier,
    COUNT(*) as total_logs,
    COUNT(CASE WHEN ml.detected_issues != '[]' THEN 1 END) as logs_with_issues,
    COUNT(CASE WHEN ml.severity = 'critical' THEN 1 END) as critical_issues,
    COUNT(CASE WHEN ml.severity = 'high' THEN 1 END) as high_issues,
    COUNT(CASE WHEN ml.log_level = 'error' THEN 1 END) as error_logs,
    MAX(ml.created_at) as last_log_time,
    ROUND(
        CASE 
            WHEN COUNT(*) > 0 
            THEN (COUNT(CASE WHEN ml.log_level = 'error' THEN 1 END)::decimal / COUNT(*)) * 100 
            ELSE 0 
        END, 2
    ) as error_rate_percentage
FROM monitoring_logs ml
WHERE ml.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY ml.user_id, ml.app_identifier;

-- Create view for optimization session summaries
CREATE OR REPLACE VIEW optimization_session_summary AS
SELECT 
    aos.user_id,
    aos.app_identifier,
    aos.status,
    COUNT(*) as session_count,
    COUNT(CASE WHEN aos.status = 'completed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN aos.status = 'failed' THEN 1 END) as failed_sessions,
    AVG(
        CASE 
            WHEN aos.completed_at IS NOT NULL AND aos.created_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (aos.completed_at - aos.created_at))
            ELSE NULL
        END
    ) as avg_completion_time_seconds,
    MAX(aos.created_at) as last_optimization
FROM autonomous_optimization_sessions aos
WHERE aos.created_at >= NOW() - INTERVAL '7 days'
GROUP BY aos.user_id, aos.app_identifier, aos.status;

-- Success message
SELECT 'Autonomous monitoring and decision engine schema created successfully!' as result;