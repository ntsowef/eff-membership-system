/**
 * Export IEC Municipality Mappings to SQL - Matches actual table structure
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function exportMappings() {
  try {
    // Get all data with actual column names
    const data = await prisma.$queryRaw`
      SELECT id, municipality_code, municipality_name, province_code,
             iec_municipality_id, iec_municipality_name, iec_province_id,
             is_active, district_code
      FROM iec_municipality_mappings
      ORDER BY id
    ` as any[];

    console.log(`-- ============================================================================`);
    console.log(`-- IEC Municipality Mappings - Production SQL Script`);
    console.log(`-- Generated: ${new Date().toISOString()}`);
    console.log(`-- Total records: ${data.length}`);
    console.log(`-- ============================================================================\n`);

    console.log(`-- Create table
CREATE TABLE IF NOT EXISTS iec_municipality_mappings (
    id SERIAL PRIMARY KEY,
    municipality_code VARCHAR(10) NOT NULL,
    municipality_name VARCHAR(255) NOT NULL,
    province_code VARCHAR(5) NOT NULL,
    iec_municipality_id VARCHAR(10) NOT NULL,
    iec_municipality_name VARCHAR(255) NOT NULL,
    iec_province_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    district_code VARCHAR(10)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_iec_muni_map_iec_id ON iec_municipality_mappings(iec_municipality_id);
CREATE INDEX IF NOT EXISTS idx_iec_muni_map_muni_code ON iec_municipality_mappings(municipality_code);
CREATE INDEX IF NOT EXISTS idx_iec_muni_map_district ON iec_municipality_mappings(district_code);
CREATE INDEX IF NOT EXISTS idx_iec_muni_map_province ON iec_municipality_mappings(province_code);

-- Clear existing data and insert fresh
TRUNCATE TABLE iec_municipality_mappings RESTART IDENTITY;

-- Insert data
INSERT INTO iec_municipality_mappings (id, municipality_code, municipality_name, province_code, iec_municipality_id, iec_municipality_name, iec_province_id, is_active, district_code)
VALUES`);

    data.forEach((row: any, index: number) => {
      const isLast = index === data.length - 1;
      const muniName = row.municipality_name ? `'${row.municipality_name.replace(/'/g, "''")}'` : 'NULL';
      const iecMuniName = row.iec_municipality_name ? `'${row.iec_municipality_name.replace(/'/g, "''")}'` : 'NULL';
      const districtCode = row.district_code ? `'${row.district_code}'` : 'NULL';
      const isActive = row.is_active === null ? 'true' : row.is_active;
      console.log(`    (${row.id}, '${row.municipality_code}', ${muniName}, '${row.province_code}', '${row.iec_municipality_id}', ${iecMuniName}, ${row.iec_province_id}, ${isActive}, ${districtCode})${isLast ? ';' : ','}`);
    });

    console.log(`
-- Reset sequence to max id
SELECT setval('iec_municipality_mappings_id_seq', (SELECT MAX(id) FROM iec_municipality_mappings));

-- Verify insertion
SELECT COUNT(*) as total_mappings FROM iec_municipality_mappings;
SELECT province_code, COUNT(*) as count FROM iec_municipality_mappings GROUP BY province_code ORDER BY province_code;
`);

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

exportMappings();

