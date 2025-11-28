-- =====================================================================================
-- INSERT SIMPLE TEST MEMBERS FOR RENEWAL TESTING
-- =====================================================================================

BEGIN;

-- Insert 10 test members with proper geographic data
INSERT INTO members (
    firstname, surname, id_number, cell_number, email, date_of_birth,
    gender_id, race_id, language_id, ward_code, voting_district_code, voter_district_code,
    province_code, province_name, district_code, district_name, municipality_code, municipality_name
) VALUES
('Thabo', 'Mbeki', '8001015800080', '0821234567', 'thabo.mbeki@test.com', '1980-01-01', 1, 1, 1, '93805001', '93805001', '93805001', 'GP', 'Gauteng', '938', 'City of Johannesburg', '93805', 'Johannesburg Sub-Region 5'),
('Nomsa', 'Dlamini', '8502025800081', '0821234568', 'nomsa.dlamini@test.com', '1985-02-02', 2, 1, 2, '93805002', '93805002', '93805002', 'GP', 'Gauteng', '938', 'City of Johannesburg', '93805', 'Johannesburg Sub-Region 5'),
('Sipho', 'Khumalo', '9003035800082', '0821234569', 'sipho.khumalo@test.com', '1990-03-03', 1, 1, 3, '93805003', '93805003', '93805003', 'GP', 'Gauteng', '938', 'City of Johannesburg', '93805', 'Johannesburg Sub-Region 5'),
('Zanele', 'Mthembu', '9504045800083', '0821234570', 'zanele.mthembu@test.com', '1995-04-04', 2, 1, 1, '93805004', '93805004', '93805004', 'GP', 'Gauteng', '938', 'City of Johannesburg', '93805', 'Johannesburg Sub-Region 5'),
('Mandla', 'Ndlovu', '8805055800084', '0821234571', 'mandla.ndlovu@test.com', '1988-05-05', 1, 1, 2, '93805005', '93805005', '93805005', 'GP', 'Gauteng', '938', 'City of Johannesburg', '93805', 'Johannesburg Sub-Region 5'),
('Lerato', 'Mokoena', '9206065800085', '0821234572', 'lerato.mokoena@test.com', '1992-06-06', 2, 1, 3, '93805006', '93805006', '93805006', 'GP', 'Gauteng', '938', 'City of Johannesburg', '93805', 'Johannesburg Sub-Region 5'),
('Bongani', 'Zulu', '8707075800086', '0821234573', 'bongani.zulu@test.com', '1987-07-07', 1, 1, 2, '93805007', '93805007', '93805007', 'GP', 'Gauteng', '938', 'City of Johannesburg', '93805', 'Johannesburg Sub-Region 5'),
('Thandi', 'Sithole', '9408085800087', '0821234574', 'thandi.sithole@test.com', '1994-08-08', 2, 1, 1, '93805008', '93805008', '93805008', 'GP', 'Gauteng', '938', 'City of Johannesburg', '93805', 'Johannesburg Sub-Region 5'),
('Sello', 'Molefe', '8909095800088', '0821234575', 'sello.molefe@test.com', '1989-09-09', 1, 1, 3, '93805009', '93805009', '93805009', 'GP', 'Gauteng', '938', 'City of Johannesburg', '93805', 'Johannesburg Sub-Region 5'),
('Nandi', 'Cele', '9110105800089', '0821234576', 'nandi.cele@test.com', '1991-10-10', 2, 1, 2, '93805010', '93805010', '93805010', 'GP', 'Gauteng', '938', 'City of Johannesburg', '93805', 'Johannesburg Sub-Region 5');

COMMIT;

-- Verify
SELECT member_id, firstname, surname, id_number, province_code, ward_code FROM members WHERE id_number LIKE '80%' OR id_number LIKE '85%' OR id_number LIKE '90%' OR id_number LIKE '95%' OR id_number LIKE '88%' OR id_number LIKE '92%' OR id_number LIKE '87%' OR id_number LIKE '94%' OR id_number LIKE '89%' OR id_number LIKE '91%' ORDER BY id_number;

