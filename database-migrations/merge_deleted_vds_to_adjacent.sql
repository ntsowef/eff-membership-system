
-- =====================================================
-- MIGRATION: Merge Deleted VDs to Adjacent VDs
-- =====================================================
-- Source: Deleted_VDs_merged_completely_to_adjacent_VDs.xlsx
-- Date: 2026-06-11
-- Total VD merges: 167
-- 
-- This migration:
--   1. Creates a temporary mapping table of deleted -> merged VD pairs
--   2. Validates that target VDs exist
--   3. Moves members from deleted VDs to their merge targets
--   4. Deactivates/removes the deleted VDs from the voting_districts table
--   5. Logs all changes for audit
--   6. Refreshes materialized views
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 0: Create audit log table for this migration
-- =====================================================
CREATE TABLE IF NOT EXISTS vd_merge_audit_log (
    audit_id SERIAL PRIMARY KEY,
    deleted_vd VARCHAR(20) NOT NULL,
    merged_to_vd VARCHAR(20) NOT NULL,
    members_moved INTEGER DEFAULT 0,
    migration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- =====================================================
-- STEP 1: Create temporary mapping table
-- =====================================================
DROP TABLE IF EXISTS tmp_vd_merge_map;

CREATE TEMP TABLE tmp_vd_merge_map (
    deleted_vd VARCHAR(20) NOT NULL,
    merged_to_vd VARCHAR(20) NOT NULL,
    municipality TEXT
);

INSERT INTO tmp_vd_merge_map (deleted_vd, merged_to_vd, municipality) VALUES
-- Gauteng - JHB
('32861448', '32861437', 'JHB - City of Johannesburg'),
('32840524', '32840401', 'JHB - City of Johannesburg'),
('32850985', '32850413', 'JHB - City of Johannesburg'),
('32851212', '32850402', 'JHB - City of Johannesburg'),
('32851245', '32851414', 'JHB - City of Johannesburg'),
('32851290', '32851302', 'JHB - City of Johannesburg'),
('32851357', '32851223', 'JHB - City of Johannesburg'),
('32860289', '32860111', 'JHB - City of Johannesburg'),
('32860458', '32863608', 'JHB - City of Johannesburg'),
('32862786', '32860111', 'JHB - City of Johannesburg'),
('32863035', '32863653', 'JHB - City of Johannesburg'),
('32863114', '32841008', 'JHB - City of Johannesburg'),
('32863260', '32861369', 'JHB - City of Johannesburg'),
('32863518', '32862450', 'JHB - City of Johannesburg'),

-- Gauteng - EKU
('33020727', '33020503', 'EKU - Ekurhuleni'),
('33020738', '33020389', 'EKU - Ekurhuleni'),
('33020749', '32890866', 'EKU - Ekurhuleni'),
('33020828', '33020299', 'EKU - Ekurhuleni'),
('33030649', '33030166', 'EKU - Ekurhuleni'),
('33060259', '33060260', 'EKU - Ekurhuleni'),
('32890721', '32890473', 'EKU - Ekurhuleni'),

-- Gauteng - TSH
('32951303', '32951347', 'TSH - City of Tshwane'),
('32951314', '32951370', 'TSH - City of Tshwane'),
('32952562', '32951820', 'TSH - City of Tshwane'),
('32952607', '32952450', 'TSH - City of Tshwane'),
('32952887', '32950908', 'TSH - City of Tshwane'),
('32961113', '32960954', 'TSH - City of Tshwane'),
('86690223', '86690188', 'TSH - City of Tshwane'),
('86720115', '86720104', 'TSH - City of Tshwane'),
('86720160', '86720069', 'TSH - City of Tshwane'),

-- Gauteng - GT481
('33250902', '33250698', 'GT481 - Mogale City'),

-- KwaZulu-Natal - ETH
('43370872', '43370490', 'ETH - eThekwini'),
('43380165', '43380299', 'ETH - eThekwini'),
('43350522', '43350263', 'ETH - eThekwini'),
('43360196', '43360174', 'ETH - eThekwini'),
('43360286', '43360264', 'ETH - eThekwini'),
('43360488', '43360499', 'ETH - eThekwini'),
('43360848', '43360859', 'ETH - eThekwini'),
('43360961', '43360972', 'ETH - eThekwini'),
('43360983', '43360994', 'ETH - eThekwini'),
('43361164', '43361434', 'ETH - eThekwini'),
('43361377', '43361388', 'ETH - eThekwini'),
('43361782', '43361805', 'ETH - eThekwini'),
('43361883', '43361894', 'ETH - eThekwini'),
('43362086', '43360871', 'ETH - eThekwini'),
('43362121', '43361816', 'ETH - eThekwini'),
('43362198', '43361423', 'ETH - eThekwini'),
('43362266', '43361108', 'ETH - eThekwini'),
('43370029', '43370018', 'ETH - eThekwini'),
('43370030', '43370131', 'ETH - eThekwini'),
('43400236', '43400247', 'ETH - eThekwini'),
('43581685', '43583452', 'ETH - eThekwini'),
('43582002', '43380132', 'ETH - eThekwini'),
('43584048', '43350320', 'ETH - eThekwini'),
('43371356', '43371323', 'ETH - eThekwini'),
('43371491', '43370502', 'ETH - eThekwini'),
('43371503', '43370399', 'ETH - eThekwini'),

-- KwaZulu-Natal - KZN225
('43771147', '43771125', 'KZN225 - The Msunduzi'),
('43771440', '43775411', 'KZN225 - The Msunduzi'),
('43775297', '43775309', 'KZN225 - The Msunduzi'),
('43775398', '43771169', 'KZN225 - The Msunduzi'),

-- KwaZulu-Natal - KZN282
('43413476', '43413487', 'KZN282 - uMhlathuze'),
('43413139', '43418235', 'KZN282 - uMhlathuze'),
('43413140', '43416884', 'KZN282 - uMhlathuze'),
('43417065', '43415760', 'KZN282 - uMhlathuze'),
('43419449', '43417874', 'KZN282 - uMhlathuze'),

-- KwaZulu-Natal - KZN263
('43504860', '43501496', 'KZN263 - AbaQulusi'),
('43505063', '43501407', 'KZN263 - AbaQulusi'),
('43505265', '43503566', 'KZN263 - AbaQulusi'),
('43570199', '43570133', 'KZN263 - AbaQulusi'),

-- KwaZulu-Natal - KZN262
('43503926', '43550108', 'KZN262 - uPhongolo'),
('43505209', '43501979', 'KZN262 - uPhongolo'),
('43550063', '43550074', 'KZN262 - uPhongolo'),

-- KwaZulu-Natal - KZN213
('43992793', '43994740', 'KZN213 - Umzumbe'),
('43994289', '43990746', 'KZN213 - Umzumbe'),

-- KwaZulu-Natal - KZN245
('43775680', '43774623', 'KZN245 - Umvoti'),
('43910029', '43910018', 'KZN245 - Umvoti'),

-- KwaZulu-Natal - KZN284
('43416648', '43412341', 'KZN284 - uMlalazi'),
('44520038', '43430026', 'KZN284 - uMlalazi'),

-- KwaZulu-Natal - KZN291
('43419472', '43417009', 'KZN291 - Mandeni'),
('43460018', '43460119', 'KZN291 - Mandeni'),

-- KwaZulu-Natal - KZN242
('43624795', '43625279', 'KZN242 - Nqutu'),
('43626326', '43625257', 'KZN242 - Nqutu'),

-- KwaZulu-Natal - KZN244
('43620230', '43620184', 'KZN244 - uMsinga'),
('43622669', '43620083', 'KZN244 - uMsinga'),

-- KwaZulu-Natal - KZN253
('43680045', '43680012', 'KZN253 - eMadlangeni'),
('43621657', '43625482', 'KZN253 - eMadlangeni'),

-- KwaZulu-Natal - KZN238
('43693274', '43690394', 'KZN238 - Alfred Duma'),
('43693319', '43690585', 'KZN238 - Alfred Duma'),

-- KwaZulu-Natal - Other
('43990308', '43990296', 'KZN212 - Umdoni'),
('43992221', '44010065', 'KZN216 - Ray Nkonyeni'),
('43991860', '43993806', 'KZN214 - uMuziwabantu'),
('43775679', '43770720', 'KZN221 - uMshwathi'),
('43693375', '43693555', 'KZN235 - Okhahlamba'),
('43693364', '43692149', 'KZN237 - Inkosi Langalibalele'),
('43626281', '43670033', 'KZN252 - Newcastle'),
('43500192', '43502419', 'KZN266 - Ulundi'),
('43410686', '43410529', 'KZN271 - Umhlabuyalingana'),
('43416716', '43419089', 'KZN272 - Jozini'),
('43418909', '43413522', 'KZN281 - Mfolozi'),
('43584789', '43583711', 'KZN292 - KwaDukuza'),
('43774511', '43583867', 'KZN294 - Maphumulo'),
('43994706', '43992287', 'KZN434 - Johannes Phumani Pungula'),
('43772812', '43970014', 'KZN436 - Dr. Nkosazana Dlamini Zuma'),

-- Limpopo
('76141188', '76140828', 'LIM332 - Greater Letaba'),
('76320772', '76320761', 'LIM354 - Polokwane'),
('54670282', '54670114', 'LIM472 - Elias Motsoaledi'),
('76250145', '76251236', 'LIM472 - Elias Motsoaledi'),
('54560022', '54560011', 'LIM471 - Ephraim Mogale'),
('76251180', '76250505', 'LIM471 - Ephraim Mogale'),

-- Mpumalanga
('54870015', '54870026', 'MP326 - City of Mbombela'),
('54910919', '54910155', 'MP326 - City of Mbombela'),
('54650875', '54650549', 'MP312 - Emalahleni'),
('54650886', '54650549', 'MP312 - Emalahleni'),
('54860193', '54860216', 'MP321 - Thaba Chweu'),
('54580226', '54580103', 'MP316 - Dr JS Moroka'),
('54880027', '54890848', 'MP324 - Nkomazi'),

-- Eastern Cape
('10591433', '10590522', 'BUF - Buffalo City'),
('10500039', '10500028', 'EC101 - Dr Beyers Naude'),
('10340053', '10030026', 'EC105 - Ndlambe'),
('10850699', '10851094', 'EC121 - Mbhashe'),
('10851162', '10850813', 'EC121 - Mbhashe'),
('10570171', '10570115', 'EC122 - Mnquma'),
('11150165', '11180012', 'EC139 - Enoch Mgijima'),
('11780535', '11780333', 'EC441 - Matatiele'),
('11781378', '11780041', 'EC441 - Matatiele'),
('11761455', '11760162', 'EC442 - Umzimvubu'),
('11761501', '11760982', 'EC442 - Umzimvubu'),

-- Free State
('21861435', '21860636', 'MAN - Mangaung'),
('22630126', '22630115', 'FS181 - Masilonyana'),
('22400053', '22400097', 'FS191 - Setsoto'),
('22270070', '22270047', 'FS192 - Dihlabeng'),
('22240145', '22240134', 'FS196 - Mantsopa'),
('22650049', '22650038', 'FS183 - Tswelopele'),

-- North West
('86940041', '86940018', 'NW405 - JB Marks'),
('86992688', '86991621', 'NW375 - Moses Kotane'),
('86993016', '86990596', 'NW375 - Moses Kotane'),
('86993038', '86991395', 'NW375 - Moses Kotane'),
('86742603', '86741725', 'NW392 - Naledi'),
('86820644', '86920050', 'NW393 - Mamusa'),
('86960111', '86960098', 'NW404 - Maquassi Hills'),
('86991104', '86992880', 'NW373 - Rustenburg'),
('86552242', '86552208', 'NW382 - Tswaing'),
('86550701', '86552860', 'NW383 - Mafikeng'),
('86551274', '86551263', 'NW383 - Mafikeng'),
('86551364', '86552354', 'NW383 - Mafikeng'),
('86551410', '86551397', 'NW383 - Mafikeng'),
('86550958', '86550947', 'NW384 - Ditsobotla'),
('86553838', '86553658', 'NW384 - Ditsobotla'),
('86554064', '86550532', 'NW385 - Ramotshere Moiloa'),
('86742265', '86741703', 'NW394 - Greater Taung'),
('86743558', '86740409', 'NW394 - Greater Taung'),

-- Northern Cape
('65350043', '65230028', 'NC071 - Ubuntu'),
('65350065', '65350133', 'NC071 - Ubuntu'),
('65690062', '65690039', 'NC451 - Joe Morolong'),

-- Western Cape
('97660042', '97660019', 'WC011 - Matzikama'),
('97770022', '97770033', 'WC011 - Matzikama'),
('97770044', '97770011', 'WC011 - Matzikama'),
('97830210', '97710082', 'WC015 - Swartland'),
('98430217', '97830164', 'WC015 - Swartland'),
('97960157', '98020010', 'WC032 - Overstrand'),
('97370062', '97340025', 'WC044 - George'),
('98180073', '98180028', 'WC053 - Beaufort West'),
('97093299', '97140113', 'CPT - City of Cape Town'),
('97120593', '97120379', 'CPT - City of Cape Town'),
('97120605', '97120379', 'CPT - City of Cape Town'),
('97950088', '97950022', 'WC031 - Theewaterskloof');


-- =====================================================
-- STEP 2: Pre-migration validation
-- =====================================================

-- 2a. Check how many merge records we have
DO $$
DECLARE
    merge_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO merge_count FROM tmp_vd_merge_map;
    RAISE NOTICE '✅ Loaded % VD merge mappings', merge_count;
    IF merge_count != 167 THEN
        RAISE EXCEPTION '❌ Expected 167 merge mappings, got %. Aborting.', merge_count;
    END IF;
END $$;

-- 2b. Check which target VDs exist in the voting_districts table
DO $$
DECLARE
    missing_targets INTEGER;
    missing_list TEXT;
BEGIN
    SELECT COUNT(*), STRING_AGG(m.merged_to_vd, ', ')
    INTO missing_targets, missing_list
    FROM tmp_vd_merge_map m
    LEFT JOIN voting_districts vd ON m.merged_to_vd = vd.voting_district_code
    WHERE vd.voting_district_code IS NULL;

    IF missing_targets > 0 THEN
        RAISE WARNING '⚠️ % target VDs not found in voting_districts table: %', missing_targets, missing_list;
        RAISE NOTICE 'These members will still be moved (voting_district_code updated) but targets may need to be added.';
    ELSE
        RAISE NOTICE '✅ All target VDs exist in voting_districts table';
    END IF;
END $$;

-- 2c. Count members in deleted VDs before migration
DO $$
DECLARE
    total_affected INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO total_affected
    FROM members_consolidated mc
    WHERE mc.voting_district_code IN (SELECT deleted_vd FROM tmp_vd_merge_map);

    RAISE NOTICE '📊 Total members in deleted VDs (to be moved): %', total_affected;
END $$;

-- 2d. Show per-VD member counts before migration
SELECT
    m.deleted_vd,
    m.merged_to_vd,
    m.municipality,
    COALESCE(mc_count.member_count, 0) AS members_to_move
FROM tmp_vd_merge_map m
LEFT JOIN (
    SELECT voting_district_code, COUNT(*) AS member_count
    FROM members_consolidated
    WHERE voting_district_code IN (SELECT deleted_vd FROM tmp_vd_merge_map)
    GROUP BY voting_district_code
) mc_count ON m.deleted_vd = mc_count.voting_district_code
ORDER BY mc_count.member_count DESC NULLS LAST;


-- =====================================================
-- STEP 3: Move members from deleted VDs to merge targets
-- =====================================================

-- 3a. Log the member counts before moving (for audit)
INSERT INTO vd_merge_audit_log (deleted_vd, merged_to_vd, members_moved, notes)
SELECT
    m.deleted_vd,
    m.merged_to_vd,
    COALESCE(mc_count.member_count, 0),
    'Migration from spreadsheet: Deleted_VDs_merged_completely_to_adjacent_VDs.xlsx (' || m.municipality || ')'
FROM tmp_vd_merge_map m
LEFT JOIN (
    SELECT voting_district_code, COUNT(*) AS member_count
    FROM members_consolidated
    WHERE voting_district_code IN (SELECT deleted_vd FROM tmp_vd_merge_map)
    GROUP BY voting_district_code
) mc_count ON m.deleted_vd = mc_count.voting_district_code;

-- 3b. Update members_consolidated: move members to new VDs
UPDATE members_consolidated mc
SET
    voting_district_code = m.merged_to_vd,
    updated_at = CURRENT_TIMESTAMP
FROM tmp_vd_merge_map m
WHERE mc.voting_district_code = m.deleted_vd;

-- Report how many members were moved
DO $$
DECLARE
    rows_moved INTEGER;
BEGIN
    GET DIAGNOSTICS rows_moved = ROW_COUNT;
    RAISE NOTICE '✅ Moved % members to new voting districts', rows_moved;
END $$;


-- =====================================================
-- STEP 4: Deactivate deleted VDs in voting_districts table
-- =====================================================

-- 4a. If voting_districts has an is_active column, deactivate them
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'voting_districts' AND column_name = 'is_active'
    ) THEN
        UPDATE voting_districts
        SET is_active = FALSE
        WHERE voting_district_code IN (SELECT deleted_vd FROM tmp_vd_merge_map);
        RAISE NOTICE '✅ Deactivated deleted VDs (is_active = FALSE)';
    ELSE
        -- If no is_active column, delete the VD records
        DELETE FROM voting_districts
        WHERE voting_district_code IN (SELECT deleted_vd FROM tmp_vd_merge_map);
        RAISE NOTICE '✅ Deleted VD records from voting_districts table';
    END IF;
