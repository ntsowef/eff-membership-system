-- Sample Data for Membership System
-- This file contains realistic sample data for South Africa's administrative divisions
-- and admin users at various levels of the hierarchy

-- National Level Data
-- Already inserted in schema, but included here for completeness
INSERT INTO national (id, name, code, description) 
VALUES (1, 'South Africa', 'ZA', 'Republic of South Africa');

-- Province Level Data
INSERT INTO provinces (id, national_id, name, code, capital, description) VALUES
(1, 1, 'Eastern Cape', 'EC', 'Bhisho', 'The Eastern Cape is a province of South Africa'),
(2, 1, 'Free State', 'FS', 'Bloemfontein', 'The Free State is a province of South Africa'),
(3, 1, 'Gauteng', 'GP', 'Johannesburg', 'Gauteng is the smallest but most populous province of South Africa'),
(4, 1, 'KwaZulu-Natal', 'KZN', 'Pietermaritzburg', 'KwaZulu-Natal is a province of South Africa'),
(5, 1, 'Limpopo', 'LP', 'Polokwane', 'Limpopo is the northernmost province of South Africa'),
(6, 1, 'Mpumalanga', 'MP', 'Nelspruit', 'Mpumalanga is a province of South Africa'),
(7, 1, 'Northern Cape', 'NC', 'Kimberley', 'The Northern Cape is the largest and most sparsely populated province of South Africa'),
(8, 1, 'North West', 'NW', 'Mahikeng', 'North West is a province of South Africa'),
(9, 1, 'Western Cape', 'WC', 'Cape Town', 'The Western Cape is a province of South Africa');

-- Region Level Data (Districts and Metros)
INSERT INTO regions (id, province_id, name, code, description) VALUES
-- Eastern Cape Regions
(1, 1, 'Buffalo City Metropolitan', 'BUF', 'Metropolitan municipality that includes East London'),
(2, 1, 'Nelson Mandela Bay Metropolitan', 'NMA', 'Metropolitan municipality that includes Port Elizabeth'),
(3, 1, 'Sarah Baartman District', 'DC10', 'District municipality in the Eastern Cape'),
(4, 1, 'Amathole District', 'DC12', 'District municipality in the Eastern Cape'),
(5, 1, 'Chris Hani District', 'DC13', 'District municipality in the Eastern Cape'),
(6, 1, 'Joe Gqabi District', 'DC14', 'District municipality in the Eastern Cape'),
(7, 1, 'OR Tambo District', 'DC15', 'District municipality in the Eastern Cape'),
(8, 1, 'Alfred Nzo District', 'DC44', 'District municipality in the Eastern Cape'),

-- Free State Regions
(9, 2, 'Mangaung Metropolitan', 'MAN', 'Metropolitan municipality that includes Bloemfontein'),
(10, 2, 'Xhariep District', 'DC16', 'District municipality in the Free State'),
(11, 2, 'Lejweleputswa District', 'DC18', 'District municipality in the Free State'),
(12, 2, 'Thabo Mofutsanyana District', 'DC19', 'District municipality in the Free State'),
(13, 2, 'Fezile Dabi District', 'DC20', 'District municipality in the Free State'),

-- Gauteng Regions
(14, 3, 'City of Johannesburg Metropolitan', 'JHB', 'Metropolitan municipality that includes Johannesburg'),
(15, 3, 'City of Tshwane Metropolitan', 'TSH', 'Metropolitan municipality that includes Pretoria'),
(16, 3, 'Ekurhuleni Metropolitan', 'EKU', 'Metropolitan municipality that includes Germiston'),
(17, 3, 'Sedibeng District', 'DC42', 'District municipality in Gauteng'),
(18, 3, 'West Rand District', 'DC48', 'District municipality in Gauteng'),

-- KwaZulu-Natal Regions
(19, 4, 'eThekwini Metropolitan', 'ETH', 'Metropolitan municipality that includes Durban'),
(20, 4, 'uMgungundlovu District', 'DC22', 'District municipality in KwaZulu-Natal'),
(21, 4, 'Ugu District', 'DC21', 'District municipality in KwaZulu-Natal'),
(22, 4, 'King Cetshwayo District', 'DC28', 'District municipality in KwaZulu-Natal'),
(23, 4, 'uMkhanyakude District', 'DC27', 'District municipality in KwaZulu-Natal'),
(24, 4, 'Zululand District', 'DC26', 'District municipality in KwaZulu-Natal'),
(25, 4, 'Amajuba District', 'DC25', 'District municipality in KwaZulu-Natal'),
(26, 4, 'Harry Gwala District', 'DC43', 'District municipality in KwaZulu-Natal'),
(27, 4, 'iLembe District', 'DC29', 'District municipality in KwaZulu-Natal'),
(28, 4, 'uMzinyathi District', 'DC24', 'District municipality in KwaZulu-Natal'),
(29, 4, 'uThukela District', 'DC23', 'District municipality in KwaZulu-Natal'),

-- Limpopo Regions
(30, 5, 'Capricorn District', 'DC35', 'District municipality in Limpopo'),
(31, 5, 'Mopani District', 'DC33', 'District municipality in Limpopo'),
(32, 5, 'Sekhukhune District', 'DC47', 'District municipality in Limpopo'),
(33, 5, 'Vhembe District', 'DC34', 'District municipality in Limpopo'),
(34, 5, 'Waterberg District', 'DC36', 'District municipality in Limpopo'),

