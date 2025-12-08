-- Migration: Create iec_municipality_mappings table
-- Date: 2025-10-21
-- Purpose: Map internal municipality codes to IEC API municipality IDs

CREATE TABLE IF NOT EXISTS iec_municipality_mappings (
    id SERIAL PRIMARY KEY,
    municipality_code VARCHAR(20) UNIQUE NOT NULL,
    municipality_name VARCHAR(255) NOT NULL,
    province_code VARCHAR(10) NOT NULL,
    iec_municipality_id VARCHAR(50) NOT NULL,
    iec_municipality_name VARCHAR(255) NOT NULL,
    iec_province_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_iec_municipality_mappings_province 
        FOREIGN KEY (province_code) 
        REFERENCES iec_province_mappings(province_code) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_iec_municipality_mappings_municipality_code ON iec_municipality_mappings(municipality_code);
CREATE INDEX IF NOT EXISTS idx_iec_municipality_mappings_province_code ON iec_municipality_mappings(province_code);
CREATE INDEX IF NOT EXISTS idx_iec_municipality_mappings_iec_municipality_id ON iec_municipality_mappings(iec_municipality_id);
CREATE INDEX IF NOT EXISTS idx_iec_municipality_mappings_iec_province_id ON iec_municipality_mappings(iec_province_id);
CREATE INDEX IF NOT EXISTS idx_iec_municipality_mappings_is_active ON iec_municipality_mappings(is_active);

-- Add comments
COMMENT ON TABLE iec_municipality_mappings IS 'Mapping between internal municipality codes and IEC API municipality IDs';
COMMENT ON COLUMN iec_municipality_mappings.municipality_code IS 'Internal municipality code';
COMMENT ON COLUMN iec_municipality_mappings.municipality_name IS 'Internal municipality name';
COMMENT ON COLUMN iec_municipality_mappings.province_code IS 'Internal province code (foreign key)';
COMMENT ON COLUMN iec_municipality_mappings.iec_municipality_id IS 'IEC API municipality ID (can be string or number)';
COMMENT ON COLUMN iec_municipality_mappings.iec_municipality_name IS 'IEC API municipality name';
COMMENT ON COLUMN iec_municipality_mappings.iec_province_id IS 'IEC API province ID';
COMMENT ON COLUMN iec_municipality_mappings.is_active IS 'Whether this mapping is active';