END $$;


-- =====================================================
-- STEP 5: Post-migration validation
-- =====================================================

-- 5a. Verify no members remain in deleted VDs
DO $$
DECLARE
    remaining INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO remaining
    FROM members_consolidated
    WHERE voting_district_code IN (SELECT deleted_vd FROM tmp_vd_merge_map);

    IF remaining > 0 THEN
        RAISE WARNING '⚠️ % members still have deleted VD codes! Check for issues.', remaining;
    ELSE
        RAISE NOTICE '✅ No members remain in deleted VDs - migration clean';
    END IF;
END $$;

-- 5b. Show summary of audit log
SELECT
    'Migration Summary' AS report,
    COUNT(*) AS total_vd_merges,
    SUM(members_moved) AS total_members_moved,
    COUNT(CASE WHEN members_moved > 0 THEN 1 END) AS vds_with_members,
    COUNT(CASE WHEN members_moved = 0 THEN 1 END) AS vds_without_members
FROM vd_merge_audit_log
WHERE migration_date >= CURRENT_DATE;


-- =====================================================
-- STEP 6: Refresh materialized views
-- =====================================================

-- These views depend on voting district and member data
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_voting_district_compliance;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ward_compliance_summary;

-- Refresh the analytics summary if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_membership_analytics_summary'
    ) THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_membership_analytics_summary;
        RAISE NOTICE '✅ Refreshed mv_membership_analytics_summary';
    END IF;
END $$;

-- Materialized views refreshed above


-- =====================================================
-- STEP 7: Final report
-- =====================================================

-- Show top affected wards (by member count change)
SELECT
    vd_target.ward_code,
    w.ward_name,
    COUNT(DISTINCT audit.deleted_vd) AS vds_merged_in,
    SUM(audit.members_moved) AS members_gained
FROM vd_merge_audit_log audit
LEFT JOIN voting_districts vd_target ON audit.merged_to_vd = vd_target.voting_district_code
LEFT JOIN wards w ON vd_target.ward_code = w.ward_code
WHERE audit.migration_date >= CURRENT_DATE
GROUP BY vd_target.ward_code, w.ward_name
HAVING SUM(audit.members_moved) > 0
ORDER BY SUM(audit.members_moved) DESC
LIMIT 20;

-- Cleanup temp table
DROP TABLE IF EXISTS tmp_vd_merge_map;

COMMIT;

-- Final message
SELECT '✅ VD MERGE MIGRATION COMPLETE: 167 voting districts merged successfully' AS status;