-- Mpumalanga Regions
(35, 6, 'Ehlanzeni District', 'DC32', 'District municipality in Mpumalanga'),
(36, 6, 'Gert Sibande District', 'DC30', 'District municipality in Mpumalanga'),
(37, 6, 'Nkangala District', 'DC31', 'District municipality in Mpumalanga'),

-- Northern Cape Regions
(38, 7, 'Frances Baard District', 'DC9', 'District municipality in Northern Cape'),
(39, 7, 'John Taolo Gaetsewe District', 'DC45', 'District municipality in Northern Cape'),
(40, 7, 'Namakwa District', 'DC6', 'District municipality in Northern Cape'),
(41, 7, 'Pixley ka Seme District', 'DC7', 'District municipality in Northern Cape'),
(42, 7, 'ZF Mgcawu District', 'DC8', 'District municipality in Northern Cape'),

-- North West Regions
(43, 8, 'Bojanala Platinum District', 'DC37', 'District municipality in North West'),
(44, 8, 'Dr Kenneth Kaunda District', 'DC40', 'District municipality in North West'),
(45, 8, 'Dr Ruth Segomotsi Mompati District', 'DC39', 'District municipality in North West'),
(46, 8, 'Ngaka Modiri Molema District', 'DC38', 'District municipality in North West'),

-- Western Cape Regions
(47, 9, 'City of Cape Town Metropolitan', 'CPT', 'Metropolitan municipality that includes Cape Town'),
(48, 9, 'Cape Winelands District', 'DC2', 'District municipality in Western Cape'),
(49, 9, 'Central Karoo District', 'DC5', 'District municipality in Western Cape'),
(50, 9, 'Garden Route District', 'DC4', 'District municipality in Western Cape'),
(51, 9, 'Overberg District', 'DC3', 'District municipality in Western Cape'),
(52, 9, 'West Coast District', 'DC1', 'District municipality in Western Cape');

-- Municipality Level Data (Selected examples from each province)
INSERT INTO municipalities (id, region_id, name, code, municipality_type, description) VALUES
-- Eastern Cape Municipalities (Selected)
(1, 1, 'Buffalo City', 'BUF', 'Metropolitan', 'Buffalo City Metropolitan Municipality'),
(2, 2, 'Nelson Mandela Bay', 'NMA', 'Metropolitan', 'Nelson Mandela Bay Metropolitan Municipality'),
(3, 3, 'Makana', 'EC104', 'Local', 'Makana Local Municipality in Sarah Baartman District'),
(4, 3, 'Kouga', 'EC108', 'Local', 'Kouga Local Municipality in Sarah Baartman District'),
(5, 4, 'Amahlathi', 'EC124', 'Local', 'Amahlathi Local Municipality in Amathole District'),
(6, 5, 'Enoch Mgijima', 'EC139', 'Local', 'Enoch Mgijima Local Municipality in Chris Hani District'),

-- Free State Municipalities (Selected)
(7, 9, 'Mangaung', 'MAN', 'Metropolitan', 'Mangaung Metropolitan Municipality'),
(8, 10, 'Kopanong', 'FS162', 'Local', 'Kopanong Local Municipality in Xhariep District'),
(9, 11, 'Matjhabeng', 'FS184', 'Local', 'Matjhabeng Local Municipality in Lejweleputswa District'),
(10, 12, 'Dihlabeng', 'FS192', 'Local', 'Dihlabeng Local Municipality in Thabo Mofutsanyana District'),

-- Gauteng Municipalities (Selected)
(11, 14, 'City of Johannesburg', 'JHB', 'Metropolitan', 'City of Johannesburg Metropolitan Municipality'),
(12, 15, 'City of Tshwane', 'TSH', 'Metropolitan', 'City of Tshwane Metropolitan Municipality'),
(13, 16, 'Ekurhuleni', 'EKU', 'Metropolitan', 'Ekurhuleni Metropolitan Municipality'),
(14, 17, 'Emfuleni', 'GT421', 'Local', 'Emfuleni Local Municipality in Sedibeng District'),
(15, 18, 'Mogale City', 'GT481', 'Local', 'Mogale City Local Municipality in West Rand District'),

-- KwaZulu-Natal Municipalities (Selected)
(16, 19, 'eThekwini', 'ETH', 'Metropolitan', 'eThekwini Metropolitan Municipality'),
(17, 20, 'Msunduzi', 'KZN225', 'Local', 'Msunduzi Local Municipality in uMgungundlovu District'),
(18, 21, 'Ray Nkonyeni', 'KZN216', 'Local', 'Ray Nkonyeni Local Municipality in Ugu District'),
(19, 22, 'uMhlathuze', 'KZN282', 'Local', 'uMhlathuze Local Municipality in King Cetshwayo District'),

-- Limpopo Municipalities (Selected)
(20, 30, 'Polokwane', 'LIM354', 'Local', 'Polokwane Local Municipality in Capricorn District'),
(21, 31, 'Greater Tzaneen', 'LIM333', 'Local', 'Greater Tzaneen Local Municipality in Mopani District'),
(22, 33, 'Thulamela', 'LIM343', 'Local', 'Thulamela Local Municipality in Vhembe District'),

-- Mpumalanga Municipalities (Selected)
(23, 35, 'Mbombela', 'MP326', 'Local', 'Mbombela Local Municipality in Ehlanzeni District'),
(24, 36, 'Govan Mbeki', 'MP307', 'Local', 'Govan Mbeki Local Municipality in Gert Sibande District'),
(25, 37, 'Emalahleni', 'MP312', 'Local', 'Emalahleni Local Municipality in Nkangala District'),

