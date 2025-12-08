-- =====================================================================================
-- ADD METRO SUB-REGION LEADERSHIP POSITIONS
-- =====================================================================================
-- This script creates leadership positions for Metro Sub-Regions (sub-regions within
-- metropolitan municipalities) that are currently missing leadership positions.
-- 
-- Metro Sub-Regions:
-- - Buffalo City (BUF): 4 sub-regions
-- - Cape Town (CPT): 10 sub-regions
-- - Ekurhuleni (EKU): 5 sub-regions
-- - eThekwini (ETH): 10 sub-regions
-- - Johannesburg (JHB): 7 sub-regions
-- - Mangaung (MAN): 4 sub-regions
-- - Nelson Mandela Bay (NMA): 7 sub-regions
-- - Tshwane (TSH): 6 sub-regions
-- Total: 53 Metro Sub-Regions
-- =====================================================================================

-- Standard leadership positions for each metro sub-region:
-- 1. Sub-Region Chairperson
-- 2. Sub-Region Secretary
-- 3. Sub-Region Treasurer
-- 4. Sub-Region Deputy Chairperson
-- 5. Sub-Region Deputy Secretary
-- 6. Sub-Region Youth Leader
-- 7. Sub-Region Women Leader
-- 8. Sub-Region Organizer
-- 9-18. Sub-Region Committee Members (10 members)

BEGIN;

-- Create a temporary function to generate leadership positions for metro sub-regions
CREATE OR REPLACE FUNCTION create_metro_subregion_leadership_positions()
RETURNS void AS $$
DECLARE
    municipality_record RECORD;
    position_counter INTEGER := 0;
    base_position_id INTEGER;
