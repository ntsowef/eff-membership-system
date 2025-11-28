-- Create search_history table for logging search activities
-- This table tracks user search queries for analytics and audit purposes

CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    search_query VARCHAR(255) NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    search_type VARCHAR(50) NOT NULL DEFAULT 'general',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_search_type ON search_history(search_type);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_search_query ON search_history(search_query);

-- Add foreign key constraint to users table (if it exists)
-- Note: This will fail silently if users table doesn't exist or doesn't have the right structure
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name = 'fk_search_history_user_id' 
                      AND table_name = 'search_history') THEN
            ALTER TABLE search_history 
            ADD CONSTRAINT fk_search_history_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if foreign key can't be created
        NULL;
END $$;

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_search_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_history_updated_at
    BEFORE UPDATE ON search_history
    FOR EACH ROW
    EXECUTE FUNCTION update_search_history_updated_at();

-- Insert some sample data to verify the table works
INSERT INTO search_history (user_id, search_query, results_count, execution_time_ms, search_type, ip_address, user_agent)
VALUES 
    (1, 'test search', 0, 100, 'quick', '127.0.0.1', 'Test User Agent'),
    (1, 'sample query', 5, 250, 'advanced', '127.0.0.1', 'Test User Agent')
ON CONFLICT DO NOTHING;

-- Display table information
SELECT 
    'search_history table created successfully' as status,
    COUNT(*) as sample_records
FROM search_history;
