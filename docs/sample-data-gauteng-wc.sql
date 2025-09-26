-- Sample Data for Membership System - Gauteng and Western Cape Wards and Members
-- This file contains realistic sample data for wards and members in Gauteng and Western Cape
-- to replace the deleted data in sample-data.sql

-- Ward Level Data for Gauteng and Western Cape
INSERT INTO wards (id, municipality_id, name, ward_number, description, member_count) VALUES
-- Johannesburg Wards (City of Johannesburg - municipality_id 11)
(43, 11, 'Johannesburg Ward 58', '58', 'Ward in Johannesburg South', 345),
(44, 11, 'Johannesburg Ward 23', '23', 'Ward in Johannesburg North', 210),
(45, 11, 'Johannesburg Ward 87', '87', 'Ward in Johannesburg East', 178),
(46, 11, 'Johannesburg Ward 112', '112', 'Ward in Johannesburg Central', 256),
(47, 11, 'Johannesburg Ward 54', '54', 'Ward in Johannesburg West', 189),
(48, 11, 'Johannesburg Ward 76', '76', 'Ward in Soweto', 312),
(49, 11, 'Johannesburg Ward 92', '92', 'Ward in Sandton', 167),
(50, 11, 'Johannesburg Ward 105', '105', 'Ward in Midrand', 198),

-- Tshwane Wards (City of Tshwane - municipality_id 12)
(51, 12, 'Tshwane Ward 58', '58', 'Ward in Pretoria Central', 167),
(52, 12, 'Tshwane Ward 82', '82', 'Ward in Pretoria East', 198),
(53, 12, 'Tshwane Ward 44', '44', 'Ward in Pretoria North', 143),
(54, 12, 'Tshwane Ward 3', '3', 'Ward in Pretoria West', 176),
(55, 12, 'Tshwane Ward 92', '92', 'Ward in Centurion', 234),
(56, 12, 'Tshwane Ward 37', '37', 'Ward in Mamelodi', 287),
(57, 12, 'Tshwane Ward 69', '69', 'Ward in Atteridgeville', 156),

-- Ekurhuleni Wards (Ekurhuleni - municipality_id 13)
(58, 13, 'Ekurhuleni Ward 15', '15', 'Ward in Kempton Park', 189),
(59, 13, 'Ekurhuleni Ward 34', '34', 'Ward in Benoni', 167),
(60, 13, 'Ekurhuleni Ward 53', '53', 'Ward in Germiston', 212),
(61, 13, 'Ekurhuleni Ward 76', '76', 'Ward in Boksburg', 178),
(62, 13, 'Ekurhuleni Ward 91', '91', 'Ward in Springs', 145),
(63, 13, 'Ekurhuleni Ward 103', '103', 'Ward in Alberton', 198),

-- Emfuleni Wards (Emfuleni - municipality_id 14)
(64, 14, 'Emfuleni Ward 12', '12', 'Ward in Vanderbijlpark', 156),
(65, 14, 'Emfuleni Ward 27', '27', 'Ward in Vereeniging', 178),
(66, 14, 'Emfuleni Ward 38', '38', 'Ward in Sebokeng', 234),

-- Mogale City Wards (Mogale City - municipality_id 15)
(67, 15, 'Mogale City Ward 8', '8', 'Ward in Krugersdorp', 145),
(68, 15, 'Mogale City Ward 19', '19', 'Ward in Kagiso', 189),

-- Cape Town Wards (City of Cape Town - municipality_id 32)
(69, 32, 'Cape Town Ward 57', '57', 'Ward in Cape Town Central', 287),
(70, 32, 'Cape Town Ward 23', '23', 'Ward in Cape Town Northern Suburbs', 312),
(71, 32, 'Cape Town Ward 74', '74', 'Ward in Cape Town Southern Suburbs', 265),
(72, 32, 'Cape Town Ward 115', '115', 'Ward in Cape Town Eastern Suburbs', 198),
(73, 32, 'Cape Town Ward 83', '83', 'Ward in Cape Town Atlantic Seaboard', 176),
(74, 32, 'Cape Town Ward 42', '42', 'Ward in Mitchell\'s Plain', 345),
(75, 32, 'Cape Town Ward 67', '67', 'Ward in Khayelitsha', 389),
(76, 32, 'Cape Town Ward 95', '95', 'Ward in Durbanville', 156),
(77, 32, 'Cape Town Ward 103', '103', 'Ward in Table View', 178),

-- Stellenbosch Wards (Stellenbosch - municipality_id 33)
(78, 33, 'Stellenbosch Ward 7', '7', 'Ward in Stellenbosch Central', 145),
(79, 33, 'Stellenbosch Ward 15', '15', 'Ward in Kayamandi', 198),
(80, 33, 'Stellenbosch Ward 21', '21', 'Ward in Franschhoek', 123),

