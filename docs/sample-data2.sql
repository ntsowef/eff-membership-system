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
(17, 5, 'Intsika Yethu', 'EC135', 'Local', 'Intsika Yethu Local Municipality in Chris Hani District'),
(18, 5, 'Emalahleni', 'EC136', 'Local', 'Emalahleni Local Municipality in Chris Hani District'),
(19, 5, 'Engcobo', 'EC137', 'Local', 'Engcobo Local Municipality in Chris Hani District'),
(20, 5, 'Sakhisizwe', 'EC138', 'Local', 'Sakhisizwe Local Municipality in Chris Hani District'),
(21, 5, 'Enoch Mgijima', 'EC139', 'Local', 'Enoch Mgijima Local Municipality in Chris Hani District'),

-- Joe Gqabi District Municipalities
(22, 6, 'Elundini', 'EC141', 'Local', 'Elundini Local Municipality in Joe Gqabi District'),
(23, 6, 'Senqu', 'EC142', 'Local', 'Senqu Local Municipality in Joe Gqabi District'),
(24, 6, 'Walter Sisulu', 'EC145', 'Local', 'Walter Sisulu Local Municipality in Joe Gqabi District'),

-- OR Tambo District Municipalities
(25, 7, 'King Sabata Dalindyebo', 'EC157', 'Local', 'King Sabata Dalindyebo Local Municipality in OR Tambo District'),
(26, 7, 'Mhlontlo', 'EC156', 'Local', 'Mhlontlo Local Municipality in OR Tambo District'),
(27, 7, 'Nyandeni', 'EC155', 'Local', 'Nyandeni Local Municipality in OR Tambo District'),
(28, 7, 'Port St Johns', 'EC154', 'Local', 'Port St Johns Local Municipality in OR Tambo District'),
(29, 7, 'Ingquza Hill', 'EC153', 'Local', 'Ingquza Hill Local Municipality in OR Tambo District'),

-- Alfred Nzo District Municipalities
(30, 8, 'Winnie Madikizela-Mandela', 'EC442', 'Local', 'Winnie Madikizela-Mandela Local Municipality in Alfred Nzo District'),
(31, 8, 'Ntabankulu', 'EC444', 'Local', 'Ntabankulu Local Municipality in Alfred Nzo District'),
(32, 8, 'Umzimvubu', 'EC441', 'Local', 'Umzimvubu Local Municipality in Alfred Nzo District'),
(33, 8, 'Matatiele', 'EC443', 'Local', 'Matatiele Local Municipality in Alfred Nzo District'),

-- Free State Municipalities
-- Mangaung Metropolitan
(34, 9, 'Mangaung', 'MAN', 'Metropolitan', 'Mangaung Metropolitan Municipality'),

-- Xhariep District Municipalities
(35, 10, 'Letsemeng', 'FS161', 'Local', 'Letsemeng Local Municipality in Xhariep District'),
(36, 10, 'Kopanong', 'FS162', 'Local', 'Kopanong Local Municipality in Xhariep District'),
(37, 10, 'Mohokare', 'FS163', 'Local', 'Mohokare Local Municipality in Xhariep District'),

-- Lejweleputswa District Municipalities
(38, 11, 'Masilonyana', 'FS181', 'Local', 'Masilonyana Local Municipality in Lejweleputswa District'),
(39, 11, 'Tokologo', 'FS182', 'Local', 'Tokologo Local Municipality in Lejweleputswa District'),
(40, 11, 'Tswelopele', 'FS183', 'Local', 'Tswelopele Local Municipality in Lejweleputswa District'),
(41, 11, 'Matjhabeng', 'FS184', 'Local', 'Matjhabeng Local Municipality in Lejweleputswa District'),
(42, 11, 'Nala', 'FS185', 'Local', 'Nala Local Municipality in Lejweleputswa District'),

