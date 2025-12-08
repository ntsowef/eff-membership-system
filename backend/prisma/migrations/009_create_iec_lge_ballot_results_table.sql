-- Migration: Create iec_lge_ballot_results table
-- Date: 2025-10-21
-- Purpose: Store Local Government Election ballot results from IEC API

CREATE TABLE IF NOT EXISTS iec_lge_ballot_results (
    id SERIAL PRIMARY KEY,
    iec_event_id INT NOT NULL,
    iec_province_id INT,
    iec_municipality_id VARCHAR(50),
    iec_ward_id VARCHAR(50),
    province_code VARCHAR(10),
    municipality_code VARCHAR(20),
    ward_code VARCHAR(20),
    ballot_data JSONB NOT NULL,
    total_votes INT DEFAULT 0,
    registered_voters INT DEFAULT 0,
    voter_turnout_percentage DECIMAL(5, 2),
    result_type VARCHAR(20) NOT NULL,
    data_source VARCHAR(50) DEFAULT 'IEC_API',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_iec_lge_ballot_results_event 
        FOREIGN KEY (iec_event_id) 
        REFERENCES iec_electoral_events(iec_event_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_iec_lge_ballot_results_province 
        FOREIGN KEY (province_code) 
        REFERENCES iec_province_mappings(province_code) 
        ON DELETE SET NULL,
    CONSTRAINT fk_iec_lge_ballot_results_municipality 
        FOREIGN KEY (municipality_code) 
        REFERENCES iec_municipality_mappings(municipality_code) 
        ON DELETE SET NULL,
    CONSTRAINT fk_iec_lge_ballot_results_ward 
        FOREIGN KEY (ward_code) 
        REFERENCES iec_ward_mappings(ward_code) 
        ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT chk_result_type CHECK (result_type IN ('province', 'municipality', 'ward')),
    CONSTRAINT chk_data_source CHECK (data_source IN ('IEC_API', 'MOCK', 'MANUAL', 'IMPORT')),
    
    -- Unique constraint based on result type
    CONSTRAINT uq_iec_lge_ballot_results_province 
        UNIQUE (iec_event_id, result_type, iec_province_id) 
        WHERE result_type = 'province',
    CONSTRAINT uq_iec_lge_ballot_results_municipality 
        UNIQUE (iec_event_id, result_type, iec_municipality_id) 
        WHERE result_type = 'municipality',
    CONSTRAINT uq_iec_lge_ballot_results_ward 
        UNIQUE (iec_event_id, result_type, iec_ward_id) 
        WHERE result_type = 'ward'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_iec_event_id ON iec_lge_ballot_results(iec_event_id);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_iec_province_id ON iec_lge_ballot_results(iec_province_id);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_iec_municipality_id ON iec_lge_ballot_results(iec_municipality_id);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_iec_ward_id ON iec_lge_ballot_results(iec_ward_id);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_province_code ON iec_lge_ballot_results(province_code);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_municipality_code ON iec_lge_ballot_results(municipality_code);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_ward_code ON iec_lge_ballot_results(ward_code);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_result_type ON iec_lge_ballot_results(result_type);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_data_source ON iec_lge_ballot_results(data_source);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_last_updated ON iec_lge_ballot_results(last_updated);

-- Add comments
COMMENT ON TABLE iec_lge_ballot_results IS 'Local Government Election ballot results from IEC API';
COMMENT ON COLUMN iec_lge_ballot_results.iec_event_id IS 'Foreign key to iec_electoral_events';
COMMENT ON COLUMN iec_lge_ballot_results.iec_province_id IS 'IEC API province ID (nullable)';
COMMENT ON COLUMN iec_lge_ballot_results.iec_municipality_id IS 'IEC API municipality ID (nullable)';
COMMENT ON COLUMN iec_lge_ballot_results.iec_ward_id IS 'IEC API ward ID (nullable)';
COMMENT ON COLUMN iec_lge_ballot_results.province_code IS 'Internal province code (nullable)';
COMMENT ON COLUMN iec_lge_ballot_results.municipality_code IS 'Internal municipality code (nullable)';
COMMENT ON COLUMN iec_lge_ballot_results.ward_code IS 'Internal ward code (nullable)';
COMMENT ON COLUMN iec_lge_ballot_results.ballot_data IS 'Full ballot results data in JSON format';
COMMENT ON COLUMN iec_lge_ballot_results.total_votes IS 'Total votes cast';
COMMENT ON COLUMN iec_lge_ballot_results.registered_voters IS 'Total registered voters';
COMMENT ON COLUMN iec_lge_ballot_results.voter_turnout_percentage IS 'Voter turnout percentage';
COMMENT ON COLUMN iec_lge_ballot_results.result_type IS 'Type of result: province, municipality, or ward';
COMMENT ON COLUMN iec_lge_ballot_results.data_source IS 'Source of the data: IEC_API, MOCK, MANUAL, IMPORT';
COMMENT ON COLUMN iec_lge_ballot_results.last_updated IS 'Timestamp when data was last updated';

