-- Migration: Create iec_ward_mappings table
-- Date: 2025-10-21
-- Purpose: Map internal ward codes to IEC API ward IDs

CREATE TABLE IF NOT EXISTS iec_ward_mappings (
    id SERIAL PRIMARY KEY,
    ward_code VARCHAR(20) UNIQUE NOT NULL,
    ward_name VARCHAR(255) NOT NULL,
    ward_number INT NOT NULL,
    municipality_code VARCHAR(20) NOT NULL,
    province_code VARCHAR(10) NOT NULL,
    iec_ward_id VARCHAR(50) NOT NULL,
    iec_ward_name VARCHAR(255) NOT NULL,
    iec_municipality_id VARCHAR(50) NOT NULL,
    iec_province_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_iec_ward_mappings_municipality 
        FOREIGN KEY (municipality_code) 
        REFERENCES iec_municipality_mappings(municipality_code) 
        ON DELETE CASCADE,
    CONSTRAINT fk_iec_ward_mappings_province 
        FOREIGN KEY (province_code) 
        REFERENCES iec_province_mappings(province_code) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_ward_code ON iec_ward_mappings(ward_code);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_ward_number ON iec_ward_mappings(ward_number);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_municipality_code ON iec_ward_mappings(municipality_code);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_province_code ON iec_ward_mappings(province_code);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_iec_ward_id ON iec_ward_mappings(iec_ward_id);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_iec_municipality_id ON iec_ward_mappings(iec_municipality_id);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_iec_province_id ON iec_ward_mappings(iec_province_id);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_is_active ON iec_ward_mappings(is_active);

-- Add comments
COMMENT ON TABLE iec_ward_mappings IS 'Mapping between internal ward codes and IEC API ward IDs';
COMMENT ON COLUMN iec_ward_mappings.ward_code IS 'Internal ward code';
COMMENT ON COLUMN iec_ward_mappings.ward_name IS 'Internal ward name';
COMMENT ON COLUMN iec_ward_mappings.ward_number IS 'Ward number';
COMMENT ON COLUMN iec_ward_mappings.municipality_code IS 'Internal municipality code (foreign key)';
COMMENT ON COLUMN iec_ward_mappings.province_code IS 'Internal province code (foreign key)';
COMMENT ON COLUMN iec_ward_mappings.iec_ward_id IS 'IEC API ward ID (can be string or number)';
COMMENT ON COLUMN iec_ward_mappings.iec_ward_name IS 'IEC API ward name';
COMMENT ON COLUMN iec_ward_mappings.iec_municipality_id IS 'IEC API municipality ID';
COMMENT ON COLUMN iec_ward_mappings.iec_province_id IS 'IEC API province ID';
COMMENT ON COLUMN iec_ward_mappings.is_active IS 'Whether this mapping is active';

