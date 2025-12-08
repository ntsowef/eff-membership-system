-- =====================================================
-- SRPA Delegate Configuration Table
-- =====================================================
-- Purpose: Store configurable delegate limits for SRPA (Sub-Regional People's Assembly)
-- This allows administrators to set different delegate limits per sub-region
-- instead of using a hardcoded limit of 3 delegates
-- =====================================================

-- Create the SRPA delegate configuration table
CREATE TABLE IF NOT EXISTS srpa_delegate_config (
    id SERIAL PRIMARY KEY,
    province_code VARCHAR(10) NOT NULL,
    sub_region_code VARCHAR(20) NOT NULL, -- municipality_code for Metro Sub-Region
    max_delegates INTEGER NOT NULL DEFAULT 3,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, -- user_id who created the config
    updated_by INTEGER, -- user_id who last updated the config
    
    -- Constraints
    CONSTRAINT fk_srpa_config_province 
        FOREIGN KEY (province_code) 
        REFERENCES provinces(province_code) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_srpa_config_sub_region 
        FOREIGN KEY (sub_region_code) 
        REFERENCES municipalities(municipality_code) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_srpa_config_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(user_id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_srpa_config_updated_by 
        FOREIGN KEY (updated_by) 
        REFERENCES users(user_id) 
        ON DELETE SET NULL,
    
    -- Ensure max_delegates is positive
    CONSTRAINT chk_max_delegates_positive 
        CHECK (max_delegates > 0),
    
    -- Unique constraint: one config per sub-region
    CONSTRAINT uq_srpa_config_sub_region 
        UNIQUE (sub_region_code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_srpa_config_province 
    ON srpa_delegate_config(province_code);

CREATE INDEX IF NOT EXISTS idx_srpa_config_sub_region 
    ON srpa_delegate_config(sub_region_code);

CREATE INDEX IF NOT EXISTS idx_srpa_config_active 
    ON srpa_delegate_config(is_active);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_srpa_delegate_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_srpa_delegate_config_timestamp
    BEFORE UPDATE ON srpa_delegate_config
    FOR EACH ROW
    EXECUTE FUNCTION update_srpa_delegate_config_timestamp();

-- Add comments for documentation
COMMENT ON TABLE srpa_delegate_config IS 'Stores configurable delegate limits for SRPA (Sub-Regional People''s Assembly) by municipality';
COMMENT ON COLUMN srpa_delegate_config.province_code IS 'Province code (e.g., GP, WC, KZN)';
COMMENT ON COLUMN srpa_delegate_config.sub_region_code IS 'Municipality code (includes Local municipalities and Metro Sub-Regions)';
COMMENT ON COLUMN srpa_delegate_config.max_delegates IS 'Maximum number of SRPA delegates allowed for this municipality';
COMMENT ON COLUMN srpa_delegate_config.is_active IS 'Whether this configuration is currently active';
COMMENT ON COLUMN srpa_delegate_config.created_by IS 'User ID who created this configuration';
COMMENT ON COLUMN srpa_delegate_config.updated_by IS 'User ID who last updated this configuration';

-- Insert default configurations for ALL municipalities (Local, Local Municipality, and Metro Sub-Regions)
-- This sets all municipalities to the default limit of 3 delegates
-- Administrators can then modify these values through the SRPA Delegate Setter interface
INSERT INTO srpa_delegate_config (province_code, sub_region_code, max_delegates, notes, created_by)
SELECT
    -- For Local municipalities: get province from district
    -- For Metro Sub-Regions: get province from parent municipality's district
    COALESCE(d.province_code, pd.province_code) as province_code,
    m.municipality_code as sub_region_code,
    3 as max_delegates,
    CASE
        WHEN m.municipality_type = 'Metro Sub-Region' THEN 'Default configuration for Metro Sub-Region - automatically created during migration'
        WHEN m.municipality_type IN ('Local', 'Local Municipality') THEN 'Default configuration for Local Municipality - automatically created during migration'
        ELSE 'Default configuration - automatically created during migration'
    END as notes,
    (SELECT user_id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'National Administrator' LIMIT 1) LIMIT 1) as created_by
FROM municipalities m
LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id
LEFT JOIN districts d ON m.district_code = d.district_code
LEFT JOIN districts pd ON pm.district_code = pd.district_code
WHERE m.municipality_type IN ('Local', 'Local Municipality', 'Metro Sub-Region')
    AND m.is_active = TRUE
    AND COALESCE(d.province_code, pd.province_code) IS NOT NULL -- Only include municipalities with valid province
ON CONFLICT (sub_region_code) DO NOTHING;

-- Create a view for easy querying of SRPA delegate configurations with geographic details
CREATE OR REPLACE VIEW vw_srpa_delegate_config AS
SELECT
    sdc.id,
    sdc.province_code,
    p.province_name,
    sdc.sub_region_code,
    m.municipality_name as sub_region_name,
    m.municipality_type,
    pm.municipality_code as parent_municipality_code,
    pm.municipality_name as parent_municipality_name,
    sdc.max_delegates,
    sdc.notes,
    sdc.is_active,
    sdc.created_at,
    sdc.updated_at,
    u1.name as created_by_name,
    u2.name as updated_by_name,
    -- Count current active delegates for this municipality
    (SELECT COUNT(DISTINCT wd.delegate_id)
     FROM ward_delegates wd
     JOIN wards w ON wd.ward_code = w.ward_code
     JOIN municipalities wm ON w.municipality_code = wm.municipality_code
     JOIN assembly_types at ON wd.assembly_type_id = at.assembly_type_id
     WHERE wm.municipality_code = sdc.sub_region_code
         AND at.assembly_code = 'SRPA'
         AND wd.delegate_status = 'Active') as current_delegates_count
FROM srpa_delegate_config sdc
JOIN provinces p ON sdc.province_code = p.province_code
JOIN municipalities m ON sdc.sub_region_code = m.municipality_code
LEFT JOIN municipalities pm ON m.parent_municipality_id = pm.municipality_id
LEFT JOIN users u1 ON sdc.created_by = u1.user_id
LEFT JOIN users u2 ON sdc.updated_by = u2.user_id
WHERE sdc.is_active = TRUE
ORDER BY p.province_name, m.municipality_type, m.municipality_name;

COMMENT ON VIEW vw_srpa_delegate_config IS 'View showing SRPA delegate configurations for all municipalities (Local and Metro Sub-Regions) with geographic details and current delegate counts';

