-- Migration: Create iec_province_mappings table
-- Date: 2025-10-21
-- Purpose: Map internal province codes to IEC API province IDs

CREATE TABLE IF NOT EXISTS iec_province_mappings (
    id SERIAL PRIMARY KEY,
    province_code VARCHAR(10) UNIQUE NOT NULL,
    province_name VARCHAR(255) NOT NULL,
    iec_province_id INT NOT NULL,
    iec_province_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_iec_province_mappings_province_code ON iec_province_mappings(province_code);
CREATE INDEX IF NOT EXISTS idx_iec_province_mappings_iec_province_id ON iec_province_mappings(iec_province_id);
CREATE INDEX IF NOT EXISTS idx_iec_province_mappings_is_active ON iec_province_mappings(is_active);

-- Add comments
COMMENT ON TABLE iec_province_mappings IS 'Mapping between internal province codes and IEC API province IDs';
COMMENT ON COLUMN iec_province_mappings.province_code IS 'Internal province code (EC, FS, GP, KZN, LP, MP, NC, NW, WC)';
COMMENT ON COLUMN iec_province_mappings.province_name IS 'Internal province name';
COMMENT ON COLUMN iec_province_mappings.iec_province_id IS 'IEC API province ID';
COMMENT ON COLUMN iec_province_mappings.iec_province_name IS 'IEC API province name';
COMMENT ON COLUMN iec_province_mappings.is_active IS 'Whether this mapping is active';

-- Insert default province mappings (South African provinces)
INSERT INTO iec_province_mappings (province_code, province_name, iec_province_id, iec_province_name, is_active)
VALUES
    ('EC', 'Eastern Cape', 1, 'Eastern Cape', TRUE),
    ('FS', 'Free State', 2, 'Free State', TRUE),
    ('GP', 'Gauteng', 3, 'Gauteng', TRUE),
    ('KZN', 'KwaZulu-Natal', 4, 'KwaZulu-Natal', TRUE),
    ('LP', 'Limpopo', 5, 'Limpopo', TRUE),
    ('MP', 'Mpumalanga', 6, 'Mpumalanga', TRUE),
    ('NC', 'Northern Cape', 7, 'Northern Cape', TRUE),
    ('NW', 'North West', 8, 'North West', TRUE),
    ('WC', 'Western Cape', 9, 'Western Cape', TRUE)
ON CONFLICT (province_code) DO NOTHING;