-- Thabo Mofutsanyana District Municipalities
(43, 12, 'Setsoto', 'FS191', 'Local', 'Setsoto Local Municipality in Thabo Mofutsanyana District'),
(44, 12, 'Dihlabeng', 'FS192', 'Local', 'Dihlabeng Local Municipality in Thabo Mofutsanyana District'),
(45, 12, 'Nketoana', 'FS193', 'Local', 'Nketoana Local Municipality in Thabo Mofutsanyana District'),
(46, 12, 'Maluti-a-Phofung', 'FS194', 'Local', 'Maluti-a-Phofung Local Municipality in Thabo Mofutsanyana District'),
(47, 12, 'Phumelela', 'FS195', 'Local', 'Phumelela Local Municipality in Thabo Mofutsanyana District'),
(48, 12, 'Mantsopa', 'FS196', 'Local', 'Mantsopa Local Municipality in Thabo Mofutsanyana District'),

-- Fezile Dabi District Municipalities
(49, 13, 'Moqhaka', 'FS201', 'Local', 'Moqhaka Local Municipality in Fezile Dabi District'),
(50, 13, 'Ngwathe', 'FS203', 'Local', 'Ngwathe Local Municipality in Fezile Dabi District'),
(51, 13, 'Metsimaholo', 'FS204', 'Local', 'Metsimaholo Local Municipality in Fezile Dabi District'),
(52, 13, 'Mafube', 'FS205', 'Local', 'Mafube Local Municipality in Fezile Dabi District'),

-- Gauteng Municipalities
-- City of Johannesburg Metropolitan
(53, 14, 'City of Johannesburg', 'JHB', 'Metropolitan', 'City of Johannesburg Metropolitan Municipality'),

-- City of Tshwane Metropolitan
(54, 15, 'City of Tshwane', 'TSH', 'Metropolitan', 'City of Tshwane Metropolitan Municipality'),

-- Ekurhuleni Metropolitan
(55, 16, 'Ekurhuleni', 'EKU', 'Metropolitan', 'Ekurhuleni Metropolitan Municipality'),

-- Sedibeng District Municipalities
(56, 17, 'Emfuleni', 'GT421', 'Local', 'Emfuleni Local Municipality in Sedibeng District'),
(57, 17, 'Midvaal', 'GT422', 'Local', 'Midvaal Local Municipality in Sedibeng District'),
(58, 17, 'Lesedi', 'GT423', 'Local', 'Lesedi Local Municipality in Sedibeng District'),

-- West Rand District Municipalities
(59, 18, 'Mogale City', 'GT481', 'Local', 'Mogale City Local Municipality in West Rand District'),
(60, 18, 'Rand West City', 'GT485', 'Local', 'Rand West City Local Municipality in West Rand District'),
(61, 18, 'Merafong City', 'GT484', 'Local', 'Merafong City Local Municipality in West Rand District'),

-- KwaZulu-Natal Municipalities
-- eThekwini Metropolitan
(62, 19, 'eThekwini', 'ETH', 'Metropolitan', 'eThekwini Metropolitan Municipality'),

-- uMgungundlovu District Municipalities
(63, 20, 'uMshwathi', 'KZN221', 'Local', 'uMshwathi Local Municipality in uMgungundlovu District'),
(64, 20, 'uMngeni', 'KZN222', 'Local', 'uMngeni Local Municipality in uMgungundlovu District'),
(65, 20, 'Mpofana', 'KZN223', 'Local', 'Mpofana Local Municipality in uMgungundlovu District'),
(66, 20, 'Impendle', 'KZN224', 'Local', 'Impendle Local Municipality in uMgungundlovu District'),
(67, 20, 'Msunduzi', 'KZN225', 'Local', 'Msunduzi Local Municipality in uMgungundlovu District'),
(68, 20, 'Mkhambathini', 'KZN226', 'Local', 'Mkhambathini Local Municipality in uMgungundlovu District'),
(69, 20, 'Richmond', 'KZN227', 'Local', 'Richmond Local Municipality in uMgungundlovu District'),

-- Ugu District Municipalities
(70, 21, 'Ray Nkonyeni', 'KZN216', 'Local', 'Ray Nkonyeni Local Municipality in Ugu District'),
(71, 21, 'Umdoni', 'KZN212', 'Local', 'Umdoni Local Municipality in Ugu District'),
(72, 21, 'Umzumbe', 'KZN213', 'Local', 'Umzumbe Local Municipality in Ugu District'),
(73, 21, 'uMuziwabantu', 'KZN214', 'Local', 'uMuziwabantu Local Municipality in Ugu District'),

