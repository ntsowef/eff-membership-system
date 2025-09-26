-- Sample Data for Membership System - Additional Wards and Members
-- This file contains realistic sample data for South African wards and members
-- to demonstrate the membership system's hierarchical structure

-- Additional Ward Level Data
INSERT INTO wards (id, municipality_id, name, ward_number, description, member_count) VALUES
-- Eastern Cape Wards (Buffalo City)
(19, 1, 'Buffalo City Ward 12', '12', 'Ward in East London Central', 156),
(20, 1, 'Buffalo City Ward 24', '24', 'Ward in East London North', 123),
(21, 1, 'Buffalo City Ward 35', '35', 'Ward in Mdantsane', 189),

-- Eastern Cape Wards (Nelson Mandela Bay)
(22, 2, 'Nelson Mandela Bay Ward 8', '8', 'Ward in Port Elizabeth Central', 167),
(23, 2, 'Nelson Mandela Bay Ward 17', '17', 'Ward in Uitenhage', 145),
(24, 2, 'Nelson Mandela Bay Ward 29', '29', 'Ward in Motherwell', 178),

-- Free State Wards (Mangaung)
(25, 7, 'Mangaung Ward 14', '14', 'Ward in Bloemfontein Central', 134),
(26, 7, 'Mangaung Ward 27', '27', 'Ward in Botshabelo', 156),
(27, 7, 'Mangaung Ward 39', '39', 'Ward in Thaba Nchu', 112),

-- KwaZulu-Natal Wards (Additional eThekwini)
(28, 16, 'eThekwini Ward 42', '42', 'Ward in Umlazi', 223),
(29, 16, 'eThekwini Ward 56', '56', 'Ward in Phoenix', 178),
(30, 16, 'eThekwini Ward 67', '67', 'Ward in Chatsworth', 156),

-- Limpopo Wards (Polokwane)
(31, 20, 'Polokwane Ward 12', '12', 'Ward in Polokwane Central', 145),
(32, 20, 'Polokwane Ward 23', '23', 'Ward in Seshego', 167),
(33, 20, 'Polokwane Ward 31', '31', 'Ward in Mankweng', 134),

-- Mpumalanga Wards (Mbombela)
(34, 23, 'Mbombela Ward 14', '14', 'Ward in Nelspruit Central', 123),
(35, 23, 'Mbombela Ward 22', '22', 'Ward in White River', 112),
(36, 23, 'Mbombela Ward 33', '33', 'Ward in Kabokweni', 145),

-- Northern Cape Wards (Sol Plaatje)
(37, 26, 'Sol Plaatje Ward 9', '9', 'Ward in Kimberley Central', 98),
(38, 26, 'Sol Plaatje Ward 16', '16', 'Ward in Galeshewe', 123),
(39, 26, 'Sol Plaatje Ward 24', '24', 'Ward in Ritchie', 87),

-- North West Wards (Rustenburg)
(40, 29, 'Rustenburg Ward 11', '11', 'Ward in Rustenburg Central', 134),
(41, 29, 'Rustenburg Ward 19', '19', 'Ward in Tlhabane', 156),
(42, 29, 'Rustenburg Ward 27', '27', 'Ward in Phokeng', 123);

-- Member Data
INSERT INTO members (id, first_name, last_name, id_number, date_of_birth, gender, email, cell_number, residential_address, ward_id, membership_number, membership_start_date, membership_expiry_date, membership_status, voter_status) VALUES
-- Buffalo City Members
(11, 'Nomsa', 'Mabaso', '7801235678083', '1978-01-23', 'Female', 'nomsa.mabaso@example.com', '0731234567', '15 Amalinda Road, East London', 19, 'EC-BUF-12-001', '2021-03-15', '2023-03-15', 'Expired', 'Registered'),
(12, 'Thabo', 'Nkosi', '8504127890123', '1985-04-12', 'Male', 'thabo.nkosi@example.com', '0821234568', '78 Oxford Street, East London', 19, 'EC-BUF-12-002', '2022-05-20', '2024-05-20', 'Active', 'Registered'),
(13, 'Lindiwe', 'Dlamini', '9207086543210', '1992-07-08', 'Female', 'lindiwe.dlamini@example.com', '0641234569', '23 Bonza Bay Road, East London', 20, 'EC-BUF-24-001', '2022-01-10', '2024-01-10', 'Active', 'Registered'),
(14, 'Sipho', 'Ndlovu', '8903156789012', '1989-03-15', 'Male', 'sipho.ndlovu@example.com', '0731234570', '45 Mdantsane Access Road, East London', 21, 'EC-BUF-35-001', '2021-11-05', '2023-11-05', 'Expired', 'Registered'),