-- George Wards (George - municipality_id 34)
(81, 34, 'George Ward 9', '9', 'Ward in George Central', 167),
(82, 34, 'George Ward 18', '18', 'Ward in Thembalethu', 234),

-- Overstrand Wards (Overstrand - municipality_id 35)
(83, 35, 'Overstrand Ward 5', '5', 'Ward in Hermanus', 156),
(84, 35, 'Overstrand Ward 13', '13', 'Ward in Gansbaai', 123);

-- Member Data for Gauteng and Western Cape
INSERT INTO members (id, first_name, last_name, id_number, date_of_birth, gender, email, cell_number, residential_address, ward_id, membership_number, membership_start_date, membership_expiry_date, membership_status, voter_status) VALUES
-- Johannesburg Members
(43, 'Thabo', 'Molefe', '8503125678083', '1985-03-12', 'Male', 'thabo.molefe@example.com', '0731234501', '45 Main Street, Johannesburg South', 43, 'GP-JHB-58-001', '2022-03-15', '2024-03-15', 'Active', 'Registered'),
(44, 'Lerato', 'Ndlovu', '9207084567012', '1992-07-08', 'Female', 'lerato.ndlovu@example.com', '0821234502', '78 Oak Avenue, Johannesburg North', 44, 'GP-JHB-23-001', '2021-05-20', '2023-05-20', 'Expired', 'Registered'),
(45, 'Sipho', 'Mabaso', '8611235432109', '1986-11-23', 'Male', 'sipho.mabaso@example.com', '0641234503', '12 Acacia Road, Johannesburg East', 45, 'GP-JHB-87-001', '2022-07-10', '2024-07-10', 'Active', 'Registered'),
(46, 'Nomsa', 'Khumalo', '9004157890123', '1990-04-15', 'Female', 'nomsa.khumalo@example.com', '0731234504', '34 Central Avenue, Johannesburg Central', 46, 'GP-JHB-112-001', '2021-09-05', '2023-09-05', 'Expired', 'Registered'),
(47, 'Bongani', 'Dlamini', '8708126789012', '1987-08-12', 'Male', 'bongani.dlamini@example.com', '0821234505', '56 West Street, Johannesburg West', 47, 'GP-JHB-54-001', '2022-02-15', '2024-02-15', 'Active', 'Not Registered'),
(48, 'Zanele', 'Nkosi', '9301086543210', '1993-01-08', 'Female', 'zanele.nkosi@example.com', '0641234506', '89 Soweto Main Road, Soweto', 48, 'GP-JHB-76-001', '2022-04-20', '2024-04-20', 'Active', 'Registered'),
(49, 'Mandla', 'Tshabalala', '8805156789012', '1988-05-15', 'Male', 'mandla.tshabalala@example.com', '0731234507', '23 Sandton Drive, Sandton', 49, 'GP-JHB-92-001', '2021-11-10', '2023-11-10', 'Expired', 'Registered'),
(50, 'Precious', 'Mokoena', '9109127890123', '1991-09-12', 'Female', 'precious.mokoena@example.com', '0821234508', '45 Midrand Boulevard, Midrand', 50, 'GP-JHB-105-001', '2022-06-05', '2024-06-05', 'Active', 'Registered'),

-- Tshwane Members
(51, 'Themba', 'Sithole', '8602145678083', '1986-02-14', 'Male', 'themba.sithole@example.com', '0641234509', '12 Church Street, Pretoria Central', 51, 'GP-TSH-58-001', '2021-08-15', '2023-08-15', 'Expired', 'Registered'),
(52, 'Lindiwe', 'Mahlangu', '9305084567012', '1993-05-08', 'Female', 'lindiwe.mahlangu@example.com', '0731234510', '34 Lynnwood Road, Pretoria East', 52, 'GP-TSH-82-001', '2022-10-20', '2024-10-20', 'Active', 'Registered'),
(53, 'Sifiso', 'Zwane', '8709235432109', '1987-09-23', 'Male', 'sifiso.zwane@example.com', '0821234511', '56 North Avenue, Pretoria North', 53, 'GP-TSH-44-001', '2022-01-10', '2024-01-10', 'Active', 'Not Registered'),
(54, 'Nthabiseng', 'Modise', '9102157890123', '1991-02-15', 'Female', 'nthabiseng.modise@example.com', '0641234512', '78 West Street, Pretoria West', 54, 'GP-TSH-03-001', '2021-03-05', '2023-03-05', 'Expired', 'Registered'),
(55, 'Tebogo', 'Mokgadi', '8806126789012', '1988-06-12', 'Male', 'tebogo.mokgadi@example.com', '0731234513', '23 Centurion Main Road, Centurion', 55, 'GP-TSH-92-001', '2022-05-15', '2024-05-15', 'Active', 'Registered'),
(56, 'Dikeledi', 'Mthembu', '9211086543210', '1992-11-08', 'Female', 'dikeledi.mthembu@example.com', '0821234514', '45 Mamelodi East, Mamelodi', 56, 'GP-TSH-37-001', '2022-07-20', '2024-07-20', 'Active', 'Registered'),
(57, 'Kagiso', 'Mokoena', '8704156789012', '1987-04-15', 'Male', 'kagiso.mokoena@example.com', '0641234515', '67 Atteridgeville Main Road, Atteridgeville', 57, 'GP-TSH-69-001', '2021-12-10', '2023-12-10', 'Expired', 'Not Registered'),