-- King Cetshwayo District Municipalities
(74, 22, 'uMfolozi', 'KZN281', 'Local', 'uMfolozi Local Municipality in King Cetshwayo District'),
(75, 22, 'uMhlathuze', 'KZN282', 'Local', 'uMhlathuze Local Municipality in King Cetshwayo District'),
(76, 22, 'uMlalazi', 'KZN284', 'Local', 'uMlalazi Local Municipality in King Cetshwayo District'),
(77, 22, 'Mthonjaneni', 'KZN285', 'Local', 'Mthonjaneni Local Municipality in King Cetshwayo District'),
(78, 22, 'Nkandla', 'KZN286', 'Local', 'Nkandla Local Municipality in King Cetshwayo District'),

-- uMkhanyakude District Municipalities
(79, 23, 'Umhlabuyalingana', 'KZN271', 'Local', 'Umhlabuyalingana Local Municipality in uMkhanyakude District'),
(80, 23, 'Jozini', 'KZN272', 'Local', 'Jozini Local Municipality in uMkhanyakude District'),
(81, 23, 'Mtubatuba', 'KZN275', 'Local', 'Mtubatuba Local Municipality in uMkhanyakude District'),
(82, 23, 'Big Five Hlabisa', 'KZN276', 'Local', 'Big Five Hlabisa Local Municipality in uMkhanyakude District'),

-- Zululand District Municipalities
(83, 24, 'eDumbe', 'KZN261', 'Local', 'eDumbe Local Municipality in Zululand District'),
(84, 24, 'uPhongolo', 'KZN262', 'Local', 'uPhongolo Local Municipality in Zululand District'),
(85, 24, 'Abaqulusi', 'KZN263', 'Local', 'Abaqulusi Local Municipality in Zululand District'),
(86, 24, 'Nongoma', 'KZN265', 'Local', 'Nongoma Local Municipality in Zululand District'),
(87, 24, 'Ulundi', 'KZN266', 'Local', 'Ulundi Local Municipality in Zululand District'),

-- Amajuba District Municipalities
(88, 25, 'Newcastle', 'KZN252', 'Local', 'Newcastle Local Municipality in Amajuba District'),
(89, 25, 'Emadlangeni', 'KZN253', 'Local', 'Emadlangeni Local Municipality in Amajuba District'),
(90, 25, 'Dannhauser', 'KZN254', 'Local', 'Dannhauser Local Municipality in Amajuba District'),

-- Harry Gwala District Municipalities
(91, 26, 'Dr Nkosazana Dlamini Zuma', 'KZN436', 'Local', 'Dr Nkosazana Dlamini Zuma Local Municipality in Harry Gwala District'),
(92, 26, 'Greater Kokstad', 'KZN433', 'Local', 'Greater Kokstad Local Municipality in Harry Gwala District'),
(93, 26, 'Ubuhlebezwe', 'KZN434', 'Local', 'Ubuhlebezwe Local Municipality in Harry Gwala District'),
(94, 26, 'Umzimkhulu', 'KZN435', 'Local', 'Umzimkhulu Local Municipality in Harry Gwala District'),

-- iLembe District Municipalities
(95, 27, 'KwaDukuza', 'KZN292', 'Local', 'KwaDukuza Local Municipality in iLembe District'),
(96, 27, 'Mandeni', 'KZN291', 'Local', 'Mandeni Local Municipality in iLembe District'),
(97, 27, 'Maphumulo', 'KZN294', 'Local', 'Maphumulo Local Municipality in iLembe District'),
(98, 27, 'Ndwedwe', 'KZN293', 'Local', 'Ndwedwe Local Municipality in iLembe District'),

-- uMzinyathi District Municipalities
(99, 28, 'Endumeni', 'KZN241', 'Local', 'Endumeni Local Municipality in uMzinyathi District'),
(100, 28, 'Msinga', 'KZN244', 'Local', 'Msinga Local Municipality in uMzinyathi District'),
(101, 28, 'Nquthu', 'KZN242', 'Local', 'Nquthu Local Municipality in uMzinyathi District'),
(102, 28, 'Umvoti', 'KZN245', 'Local', 'Umvoti Local Municipality in uMzinyathi District'),

