-- Backup of districts table
-- Created: 2025-09-29T01:21:00.572Z
-- Rows: 52

-- Table Structure:
-- district_id: integer NOT NULL
-- district_code: character varying NOT NULL
-- district_name: character varying NOT NULL
-- province_code: character varying NOT NULL
-- district_type: character varying NULL
-- population: integer NULL
-- area_km2: numeric NULL
-- is_active: boolean NULL
-- created_at: timestamp without time zone NULL
-- updated_at: timestamp without time zone NULL
-- population_2022: integer NULL
-- population_density: numeric NULL
-- number_of_municipalities: integer NULL
-- established_year: integer NULL

-- Data Export
INSERT INTO districts (district_id, district_code, district_name, province_code, district_type, population, area_km2, is_active, created_at, updated_at, population_2022, population_density, number_of_municipalities, established_year) VALUES
(1, 'DC37', 'Bojanala', 'NW', 'District', NULL, NULL, TRUE, '2025-09-24T03:17:09.879Z', '2025-09-25T02:22:32.539Z', NULL, NULL, 0, 2000),
(2, 'DC38', 'Ngaka Modiri Molema', 'NW', 'District', NULL, NULL, TRUE, '2025-09-24T03:17:09.879Z', '2025-09-25T02:22:32.539Z', NULL, NULL, 0, 2000),
(3, 'DC39', 'Dr Ruth Segomotsi Mompati', 'NW', 'District', NULL, NULL, TRUE, '2025-09-24T03:17:09.879Z', '2025-09-25T02:22:32.539Z', NULL, NULL, 0, 2000),
(4, 'DC40', 'Dr Kenneth Kaunda', 'NW', 'District', NULL, NULL, TRUE, '2025-09-24T03:17:09.879Z', '2025-09-25T02:22:32.539Z', NULL, NULL, 0, 2000),
(5, 'DC5', 'Central Karoo', 'WC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:32.539Z', '2025-09-25T02:22:32.539Z', NULL, NULL, 0, 2000),
(6, 'DC1', 'West Coast', 'WC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:32.539Z', '2025-09-25T02:22:32.539Z', NULL, NULL, 0, 2000),
(7, 'DC4', 'Garden Route', 'WC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:32.539Z', '2025-09-25T02:22:32.539Z', NULL, NULL, 0, 2000),
(8, 'DC2', 'Cape Winelands', 'WC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:32.539Z', '2025-09-25T02:22:32.539Z', NULL, NULL, 0, 2000),
(9, 'DC3', 'Overberg', 'WC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:32.539Z', '2025-09-25T02:22:32.539Z', NULL, NULL, 0, 2000),
(10, 'CPT', 'City of Cape Town', 'WC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:32.539Z', '2025-09-25T02:22:32.539Z', NULL, NULL, 0, 2000),
(35, 'DC22', 'Umgungundlovu', 'KZN', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:33.837Z', '2025-09-25T02:22:33.837Z', NULL, NULL, 0, 2000),
(36, 'DC29', 'iLembe', 'KZN', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:33.837Z', '2025-09-25T02:22:33.837Z', NULL, NULL, 0, 2000),
(37, 'DC28', 'King Cetshwayo', 'KZN', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:33.837Z', '2025-09-25T02:22:33.837Z', NULL, NULL, 0, 2000),
(38, 'DC21', 'Ugu', 'KZN', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:33.837Z', '2025-09-25T02:22:33.837Z', NULL, NULL, 0, 2000),
(39, 'JHB', 'City of Johannesburg', 'GP', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:33.837Z', '2025-09-25T02:22:33.837Z', NULL, NULL, 0, 2000),
(40, 'TSH', 'City of Tshwane', 'GP', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:33.837Z', '2025-09-25T02:22:33.837Z', NULL, NULL, 0, 2000),
(41, 'EKU', 'Ekurhuleni', 'GP', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:33.837Z', '2025-09-25T02:22:33.837Z', NULL, NULL, 0, 2000),
(42, 'DC42', 'Sedibeng', 'GP', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:33.837Z', '2025-09-25T02:22:33.837Z', NULL, NULL, 0, 2000),
(43, 'DC48', 'West Rand', 'GP', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:33.837Z', '2025-09-25T02:22:33.837Z', NULL, NULL, 0, 2000),
(44, 'DC16', 'Xhariep', 'FS', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:33.837Z', '2025-09-25T02:22:33.837Z', NULL, NULL, 0, 2000),
(45, 'DC18', 'Lejweleputswa', 'FS', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:34.296Z', '2025-09-25T02:22:34.296Z', NULL, NULL, 0, 2000),
(46, 'DC19', 'Thabo Mofutsanyane', 'FS', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:34.296Z', '2025-09-25T02:22:34.296Z', NULL, NULL, 0, 2000),
(47, 'DC20', 'Fezile Dabi', 'FS', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:34.296Z', '2025-09-25T02:22:34.296Z', NULL, NULL, 0, 2000),
(48, 'MAN', 'Mangaung', 'FS', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:34.296Z', '2025-09-25T02:22:34.296Z', NULL, NULL, 0, 2000),
(49, 'DC12', 'Amathole', 'EC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:34.296Z', '2025-09-25T02:22:34.296Z', NULL, NULL, 0, 2000),
(50, 'DC10', 'Sarah Baartman', 'EC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:34.296Z', '2025-09-25T02:22:34.296Z', NULL, NULL, 0, 2000),
(51, 'BUF', 'Buffalo City', 'EC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:34.296Z', '2025-09-25T02:22:34.296Z', NULL, NULL, 0, 2000),
(52, 'DC14', 'Joe Gqabi', 'EC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:34.296Z', '2025-09-25T02:22:34.296Z', NULL, NULL, 0, 2000),
(53, 'DC13', 'Chris Hani', 'EC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:34.296Z', '2025-09-25T02:22:34.296Z', NULL, NULL, 0, 2000),
(54, 'DC15', 'O.R.Tambo', 'EC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:34.296Z', '2025-09-25T02:22:34.296Z', NULL, NULL, 0, 2000),
(55, 'DC44', 'Alfred Nzo', 'EC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:34.799Z', '2025-09-25T02:22:34.799Z', NULL, NULL, 0, 2000),
(56, 'NMA', 'Nelson Mandela Bay', 'EC', 'District', NULL, NULL, TRUE, '2025-09-25T02:22:34.799Z', '2025-09-25T02:22:34.799Z', NULL, NULL, 0, 2000),
(57, 'DC6', 'Namakwa', 'NC', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:16.772Z', '2025-09-25T02:27:16.772Z', NULL, NULL, 0, 2000),
(58, 'DC7', 'Pixley ka Seme', 'NC', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:16.772Z', '2025-09-25T02:27:16.772Z', NULL, NULL, 0, 2000),
(59, 'DC8', 'Z F Mgcawu', 'NC', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:16.772Z', '2025-09-25T02:27:16.772Z', NULL, NULL, 0, 2000),
(60, 'DC9', 'Frances Baard', 'NC', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:16.772Z', '2025-09-25T02:27:16.772Z', NULL, NULL, 0, 2000),
(61, 'DC45', 'John Taolo Gaetsewe', 'NC', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:16.772Z', '2025-09-25T02:27:16.772Z', NULL, NULL, 0, 2000),
(67, 'DC32', 'Ehlanzeni', 'MP', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:17.766Z', '2025-09-25T02:27:17.766Z', NULL, NULL, 0, 2000),
(68, 'DC30', 'Gert Sibande', 'MP', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:18.297Z', '2025-09-25T02:27:18.297Z', NULL, NULL, 0, 2000),
(69, 'DC31', 'Nkangala', 'MP', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:18.790Z', '2025-09-25T02:27:18.790Z', NULL, NULL, 0, 2000),
(80, 'DC26', 'Zululand', 'KZN', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:22.591Z', '2025-09-25T02:27:22.591Z', NULL, NULL, 0, 2000),
(81, 'DC23', 'Uthukela', 'KZN', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:23.268Z', '2025-09-25T02:27:23.268Z', NULL, NULL, 0, 2000),
(82, 'DC27', 'Umkhanyakude', 'KZN', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:26.534Z', '2025-09-25T02:27:26.534Z', NULL, NULL, 0, 2000),
(83, 'DC25', 'Amajuba', 'KZN', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:26.534Z', '2025-09-25T02:27:26.534Z', NULL, NULL, 0, 2000),
(84, 'DC43', 'Harry Gwala', 'KZN', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:26.534Z', '2025-09-25T02:27:26.534Z', NULL, NULL, 0, 2000),
(85, 'DC24', 'Umzinyathi', 'KZN', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:26.534Z', '2025-09-25T02:27:26.534Z', NULL, NULL, 0, 2000),
(86, 'ETH', 'eThekwini', 'KZN', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:26.534Z', '2025-09-25T02:27:26.534Z', NULL, NULL, 0, 2000),
(87, 'DC33', 'Mopani', 'LP', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:51.151Z', '2025-09-25T02:27:51.151Z', NULL, NULL, 0, 2000),
(88, 'DC36', 'Waterberg', 'LP', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:51.151Z', '2025-09-25T02:27:51.151Z', NULL, NULL, 0, 2000),
(89, 'DC35', 'Capricorn', 'LP', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:51.151Z', '2025-09-25T02:27:51.151Z', NULL, NULL, 0, 2000),
(90, 'DC34', 'Vhembe', 'LP', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:51.151Z', '2025-09-25T02:27:51.151Z', NULL, NULL, 0, 2000),
(91, 'DC47', 'Sekhukhune', 'LP', 'District', NULL, NULL, TRUE, '2025-09-25T02:27:51.151Z', '2025-09-25T02:27:51.151Z', NULL, NULL, 0, 2000);
