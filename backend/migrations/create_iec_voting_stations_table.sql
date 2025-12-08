-- Create IEC Voting Stations Reference Table
-- This table contains the complete IEC voting station data for mapping IEC IDs to internal codes
-- Data source: reports/VOTING_STATIONS_ELECTIONS.xlsx

DROP TABLE IF EXISTS iec_voting_stations CASCADE;

CREATE TABLE iec_voting_stations (
    -- Primary key
    id SERIAL PRIMARY KEY,
    
    -- Location details
    town VARCHAR(255),
    suburb VARCHAR(255),
    street VARCHAR(255),
    
    -- GPS coordinates
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    
    -- IEC Province information
    iec_province_id INTEGER NOT NULL,
    iec_province_name VARCHAR(100) NOT NULL,
    
    -- IEC Municipality information
    iec_municipality_id INTEGER NOT NULL,
    iec_municipality_name VARCHAR(255) NOT NULL,
    
    -- IEC Ward information
    iec_ward_id BIGINT NOT NULL,
    
    -- IEC Voting District information
    iec_vd_number BIGINT NOT NULL,
    iec_voting_district_name VARCHAR(255) NOT NULL,
    iec_vd_address TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for fast lookups
    CONSTRAINT unique_vd_number UNIQUE (iec_vd_number)
);

-- Create indexes for efficient IEC ID lookups
CREATE INDEX idx_iec_voting_stations_province_id ON iec_voting_stations(iec_province_id);
CREATE INDEX idx_iec_voting_stations_municipality_id ON iec_voting_stations(iec_municipality_id);
CREATE INDEX idx_iec_voting_stations_ward_id ON iec_voting_stations(iec_ward_id);
CREATE INDEX idx_iec_voting_stations_vd_number ON iec_voting_stations(iec_vd_number);

-- Create composite index for common query patterns
CREATE INDEX idx_iec_voting_stations_lookup ON iec_voting_stations(iec_province_id, iec_municipality_id, iec_ward_id);

-- Add comments
COMMENT ON TABLE iec_voting_stations IS 'IEC voting station reference data for mapping IEC IDs to internal codes';
COMMENT ON COLUMN iec_voting_stations.iec_province_id IS 'IEC Province ID (e.g., 3 for Gauteng)';
COMMENT ON COLUMN iec_voting_stations.iec_municipality_id IS 'IEC Municipality ID (e.g., 3003 for Johannesburg)';
COMMENT ON COLUMN iec_voting_stations.iec_ward_id IS 'IEC Ward ID (e.g., 79800135)';
COMMENT ON COLUMN iec_voting_stations.iec_vd_number IS 'IEC Voting District Number (e.g., 32871326)';

-- Grant permissions
GRANT SELECT ON iec_voting_stations TO PUBLIC;
GRANT ALL ON iec_voting_stations TO eff_admin;
GRANT USAGE, SELECT ON SEQUENCE iec_voting_stations_id_seq TO eff_admin;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Table iec_voting_stations created successfully';
    RAISE NOTICE '📊 Ready to import data from VOTING_STATIONS_ELECTIONS.xlsx';
END $$;

