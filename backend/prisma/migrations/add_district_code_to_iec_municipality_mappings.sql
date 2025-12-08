-- Migration: Add district_code to iec_municipality_mappings table
-- Date: 2025-12-03
-- Purpose: Add district_code column to eliminate the extra lookup step when mapping IEC municipalities

-- Add district_code column
ALTER TABLE iec_municipality_mappings 
ADD COLUMN IF NOT EXISTS district_code VARCHAR(20);

-- Create index on district_code
CREATE INDEX IF NOT EXISTS idx_iec_municipality_mappings_district_code 
ON iec_municipality_mappings(district_code);

-- Add comment
COMMENT ON COLUMN iec_municipality_mappings.district_code IS 'Internal district code for quick lookup (derived from municipalities table)';