-- Ekurhuleni Members
(58, 'Nkosinathi', 'Mbatha', '9003125678083', '1990-03-12', 'Male', 'nkosinathi.mbatha@example.com', '0731234516', '12 Kempton Park CBD, Kempton Park', 58, 'GP-EKU-15-001', '2022-02-15', '2024-02-15', 'Active', 'Registered'),
(59, 'Nonhlanhla', 'Shabangu', '8507084567012', '1985-07-08', 'Female', 'nonhlanhla.shabangu@example.com', '0821234517', '34 Benoni Main Road, Benoni', 59, 'GP-EKU-34-001', '2021-04-20', '2023-04-20', 'Expired', 'Registered'),
(60, 'Sibusiso', 'Nhlapo', '8910235432109', '1989-10-23', 'Male', 'sibusiso.nhlapo@example.com', '0641234518', '56 Germiston CBD, Germiston', 60, 'GP-EKU-53-001', '2022-06-10', '2024-06-10', 'Active', 'Not Registered'),
(61, 'Zandile', 'Maseko', '9205157890123', '1992-05-15', 'Female', 'zandile.maseko@example.com', '0731234519', '78 Boksburg East, Boksburg', 61, 'GP-EKU-76-001', '2021-08-05', '2023-08-05', 'Expired', 'Registered'),
(62, 'Thulani', 'Radebe', '8801126789012', '1988-01-12', 'Male', 'thulani.radebe@example.com', '0821234520', '23 Springs CBD, Springs', 62, 'GP-EKU-91-001', '2022-10-15', '2024-10-15', 'Active', 'Registered'),
(63, 'Busisiwe', 'Mashaba', '9106086543210', '1991-06-08', 'Female', 'busisiwe.mashaba@example.com', '0641234521', '45 Alberton North, Alberton', 63, 'GP-EKU-103-001', '2021-12-05', '2023-12-05', 'Expired', 'Registered'),

-- Emfuleni Members
(64, 'Vusi', 'Nhlapho', '8803156789012', '1988-03-15', 'Male', 'vusi.nhlapho@example.com', '0731234522', '12 Vanderbijlpark Central, Vanderbijlpark', 64, 'GP-EMF-12-001', '2022-01-15', '2024-01-15', 'Active', 'Registered'),
(65, 'Palesa', 'Motaung', '9208084567012', '1992-08-08', 'Female', 'palesa.motaung@example.com', '0821234523', '34 Vereeniging CBD, Vereeniging', 65, 'GP-EMF-27-001', '2021-03-20', '2023-03-20', 'Expired', 'Registered'),
(66, 'Jabu', 'Vilakazi', '8712235432109', '1987-12-23', 'Male', 'jabu.vilakazi@example.com', '0641234524', '56 Sebokeng Zone 10, Sebokeng', 66, 'GP-EMF-38-001', '2022-05-10', '2024-05-10', 'Active', 'Not Registered'),

-- Mogale City Members
(67, 'Lucky', 'Mthethwa', '9004157890123', '1990-04-15', 'Male', 'lucky.mthethwa@example.com', '0731234525', '78 Krugersdorp Central, Krugersdorp', 67, 'GP-MOG-08-001', '2021-07-05', '2023-07-05', 'Expired', 'Registered'),
(68, 'Nomvula', 'Kubheka', '8809126789012', '1988-09-12', 'Female', 'nomvula.kubheka@example.com', '0821234526', '90 Kagiso Extension 12, Kagiso', 68, 'GP-MOG-19-001', '2022-09-15', '2024-09-15', 'Active', 'Registered'),

