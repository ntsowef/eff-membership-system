-- Backup of provinces table
-- Created: 2025-09-29T01:21:00.553Z
-- Rows: 9

-- Table Structure:
-- province_id: integer NOT NULL
-- province_code: character varying NOT NULL
-- province_name: character varying NOT NULL
-- capital_city: character varying NULL
-- population: integer NULL
-- area_km2: numeric NULL
-- is_active: boolean NULL
-- created_at: timestamp without time zone NULL
-- updated_at: timestamp without time zone NULL

-- Data Export
INSERT INTO provinces (province_id, province_code, province_name, capital_city, population, area_km2, is_active, created_at, updated_at) VALUES
(1, 'EC', 'Eastern Cape', 'Bhisho', NULL, NULL, TRUE, '2025-09-24T03:17:09.800Z', '2025-09-24T03:17:09.800Z'),
(2, 'FS', 'Free State', 'Bloemfontein', NULL, NULL, TRUE, '2025-09-24T03:17:09.800Z', '2025-09-24T03:17:09.800Z'),
(3, 'GP', 'Gauteng', 'Johannesburg', NULL, NULL, TRUE, '2025-09-24T03:17:09.800Z', '2025-09-24T03:17:09.800Z'),
(4, 'KZN', 'KwaZulu-Natal', 'Pietermaritzburg', NULL, NULL, TRUE, '2025-09-24T03:17:09.800Z', '2025-09-24T03:17:09.800Z'),
(5, 'LP', 'Limpopo', 'Polokwane', NULL, NULL, TRUE, '2025-09-24T03:17:09.800Z', '2025-09-24T03:17:09.800Z'),
(6, 'MP', 'Mpumalanga', 'Mbombela', NULL, NULL, TRUE, '2025-09-24T03:17:09.800Z', '2025-09-24T03:17:09.800Z'),
(7, 'NC', 'Northern Cape', 'Kimberley', NULL, NULL, TRUE, '2025-09-24T03:17:09.800Z', '2025-09-24T03:17:09.800Z'),
(8, 'NW', 'North West', 'Mahikeng', NULL, NULL, TRUE, '2025-09-24T03:17:09.800Z', '2025-09-24T03:17:09.800Z'),
(9, 'WC', 'Western Cape', 'Cape Town', NULL, NULL, TRUE, '2025-09-24T03:17:09.800Z', '2025-09-24T03:17:09.800Z');