-- uThukela District Municipalities
(103, 29, 'Alfred Duma', 'KZN238', 'Local', 'Alfred Duma Local Municipality in uThukela District'),
(104, 29, 'Inkosi Langalibalele', 'KZN237', 'Local', 'Inkosi Langalibalele Local Municipality in uThukela District'),
(105, 29, 'Okhahlamba', 'KZN235', 'Local', 'Okhahlamba Local Municipality in uThukela District'),

-- Limpopo Municipalities
-- Capricorn District Municipalities
(106, 30, 'Blouberg', 'LIM351', 'Local', 'Blouberg Local Municipality in Capricorn District'),
(107, 30, 'Lepelle-Nkumpi', 'LIM355', 'Local', 'Lepelle-Nkumpi Local Municipality in Capricorn District'),
(108, 30, 'Molemole', 'LIM353', 'Local', 'Molemole Local Municipality in Capricorn District'),
(109, 30, 'Polokwane', 'LIM354', 'Local', 'Polokwane Local Municipality in Capricorn District'),

-- Mopani District Municipalities
(110, 31, 'Ba-Phalaborwa', 'LIM334', 'Local', 'Ba-Phalaborwa Local Municipality in Mopani District'),
(111, 31, 'Greater Giyani', 'LIM331', 'Local', 'Greater Giyani Local Municipality in Mopani District'),
(112, 31, 'Greater Letaba', 'LIM332', 'Local', 'Greater Letaba Local Municipality in Mopani District'),
(113, 31, 'Greater Tzaneen', 'LIM333', 'Local', 'Greater Tzaneen Local Municipality in Mopani District'),
(114, 31, 'Maruleng', 'LIM335', 'Local', 'Maruleng Local Municipality in Mopani District'),

-- Sekhukhune District Municipalities
(115, 32, 'Elias Motsoaledi', 'LIM472', 'Local', 'Elias Motsoaledi Local Municipality in Sekhukhune District'),
(116, 32, 'Ephraim Mogale', 'LIM471', 'Local', 'Ephraim Mogale Local Municipality in Sekhukhune District'),
(117, 32, 'Fetakgomo Tubatse', 'LIM476', 'Local', 'Fetakgomo Tubatse Local Municipality in Sekhukhune District'),
(118, 32, 'Makhuduthamaga', 'LIM473', 'Local', 'Makhuduthamaga Local Municipality in Sekhukhune District'),

-- Vhembe District Municipalities
(119, 33, 'Collins Chabane', 'LIM345', 'Local', 'Collins Chabane Local Municipality in Vhembe District'),
(120, 33, 'Makhado', 'LIM344', 'Local', 'Makhado Local Municipality in Vhembe District'),
(121, 33, 'Musina', 'LIM341', 'Local', 'Musina Local Municipality in Vhembe District'),
(122, 33, 'Thulamela', 'LIM343', 'Local', 'Thulamela Local Municipality in Vhembe District'),

-- Waterberg District Municipalities
(123, 34, 'Bela-Bela', 'LIM366', 'Local', 'Bela-Bela Local Municipality in Waterberg District'),
(124, 34, 'Lephalale', 'LIM362', 'Local', 'Lephalale Local Municipality in Waterberg District'),
(125, 34, 'Modimolle-Mookgophong', 'LIM368', 'Local', 'Modimolle-Mookgophong Local Municipality in Waterberg District'),
(126, 34, 'Mogalakwena', 'LIM367', 'Local', 'Mogalakwena Local Municipality in Waterberg District'),
(127, 34, 'Thabazimbi', 'LIM361', 'Local', 'Thabazimbi Local Municipality in Waterberg District'),