-- Cape Town Members
(69, 'John', 'van der Merwe', '8705156543210', '1987-05-15', 'Male', 'john.vandermerwe@example.com', '0641234527', '12 Long Street, Cape Town Central', 69, 'WC-CPT-57-001', '2022-11-20', '2024-11-20', 'Active', 'Registered'),
(70, 'Sarah', 'Williams', '9110086789012', '1991-10-08', 'Female', 'sarah.williams@example.com', '0731234528', '34 Durbanville Hills, Northern Suburbs', 70, 'WC-CPT-23-001', '2021-02-10', '2023-02-10', 'Expired', 'Registered'),
(71, 'Michael', 'Brown', '8802125432109', '1988-02-12', 'Male', 'michael.brown@example.com', '0821234529', '56 Claremont Main Road, Southern Suburbs', 71, 'WC-CPT-74-001', '2022-04-15', '2024-04-15', 'Active', 'Not Registered'),
(72, 'Lauren', 'Smith', '9207157890123', '1992-07-15', 'Female', 'lauren.smith@example.com', '0641234530', '78 Kuils River Main Road, Eastern Suburbs', 72, 'WC-CPT-115-001', '2021-06-05', '2023-06-05', 'Expired', 'Registered'),
(73, 'David', 'Johnson', '8811086789012', '1988-11-08', 'Male', 'david.johnson@example.com', '0731234531', '90 Sea Point Main Road, Atlantic Seaboard', 73, 'WC-CPT-83-001', '2022-08-15', '2024-08-15', 'Active', 'Registered'),
(74, 'Fatima', 'Adams', '9103126543210', '1991-03-12', 'Female', 'fatima.adams@example.com', '0821234532', '23 Mitchell\'s Plain CBD, Mitchell\'s Plain', 74, 'WC-CPT-42-001', '2021-10-20', '2023-10-20', 'Expired', 'Registered'),
(75, 'Andile', 'Mkhize', '8708156789012', '1987-08-15', 'Male', 'andile.mkhize@example.com', '0641234533', '45 Khayelitsha Site C, Khayelitsha', 75, 'WC-CPT-67-001', '2022-12-10', '2024-12-10', 'Active', 'Not Registered'),
(76, 'Emma', 'Taylor', '9201086543210', '1992-01-08', 'Female', 'emma.taylor@example.com', '0731234534', '67 Durbanville Central, Durbanville', 76, 'WC-CPT-95-001', '2021-01-05', '2023-01-05', 'Expired', 'Registered'),
(77, 'James', 'Wilson', '8806126789012', '1988-06-12', 'Male', 'james.wilson@example.com', '0821234535', '89 Table View Beach Road, Table View', 77, 'WC-CPT-103-001', '2022-03-15', '2024-03-15', 'Active', 'Registered'),

-- Stellenbosch Members
(78, 'Pieter', 'du Toit', '9109157890123', '1991-09-15', 'Male', 'pieter.dutoit@example.com', '0641234536', '12 Stellenbosch Central, Stellenbosch', 78, 'WC-STB-07-001', '2021-05-20', '2023-05-20', 'Expired', 'Registered'),
(79, 'Nosipho', 'Ndlovu', '8704086543210', '1987-04-08', 'Female', 'nosipho.ndlovu@example.com', '0731234537', '34 Kayamandi Main Road, Kayamandi', 79, 'WC-STB-15-001', '2022-07-10', '2024-07-10', 'Active', 'Not Registered'),
(80, 'Jacques', 'Fourie', '9202126789012', '1992-02-12', 'Male', 'jacques.fourie@example.com', '0821234538', '56 Franschhoek Main Road, Franschhoek', 80, 'WC-STB-21-001', '2021-09-05', '2023-09-05', 'Expired', 'Registered'),

-- George Members
(81, 'Daniel', 'Botha', '8807156543210', '1988-07-15', 'Male', 'daniel.botha@example.com', '0641234539', '78 George CBD, George Central', 81, 'WC-GEO-09-001', '2022-11-15', '2024-11-15', 'Active', 'Registered'),
(82, 'Thandiwe', 'Madiba', '9112086789012', '1991-12-08', 'Female', 'thandiwe.madiba@example.com', '0731234540', '90 Thembalethu Main Road, Thembalethu', 82, 'WC-GEO-18-001', '2021-04-20', '2023-04-20', 'Expired', 'Registered'),

-- Overstrand Members
(83, 'Willem', 'van Zyl', '8803126543210', '1988-03-12', 'Male', 'willem.vanzyl@example.com', '0821234541', '23 Hermanus Central, Hermanus', 83, 'WC-OVS-05-001', '2022-06-10', '2024-06-10', 'Active', 'Not Registered'),
(84, 'Maria', 'Visser', '9208157890123', '1992-08-15', 'Female', 'maria.visser@example.com', '0641234542', '45 Gansbaai Main Road, Gansbaai', 84, 'WC-OVS-13-001', '2021-08-05', '2023-08-05', 'Expired', 'Registered');