-- Nelson Mandela Bay Members
(15, 'Ayanda', 'Mbeki', '9012056789012', '1990-12-05', 'Female', 'ayanda.mbeki@example.com', '0821234571', '12 Govan Mbeki Avenue, Port Elizabeth', 22, 'EC-NMB-08-001', '2022-02-15', '2024-02-15', 'Active', 'Registered'),
(16, 'Mandla', 'Zuma', '8605127890123', '1986-05-12', 'Male', 'mandla.zuma@example.com', '0641234572', '34 Cape Road, Port Elizabeth', 22, 'EC-NMB-08-002', '2021-08-20', '2023-08-20', 'Expired', 'Registered'),
(17, 'Nosipho', 'Khumalo', '9309086543210', '1993-09-08', 'Female', 'nosipho.khumalo@example.com', '0731234573', '56 Cuyler Street, Uitenhage', 23, 'EC-NMB-17-001', '2022-04-10', '2024-04-10', 'Active', 'Not Registered'),
(18, 'Bongani', 'Sithole', '8807156789012', '1988-07-15', 'Male', 'bongani.sithole@example.com', '0821234574', '78 Motherwell NU7, Port Elizabeth', 24, 'EC-NMB-29-001', '2022-06-05', '2024-06-05', 'Active', 'Registered'),

-- Mangaung Members
(19, 'Thabiso', 'Mokoena', '9104056789012', '1991-04-05', 'Male', 'thabiso.mokoena@example.com', '0641234575', '23 President Brand Street, Bloemfontein', 25, 'FS-MAN-14-001', '2021-07-15', '2023-07-15', 'Expired', 'Registered'),
(20, 'Lerato', 'Tshabalala', '8802127890123', '1988-02-12', 'Female', 'lerato.tshabalala@example.com', '0731234576', '45 Zastron Street, Bloemfontein', 25, 'FS-MAN-14-002', '2022-09-20', '2024-09-20', 'Active', 'Registered'),
(21, 'Mpho', 'Molefe', '9506086543210', '1995-06-08', 'Male', 'mpho.molefe@example.com', '0821234577', '67 Section K, Botshabelo', 26, 'FS-MAN-27-001', '2022-03-10', '2024-03-10', 'Active', 'Not Registered'),
(22, 'Dineo', 'Modise', '8709156789012', '1987-09-15', 'Female', 'dineo.modise@example.com', '0641234578', '89 Thaba Nchu Road, Thaba Nchu', 27, 'FS-MAN-39-001', '2021-12-05', '2023-12-05', 'Expired', 'Registered'),

-- eThekwini Members
(23, 'Nkosinathi', 'Zungu', '9203056789012', '1992-03-05', 'Male', 'nkosinathi.zungu@example.com', '0731234579', '12 Umlazi V Section, Durban', 28, 'KZN-ETH-42-001', '2022-01-15', '2024-01-15', 'Active', 'Registered'),
(24, 'Nonhlanhla', 'Buthelezi', '8811127890123', '1988-11-12', 'Female', 'nonhlanhla.buthelezi@example.com', '0821234580', '34 Umlazi Z Section, Durban', 28, 'KZN-ETH-42-002', '2021-10-20', '2023-10-20', 'Expired', 'Registered'),
(25, 'Siyabonga', 'Mkhize', '9407086543210', '1994-07-08', 'Male', 'siyabonga.mkhize@example.com', '0641234581', '56 Phoenix Highway, Durban', 29, 'KZN-ETH-56-001', '2022-05-10', '2024-05-10', 'Active', 'Registered'),
(26, 'Zandile', 'Ngcobo', '8610156789012', '1986-10-15', 'Female', 'zandile.ngcobo@example.com', '0731234582', '78 Chatsworth Main Road, Durban', 30, 'KZN-ETH-67-001', '2022-07-05', '2024-07-05', 'Active', 'Not Registered'),

-- Polokwane Members
(27, 'Tebogo', 'Mokgadi', '9301056789012', '1993-01-05', 'Male', 'tebogo.mokgadi@example.com', '0821234583', '23 Church Street, Polokwane', 31, 'LIM-POL-12-001', '2021-09-15', '2023-09-15', 'Expired', 'Registered'),
(28, 'Kgomotso', 'Ledwaba', '8808127890123', '1988-08-12', 'Female', 'kgomotso.ledwaba@example.com', '0641234584', '45 Thabo Mbeki Street, Polokwane', 31, 'LIM-POL-12-002', '2022-11-20', '2024-11-20', 'Active', 'Registered'),
(29, 'Lesego', 'Mathebula', '9505086543210', '1995-05-08', 'Male', 'lesego.mathebula@example.com', '0731234585', '67 Zone 2, Seshego', 32, 'LIM-POL-23-001', '2022-02-10', '2024-02-10', 'Active', 'Not Registered'),
(30, 'Refilwe', 'Molepo', '8712156789012', '1987-12-15', 'Female', 'refilwe.molepo@example.com', '0821234586', '89 Mankweng Unit A, Polokwane', 33, 'LIM-POL-31-001', '2021-04-05', '2023-04-05', 'Expired', 'Registered'),