-- Mpumalanga Municipalities
-- Ehlanzeni District Municipalities
(128, 35, 'Bushbuckridge', 'MP325', 'Local', 'Bushbuckridge Local Municipality in Ehlanzeni District'),
(129, 35, 'City of Mbombela', 'MP326', 'Local', 'City of Mbombela Local Municipality in Ehlanzeni District'),
(130, 35, 'Nkomazi', 'MP324', 'Local', 'Nkomazi Local Municipality in Ehlanzeni District'),
(131, 35, 'Thaba Chweu', 'MP321', 'Local', 'Thaba Chweu Local Municipality in Ehlanzeni District'),

-- Gert Sibande District Municipalities
(132, 36, 'Chief Albert Luthuli', 'MP301', 'Local', 'Chief Albert Luthuli Local Municipality in Gert Sibande District'),
(133, 36, 'Dipaleseng', 'MP306', 'Local', 'Dipaleseng Local Municipality in Gert Sibande District'),
(134, 36, 'Dr Pixley Ka Isaka Seme', 'MP304', 'Local', 'Dr Pixley Ka Isaka Seme Local Municipality in Gert Sibande District'),
(135, 36, 'Govan Mbeki', 'MP307', 'Local', 'Govan Mbeki Local Municipality in Gert Sibande District'),
(136, 36, 'Lekwa', 'MP305', 'Local', 'Lekwa Local Municipality in Gert Sibande District'),
(137, 36, 'Mkhondo', 'MP303', 'Local', 'Mkhondo Local Municipality in Gert Sibande District'),
(138, 36, 'Msukaligwa', 'MP302', 'Local', 'Msukaligwa Local Municipality in Gert Sibande District'),

-- Nkangala District Municipalities
(139, 37, 'Dr JS Moroka', 'MP316', 'Local', 'Dr JS Moroka Local Municipality in Nkangala District'),
(140, 37, 'Emakhazeni', 'MP314', 'Local', 'Emakhazeni Local Municipality in Nkangala District'),
(141, 37, 'Emalahleni', 'MP312', 'Local', 'Emalahleni Local Municipality in Nkangala District'),
(142, 37, 'Steve Tshwete', 'MP313', 'Local', 'Steve Tshwete Local Municipality in Nkangala District'),
(143, 37, 'Thembisile Hani', 'MP315', 'Local', 'Thembisile Hani Local Municipality in Nkangala District'),
(144, 37, 'Victor Khanye', 'MP311', 'Local', 'Victor Khanye Local Municipality in Nkangala District'),

-- Northern Cape Municipalities
-- Frances Baard District Municipalities
(145, 38, 'Dikgatlong', 'NC092', 'Local', 'Dikgatlong Local Municipality in Frances Baard District'),
(146, 38, 'Magareng', 'NC093', 'Local', 'Magareng Local Municipality in Frances Baard District'),
(147, 38, 'Phokwane', 'NC094', 'Local', 'Phokwane Local Municipality in Frances Baard District'),
(148, 38, 'Sol Plaatje', 'NC091', 'Local', 'Sol Plaatje Local Municipality in Frances Baard District'),

-- John Taolo Gaetsewe District Municipalities
(149, 39, 'Ga-Segonyana', 'NC452', 'Local', 'Ga-Segonyana Local Municipality in John Taolo Gaetsewe District'),
(150, 39, 'Gamagara', 'NC453', 'Local', 'Gamagara Local Municipality in John Taolo Gaetsewe District'),
(151, 39, 'Joe Morolong', 'NC451', 'Local', 'Joe Morolong Local Municipality in John Taolo Gaetsewe District'),

-- Namakwa District Municipalities
(152, 40, 'Hantam', 'NC065', 'Local', 'Hantam Local Municipality in Namakwa District'),
(153, 40, 'Kamiesberg', 'NC064', 'Local', 'Kamiesberg Local Municipality in Namakwa District'),
(154, 40, 'Karoo Hoogland', 'NC066', 'Local', 'Karoo Hoogland Local Municipality in Namakwa District'),
(155, 40, 'Khai-Ma', 'NC067', 'Local', 'Khai-Ma Local Municipality in Namakwa District'),
(156, 40, 'Nama Khoi', 'NC062', 'Local', 'Nama Khoi Local Municipality in Namakwa District'),
(157, 40, 'Richtersveld', 'NC061', 'Local', 'Richtersveld Local Municipality in Namakwa District'),

