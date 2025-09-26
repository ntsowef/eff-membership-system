-- Geographic Hierarchy Tables for EFF Membership Management System
-- PostgreSQL Version
-- Created: 2025-01-23
-- Purpose: South African geographic hierarchy (provinces, districts, municipalities, wards, voting districts)

-- Start transaction
BEGIN;

-- 1. Provinces table
CREATE TABLE IF NOT EXISTS provinces (
  province_id SERIAL PRIMARY KEY,
  province_code VARCHAR(10) NOT NULL UNIQUE,
  province_name VARCHAR(100) NOT NULL UNIQUE,
  capital_city VARCHAR(100),
  population INTEGER,
  area_km2 DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert South African provinces
INSERT INTO provinces (province_code, province_name, capital_city) VALUES
('EC', 'Eastern Cape', 'Bhisho'),
('FS', 'Free State', 'Bloemfontein'),
('GP', 'Gauteng', 'Johannesburg'),
('KZN', 'KwaZulu-Natal', 'Pietermaritzburg'),
('LP', 'Limpopo', 'Polokwane'),
('MP', 'Mpumalanga', 'Mbombela'),
('NC', 'Northern Cape', 'Kimberley'),
('NW', 'North West', 'Mahikeng'),
('WC', 'Western Cape', 'Cape Town')
ON CONFLICT (province_code) DO NOTHING;

-- 2. Districts table
CREATE TABLE IF NOT EXISTS districts (
  district_id SERIAL PRIMARY KEY,
  district_code VARCHAR(20) NOT NULL UNIQUE,
  district_name VARCHAR(150) NOT NULL,
  province_code VARCHAR(10) NOT NULL REFERENCES provinces(province_code),
  district_type VARCHAR(20) DEFAULT 'District',
  population INTEGER,
  area_km2 DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Municipalities table
CREATE TABLE IF NOT EXISTS municipalities (
  municipality_id SERIAL PRIMARY KEY,
  municipality_code VARCHAR(20) NOT NULL UNIQUE,
  municipality_name VARCHAR(150) NOT NULL,
  district_code VARCHAR(20) NOT NULL REFERENCES districts(district_code),
  municipality_type VARCHAR(20) DEFAULT 'Local',
  population INTEGER,
  area_km2 DECIMAL(10,2),
  total_wards INTEGER DEFAULT 0,
  represented_wards INTEGER DEFAULT 0,
  is_adequately_represented BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Wards table
CREATE TABLE IF NOT EXISTS wards (
  ward_id SERIAL PRIMARY KEY,
  ward_code VARCHAR(20) NOT NULL UNIQUE,
  ward_name VARCHAR(150) NOT NULL,
  ward_number INTEGER,
  municipality_code VARCHAR(20) NOT NULL REFERENCES municipalities(municipality_code),
  population INTEGER,
  area_km2 DECIMAL(10,2),
  member_count INTEGER DEFAULT 0,
  is_in_good_standing BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Voting districts table
CREATE TABLE IF NOT EXISTS voting_districts (
  voting_district_id SERIAL PRIMARY KEY,
  voting_district_code VARCHAR(20) NOT NULL UNIQUE,
  voting_district_name VARCHAR(150) NOT NULL,
  ward_code VARCHAR(20) NOT NULL REFERENCES wards(ward_code),
  population INTEGER,
  registered_voters INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Voting stations table
CREATE TABLE IF NOT EXISTS voting_stations (
  voting_station_id SERIAL PRIMARY KEY,
  station_code VARCHAR(20) UNIQUE,
  station_name VARCHAR(200) NOT NULL,
  voting_district_code VARCHAR(20) REFERENCES voting_districts(voting_district_code),
  ward_code VARCHAR(20) NOT NULL REFERENCES wards(ward_code),
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  registered_voters INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data for testing (Rustenburg area)
-- Districts
INSERT INTO districts (district_code, district_name, province_code, district_type) VALUES
('DC37', 'Bojanala Platinum District Municipality', 'NW', 'District'),
('DC38', 'Ngaka Modiri Molema District Municipality', 'NW', 'District'),
('DC39', 'Dr Ruth Segomotsi Mompati District Municipality', 'NW', 'District'),
('DC40', 'Dr Kenneth Kaunda District Municipality', 'NW', 'District')
ON CONFLICT (district_code) DO NOTHING;

-- Municipalities
INSERT INTO municipalities (municipality_code, municipality_name, district_code, municipality_type, total_wards) VALUES
('NW372', 'Rustenburg Local Municipality', 'DC37', 'Local', 42),
('NW373', 'Kgetlengrivier Local Municipality', 'DC37', 'Local', 8),
('NW374', 'Moses Kotane Local Municipality', 'DC37', 'Local', 32),
('NW375', 'Madibeng Local Municipality', 'DC37', 'Local', 35)
ON CONFLICT (municipality_code) DO NOTHING;

-- Sample wards for Rustenburg
INSERT INTO wards (ward_code, ward_name, ward_number, municipality_code) VALUES
('29200001', 'Rustenburg Ward 1', 1, 'NW372'),
('29200002', 'Rustenburg Ward 2', 2, 'NW372'),
('29200003', 'Rustenburg Ward 3', 3, 'NW372'),
('29200004', 'Rustenburg Ward 4', 4, 'NW372'),
('29200005', 'Rustenburg Ward 5', 5, 'NW372'),
('29200006', 'Rustenburg Ward 6', 6, 'NW372'),
('29200007', 'Rustenburg Ward 7', 7, 'NW372'),
('29200008', 'Rustenburg Ward 8', 8, 'NW372'),
('29200009', 'Rustenburg Ward 9', 9, 'NW372'),
('29200010', 'Rustenburg Ward 10', 10, 'NW372')
ON CONFLICT (ward_code) DO NOTHING;

-- Sample voting districts
INSERT INTO voting_districts (voting_district_code, voting_district_name, ward_code) VALUES
('2920000101', 'Rustenburg Ward 1 VD 1', '29200001'),
('2920000102', 'Rustenburg Ward 1 VD 2', '29200001'),
('2920000201', 'Rustenburg Ward 2 VD 1', '29200002'),
('2920000202', 'Rustenburg Ward 2 VD 2', '29200002'),
('2920000501', 'Rustenburg Ward 5 VD 1', '29200005'),
('2920000502', 'Rustenburg Ward 5 VD 2', '29200005')
ON CONFLICT (voting_district_code) DO NOTHING;

-- Sample voting stations
INSERT INTO voting_stations (station_code, station_name, voting_district_code, ward_code, address) VALUES
('29200001001', 'Rustenburg Primary School', '2920000101', '29200001', 'Main Street, Rustenburg CBD'),
('29200001002', 'Community Hall Rustenburg', '2920000102', '29200001', 'Church Street, Rustenburg'),
('29200002001', 'Boitekong Primary School', '2920000201', '29200002', 'Boitekong Township'),
('29200002002', 'Boitekong Community Centre', '2920000202', '29200002', 'Boitekong Extension 1'),
('29200005001', 'Tlhabane Primary School', '2920000501', '29200005', 'Tlhabane Township'),
('29200005002', 'Tlhabane West Hall', '2920000502', '29200005', 'Tlhabane West')
ON CONFLICT (station_code) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_provinces_code ON provinces(province_code);
CREATE INDEX IF NOT EXISTS idx_provinces_active ON provinces(is_active);

CREATE INDEX IF NOT EXISTS idx_districts_code ON districts(district_code);
CREATE INDEX IF NOT EXISTS idx_districts_province ON districts(province_code);
CREATE INDEX IF NOT EXISTS idx_districts_active ON districts(is_active);

CREATE INDEX IF NOT EXISTS idx_municipalities_code ON municipalities(municipality_code);
CREATE INDEX IF NOT EXISTS idx_municipalities_district ON municipalities(district_code);
CREATE INDEX IF NOT EXISTS idx_municipalities_active ON municipalities(is_active);
CREATE INDEX IF NOT EXISTS idx_municipalities_type ON municipalities(municipality_type);

CREATE INDEX IF NOT EXISTS idx_wards_code ON wards(ward_code);
CREATE INDEX IF NOT EXISTS idx_wards_municipality ON wards(municipality_code);
CREATE INDEX IF NOT EXISTS idx_wards_number ON wards(ward_number);
CREATE INDEX IF NOT EXISTS idx_wards_active ON wards(is_active);
CREATE INDEX IF NOT EXISTS idx_wards_standing ON wards(is_in_good_standing);

CREATE INDEX IF NOT EXISTS idx_voting_districts_code ON voting_districts(voting_district_code);
CREATE INDEX IF NOT EXISTS idx_voting_districts_ward ON voting_districts(ward_code);
CREATE INDEX IF NOT EXISTS idx_voting_districts_active ON voting_districts(is_active);

CREATE INDEX IF NOT EXISTS idx_voting_stations_code ON voting_stations(station_code);
CREATE INDEX IF NOT EXISTS idx_voting_stations_district ON voting_stations(voting_district_code);
CREATE INDEX IF NOT EXISTS idx_voting_stations_ward ON voting_stations(ward_code);
CREATE INDEX IF NOT EXISTS idx_voting_stations_active ON voting_stations(is_active);

-- Create triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_provinces_updated_at BEFORE UPDATE ON provinces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON districts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_municipalities_updated_at BEFORE UPDATE ON municipalities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wards_updated_at BEFORE UPDATE ON wards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voting_districts_updated_at BEFORE UPDATE ON voting_districts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voting_stations_updated_at BEFORE UPDATE ON voting_stations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Display completion message
SELECT 'Geographic hierarchy tables created successfully!' as message;