-- Mbombela Members
(31, 'Themba', 'Mabuza', '9206056789012', '1992-06-05', 'Male', 'themba.mabuza@example.com', '0641234587', '12 Nelspruit CBD, Mbombela', 34, 'MP-MBO-14-001', '2022-08-15', '2024-08-15', 'Active', 'Registered'),
(32, 'Busisiwe', 'Nkosi', '8809127890123', '1988-09-12', 'Female', 'busisiwe.nkosi@example.com', '0731234588', '34 Riverside Park, Mbombela', 34, 'MP-MBO-14-002', '2021-06-20', '2023-06-20', 'Expired', 'Registered'),
(33, 'Sibusiso', 'Maseko', '9408086543210', '1994-08-08', 'Male', 'sibusiso.maseko@example.com', '0821234589', '56 White River Main Road, Mbombela', 35, 'MP-MBO-22-001', '2022-10-10', '2024-10-10', 'Active', 'Not Registered'),
(34, 'Nomthandazo', 'Shabangu', '8611156789012', '1986-11-15', 'Female', 'nomthandazo.shabangu@example.com', '0641234590', '78 Kabokweni Main Road, Mbombela', 36, 'MP-MBO-33-001', '2022-12-05', '2024-12-05', 'Active', 'Registered'),

-- Sol Plaatje Members
(35, 'Kagiso', 'Modise', '9302056789012', '1993-02-05', 'Male', 'kagiso.modise@example.com', '0731234591', '23 Du Toitspan Road, Kimberley', 37, 'NC-SOL-09-001', '2021-05-15', '2023-05-15', 'Expired', 'Registered'),
(36, 'Nthabiseng', 'Mokoena', '8810127890123', '1988-10-12', 'Female', 'nthabiseng.mokoena@example.com', '0821234592', '45 Barkly Road, Kimberley', 37, 'NC-SOL-09-002', '2022-07-20', '2024-07-20', 'Active', 'Registered'),
(37, 'Tumelo', 'Phiri', '9503086543210', '1995-03-08', 'Male', 'tumelo.phiri@example.com', '0641234593', '67 Galeshewe Street, Kimberley', 38, 'NC-SOL-16-001', '2022-01-10', '2024-01-10', 'Active', 'Not Registered'),
(38, 'Palesa', 'Moloi', '8704156789012', '1987-04-15', 'Female', 'palesa.moloi@example.com', '0731234594', '89 Ritchie Main Road, Kimberley', 39, 'NC-SOL-24-001', '2021-03-05', '2023-03-05', 'Expired', 'Registered'),

-- Rustenburg Members
(39, 'Thulani', 'Nkosi', '9205056789012', '1992-05-05', 'Male', 'thulani.nkosi@example.com', '0821234595', '12 Fatima Bhayat Street, Rustenburg', 40, 'NW-RUS-11-001', '2022-04-15', '2024-04-15', 'Active', 'Registered'),
(40, 'Precious', 'Tau', '8812127890123', '1988-12-12', 'Female', 'precious.tau@example.com', '0641234596', '34 Klopper Street, Rustenburg', 40, 'NW-RUS-11-002', '2021-11-20', '2023-11-20', 'Expired', 'Registered'),
(41, 'Tshepo', 'Morake', '9409086543210', '1994-09-08', 'Male', 'tshepo.morake@example.com', '0731234597', '56 Tlhabane West, Rustenburg', 41, 'NW-RUS-19-001', '2022-06-10', '2024-06-10', 'Active', 'Not Registered'),
(42, 'Bonolo', 'Mogapi', '8605156789012', '1986-05-15', 'Female', 'bonolo.mogapi@example.com', '0821234598', '78 Phokeng Main Road, Rustenburg', 42, 'NW-RUS-27-001', '2022-09-05', '2024-09-05', 'Active', 'Registered');

-- Update ward member counts based on actual members
UPDATE wards SET member_count = (
  SELECT COUNT(*) FROM members WHERE members.ward_id = wards.id
) WHERE id IN (19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42);

-- Create additional user accounts for some of the new members
INSERT INTO users (id, name, email, password, role, admin_level, province_id, region_id, municipality_id, ward_id, member_id, is_active) VALUES
(29, 'Nomsa Mabaso', 'nomsa.mabaso@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 1, 1, 1, 19, 11, TRUE),
(30, 'Ayanda Mbeki', 'ayanda.mbeki@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 1, 2, 2, 22, 15, TRUE),
(31, 'Thabiso Mokoena', 'thabiso.mokoena@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 2, 9, 7, 25, 19, TRUE),
(32, 'Nkosinathi Zungu', 'nkosinathi.zungu@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 4, 19, 16, 28, 23, TRUE),
(33, 'Tebogo Mokgadi', 'tebogo.mokgadi@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 5, 30, 20, 31, 27, TRUE),
(34, 'Themba Mabuza', 'themba.mabuza@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 6, 35, 23, 34, 31, TRUE),
(35, 'Kagiso Modise', 'kagiso.modise@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 7, 38, 26, 37, 35, TRUE),
(36, 'Thulani Nkosi', 'thulani.nkosi@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 8, 43, 29, 40, 39, TRUE);

-- Note: All passwords in this example are hashed versions of "Password123!" 
-- The hash is: $2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO