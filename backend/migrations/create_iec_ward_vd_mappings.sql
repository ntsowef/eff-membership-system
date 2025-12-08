-- Create IEC Ward Mapping Table
-- Maps IEC ward_id to our internal ward_code

CREATE TABLE IF NOT EXISTS iec_ward_mappings (
    mapping_id SERIAL PRIMARY KEY,
    iec_ward_id BIGINT NOT NULL UNIQUE,
    ward_code VARCHAR(20) NOT NULL,
    ward_name VARCHAR(255),
    municipality_code VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ward_code FOREIGN KEY (ward_code) REFERENCES wards(ward_code) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_iec_ward_id ON iec_ward_mappings(iec_ward_id);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_ward_code ON iec_ward_mappings(ward_code);

-- Create IEC Voting District Mapping Table
-- Maps IEC vd_number to our internal voting_district_code

CREATE TABLE IF NOT EXISTS iec_voting_district_mappings (
    mapping_id SERIAL PRIMARY KEY,
    iec_vd_number BIGINT NOT NULL UNIQUE,
    voting_district_code VARCHAR(20) NOT NULL,
    voting_district_name VARCHAR(255),
    ward_code VARCHAR(20),
    voting_station_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_voting_district_code FOREIGN KEY (voting_district_code) REFERENCES voting_districts(voting_district_code) ON DELETE CASCADE,
    CONSTRAINT fk_ward_code_vd FOREIGN KEY (ward_code) REFERENCES wards(ward_code) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_iec_vd_mappings_iec_vd_number ON iec_voting_district_mappings(iec_vd_number);
CREATE INDEX IF NOT EXISTS idx_iec_vd_mappings_voting_district_code ON iec_voting_district_mappings(voting_district_code);
CREATE INDEX IF NOT EXISTS idx_iec_vd_mappings_ward_code ON iec_voting_district_mappings(ward_code);

-- Add comments
COMMENT ON TABLE iec_ward_mappings IS 'Maps IEC ward IDs to internal ward codes';
COMMENT ON TABLE iec_voting_district_mappings IS 'Maps IEC voting district numbers to internal voting district codes';

-- Grant permissions (sequences are auto-created by SERIAL)
GRANT SELECT, INSERT, UPDATE ON iec_ward_mappings TO eff_admin;
GRANT SELECT, INSERT, UPDATE ON iec_voting_district_mappings TO eff_admin;

