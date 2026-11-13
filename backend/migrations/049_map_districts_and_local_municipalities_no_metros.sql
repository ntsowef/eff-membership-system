-- ============================================================================
-- Migration: 049_map_districts_and_local_municipalities_no_metros.sql
-- Description: Maps all 44 District Municipalities (Category C) with their
--              205 Local Municipalities (Category B), strictly excluding the 
--              8 Metropolitan Municipalities (Category A).
-- Target Tables: districts, municipalities
-- Idempotency: Uses ON CONFLICT DO UPDATE for safe re-runs
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: SAFETY BACKUP OF CURRENT MUNICIPALITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS municipalities_backup_before_district_remap AS
SELECT * FROM municipalities;

DO $$
BEGIN
    RAISE NOTICE '===============================================================';
    RAISE NOTICE 'STARTING MIGRATION: District to Local Municipality Mapping';
    RAISE NOTICE 'Scope: 44 Districts, 205 Local Municipalities (Metros Excluded)';
    RAISE NOTICE '===============================================================';
END $$;

-- ============================================================================
-- STEP 2: ENSURE ALL 44 NON-METRO DISTRICT MUNICIPALITIES EXIST
-- ============================================================================
-- Note: Metros (BUF, NMA, MAN, EKU, JHB, TSH, ETH, CPT) are strictly excluded.

INSERT INTO districts (district_code, district_name, province_code, district_type, is_active)
VALUES
  ('DC10', 'Sarah Baartman', 'EC', 'District', TRUE),
  ('DC12', 'Amathole', 'EC', 'District', TRUE),
  ('DC13', 'Chris Hani', 'EC', 'District', TRUE),
  ('DC14', 'Joe Gqabi', 'EC', 'District', TRUE),
  ('DC15', 'O.R.Tambo', 'EC', 'District', TRUE),
  ('DC44', 'Alfred Nzo', 'EC', 'District', TRUE),
  ('DC16', 'Xhariep', 'FS', 'District', TRUE),
  ('DC18', 'Lejweleputswa', 'FS', 'District', TRUE),
  ('DC19', 'Thabo Mofutsanyane', 'FS', 'District', TRUE),
  ('DC20', 'Fezile Dabi', 'FS', 'District', TRUE),
  ('DC42', 'Sedibeng', 'GP', 'District', TRUE),
  ('DC48', 'West Rand', 'GP', 'District', TRUE),
  ('DC21', 'Ugu', 'KZN', 'District', TRUE),
  ('DC22', 'Umgungundlovu', 'KZN', 'District', TRUE),
  ('DC23', 'Uthukela', 'KZN', 'District', TRUE),
  ('DC24', 'Umzinyathi', 'KZN', 'District', TRUE),
  ('DC25', 'Amajuba', 'KZN', 'District', TRUE),
  ('DC26', 'Zululand', 'KZN', 'District', TRUE),
  ('DC27', 'Umkhanyakude', 'KZN', 'District', TRUE),
  ('DC28', 'King Cetshwayo', 'KZN', 'District', TRUE),
  ('DC29', 'iLembe', 'KZN', 'District', TRUE),
  ('DC43', 'Harry Gwala', 'KZN', 'District', TRUE),
  ('DC33', 'Mopani', 'LP', 'District', TRUE),
  ('DC34', 'Vhembe', 'LP', 'District', TRUE),
  ('DC35', 'Capricorn', 'LP', 'District', TRUE),
  ('DC36', 'Waterberg', 'LP', 'District', TRUE),
  ('DC47', 'Sekhukhune', 'LP', 'District', TRUE),
  ('DC30', 'Gert Sibande', 'MP', 'District', TRUE),
  ('DC31', 'Nkangala', 'MP', 'District', TRUE),
  ('DC32', 'Ehlanzeni', 'MP', 'District', TRUE),
  ('DC45', 'John Taolo Gaetsewe', 'NC', 'District', TRUE),
  ('DC6', 'Namakwa', 'NC', 'District', TRUE),
  ('DC7', 'Pixley ka Seme', 'NC', 'District', TRUE),
  ('DC8', 'Z F Mgcawu', 'NC', 'District', TRUE),
  ('DC9', 'Frances Baard', 'NC', 'District', TRUE),
  ('DC37', 'Bojanala', 'NW', 'District', TRUE),
  ('DC38', 'Ngaka Modiri Molema', 'NW', 'District', TRUE),
  ('DC39', 'Dr Ruth Segomotsi Mompati', 'NW', 'District', TRUE),
  ('DC40', 'Dr Kenneth Kaunda', 'NW', 'District', TRUE),
  ('DC1', 'West Coast', 'WC', 'District', TRUE),
  ('DC2', 'Cape Winelands', 'WC', 'District', TRUE),
  ('DC3', 'Overberg', 'WC', 'District', TRUE),
  ('DC4', 'Garden Route', 'WC', 'District', TRUE),
  ('DC5', 'Central Karoo', 'WC', 'District', TRUE)
ON CONFLICT (district_code) DO UPDATE SET
  district_name = EXCLUDED.district_name,
  province_code = EXCLUDED.province_code,
  district_type = EXCLUDED.district_type,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- STEP 3: MAP ALL 205 LOCAL MUNICIPALITIES TO THEIR RESPECTIVE DISTRICTS
-- ============================================================================
-- All 8 Metropolitan Municipalities are completely omitted from this mapping.

-- ----------------------------------------------------------------------------
-- PROVINCE: Eastern Cape (EC)
-- Districts: 6 | Local Municipalities: 31
-- ----------------------------------------------------------------------------

-- District: DC10 - Sarah Baartman (7 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('EC101', 'Dr Beyers Naude Local Municipality', 'DC10', 'Local', TRUE),
  ('EC102', 'Blue Crane Route Local Municipality', 'DC10', 'Local', TRUE),
  ('EC104', 'Makana Local Municipality', 'DC10', 'Local', TRUE),
  ('EC105', 'Ndlambe Local Municipality', 'DC10', 'Local', TRUE),
  ('EC106', 'Sundays River Valley Local Municipality', 'DC10', 'Local', TRUE),
  ('EC108', 'Kouga Local Municipality', 'DC10', 'Local', TRUE),
  ('EC109', 'Kou-Kamma Local Municipality', 'DC10', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC12 - Amathole (6 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('EC121', 'Mbhashe Local Municipality', 'DC12', 'Local', TRUE),
  ('EC122', 'Mnquma Local Municipality', 'DC12', 'Local', TRUE),
  ('EC123', 'Great Kei Local Municipality', 'DC12', 'Local', TRUE),
  ('EC124', 'Amahlathi Local Municipality', 'DC12', 'Local', TRUE),
  ('EC126', 'Ngqushwa Local Municipality', 'DC12', 'Local', TRUE),
  ('EC129', 'Raymond Mhlaba Local Municipality', 'DC12', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC13 - Chris Hani (6 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('EC131', 'Inxuba Yethemba Local Municipality', 'DC13', 'Local', TRUE),
  ('EC135', 'Intsika Yethu Local Municipality', 'DC13', 'Local', TRUE),
  ('EC136', 'Emalahleni Local Municipality', 'DC13', 'Local', TRUE),
  ('EC137', 'Engcobo Local Municipality', 'DC13', 'Local', TRUE),
  ('EC138', 'Sakhisizwe Local Municipality', 'DC13', 'Local', TRUE),
  ('EC139', 'Enoch Mgijima Local Municipality', 'DC13', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC14 - Joe Gqabi (3 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('EC141', 'Elundini Local Municipality', 'DC14', 'Local', TRUE),
  ('EC142', 'Senqu Local Municipality', 'DC14', 'Local', TRUE),
  ('EC145', 'Walter Sisulu Local Municipality', 'DC14', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC15 - O.R.Tambo (5 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('EC153', 'Ingquza Hill Local Municipality', 'DC15', 'Local', TRUE),
  ('EC154', 'Port St Johns Local Municipality', 'DC15', 'Local', TRUE),
  ('EC155', 'Nyandeni Local Municipality', 'DC15', 'Local', TRUE),
  ('EC156', 'Mhlontlo Local Municipality', 'DC15', 'Local', TRUE),
  ('EC157', 'King Sabata Dalindyebo Local Municipality', 'DC15', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC44 - Alfred Nzo (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('EC441', 'Matatiele Local Municipality', 'DC44', 'Local', TRUE),
  ('EC442', 'Umzimvubu Local Municipality', 'DC44', 'Local', TRUE),
  ('EC443', 'Winnie Madikizela Local Municipality', 'DC44', 'Local', TRUE),
  ('EC444', 'Ntabankulu Local Municipality', 'DC44', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ----------------------------------------------------------------------------
-- PROVINCE: Free State (FS)
-- Districts: 4 | Local Municipalities: 18
-- ----------------------------------------------------------------------------

-- District: DC16 - Xhariep (3 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('FS161', 'Letsemeng Local Municipality', 'DC16', 'Local', TRUE),
  ('FS162', 'Kopanong Local Municipality', 'DC16', 'Local', TRUE),
  ('FS163', 'Mohokare Local Municipality', 'DC16', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC18 - Lejweleputswa (5 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('FS181', 'Masilonyana Local Municipality', 'DC18', 'Local', TRUE),
  ('FS182', 'Tokologo Local Municipality', 'DC18', 'Local', TRUE),
  ('FS183', 'Tswelopele Local Municipality', 'DC18', 'Local', TRUE),
  ('FS184', 'Matjhabeng Local Municipality', 'DC18', 'Local', TRUE),
  ('FS185', 'Nala Local Municipality', 'DC18', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC19 - Thabo Mofutsanyane (6 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('FS191', 'Setsoto Local Municipality', 'DC19', 'Local', TRUE),
  ('FS192', 'Dihlabeng Local Municipality', 'DC19', 'Local', TRUE),
  ('FS193', 'Nketoana Local Municipality', 'DC19', 'Local', TRUE),
  ('FS194', 'Maluti a Phofung Local Municipality', 'DC19', 'Local', TRUE),
  ('FS195', 'Phumelela Local Municipality', 'DC19', 'Local', TRUE),
  ('FS196', 'Mantsopa Local Municipality', 'DC19', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC20 - Fezile Dabi (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('FS201', 'Moqhaka Local Municipality', 'DC20', 'Local', TRUE),
  ('FS203', 'Ngwathe Local Municipality', 'DC20', 'Local', TRUE),
  ('FS204', 'Metsimaholo Local Municipality', 'DC20', 'Local', TRUE),
  ('FS205', 'Mafube Local Municipality', 'DC20', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ----------------------------------------------------------------------------
-- PROVINCE: Gauteng (GP)
-- Districts: 2 | Local Municipalities: 6
-- ----------------------------------------------------------------------------

-- District: DC42 - Sedibeng (3 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('GT421', 'Emfuleni Local Municipality', 'DC42', 'Local', TRUE),
  ('GT422', 'Midvaal Local Municipality', 'DC42', 'Local', TRUE),
  ('GT423', 'Lesedi Local Municipality', 'DC42', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC48 - West Rand (3 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('GT481', 'Mogale City Local Municipality', 'DC48', 'Local', TRUE),
  ('GT484', 'Merafong City Local Municipality', 'DC48', 'Local', TRUE),
  ('GT485', 'Rand West City Local Municipality', 'DC48', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ----------------------------------------------------------------------------
-- PROVINCE: KwaZulu-Natal (KZN)
-- Districts: 10 | Local Municipalities: 43
-- ----------------------------------------------------------------------------

-- District: DC21 - Ugu (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('KZN212', 'Umdoni Local Municipality', 'DC21', 'Local', TRUE),
  ('KZN213', 'Umzumbe Local Municipality', 'DC21', 'Local', TRUE),
  ('KZN214', 'UMuziwabantu Local Municipality', 'DC21', 'Local', TRUE),
  ('KZN216', 'Ray Nkonyeni Local Municipality', 'DC21', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC22 - Umgungundlovu (7 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('KZN221', 'uMshwathi Local Municipality', 'DC22', 'Local', TRUE),
  ('KZN222', 'uMngeni Local Municipality', 'DC22', 'Local', TRUE),
  ('KZN223', 'Mpofana Local Municipality', 'DC22', 'Local', TRUE),
  ('KZN224', 'Impendle Local Municipality', 'DC22', 'Local', TRUE),
  ('KZN225', 'The Msunduzi Local Municipality', 'DC22', 'Local', TRUE),
  ('KZN226', 'Mkhambathini Local Municipality', 'DC22', 'Local', TRUE),
  ('KZN227', 'Richmond Local Municipality', 'DC22', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC23 - Uthukela (3 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('KZN235', 'Okhahlamba Local Municipality', 'DC23', 'Local', TRUE),
  ('KZN237', 'Inkosi Langalibalele Local Municipality', 'DC23', 'Local', TRUE),
  ('KZN238', 'Alfred Duma Local Municipality', 'DC23', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC24 - Umzinyathi (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('KZN241', 'Endumeni Local Municipality', 'DC24', 'Local', TRUE),
  ('KZN242', 'Nqutu Local Municipality', 'DC24', 'Local', TRUE),
  ('KZN244', 'Msinga Local Municipality', 'DC24', 'Local', TRUE),
  ('KZN245', 'Umvoti Local Municipality', 'DC24', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC25 - Amajuba (3 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('KZN252', 'Newcastle Local Municipality', 'DC25', 'Local', TRUE),
  ('KZN253', 'Emadlangeni Local Municipality', 'DC25', 'Local', TRUE),
  ('KZN254', 'Dannhauser Local Municipality', 'DC25', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC26 - Zululand (5 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('KZN261', 'eDumbe Local Municipality', 'DC26', 'Local', TRUE),
  ('KZN262', 'UPhongolo Local Municipality', 'DC26', 'Local', TRUE),
  ('KZN263', 'Abaqulusi Local Municipality', 'DC26', 'Local', TRUE),
  ('KZN265', 'Nongoma Local Municipality', 'DC26', 'Local', TRUE),
  ('KZN266', 'Ulundi Local Municipality', 'DC26', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC27 - Umkhanyakude (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('KZN271', 'Umhlabuyalingana Local Municipality', 'DC27', 'Local', TRUE),
  ('KZN272', 'Jozini Local Municipality', 'DC27', 'Local', TRUE),
  ('KZN275', 'Mtubatuba Local Municipality', 'DC27', 'Local', TRUE),
  ('KZN276', 'Big Five Hlabisa Local Municipality', 'DC27', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC28 - King Cetshwayo (5 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('KZN281', 'Mfolozi Local Municipality', 'DC28', 'Local', TRUE),
  ('KZN282', 'uMhlathuze Local Municipality', 'DC28', 'Local', TRUE),
  ('KZN284', 'uMlalazi Local Municipality', 'DC28', 'Local', TRUE),
  ('KZN285', 'Mthonjaneni Local Municipality', 'DC28', 'Local', TRUE),
  ('KZN286', 'Nkandla Local Municipality', 'DC28', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC29 - iLembe (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('KZN291', 'Mandeni Local Municipality', 'DC29', 'Local', TRUE),
  ('KZN292', 'KwaDukuza Local Municipality', 'DC29', 'Local', TRUE),
  ('KZN293', 'Ndwedwe Local Municipality', 'DC29', 'Local', TRUE),
  ('KZN294', 'Maphumulo Local Municipality', 'DC29', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC43 - Harry Gwala (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('KZN433', 'Greater Kokstad Local Municipality', 'DC43', 'Local', TRUE),
  ('KZN434', 'Ubuhlebezwe Local Municipality', 'DC43', 'Local', TRUE),
  ('KZN435', 'Umzimkhulu Local Municipality', 'DC43', 'Local', TRUE),
  ('KZN436', 'Dr Nkosazana Dlamini Zuma Local Municipality', 'DC43', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ----------------------------------------------------------------------------
-- PROVINCE: Limpopo (LP)
-- Districts: 5 | Local Municipalities: 22
-- ----------------------------------------------------------------------------

-- District: DC33 - Mopani (5 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('LIM331', 'Greater Giyani Local Municipality', 'DC33', 'Local', TRUE),
  ('LIM332', 'Greater Letaba Local Municipality', 'DC33', 'Local', TRUE),
  ('LIM333', 'Greater Tzaneen Local Municipality', 'DC33', 'Local', TRUE),
  ('LIM334', 'Ba-Phalaborwa Local Municipality', 'DC33', 'Local', TRUE),
  ('LIM335', 'Maruleng Local Municipality', 'DC33', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC34 - Vhembe (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('LIM341', 'Musina Local Municipality', 'DC34', 'Local', TRUE),
  ('LIM343', 'Thulamela Local Municipality', 'DC34', 'Local', TRUE),
  ('LIM344', 'Makhado Local Municipality', 'DC34', 'Local', TRUE),
  ('LIM345', 'Collins Chabane Local Municipality', 'DC34', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC35 - Capricorn (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('LIM351', 'Blouberg Local Municipality', 'DC35', 'Local', TRUE),
  ('LIM353', 'Molemole Local Municipality', 'DC35', 'Local', TRUE),
  ('LIM354', 'Polokwane Local Municipality', 'DC35', 'Local', TRUE),
  ('LIM355', 'Lepele-Nkumpi Local Municipality', 'DC35', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC36 - Waterberg (5 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('LIM361', 'Thabazimbi Local Municipality', 'DC36', 'Local', TRUE),
  ('LIM362', 'Lephalale Local Municipality', 'DC36', 'Local', TRUE),
  ('LIM366', 'Bela-Bela Local Municipality', 'DC36', 'Local', TRUE),
  ('LIM367', 'Mogalakwena Local Municipality', 'DC36', 'Local', TRUE),
  ('LIM368', 'Modimolle-Mookgophong Local Municipality', 'DC36', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC47 - Sekhukhune (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('LIM471', 'Ephraim Mogale Local Municipality', 'DC47', 'Local', TRUE),
  ('LIM472', 'Elias Motsoaledi Local Municipality', 'DC47', 'Local', TRUE),
  ('LIM473', 'Makhuduthamaga Local Municipality', 'DC47', 'Local', TRUE),
  ('LIM476', 'Fetakgomo Tubatse Local Municipality', 'DC47', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ----------------------------------------------------------------------------
-- PROVINCE: Mpumalanga (MP)
-- Districts: 3 | Local Municipalities: 17
-- ----------------------------------------------------------------------------

-- District: DC30 - Gert Sibande (7 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('MP301', 'Chief Albert Luthuli Local Municipality', 'DC30', 'Local', TRUE),
  ('MP302', 'Msukaligwa Local Municipality', 'DC30', 'Local', TRUE),
  ('MP303', 'Mkhondo Local Municipality', 'DC30', 'Local', TRUE),
  ('MP304', 'Dr Pixley Ka Isaka Seme Local Municipality', 'DC30', 'Local', TRUE),
  ('MP305', 'Lekwa Local Municipality', 'DC30', 'Local', TRUE),
  ('MP306', 'Dipaleseng Local Municipality', 'DC30', 'Local', TRUE),
  ('MP307', 'Govan Mbeki Local Municipality', 'DC30', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC31 - Nkangala (6 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('MP311', 'Victor Khanye Local Municipality', 'DC31', 'Local', TRUE),
  ('MP312', 'Emalahleni Local Municipality', 'DC31', 'Local', TRUE),
  ('MP313', 'Steve Tshwete Local Municipality', 'DC31', 'Local', TRUE),
  ('MP314', 'Emakhazeni Local Municipality', 'DC31', 'Local', TRUE),
  ('MP315', 'Thembisile Hani Local Municipality', 'DC31', 'Local', TRUE),
  ('MP316', 'Dr JS Moroka Local Municipality', 'DC31', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC32 - Ehlanzeni (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('MP321', 'Thaba Chweu Local Municipality', 'DC32', 'Local', TRUE),
  ('MP324', 'Nkomazi Local Municipality', 'DC32', 'Local', TRUE),
  ('MP325', 'Bushbuckridge Local Municipality', 'DC32', 'Local', TRUE),
  ('MP326', 'City of Mbombela Local Municipality', 'DC32', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ----------------------------------------------------------------------------
-- PROVINCE: Northern Cape (NC)
-- Districts: 5 | Local Municipalities: 26
-- ----------------------------------------------------------------------------

-- District: DC45 - John Taolo Gaetsewe (3 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NC451', 'Joe Morolong Local Municipality', 'DC45', 'Local', TRUE),
  ('NC452', 'Ga-Segonyana Local Municipality', 'DC45', 'Local', TRUE),
  ('NC453', 'Gamagara Local Municipality', 'DC45', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC6 - Namakwa (6 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NC061', 'Richtersveld Local Municipality', 'DC6', 'Local', TRUE),
  ('NC062', 'Nama Khoi Local Municipality', 'DC6', 'Local', TRUE),
  ('NC064', 'Kamiesberg Local Municipality', 'DC6', 'Local', TRUE),
  ('NC065', 'Hantam Local Municipality', 'DC6', 'Local', TRUE),
  ('NC066', 'Karoo Hoogland Local Municipality', 'DC6', 'Local', TRUE),
  ('NC067', 'Kh├â┬ói-Ma Local Municipality', 'DC6', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC7 - Pixley ka Seme (8 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NC071', 'Ubuntu Local Municipality', 'DC7', 'Local', TRUE),
  ('NC072', 'Umsobomvu Local Municipality', 'DC7', 'Local', TRUE),
  ('NC073', 'Emthanjeni Local Municipality', 'DC7', 'Local', TRUE),
  ('NC074', 'Kareeberg Local Municipality', 'DC7', 'Local', TRUE),
  ('NC075', 'Renosterberg Local Municipality', 'DC7', 'Local', TRUE),
  ('NC076', 'Thembelihle Local Municipality', 'DC7', 'Local', TRUE),
  ('NC077', 'Siyathemba Local Municipality', 'DC7', 'Local', TRUE),
  ('NC078', 'Siyancuma Local Municipality', 'DC7', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC8 - Z F Mgcawu (5 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NC082', 'Kai !Garib Local Municipality', 'DC8', 'Local', TRUE),
  ('NC084', '!Kheis Local Municipality', 'DC8', 'Local', TRUE),
  ('NC085', 'Tsantsabane Local Municipality', 'DC8', 'Local', TRUE),
  ('NC086', 'Kgatelopele Local Municipality', 'DC8', 'Local', TRUE),
  ('NC087', 'Dawid Kruiper Local Municipality', 'DC8', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC9 - Frances Baard (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NC091', 'Sol Plaatje Local Municipality', 'DC9', 'Local', TRUE),
  ('NC092', 'Dikgatlong Local Municipality', 'DC9', 'Local', TRUE),
  ('NC093', 'Magareng Local Municipality', 'DC9', 'Local', TRUE),
  ('NC094', 'Phokwane Local Municipality', 'DC9', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ----------------------------------------------------------------------------
-- PROVINCE: North West (NW)
-- Districts: 4 | Local Municipalities: 18
-- ----------------------------------------------------------------------------

-- District: DC37 - Bojanala (5 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NW371', 'Moretele Local Municipality', 'DC37', 'Local', TRUE),
  ('NW372', 'Local Municipality of Madibeng', 'DC37', 'Local', TRUE),
  ('NW373', 'Rustenburg Local Municipality', 'DC37', 'Local', TRUE),
  ('NW374', 'Kgetlengrivier Local Municipality', 'DC37', 'Local', TRUE),
  ('NW375', 'Moses Kotane Local Municipality', 'DC37', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC38 - Ngaka Modiri Molema (5 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NW381', 'Ratlou Local Municipality', 'DC38', 'Local', TRUE),
  ('NW382', 'Tswaing Local Municipality', 'DC38', 'Local', TRUE),
  ('NW383', 'Mafikeng Local Municipality', 'DC38', 'Local', TRUE),
  ('NW384', 'Ditsobotla Local Municipality', 'DC38', 'Local', TRUE),
  ('NW385', 'Ramotshere Moiloa Local Municipality', 'DC38', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC39 - Dr Ruth Segomotsi Mompati (5 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NW392', 'Naledi Local Municipality', 'DC39', 'Local', TRUE),
  ('NW393', 'Mamusa Local Municipality', 'DC39', 'Local', TRUE),
  ('NW394', 'Greater Taung Local Municipality', 'DC39', 'Local', TRUE),
  ('NW396', 'Lekwa-Teemane Local Municipality', 'DC39', 'Local', TRUE),
  ('NW397', 'Kagisano/Molopo Local Municipality', 'DC39', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC40 - Dr Kenneth Kaunda (3 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('NW403', 'City of Matlosana Local Municipality', 'DC40', 'Local', TRUE),
  ('NW404', 'Maquassi Hills Local Municipality', 'DC40', 'Local', TRUE),
  ('NW405', 'JB Marks Local Municipality', 'DC40', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ----------------------------------------------------------------------------
-- PROVINCE: Western Cape (WC)
-- Districts: 5 | Local Municipalities: 24
-- ----------------------------------------------------------------------------

-- District: DC1 - West Coast (5 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('WC011', 'Matzikama Local Municipality', 'DC1', 'Local', TRUE),
  ('WC012', 'Cederberg Local Municipality', 'DC1', 'Local', TRUE),
  ('WC013', 'Bergrivier Local Municipality', 'DC1', 'Local', TRUE),
  ('WC014', 'Saldanha Bay Local Municipality', 'DC1', 'Local', TRUE),
  ('WC015', 'Swartland Local Municipality', 'DC1', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC2 - Cape Winelands (5 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('WC022', 'Witzenberg Local Municipality', 'DC2', 'Local', TRUE),
  ('WC023', 'Drakenstein Local Municipality', 'DC2', 'Local', TRUE),
  ('WC024', 'Stellenbosch Local Municipality', 'DC2', 'Local', TRUE),
  ('WC025', 'Breede Valley Local Municipality', 'DC2', 'Local', TRUE),
  ('WC026', 'Langeberg Local Municipality', 'DC2', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC3 - Overberg (4 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('WC031', 'Theewaterskloof Local Municipality', 'DC3', 'Local', TRUE),
  ('WC032', 'Overstrand Local Municipality', 'DC3', 'Local', TRUE),
  ('WC033', 'Cape Agulhas Local Municipality', 'DC3', 'Local', TRUE),
  ('WC034', 'Swellendam Local Municipality', 'DC3', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC4 - Garden Route (7 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('WC041', 'Kannaland Local Municipality', 'DC4', 'Local', TRUE),
  ('WC042', 'Hessequa Local Municipality', 'DC4', 'Local', TRUE),
  ('WC043', 'Mossel Bay Local Municipality', 'DC4', 'Local', TRUE),
  ('WC044', 'George Local Municipality', 'DC4', 'Local', TRUE),
  ('WC045', 'Oudtshoorn Local Municipality', 'DC4', 'Local', TRUE),
  ('WC047', 'Bitou Local Municipality', 'DC4', 'Local', TRUE),
  ('WC048', 'Knysna Local Municipality', 'DC4', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- District: DC5 - Central Karoo (3 municipalities)
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, is_active)
VALUES
  ('WC051', 'Laingsburg Local Municipality', 'DC5', 'Local', TRUE),
  ('WC052', 'Prince Albert Local Municipality', 'DC5', 'Local', TRUE),
  ('WC053', 'Beaufort West Local Municipality', 'DC5', 'Local', TRUE)
ON CONFLICT (municipality_code) DO UPDATE SET
  municipality_name = EXCLUDED.municipality_name,
  district_code = EXCLUDED.district_code,
  municipality_type = 'Local',
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- STEP 4: POST-MIGRATION INTEGRITY CHECKS & VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_district_count INTEGER;
    v_muni_count INTEGER;
    v_metro_leak_count INTEGER;
    v_unmapped_count INTEGER;
BEGIN
    -- 1. Check non-metro districts count
    SELECT COUNT(*) INTO v_district_count
    FROM districts
    WHERE district_code NOT IN ('BUF', 'NMA', 'MAN', 'EKU', 'JHB', 'TSH', 'ETH', 'CPT');

    -- 2. Check local municipalities count mapped to DC districts
    SELECT COUNT(*) INTO v_muni_count
    FROM municipalities
    WHERE municipality_type = 'Local'
      AND district_code LIKE 'DC%';

    -- 3. Check that no metro has been assigned to a DC district
    SELECT COUNT(*) INTO v_metro_leak_count
    FROM municipalities
    WHERE municipality_code IN ('BUF', 'NMA', 'MAN', 'EKU', 'JHB', 'TSH', 'ETH', 'CPT')
      AND district_code LIKE 'DC%';

    -- 4. Check for any orphaned local municipality without valid district
    SELECT COUNT(*) INTO v_unmapped_count
    FROM municipalities m
    LEFT JOIN districts d ON m.district_code = d.district_code
    WHERE m.municipality_type = 'Local'
      AND d.district_code IS NULL;

    RAISE NOTICE '---------------------------------------------------------------';
    RAISE NOTICE 'MIGRATION VERIFICATION RESULTS:';
    RAISE NOTICE '  - Non-metro districts in database: % (Expected: 44)', v_district_count;
    RAISE NOTICE '  - Local municipalities mapped to DC districts: % (Expected: 205)', v_muni_count;
    RAISE NOTICE '  - Metros improperly mapped to DC districts: % (Expected: 0)', v_metro_leak_count;
    RAISE NOTICE '  - Orphaned local municipalities: % (Expected: 0)', v_unmapped_count;
    RAISE NOTICE '---------------------------------------------------------------';

    IF v_district_count < 44 THEN
        RAISE EXCEPTION 'Verification Failed: Expected at least 44 districts, found %', v_district_count;
    END IF;

    IF v_muni_count < 205 THEN
        RAISE EXCEPTION 'Verification Failed: Expected at least 205 mapped local municipalities, found %', v_muni_count;
    END IF;

    IF v_metro_leak_count > 0 THEN
        RAISE EXCEPTION 'Verification Failed: % metropolitan municipalities are mapped to DC districts!', v_metro_leak_count;
    END IF;

    IF v_unmapped_count > 0 THEN
        RAISE EXCEPTION 'Verification Failed: % local municipalities have no valid parent district!', v_unmapped_count;
    END IF;

    RAISE NOTICE '✅ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!';
END $$;

COMMIT;