BEGIN
    -- Get the maximum position ID to start from
    SELECT COALESCE(MAX(id), 0) + 1 INTO base_position_id FROM leadership_positions;
    
    -- Loop through all metro sub-regions that don't have leadership positions yet
    FOR municipality_record IN 
        SELECT 
            m.municipality_id,
            m.municipality_name,
            m.municipality_code,
            m.municipality_type
        FROM municipalities m
        LEFT JOIN leadership_positions lp 
            ON m.municipality_id = lp.entity_id 
            AND lp.hierarchy_level = 'Municipality'
        WHERE lp.id IS NULL 
            AND m.is_active = TRUE
            AND m.municipality_type = 'Metro Sub-Region'
        ORDER BY m.municipality_name
    LOOP
        -- 1. Chairperson
        INSERT INTO leadership_positions (
            id,
            position_name,
            position_code,
            position_description,
            hierarchy_level,
            position_category,
            is_core_position,
            requires_election,
            term_duration_months,
            max_concurrent_appointments,
            position_order,
            is_active,
            entity_id,
            entity_type
        ) VALUES (
            base_position_id + position_counter,
            municipality_record.municipality_name || ' Sub-Region Chairperson',
            'SRCHAIR_' || municipality_record.municipality_code,
            'Sub-Region Chairperson for ' || municipality_record.municipality_name,
            'Municipality',
            'Executive',
            TRUE,
            TRUE,
            60,
            1,
            1,
            TRUE,
            municipality_record.municipality_id,
            municipality_record.municipality_type
        );
        position_counter := position_counter + 1;

        -- 2. Secretary
        INSERT INTO leadership_positions (
            id,
            position_name,
            position_code,
            position_description,
            hierarchy_level,
            position_category,
            is_core_position,
            requires_election,
            term_duration_months,
            max_concurrent_appointments,
            position_order,
            is_active,
            entity_id,
            entity_type
        ) VALUES (
            base_position_id + position_counter,
            municipality_record.municipality_name || ' Sub-Region Secretary',
            'SRSEC_' || municipality_record.municipality_code,
            'Sub-Region Secretary for ' || municipality_record.municipality_name,
            'Municipality',
            'Executive',
            TRUE,
            TRUE,
            60,
            1,
            2,
            TRUE,
            municipality_record.municipality_id,
            municipality_record.municipality_type
        );
        position_counter := position_counter + 1;

        -- 3. Treasurer
        INSERT INTO leadership_positions (
            id,
            position_name,
            position_code,
            position_description,
            hierarchy_level,
            position_category,
            is_core_position,
            requires_election,
            term_duration_months,
            max_concurrent_appointments,
            position_order,
            is_active,
            entity_id,
            entity_type
        ) VALUES (
            base_position_id + position_counter,
            municipality_record.municipality_name || ' Sub-Region Treasurer',
            'SRTREAS_' || municipality_record.municipality_code,
            'Sub-Region Treasurer for ' || municipality_record.municipality_name,
            'Municipality',
            'Executive',
            TRUE,
            TRUE,
            60,
            1,
            3,
            TRUE,
            municipality_record.municipality_id,
            municipality_record.municipality_type
        );
        position_counter := position_counter + 1;

        -- 4. Deputy Chairperson
        INSERT INTO leadership_positions (
            id,
            position_name,
            position_code,
            position_description,
            hierarchy_level,
            position_category,
            is_core_position,
            requires_election,
            term_duration_months,
            max_concurrent_appointments,
            position_order,
            is_active,
            entity_id,
            entity_type
        ) VALUES (
            base_position_id + position_counter,
            municipality_record.municipality_name || ' Sub-Region Deputy Chairperson',
            'SRDCHAIR_' || municipality_record.municipality_code,
            'Sub-Region Deputy Chairperson for ' || municipality_record.municipality_name,
            'Municipality',
            'Executive',
            TRUE,
            TRUE,
            60,
            1,
            4,
            TRUE,
            municipality_record.municipality_id,
            municipality_record.municipality_type
        );
        position_counter := position_counter + 1;

        -- 5. Deputy Secretary
        INSERT INTO leadership_positions (
            id,
            position_name,
            position_code,
            position_description,
            hierarchy_level,
            position_category,
            is_core_position,
            requires_election,
            term_duration_months,
            max_concurrent_appointments,
            position_order,
            is_active,
            entity_id,
            entity_type
        ) VALUES (
            base_position_id + position_counter,
            municipality_record.municipality_name || ' Sub-Region Deputy Secretary',
            'SRDSEC_' || municipality_record.municipality_code,
            'Sub-Region Deputy Secretary for ' || municipality_record.municipality_name,
            'Municipality',
            'Executive',
            TRUE,
            TRUE,
            60,
            1,
            5,
            TRUE,
            municipality_record.municipality_id,
            municipality_record.municipality_type
        );
        position_counter := position_counter + 1;

        -- 6. Youth Leader
        INSERT INTO leadership_positions (
            id,
            position_name,
            position_code,
            position_description,
            hierarchy_level,
            position_category,
            is_core_position,
            requires_election,
            term_duration_months,
            max_concurrent_appointments,
            position_order,
            is_active,
            entity_id,
            entity_type
        ) VALUES (
            base_position_id + position_counter,
            municipality_record.municipality_name || ' Sub-Region Youth Leader',
            'SRYOUTH_' || municipality_record.municipality_code,
            'Sub-Region Youth Leader for ' || municipality_record.municipality_name,
            'Municipality',
            'Sectoral',
            TRUE,
            TRUE,
            60,
            1,
            6,
            TRUE,
            municipality_record.municipality_id,
            municipality_record.municipality_type
        );
        position_counter := position_counter + 1;

        -- 7. Women Leader
        INSERT INTO leadership_positions (
            id,
            position_name,
            position_code,
            position_description,
            hierarchy_level,
            position_category,
            is_core_position,
            requires_election,
            term_duration_months,
            max_concurrent_appointments,
            position_order,
            is_active,
            entity_id,
            entity_type
        ) VALUES (
            base_position_id + position_counter,
            municipality_record.municipality_name || ' Sub-Region Women Leader',
            'SRWOMEN_' || municipality_record.municipality_code,
            'Sub-Region Women Leader for ' || municipality_record.municipality_name,
            'Municipality',
            'Sectoral',
            TRUE,
            TRUE,
            60,
            1,
            7,
            TRUE,
            municipality_record.municipality_id,
            municipality_record.municipality_type
        );
        position_counter := position_counter + 1;

        -- 8. Organizer
        INSERT INTO leadership_positions (
            id,
            position_name,
            position_code,
            position_description,
            hierarchy_level,
            position_category,
            is_core_position,
            requires_election,
            term_duration_months,
            max_concurrent_appointments,
            position_order,
            is_active,
            entity_id,
            entity_type
        ) VALUES (
            base_position_id + position_counter,
            municipality_record.municipality_name || ' Sub-Region Organizer',
            'SRORG_' || municipality_record.municipality_code,
            'Sub-Region Organizer for ' || municipality_record.municipality_name,
            'Municipality',
            'Operational',
            FALSE,
            TRUE,
            60,
            1,
            8,
            TRUE,
            municipality_record.municipality_id,
            municipality_record.municipality_type
        );
        position_counter := position_counter + 1;

        -- 9-18. Committee Members (10 members)
        FOR i IN 1..10 LOOP
            INSERT INTO leadership_positions (
                id,
                position_name,
                position_code,
                position_description,
                hierarchy_level,
                position_category,
                is_core_position,
                requires_election,
                term_duration_months,
                max_concurrent_appointments,
                position_order,
                is_active,
                entity_id,
                entity_type
            ) VALUES (
                base_position_id + position_counter,
                municipality_record.municipality_name || ' Sub-Region Committee Member ' || i,
                'SRCOM' || LPAD(i::TEXT, 2, '0') || '_' || municipality_record.municipality_code,
                'Sub-Region Committee Member ' || i || ' for ' || municipality_record.municipality_name,
                'Municipality',
                'Committee',
                FALSE,
                TRUE,
                60,
                1,
                8 + i,
                TRUE,
                municipality_record.municipality_id,
                municipality_record.municipality_type
            );
            position_counter := position_counter + 1;
        END LOOP;

    END LOOP;

    RAISE NOTICE 'Created % leadership positions for metro sub-regions', position_counter;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT create_metro_subregion_leadership_positions();

-- Drop the temporary function
DROP FUNCTION create_metro_subregion_leadership_positions();

-- Update the sequence to the correct value
SELECT setval('leadership_positions_id_seq', (SELECT MAX(id) FROM leadership_positions));

COMMIT;

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Count positions by municipality type
SELECT 
    lp.entity_type,
    COUNT(*) as position_count,
    COUNT(DISTINCT lp.entity_id) as municipality_count
FROM leadership_positions lp
WHERE lp.hierarchy_level = 'Municipality'
GROUP BY lp.entity_type
ORDER BY lp.entity_type;

-- Sample metro sub-region positions
SELECT 
    lp.position_name,
    lp.position_code,
    m.municipality_name,
    m.municipality_code
FROM leadership_positions lp
JOIN municipalities m ON lp.entity_id = m.municipality_id
WHERE lp.hierarchy_level = 'Municipality'
    AND m.municipality_type = 'Metro Sub-Region'
ORDER BY m.municipality_name, lp.position_order
LIMIT 30;

-- Total count
SELECT COUNT(*) as total_municipality_positions
FROM leadership_positions
WHERE hierarchy_level = 'Municipality';

-- Count by metro
SELECT 
    SUBSTRING(m.municipality_code FROM 1 FOR 3) as metro_code,
    COUNT(DISTINCT m.municipality_id) as subregion_count,
    COUNT(lp.id) as position_count
FROM municipalities m
LEFT JOIN leadership_positions lp 
    ON m.municipality_id = lp.entity_id 
    AND lp.hierarchy_level = 'Municipality'
WHERE m.municipality_type = 'Metro Sub-Region'
GROUP BY SUBSTRING(m.municipality_code FROM 1 FOR 3)
ORDER BY metro_code;

