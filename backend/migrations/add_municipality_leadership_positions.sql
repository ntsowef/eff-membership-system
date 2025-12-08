-- =====================================================================================
-- ADD MUNICIPALITY (SUB-REGION) LEADERSHIP POSITIONS
-- =====================================================================================
-- This script creates leadership positions for all municipalities (sub-regions)
-- including:
-- 1. Metropolitan municipalities (8 metros)
-- 2. Local municipalities (195 local)
-- 3. Metro sub-regions (sub-regions within metro municipalities)
-- =====================================================================================

-- Standard leadership positions for each municipality/sub-region:
-- 1. Municipal/Sub-Region Chairperson
-- 2. Municipal/Sub-Region Secretary
-- 3. Municipal/Sub-Region Treasurer
-- 4. Municipal/Sub-Region Deputy Chairperson
-- 5. Municipal/Sub-Region Deputy Secretary
-- 6. Municipal/Sub-Region Youth Leader
-- 7. Municipal/Sub-Region Women Leader
-- 8. Municipal/Sub-Region Organizer
-- 9-18. Municipal/Sub-Region Committee Members (10 members)

BEGIN;

-- Create a temporary function to generate leadership positions for municipalities
CREATE OR REPLACE FUNCTION create_municipality_leadership_positions()
RETURNS void AS $$
DECLARE
    municipality_record RECORD;
    position_counter INTEGER := 0;
    base_position_id INTEGER;
BEGIN
    -- Get the maximum position ID to start from
    SELECT COALESCE(MAX(id), 0) + 1 INTO base_position_id FROM leadership_positions;
    
    -- Loop through all municipalities (including metros and metro sub-regions)
    FOR municipality_record IN 
        SELECT 
            municipality_id,
            municipality_name,
            municipality_code,
            municipality_type,
            district_code
        FROM municipalities
        WHERE is_active = TRUE
        ORDER BY municipality_type DESC, municipality_name
    LOOP
        -- Determine the display name based on municipality type
        DECLARE
            display_name VARCHAR(255);
            position_prefix VARCHAR(50);
        BEGIN
            IF municipality_record.municipality_type = 'Metropolitan' THEN
                display_name := municipality_record.municipality_name;
                position_prefix := 'Metro';
            ELSIF municipality_record.municipality_type = 'Metro Sub-Region' THEN
                display_name := municipality_record.municipality_name;
                position_prefix := 'Sub-Region';
            ELSE
                display_name := municipality_record.municipality_name;
                position_prefix := 'Sub-Region';
            END IF;

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
                display_name || ' ' || position_prefix || ' Chairperson',
                'MCHAIR_' || municipality_record.municipality_code,
                position_prefix || ' Chairperson for ' || display_name,
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
                display_name || ' ' || position_prefix || ' Secretary',
                'MSEC_' || municipality_record.municipality_code,
                position_prefix || ' Secretary for ' || display_name,
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
                display_name || ' ' || position_prefix || ' Treasurer',
                'MTREAS_' || municipality_record.municipality_code,
                position_prefix || ' Treasurer for ' || display_name,
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
                display_name || ' ' || position_prefix || ' Deputy Chairperson',
                'MDCHAIR_' || municipality_record.municipality_code,
                position_prefix || ' Deputy Chairperson for ' || display_name,
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
                display_name || ' ' || position_prefix || ' Deputy Secretary',
                'MDSEC_' || municipality_record.municipality_code,
                position_prefix || ' Deputy Secretary for ' || display_name,
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
                display_name || ' ' || position_prefix || ' Youth Leader',
                'MYOUTH_' || municipality_record.municipality_code,
                position_prefix || ' Youth Leader for ' || display_name,
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
                display_name || ' ' || position_prefix || ' Women Leader',
                'MWOMEN_' || municipality_record.municipality_code,
                position_prefix || ' Women Leader for ' || display_name,
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
                display_name || ' ' || position_prefix || ' Organizer',
                'MORG_' || municipality_record.municipality_code,
                position_prefix || ' Organizer for ' || display_name,
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
                    display_name || ' ' || position_prefix || ' Committee Member ' || i,
                    'MCOM' || LPAD(i::TEXT, 2, '0') || '_' || municipality_record.municipality_code,
                    position_prefix || ' Committee Member ' || i || ' for ' || display_name,
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

        END;
    END LOOP;

    RAISE NOTICE 'Created % leadership positions for municipalities', position_counter;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT create_municipality_leadership_positions();

-- Drop the temporary function
DROP FUNCTION create_municipality_leadership_positions();

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

-- Sample positions for each type
SELECT 
    lp.position_name,
    lp.position_code,
    lp.entity_type,
    m.municipality_name
FROM leadership_positions lp
JOIN municipalities m ON lp.entity_id = m.municipality_id
WHERE lp.hierarchy_level = 'Municipality'
ORDER BY lp.entity_type DESC, m.municipality_name, lp.position_order
LIMIT 30;

-- Total count
SELECT COUNT(*) as total_municipality_positions
FROM leadership_positions
WHERE hierarchy_level = 'Municipality';

