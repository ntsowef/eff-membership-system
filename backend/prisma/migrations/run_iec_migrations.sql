-- IEC Mapping Tables Migration Script
-- Date: 2025-10-21
-- Purpose: Create IEC mapping tables and ballot results table
-- 
-- This script will:
-- 6. Create iec_province_mappings table (with default data)
-- 7. Create iec_municipality_mappings table
-- 8. Create iec_ward_mappings table
-- 9. Create iec_lge_ballot_results table
--
-- Usage:
--   psql -h localhost -U eff_admin -d eff_membership_db -f run_iec_migrations.sql
--
-- Or from within psql:
--   \i backend/prisma/migrations/run_iec_migrations.sql

BEGIN;

-- ============================================================================
-- MIGRATION 006: Create iec_province_mappings table
-- ============================================================================
\echo '>>> Running Migration 006: Create iec_province_mappings table'

CREATE TABLE IF NOT EXISTS iec_province_mappings (
    id SERIAL PRIMARY KEY,
    province_code VARCHAR(10) UNIQUE NOT NULL,
    province_name VARCHAR(255) NOT NULL,
    iec_province_id INT NOT NULL,
    iec_province_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_iec_province_mappings_province_code ON iec_province_mappings(province_code);
CREATE INDEX IF NOT EXISTS idx_iec_province_mappings_iec_province_id ON iec_province_mappings(iec_province_id);
CREATE INDEX IF NOT EXISTS idx_iec_province_mappings_is_active ON iec_province_mappings(is_active);

-- Insert default province mappings
INSERT INTO iec_province_mappings (province_code, province_name, iec_province_id, iec_province_name, is_active)
VALUES
    ('EC', 'Eastern Cape', 1, 'Eastern Cape', TRUE),
    ('FS', 'Free State', 2, 'Free State', TRUE),
    ('GP', 'Gauteng', 3, 'Gauteng', TRUE),
    ('KZN', 'KwaZulu-Natal', 4, 'KwaZulu-Natal', TRUE),
    ('LP', 'Limpopo', 5, 'Limpopo', TRUE),
    ('MP', 'Mpumalanga', 6, 'Mpumalanga', TRUE),
    ('NC', 'Northern Cape', 7, 'Northern Cape', TRUE),
    ('NW', 'North West', 8, 'North West', TRUE),
    ('WC', 'Western Cape', 9, 'Western Cape', TRUE)
ON CONFLICT (province_code) DO NOTHING;

\echo '>>> Migration 006 completed'

-- ============================================================================
-- MIGRATION 007: Create iec_municipality_mappings table
-- ============================================================================
\echo '>>> Running Migration 007: Create iec_municipality_mappings table'

CREATE TABLE IF NOT EXISTS iec_municipality_mappings (
    id SERIAL PRIMARY KEY,
    municipality_code VARCHAR(20) UNIQUE NOT NULL,
    municipality_name VARCHAR(255) NOT NULL,
    province_code VARCHAR(10) NOT NULL,
    iec_municipality_id VARCHAR(50) NOT NULL,
    iec_municipality_name VARCHAR(255) NOT NULL,
    iec_province_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_iec_municipality_mappings_province 
        FOREIGN KEY (province_code) 
        REFERENCES iec_province_mappings(province_code) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_iec_municipality_mappings_municipality_code ON iec_municipality_mappings(municipality_code);
CREATE INDEX IF NOT EXISTS idx_iec_municipality_mappings_province_code ON iec_municipality_mappings(province_code);
CREATE INDEX IF NOT EXISTS idx_iec_municipality_mappings_iec_municipality_id ON iec_municipality_mappings(iec_municipality_id);
CREATE INDEX IF NOT EXISTS idx_iec_municipality_mappings_iec_province_id ON iec_municipality_mappings(iec_province_id);
CREATE INDEX IF NOT EXISTS idx_iec_municipality_mappings_is_active ON iec_municipality_mappings(is_active);

\echo '>>> Migration 007 completed'

-- ============================================================================
-- MIGRATION 008: Create iec_ward_mappings table
-- ============================================================================
\echo '>>> Running Migration 008: Create iec_ward_mappings table'

CREATE TABLE IF NOT EXISTS iec_ward_mappings (
    id SERIAL PRIMARY KEY,
    ward_code VARCHAR(20) UNIQUE NOT NULL,
    ward_name VARCHAR(255) NOT NULL,
    ward_number INT NOT NULL,
    municipality_code VARCHAR(20) NOT NULL,
    province_code VARCHAR(10) NOT NULL,
    iec_ward_id VARCHAR(50) NOT NULL,
    iec_ward_name VARCHAR(255) NOT NULL,
    iec_municipality_id VARCHAR(50) NOT NULL,
    iec_province_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_iec_ward_mappings_municipality 
        FOREIGN KEY (municipality_code) 
        REFERENCES iec_municipality_mappings(municipality_code) 
        ON DELETE CASCADE,
    CONSTRAINT fk_iec_ward_mappings_province 
        FOREIGN KEY (province_code) 
        REFERENCES iec_province_mappings(province_code) 
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_ward_code ON iec_ward_mappings(ward_code);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_ward_number ON iec_ward_mappings(ward_number);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_municipality_code ON iec_ward_mappings(municipality_code);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_province_code ON iec_ward_mappings(province_code);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_iec_ward_id ON iec_ward_mappings(iec_ward_id);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_iec_municipality_id ON iec_ward_mappings(iec_municipality_id);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_iec_province_id ON iec_ward_mappings(iec_province_id);
CREATE INDEX IF NOT EXISTS idx_iec_ward_mappings_is_active ON iec_ward_mappings(is_active);

\echo '>>> Migration 008 completed'

-- ============================================================================
-- MIGRATION 009: Create iec_lge_ballot_results table
-- ============================================================================
\echo '>>> Running Migration 009: Create iec_lge_ballot_results table'

CREATE TABLE IF NOT EXISTS iec_lge_ballot_results (
    id SERIAL PRIMARY KEY,
    iec_event_id INT NOT NULL,
    iec_province_id INT,
    iec_municipality_id VARCHAR(50),
    iec_ward_id VARCHAR(50),
    province_code VARCHAR(10),
    municipality_code VARCHAR(20),
    ward_code VARCHAR(20),
    ballot_data JSONB NOT NULL,
    total_votes INT DEFAULT 0,
    registered_voters INT DEFAULT 0,
    voter_turnout_percentage DECIMAL(5, 2),
    result_type VARCHAR(20) NOT NULL,
    data_source VARCHAR(50) DEFAULT 'IEC_API',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_iec_lge_ballot_results_event 
        FOREIGN KEY (iec_event_id) 
        REFERENCES iec_electoral_events(iec_event_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_iec_lge_ballot_results_province 
        FOREIGN KEY (province_code) 
        REFERENCES iec_province_mappings(province_code) 
        ON DELETE SET NULL,
    CONSTRAINT fk_iec_lge_ballot_results_municipality 
        FOREIGN KEY (municipality_code) 
        REFERENCES iec_municipality_mappings(municipality_code) 
        ON DELETE SET NULL,
    CONSTRAINT fk_iec_lge_ballot_results_ward 
        FOREIGN KEY (ward_code) 
        REFERENCES iec_ward_mappings(ward_code) 
        ON DELETE SET NULL,
    CONSTRAINT chk_result_type CHECK (result_type IN ('province', 'municipality', 'ward')),
    CONSTRAINT chk_data_source CHECK (data_source IN ('IEC_API', 'MOCK', 'MANUAL', 'IMPORT'))
);

CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_iec_event_id ON iec_lge_ballot_results(iec_event_id);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_iec_province_id ON iec_lge_ballot_results(iec_province_id);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_iec_municipality_id ON iec_lge_ballot_results(iec_municipality_id);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_iec_ward_id ON iec_lge_ballot_results(iec_ward_id);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_province_code ON iec_lge_ballot_results(province_code);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_municipality_code ON iec_lge_ballot_results(municipality_code);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_ward_code ON iec_lge_ballot_results(ward_code);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_result_type ON iec_lge_ballot_results(result_type);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_data_source ON iec_lge_ballot_results(data_source);
CREATE INDEX IF NOT EXISTS idx_iec_lge_ballot_results_last_updated ON iec_lge_ballot_results(last_updated);

\echo '>>> Migration 009 completed'

COMMIT;

\echo '>>> All IEC mapping migrations completed successfully!'
\echo '>>> Next steps:'
\echo '>>>   1. Update Prisma schema with new models'
\echo '>>>   2. Run: npx prisma db pull'
\echo '>>>   3. Run: npx prisma generate'
\echo '>>>   4. Complete migration of blocked services'