-- Northern Cape Municipalities (Selected)
(26, 38, 'Sol Plaatje', 'NC091', 'Local', 'Sol Plaatje Local Municipality in Frances Baard District'),
(27, 39, 'Joe Morolong', 'NC451', 'Local', 'Joe Morolong Local Municipality in John Taolo Gaetsewe District'),
(28, 40, 'Nama Khoi', 'NC062', 'Local', 'Nama Khoi Local Municipality in Namakwa District'),

-- North West Municipalities (Selected)
(29, 43, 'Rustenburg', 'NW373', 'Local', 'Rustenburg Local Municipality in Bojanala Platinum District'),
(30, 44, 'JB Marks', 'NW405', 'Local', 'JB Marks Local Municipality in Dr Kenneth Kaunda District'),
(31, 46, 'Mahikeng', 'NW383', 'Local', 'Mahikeng Local Municipality in Ngaka Modiri Molema District'),

-- Western Cape Municipalities (Selected)
(32, 47, 'City of Cape Town', 'CPT', 'Metropolitan', 'City of Cape Town Metropolitan Municipality'),
(33, 48, 'Stellenbosch', 'WC024', 'Local', 'Stellenbosch Local Municipality in Cape Winelands District'),
(34, 50, 'George', 'WC044', 'Local', 'George Local Municipality in Garden Route District'),
(35, 51, 'Overstrand', 'WC032', 'Local', 'Overstrand Local Municipality in Overberg District');

-- Ward Level Data (Selected examples)
INSERT INTO wards (id, municipality_id, name, ward_number, description, member_count) VALUES
-- Johannesburg Wards (Selected)
(1, 11, 'Johannesburg Ward 58', '58', 'Ward in Johannesburg South', 345),
(2, 11, 'Johannesburg Ward 23', '23', 'Ward in Johannesburg North', 210),
(3, 11, 'Johannesburg Ward 87', '87', 'Ward in Johannesburg East', 178),
(4, 11, 'Johannesburg Ward 112', '112', 'Ward in Johannesburg Central', 256),
(5, 11, 'Johannesburg Ward 54', '54', 'Ward in Johannesburg West', 189),

-- Cape Town Wards (Selected)
(6, 32, 'Cape Town Ward 57', '57', 'Ward in Cape Town Central', 287),
(7, 32, 'Cape Town Ward 23', '23', 'Ward in Cape Town Northern Suburbs', 312),
(8, 32, 'Cape Town Ward 74', '74', 'Ward in Cape Town Southern Suburbs', 265),
(9, 32, 'Cape Town Ward 115', '115', 'Ward in Cape Town Eastern Suburbs', 198),
(10, 32, 'Cape Town Ward 83', '83', 'Ward in Cape Town Atlantic Seaboard', 176),

-- Durban Wards (Selected)
(11, 16, 'eThekwini Ward 25', '25', 'Ward in Durban Central', 234),
(12, 16, 'eThekwini Ward 73', '73', 'Ward in Durban North', 187),
(13, 16, 'eThekwini Ward 91', '91', 'Ward in Durban West', 156),
(14, 16, 'eThekwini Ward 104', '104', 'Ward in Durban South', 201),

-- Tshwane Wards (Selected)
(15, 12, 'Tshwane Ward 58', '58', 'Ward in Pretoria Central', 167),
(16, 12, 'Tshwane Ward 82', '82', 'Ward in Pretoria East', 198),
(17, 12, 'Tshwane Ward 44', '44', 'Ward in Pretoria North', 143),
(18, 12, 'Tshwane Ward 3', '3', 'Ward in Pretoria West', 176);

