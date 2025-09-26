-- Test basic schema creation
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate age from date of birth
CREATE OR REPLACE FUNCTION calculate_age()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_of_birth IS NOT NULL THEN
        NEW.age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.date_of_birth));
    ELSE
        NEW.age = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Test table creation
CREATE TABLE IF NOT EXISTS genders (
    gender_id SERIAL PRIMARY KEY,
    gender_name VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO genders (gender_name) VALUES 
('Male'), ('Female'), ('Other'), ('Prefer not to say')
ON CONFLICT (gender_name) DO NOTHING;

-- Test view creation
CREATE OR REPLACE VIEW vw_test_view AS
SELECT 
    gender_id,
    gender_name,
    'Test Status' as status
FROM genders;

SELECT 'Schema test completed successfully!' as result;