-- Pixley ka Seme District Municipalities
(158, 41, 'Emthanjeni', 'NC073', 'Local', 'Emthanjeni Local Municipality in Pixley ka Seme District'),
(159, 41, 'Kareeberg', 'NC074', 'Local', 'Kareeberg Local Municipality in Pixley ka Seme District'),
(160, 41, 'Renosterberg', 'NC075', 'Local', 'Renosterberg Local Municipality in Pixley ka Seme District'),
(161, 41, 'Siyancuma', 'NC078', 'Local', 'Siyancuma Local Municipality in Pixley ka Seme District'),
(162, 41, 'Siyathemba', 'NC077', 'Local', 'Siyathemba Local Municipality in Pixley ka Seme District'),
(163, 41, 'Thembelihle', 'NC076', 'Local', 'Thembelihle Local Municipality in Pixley ka Seme District'),
(164, 41, 'Ubuntu', 'NC071', 'Local', 'Ubuntu Local Municipality in Pixley ka Seme District'),
(165, 41, 'Umsobomvu', 'NC072', 'Local', 'Umsobomvu Local Municipality in Pixley ka Seme District'),

-- ZF Mgcawu District Municipalities
(166, 42, '!Kheis', 'NC084', 'Local', '!Kheis Local Municipality in ZF Mgcawu District'),
(167, 42, 'Dawid Kruiper', 'NC087', 'Local', 'Dawid Kruiper Local Municipality in ZF Mgcawu District'),
(168, 42, 'Kai !Garib', 'NC082', 'Local', 'Kai !Garib Local Municipality in ZF Mgcawu District'),
(169, 42, 'Kgatelopele', 'NC086', 'Local', 'Kgatelopele Local Municipality in ZF Mgcawu District'),
(170, 42, 'Tsantsabane', 'NC085', 'Local', 'Tsantsabane Local Municipality in ZF Mgcawu District'),

-- North West Municipalities
-- Bojanala Platinum District Municipalities
(171, 43, 'Kgetlengrivier', 'NW374', 'Local', 'Kgetlengrivier Local Municipality in Bojanala Platinum District'),
(172, 43, 'Madibeng', 'NW372', 'Local', 'Madibeng Local Municipality in Bojanala Platinum District'),
(173, 43, 'Moretele', 'NW371', 'Local', 'Moretele Local Municipality in Bojanala Platinum District'),
(174, 43, 'Moses Kotane', 'NW375', 'Local', 'Moses Kotane Local Municipality in Bojanala Platinum District'),
(175, 43, 'Rustenburg', 'NW373', 'Local', 'Rustenburg Local Municipality in Bojanala Platinum District'),

-- Dr Kenneth Kaunda District Municipalities
(176, 44, 'City of Matlosana', 'NW403', 'Local', 'City of Matlosana Local Municipality in Dr Kenneth Kaunda District'),
(177, 44, 'JB Marks', 'NW405', 'Local', 'JB Marks Local Municipality in Dr Kenneth Kaunda District'),
(178, 44, 'Maquassi Hills', 'NW404', 'Local', 'Maquassi Hills Local Municipality in Dr Kenneth Kaunda District'),

-- Dr Ruth Segomotsi Mompati District Municipalities
(179, 45, 'Greater Taung', 'NW394', 'Local', 'Greater Taung Local Municipality in Dr Ruth Segomotsi Mompati District'),
(180, 45, 'Kagisano-Molopo', 'NW397', 'Local', 'Kagisano-Molopo Local Municipality in Dr Ruth Segomotsi Mompati District'),
(181, 45, 'Lekwa-Teemane', 'NW396', 'Local', 'Lekwa-Teemane Local Municipality in Dr Ruth Segomotsi Mompati District'),
(182, 45, 'Mamusa', 'NW393', 'Local', 'Mamusa Local Municipality in Dr Ruth Segomotsi Mompati District'),
(183, 45, 'Naledi', 'NW392', 'Local', 'Naledi Local Municipality in Dr Ruth Segomotsi Mompati District'),