-- Admin Users (National, Provincial, Regional, Municipal levels)
INSERT INTO users (id, name, email, password, role, admin_level, province_id, region_id, municipality_id, ward_id, member_id, is_active) VALUES
-- National Admin
(1, 'National Administrator', 'national.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'national', NULL, NULL, NULL, NULL, NULL, TRUE),

-- Provincial Admins
(2, 'Gauteng Admin', 'gauteng.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'province', 3, NULL, NULL, NULL, NULL, TRUE),
(3, 'Western Cape Admin', 'westerncape.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'province', 9, NULL, NULL, NULL, NULL, TRUE),
(4, 'KwaZulu-Natal Admin', 'kzn.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'province', 4, NULL, NULL, NULL, NULL, TRUE),
(5, 'Eastern Cape Admin', 'easterncape.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'province', 1, NULL, NULL, NULL, NULL, TRUE),
(6, 'Free State Admin', 'freestate.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'province', 2, NULL, NULL, NULL, NULL, TRUE),
(7, 'Limpopo Admin', 'limpopo.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'province', 5, NULL, NULL, NULL, NULL, TRUE),
(8, 'Mpumalanga Admin', 'mpumalanga.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'province', 6, NULL, NULL, NULL, NULL, TRUE),
(9, 'Northern Cape Admin', 'northerncape.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'province', 7, NULL, NULL, NULL, NULL, TRUE),
(10, 'North West Admin', 'northwest.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'province', 8, NULL, NULL, NULL, NULL, TRUE),

-- Regional Admins (Selected)
(11, 'Johannesburg Admin', 'jhb.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'region', 3, 14, NULL, NULL, NULL, TRUE),
(12, 'Cape Town Admin', 'cpt.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'region', 9, 47, NULL, NULL, NULL, TRUE),
(13, 'eThekwini Admin', 'ethekwini.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'region', 4, 19, NULL, NULL, NULL, TRUE),
(14, 'Tshwane Admin', 'tshwane.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'region', 3, 15, NULL, NULL, NULL, TRUE),

-- Municipal Admins (Selected)
(15, 'Soweto Admin', 'soweto.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'municipality', 3, 14, 11, NULL, NULL, TRUE),
(16, 'Sandton Admin', 'sandton.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'municipality', 3, 14, 13, NULL, NULL, TRUE),
(17, 'Durban Central Admin', 'durban.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'municipality', 4, 19, 16, NULL, NULL, TRUE),
(18, 'Stellenbosch Admin', 'stellenbosch.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'municipality', 9, 47, 32, NULL, NULL, TRUE),

-- Ward Admins (Selected)
(19, 'Johannesburg Ward 58 Admin', 'jhb.ward58.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'ward', 3, 14, 11, 1, NULL, TRUE),
(20, 'Cape Town Ward 54 Admin', 'cpt.ward54.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'ward', 9, 47, 32, 5, NULL, TRUE),
(21, 'eThekwini Ward 25 Admin', 'eth.ward25.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'ward', 4, 19, 16, 11, NULL, TRUE),
(22, 'Tshwane Ward 58 Admin', 'tsw.ward58.admin@membership.org.za', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'admin', 'ward', 3, 15, 12, 15, NULL, TRUE);

-- Sample Data for Membership System - Complete Municipalities List
-- This file contains a comprehensive list of all South African municipalities
-- organized by province and region

-- Municipality Level Data (Complete list for all regions)
INSERT INTO municipalities (id, region_id, name, code, municipality_type, description) VALUES

-- Eastern Cape Municipalities
-- Buffalo City Metropolitan
(1, 1, 'Buffalo City', 'BUF', 'Metropolitan', 'Buffalo City Metropolitan Municipality'),

-- Nelson Mandela Bay Metropolitan
(2, 2, 'Nelson Mandela Bay', 'NMA', 'Metropolitan', 'Nelson Mandela Bay Metropolitan Municipality'),

-- Sarah Baartman District Municipalities
(3, 3, 'Dr Beyers Naudé', 'EC101', 'Local', 'Dr Beyers Naudé Local Municipality in Sarah Baartman District'),
(4, 3, 'Blue Crane Route', 'EC102', 'Local', 'Blue Crane Route Local Municipality in Sarah Baartman District'),
(5, 3, 'Makana', 'EC104', 'Local', 'Makana Local Municipality in Sarah Baartman District'),
(6, 3, 'Ndlambe', 'EC105', 'Local', 'Ndlambe Local Municipality in Sarah Baartman District'),
(7, 3, 'Sundays River Valley', 'EC106', 'Local', 'Sundays River Valley Local Municipality in Sarah Baartman District'),
(8, 3, 'Kouga', 'EC108', 'Local', 'Kouga Local Municipality in Sarah Baartman District'),
(9, 3, 'Kou-Kamma', 'EC109', 'Local', 'Kou-Kamma Local Municipality in Sarah Baartman District'),

-- Amathole District Municipalities
(10, 4, 'Mbhashe', 'EC121', 'Local', 'Mbhashe Local Municipality in Amathole District'),
(11, 4, 'Mnquma', 'EC122', 'Local', 'Mnquma Local Municipality in Amathole District'),
(12, 4, 'Great Kei', 'EC123', 'Local', 'Great Kei Local Municipality in Amathole District'),
(13, 4, 'Amahlathi', 'EC124', 'Local', 'Amahlathi Local Municipality in Amathole District'),
(14, 4, 'Ngqushwa', 'EC126', 'Local', 'Ngqushwa Local Municipality in Amathole District'),
(15, 4, 'Raymond Mhlaba', 'EC129', 'Local', 'Raymond Mhlaba Local Municipality in Amathole District'),

-- Chris Hani District Municipalities
(16, 5, 'Inxuba Yethemba', 'EC131', 'Local', 'Inxuba Yethemba Local Municipality in Chris Hani District'),
(17, 5, 'Enoch Mgijima', 'EC139', 'Local', 'Enoch Mgijima Local Municipality in Chris Hani District'),
(18, 5, 'Sakhisizwe', 'EC138', 'Local', 'Sakhisizwe Local Municipality in Chris Hani District'),
(19, 5, 'Emalahleni', 'EC136', 'Local', 'Emalahleni Local Municipality in Chris Hani District'),
(20, 5, 'Intsika Yethu', 'EC135', 'Local', 'Intsika Yethu Local Municipality in Chris Hani District'),

-- Joe Gqabi District Municipalities
(21, 6, 'Elundini', 'EC141', 'Local', 'Elundini Local Municipality in Joe Gqabi District'),
(22, 6, 'Senqu', 'EC142', 'Local', 'Senqu Local Municipality in Joe Gqabi District'),
(23, 6, 'Walter Sisulu', 'EC145', 'Local', 'Walter Sisulu Local Municipality in Joe Gqabi District'),

-- OR Tambo District Municipalities
(24, 7, 'King Sabata Dalindyebo', 'EC157', 'Local', 'King Sabata Dalindyebo Local Municipality in OR Tambo District'),
(25, 7, 'Mhlontlo', 'EC156', 'Local', 'Mhlontlo Local Municipality in OR Tambo District'),
(26, 7, 'Nyandeni', 'EC155', 'Local', 'Nyandeni Local Municipality in OR Tambo District'),
(27, 7, 'Port St Johns', 'EC154', 'Local', 'Port St Johns Local Municipality in OR Tambo District'),
(28, 7, 'Ingquza Hill', 'EC153', 'Local', 'Ingquza Hill Local Municipality in OR Tambo District'),

-- Alfred Nzo District Municipalities
(29, 8, 'Matatiele', 'EC441', 'Local', 'Matatiele Local Municipality in Alfred Nzo District'),
(30, 8, 'Umzimvubu', 'EC442', 'Local', 'Umzimvubu Local Municipality in Alfred Nzo District'),
(31, 8, 'Winnie Madikizela-Mandela', 'EC443', 'Local', 'Winnie Madikizela-Mandela Local Municipality in Alfred Nzo District'),
(32, 8, 'Ntabankulu', 'EC444', 'Local', 'Ntabankulu Local Municipality in Alfred Nzo District'),

-- Free State Municipalities
-- Mangaung Metropolitan
(33, 9, 'Mangaung', 'MAN', 'Metropolitan', 'Mangaung Metropolitan Municipality'),

-- Xhariep District Municipalities
(34, 10, 'Letsemeng', 'FS161', 'Local', 'Letsemeng Local Municipality in Xhariep District'),
(35, 10, 'Kopanong', 'FS162', 'Local', 'Kopanong Local Municipality in Xhariep District'),
(36, 10, 'Mohokare', 'FS163', 'Local', 'Mohokare Local Municipality in Xhariep District'),

-- Lejweleputswa District Municipalities
(37, 11, 'Masilonyana', 'FS181', 'Local', 'Masilonyana Local Municipality in Lejweleputswa District'),
(38, 11, 'Tokologo', 'FS182', 'Local', 'Tokologo Local Municipality in Lejweleputswa District'),
(39, 11, 'Tswelopele', 'FS183', 'Local', 'Tswelopele Local Municipality in Lejweleputswa District'),
(40, 11, 'Matjhabeng', 'FS184', 'Local', 'Matjhabeng Local Municipality in Lejweleputswa District'),
(41, 11, 'Nala', 'FS185', 'Local', 'Nala Local Municipality in Lejweleputswa District'),

-- Thabo Mofutsanyana District Municipalities
(42, 12, 'Setsoto', 'FS191', 'Local', 'Setsoto Local Municipality in Thabo Mofutsanyana District'),
(43, 12, 'Dihlabeng', 'FS192', 'Local', 'Dihlabeng Local Municipality in Thabo Mofutsanyana District'),
(44, 12, 'Nketoana', 'FS193', 'Local', 'Nketoana Local Municipality in Thabo Mofutsanyana District'),
(45, 12, 'Maluti-a-Phofung', 'FS194', 'Local', 'Maluti-a-Phofung Local Municipality in Thabo Mofutsanyana District'),
(46, 12, 'Phumelela', 'FS195', 'Local', 'Phumelela Local Municipality in Thabo Mofutsanyana District'),
(47, 12, 'Mantsopa', 'FS196', 'Local', 'Mantsopa Local Municipality in Thabo Mofutsanyana District'),

-- Fezile Dabi District Municipalities
(48, 13, 'Moqhaka', 'FS201', 'Local', 'Moqhaka Local Municipality in Fezile Dabi District'),
(49, 13, 'Ngwathe', 'FS203', 'Local', 'Ngwathe Local Municipality in Fezile Dabi District'),
(50, 13, 'Metsimaholo', 'FS204', 'Local', 'Metsimaholo Local Municipality in Fezile Dabi District'),
(51, 13, 'Mafube', 'FS205', 'Local', 'Mafube Local Municipality in Fezile Dabi District'),

-- Gauteng Municipalities
-- City of Johannesburg Metropolitan
(52, 14, 'City of Johannesburg', 'JHB', 'Metropolitan', 'City of Johannesburg Metropolitan Municipality'),

-- City of Tshwane Metropolitan
(53, 15, 'City of Tshwane', 'TSH', 'Metropolitan', 'City of Tshwane Metropolitan Municipality'),

-- Ekurhuleni Metropolitan
(54, 16, 'Ekurhuleni', 'EKU', 'Metropolitan', 'Ekurhuleni Metropolitan Municipality'),

-- Sedibeng District Municipalities
(55, 17, 'Emfuleni', 'GT421', 'Local', 'Emfuleni Local Municipality in Sedibeng District'),
(56, 17, 'Midvaal', 'GT422', 'Local', 'Midvaal Local Municipality in Sedibeng District'),
(57, 17, 'Lesedi', 'GT423', 'Local', 'Lesedi Local Municipality in Sedibeng District'),

-- West Rand District Municipalities
(58, 18, 'Mogale City', 'GT481', 'Local', 'Mogale City Local Municipality in West Rand District'),
(59, 18, 'Rand West City', 'GT485', 'Local', 'Rand West City Local Municipality in West Rand District'),
(60, 18, 'Merafong City', 'GT484', 'Local', 'Merafong City Local Municipality in West Rand District'),

-- KwaZulu-Natal Municipalities
-- eThekwini Metropolitan
(61, 19, 'eThekwini', 'ETH', 'Metropolitan', 'eThekwini Metropolitan Municipality'),

-- uMgungundlovu District Municipalities
(62, 20, 'uMshwathi', 'KZN221', 'Local', 'uMshwathi Local Municipality in uMgungundlovu District'),
(63, 20, 'uMngeni', 'KZN222', 'Local', 'uMngeni Local Municipality in uMgungundlovu District'),
(64, 20, 'Mpofana', 'KZN223', 'Local', 'Mpofana Local Municipality in uMgungundlovu District'),
(65, 20, 'Impendle', 'KZN224', 'Local', 'Impendle Local Municipality in uMgungundlovu District'),
(66, 20, 'Msunduzi', 'KZN225', 'Local', 'Msunduzi Local Municipality in uMgungundlovu District'),
(67, 20, 'Mkhambathini', 'KZN226', 'Local', 'Mkhambathini Local Municipality in uMgungundlovu District'),
(68, 20, 'Richmond', 'KZN227', 'Local', 'Richmond Local Municipality in uMgungundlovu District'),

-- Ugu District Municipalities
(69, 21, 'Ray Nkonyeni', 'KZN216', 'Local', 'Ray Nkonyeni Local Municipality in Ugu District'),
(70, 21, 'Umdoni', 'KZN212', 'Local', 'Umdoni Local Municipality in Ugu District'),
(71, 21, 'Umzumbe', 'KZN213', 'Local', 'Umzumbe Local Municipality in Ugu District'),
(72, 21, 'uMuziwabantu', 'KZN214', 'Local', 'uMuziwabantu Local Municipality in Ugu District'),

-- King Cetshwayo District Municipalities
(73, 22, 'uMfolozi', 'KZN281', 'Local', 'uMfolozi Local Municipality in King Cetshwayo District'),
(74, 22, 'uMhlathuze', 'KZN282', 'Local', 'uMhlathuze Local Municipality in King Cetshwayo District'),
(75, 22, 'uMlalazi', 'KZN284', 'Local', 'uMlalazi Local Municipality in King Cetshwayo District'),
(76, 22, 'Mthonjaneni', 'KZN285', 'Local', 'Mthonjaneni Local Municipality in King Cetshwayo District'),
(77, 22, 'Nkandla', 'KZN286', 'Local', 'Nkandla Local Municipality in King Cetshwayo District'),

-- uMkhanyakude District Municipalities
(78, 23, 'Umhlabuyalingana', 'KZN271', 'Local', 'Umhlabuyalingana Local Municipality in uMkhanyakude District'),
(79, 23, 'Jozini', 'KZN272', 'Local', 'Jozini Local Municipality in uMkhanyakude District'),
(80, 23, 'Mtubatuba', 'KZN275', 'Local', 'Mtubatuba Local Municipality in uMkhanyakude District'),
(81, 23, 'Big Five Hlabisa', 'KZN276', 'Local', 'Big Five Hlabisa Local Municipality in uMkhanyakude District'),

-- Zululand District Municipalities
(82, 24, 'eDumbe', 'KZN261', 'Local', 'eDumbe Local Municipality in Zululand District'),
(83, 24, 'uPhongolo', 'KZN262', 'Local', 'uPhongolo Local Municipality in Zululand District'),
(84, 24, 'Abaqulusi', 'KZN263', 'Local', 'Abaqulusi Local Municipality in Zululand District'),
(85, 24, 'Nongoma', 'KZN265', 'Local', 'Nongoma Local Municipality in Zululand District'),
(86, 24, 'Ulundi', 'KZN266', 'Local', 'Ulundi Local Municipality in Zululand District'),

-- Amajuba District Municipalities
(87, 25, 'Newcastle', 'KZN252', 'Local', 'Newcastle Local Municipality in Amajuba District'),
(88, 25, 'Emadlangeni', 'KZN253', 'Local', 'Emadlangeni Local Municipality in Amajuba District'),
(89, 25, 'Dannhauser', 'KZN254', 'Local', 'Dannhauser Local Municipality in Amajuba District'),

-- Harry Gwala District Municipalities
(90, 26, 'Dr Nkosazana Dlamini Zuma', 'KZN436', 'Local', 'Dr Nkosazana Dlamini Zuma Local Municipality in Harry Gwala District'),
(91, 26, 'Greater Kokstad', 'KZN433', 'Local', 'Greater Kokstad Local Municipality in Harry Gwala District'),
(92, 26, 'Ubuhlebezwe', 'KZN434', 'Local', 'Ubuhlebezwe Local Municipality in Harry Gwala District'),
(93, 26, 'Umzimkhulu', 'KZN435', 'Local', 'Umzimkhulu Local Municipality in Harry Gwala District'),

-- iLembe District Municipalities
(94, 27, 'KwaDukuza', 'KZN292', 'Local', 'KwaDukuza Local Municipality in iLembe District'),
(95, 27, 'Mandeni', 'KZN291', 'Local', 'Mandeni Local Municipality in iLembe District'),
(96, 27, 'Maphumulo', 'KZN294', 'Local', 'Maphumulo Local Municipality in iLembe District'),
(97, 27, 'Ndwedwe', 'KZN293', 'Local', 'Ndwedwe Local Municipality in iLembe District'),

-- uMzinyathi District Municipalities
(98, 28, 'Endumeni', 'KZN241', 'Local', 'Endumeni Local Municipality in uMzinyathi District'),
(99, 28, 'Msinga', 'KZN244', 'Local', 'Msinga Local Municipality in uMzinyathi District'),
(100, 28, 'Nquthu', 'KZN242', 'Local', 'Nquthu Local Municipality in uMzinyathi District'),
(101, 28, 'Umvoti', 'KZN245', 'Local', 'Umvoti Local Municipality in uMzinyathi District'),

-- uThukela District Municipalities
(102, 29, 'Alfred Duma', 'KZN238', 'Local', 'Alfred Duma Local Municipality in uThukela District'),
(103, 29, 'Inkosi Langalibalele', 'KZN237', 'Local', 'Inkosi Langalibalele Local Municipality in uThukela District'),
(104, 29, 'Okhahlamba', 'KZN235', 'Local', 'Okhahlamba Local Municipality in uThukela District'),

-- Limpopo Municipalities
-- Capricorn District Municipalities
(105, 30, 'Blouberg', 'LIM351', 'Local', 'Blouberg Local Municipality in Capricorn District'),
(106, 30, 'Lepelle-Nkumpi', 'LIM355', 'Local', 'Lepelle-Nkumpi Local Municipality in Capricorn District'),
(107, 30, 'Molemole', 'LIM353', 'Local', 'Molemole Local Municipality in Capricorn District'),
(108, 30, 'Polokwane', 'LIM354', 'Local', 'Polokwane Local Municipality in Capricorn District'),

-- Mopani District Municipalities
(109, 31, 'Ba-Phalaborwa', 'LIM334', 'Local', 'Ba-Phalaborwa Local Municipality in Mopani District'),
(110, 31, 'Greater Giyani', 'LIM331', 'Local', 'Greater Giyani Local Municipality in Mopani District'),
(111, 31, 'Greater Letaba', 'LIM332', 'Local', 'Greater Letaba Local Municipality in Mopani District'),
(112, 31, 'Greater Tzaneen', 'LIM333', 'Local', 'Greater Tzaneen Local Municipality in Mopani District'),
(113, 31, 'Maruleng', 'LIM335', 'Local', 'Maruleng Local Municipality in Mopani District'),

-- uMgungundlovu District Municipalities
(62, 20, 'uMshwathi', 'KZN221', 'Local', 'uMshwathi Local Municipality in uMgungundlovu District'),
(63, 20, 'uMngeni', 'KZN222', 'Local', 'uMngeni Local Municipality in uMgungundlovu District'),
(64, 20, 'Mpofana', 'KZN223', 'Local', 'Mpofana Local Municipality in uMgungundlovu District'),
(65, 20, 'Impendle', 'KZN224', 'Local', 'Impendle Local Municipality in uMgungundlovu District'),
(66, 20, 'Msunduzi', 'KZN225', 'Local', 'Msunduzi Local Municipality in uMgungundlovu District'),
(67, 20, 'Mkhambathini', 'KZN226', 'Local', 'Mkhambathini Local Municipality in uMgungundlovu District'),
(68, 20, 'Richmond', 'KZN227', 'Local', 'Richmond Local Municipality in uMgungundlovu District'),

-- Ugu District Municipalities
(69, 21, 'Ray Nkonyeni', 'KZN216', 'Local', 'Ray Nkonyeni Local Municipality in Ugu District'),
(70, 21, 'Umdoni', 'KZN212', 'Local', 'Umdoni Local Municipality in Ugu District'),
(71, 21, 'Umzumbe', 'KZN213', 'Local', 'Umzumbe Local Municipality in Ugu District'),
(72, 21, 'Umuziwabantu', 'KZN214', 'Local', 'Umuziwabantu Local Municipality in Ugu District'),

-- King Cetshwayo District Municipalities
(73, 22, 'uMfolozi', 'KZN281', 'Local', 'uMfolozi Local Municipality in King Cetshwayo District'),
(74, 22, 'uMhlathuze', 'KZN282', 'Local', 'uMhlathuze Local Municipality in King Cetshwayo District'),
(75, 22, 'uMlalazi', 'KZN284', 'Local', 'uMlalazi Local Municipality in King Cetshwayo District'),
(76, 22, 'Mthonjaneni', 'KZN285', 'Local', 'Mthonjaneni Local Municipality in King Cetshwayo District'),
(77, 22, 'Nkandla', 'KZN286', 'Local', 'Nkandla Local Municipality in King Cetshwayo District'),

-- uMkhanyakude District Municipalities
(78, 23, 'Umhlabuyalingana', 'KZN271', 'Local', 'Umhlabuyalingana Local Municipality in uMkhanyakude District'),
(79, 23, 'Jozini', 'KZN272', 'Local', 'Jozini Local Municipality in uMkhanyakude District'),
(80, 23, 'Mtubatuba', 'KZN275', 'Local', 'Mtubatuba Local Municipality in uMkhanyakude District'),
(81, 23, 'Big Five Hlabisa', 'KZN276', 'Local', 'Big Five Hlabisa Local Municipality in uMkhanyakude District'),

-- Zululand District Municipalities
(82, 24, 'eDumbe', 'KZN261', 'Local', 'eDumbe Local Municipality in Zululand District'),
(83, 24, 'uPhongolo', 'KZN262', 'Local', 'uPhongolo Local Municipality in Zululand District'),
(84, 24, 'Abaqulusi', 'KZN263', 'Local', 'Abaqulusi Local Municipality in Zululand District'),
(85, 24, 'Nongoma', 'KZN265', 'Local', 'Nongoma Local Municipality in Zululand District'),
(86, 24, 'Ulundi', 'KZN266', 'Local', 'Ulundi Local Municipality in Zululand District'),

-- Amajuba District Municipalities
(87, 25, 'Dannhauser', 'KZN254', 'Local', 'Dannhauser Local Municipality in Amajuba District'),
(88, 25, 'Newcastle', 'KZN252', 'Local', 'Newcastle Local Municipality in Amajuba District'),
(89, 25, 'Emadlangeni', 'KZN253', 'Local', 'Emadlangeni Local Municipality in Amajuba District'),

-- Harry Gwala District Municipalities
(90, 26, 'Dr Nkosazana Dlamini Zuma', 'KZN436', 'Local', 'Dr Nkosazana Dlamini Zuma Local Municipality in Harry Gwala District'),
(91, 26, 'Greater Kokstad', 'KZN433', 'Local', 'Greater Kokstad Local Municipality in Harry Gwala District'),
(92, 26, 'Ubuhlebezwe', 'KZN434', 'Local', 'Ubuhlebezwe Local Municipality in Harry Gwala District'),
(93, 26, 'Umzimkhulu', 'KZN435', 'Local', 'Umzimkhulu Local Municipality in Harry Gwala District'),

-- iLembe District Municipalities
(94, 27, 'Mandeni', 'KZN291', 'Local', 'Mandeni Local Municipality in iLembe District'),
(95, 27, 'KwaDukuza', 'KZN292', 'Local', 'KwaDukuza Local Municipality in iLembe District'),
(96, 27, 'Ndwedwe', 'KZN293', 'Local', 'Ndwedwe Local Municipality in iLembe District'),
(97, 27, 'Maphumulo', 'KZN294', 'Local', 'Maphumulo Local Municipality in iLembe District'),

-- uMzinyathi District Municipalities
(98, 28, 'Endumeni', 'KZN241', 'Local', 'Endumeni Local Municipality in uMzinyathi District'),
(99, 28, 'Nquthu', 'KZN242', 'Local', 'Nquthu Local Municipality in uMzinyathi District'),
(100, 28, 'Msinga', 'KZN244', 'Local', 'Msinga Local Municipality in uMzinyathi District'),
(101, 28, 'Umvoti', 'KZN245', 'Local', 'Umvoti Local Municipality in uMzinyathi District'),

-- uThukela District Municipalities
(102, 29, 'Alfred Duma', 'KZN238', 'Local', 'Alfred Duma Local Municipality in uThukela District'),
(103, 29, 'Inkosi Langalibalele', 'KZN237', 'Local', 'Inkosi Langalibalele Local Municipality in uThukela District'),
(104, 29, 'Okhahlamba', 'KZN235', 'Local', 'Okhahlamba Local Municipality in uThukela District'),

-- Limpopo Municipalities
-- Capricorn District Municipalities
(105, 30, 'Blouberg', 'LIM351', 'Local', 'Blouberg Local Municipality in Capricorn District'),
(106, 30, 'Lepelle-Nkumpi', 'LIM355', 'Local', 'Lepelle-Nkumpi Local Municipality in Capricorn District'),
(107, 30, 'Molemole', 'LIM353', 'Local', 'Molemole Local Municipality in Capricorn District'),
(108, 30, 'Polokwane', 'LIM354', 'Local', 'Polokwane Local Municipality in Capricorn District'),

-- Mopani District Municipalities
(109, 31, 'Ba-Phalaborwa', 'LIM334', 'Local', 'Ba-Phalaborwa Local Municipality in Mopani District'),
(110, 31, 'Greater Giyani', 'LIM331', 'Local', 'Greater Giyani Local Municipality in Mopani District'),
(111, 31, 'Greater Letaba', 'LIM332', 'Local', 'Greater Letaba Local Municipality in Mopani District'),
(112, 31, 'Greater Tzaneen', 'LIM333', 'Local', 'Greater Tzaneen Local Municipality in Mopani District'),
(113, 31, 'Maruleng', 'LIM335', 'Local', 'Maruleng Local Municipality in Mopani District')

-- Update users who are also members to reference their member ID
UPDATE users SET member_id = 1 WHERE id = 19; -- Ward 58 Admin is also member Thabo Mbeki
UPDATE users SET member_id = 4 WHERE id = 20; -- Cape Town Ward 54 Admin is also member Amahle Botha
UPDATE users SET member_id = 6 WHERE id = 21; -- eThekwini Ward 25 Admin is also member Nkosazana Dlamini
UPDATE users SET member_id = 8 WHERE id = 22; -- Tshwane Ward 58 Admin is also member Lerato Molefe

-- Create member users (regular members who can log in)
INSERT INTO users (id, name, email, password, role, admin_level, province_id, region_id, municipality_id, ward_id, member_id, is_active) VALUES
(23, 'Nomzamo Zuma', 'nomzamo.zuma@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 3, 14, 11, 1, 2, TRUE),
(24, 'Sipho Nkosi', 'sipho.nkosi@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 3, 14, 13, 2, 3, TRUE),
(25, 'Johan van der Merwe', 'johan.vandermerwe@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 9, 47, 32, 6, 5, TRUE),
(26, 'Mandla Cele', 'mandla.cele@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 4, 19, 16, 12, 7, TRUE),
(27, 'Themba Ndlovu', 'themba.ndlovu@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 3, 15, 12, 16, 9, TRUE),
(28, 'Zanele Mthembu', 'zanele.mthembu@example.com', '$2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO', 'member', 'none', 3, 15, 12, 17, 10, TRUE);

-- System Settings for Largest Entities
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('largest_ward', 'Ward 58 in Johannesburg Metropolitan, Gauteng (345 members)', 'string', 'Largest ward by membership count', true),
('largest_municipality', 'Johannesburg Metropolitan in Gauteng (1,567 members)', 'string', 'Largest municipality by membership count', true),
('largest_region', 'City of Cape Town Metropolitan in Western Cape (1,850 members)', 'string', 'Largest region by membership count', true);

-- Note: All passwords in this example are hashed versions of "Password123!" 
-- The hash is: $2a$10$X7EBGITGJNQrYV/kapTdkO8vP5iNkxQXFIrHzfGkEZ4LHQqK3zKHO
-- In a real system, each user would have a unique, securely generated password