-- Ngaka Modiri Molema District Municipalities
(184, 46, 'Ditsobotla', 'NW384', 'Local', 'Ditsobotla Local Municipality in Ngaka Modiri Molema District'),
(185, 46, 'Mahikeng', 'NW383', 'Local', 'Mahikeng Local Municipality in Ngaka Modiri Molema District'),
(186, 46, 'Ramotshere Moiloa', 'NW385', 'Local', 'Ramotshere Moiloa Local Municipality in Ngaka Modiri Molema District'),
(187, 46, 'Ratlou', 'NW381', 'Local', 'Ratlou Local Municipality in Ngaka Modiri Molema District'),
(188, 46, 'Tswaing', 'NW382', 'Local', 'Tswaing Local Municipality in Ngaka Modiri Molema District'),

-- Western Cape Municipalities
-- City of Cape Town Metropolitan
(189, 47, 'City of Cape Town', 'CPT', 'Metropolitan', 'City of Cape Town Metropolitan Municipality'),

-- Cape Winelands District Municipalities
(190, 48, 'Breede Valley', 'WC025', 'Local', 'Breede Valley Local Municipality in Cape Winelands District'),
(191, 48, 'Drakenstein', 'WC023', 'Local', 'Drakenstein Local Municipality in Cape Winelands District'),
(192, 48, 'Langeberg', 'WC026', 'Local', 'Langeberg Local Municipality in Cape Winelands District'),
(193, 48, 'Stellenbosch', 'WC024', 'Local', 'Stellenbosch Local Municipality in Cape Winelands District'),
(194, 48, 'Witzenberg', 'WC022', 'Local', 'Witzenberg Local Municipality in Cape Winelands District'),

-- Central Karoo District Municipalities
(195, 49, 'Beaufort West', 'WC053', 'Local', 'Beaufort West Local Municipality in Central Karoo District'),
(196, 49, 'Laingsburg', 'WC051', 'Local', 'Laingsburg Local Municipality in Central Karoo District'),
(197, 49, 'Prince Albert', 'WC052', 'Local', 'Prince Albert Local Municipality in Central Karoo District'),

-- Garden Route District Municipalities
(198, 50, 'Bitou', 'WC047', 'Local', 'Bitou Local Municipality in Garden Route District'),
(199, 50, 'George', 'WC044', 'Local', 'George Local Municipality in Garden Route District'),
(200, 50, 'Hessequa', 'WC042', 'Local', 'Hessequa Local Municipality in Garden Route District'),
(201, 50, 'Kannaland', 'WC041', 'Local', 'Kannaland Local Municipality in Garden Route District'),
(202, 50, 'Knysna', 'WC048', 'Local', 'Knysna Local Municipality in Garden Route District'),
(203, 50, 'Mossel Bay', 'WC043', 'Local', 'Mossel Bay Local Municipality in Garden Route District'),
(204, 50, 'Oudtshoorn', 'WC045', 'Local', 'Oudtshoorn Local Municipality in Garden Route District'),

-- Overberg District Municipalities
(205, 51, 'Cape Agulhas', 'WC033', 'Local', 'Cape Agulhas Local Municipality in Overberg District'),
(206, 51, 'Overstrand', 'WC032', 'Local', 'Overstrand Local Municipality in Overberg District'),
(207, 51, 'Swellendam', 'WC034', 'Local', 'Swellendam Local Municipality in Overberg District'),
(208, 51, 'Theewaterskloof', 'WC031', 'Local', 'Theewaterskloof Local Municipality in Overberg District'),

-- West Coast District Municipalities
(209, 52, 'Bergrivier', 'WC013', 'Local', 'Bergrivier Local Municipality in West Coast District'),
(210, 52, 'Cederberg', 'WC012', 'Local', 'Cederberg Local Municipality in West Coast District'),
(211, 52, 'Matzikama', 'WC011', 'Local', 'Matzikama Local Municipality in West Coast District'),
(212, 52, 'Saldanha Bay', 'WC014', 'Local', 'Saldanha Bay Local Municipality in West Coast District'),
(213, 52, 'Swartland', 'WC015', 'Local', 'Swartland Local Municipality in West Coast District');