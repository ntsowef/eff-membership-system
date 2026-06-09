-- Migration: Create member_renewal_log table
-- Date: 2026-02-22
-- Purpose: Dedicated renewal logging system for accurate membership growth tracking
-- Problem: The updated_at field in members_consolidated changes for ANY update, not just renewals
-- Solution: A separate audit trail table that specifically tracks renewal events

BEGIN;

-- Create the member_renewal_log table
CREATE TABLE IF NOT EXISTS member_renewal_log (
    log_id SERIAL PRIMARY KEY,
    
    -- Member reference
    member_id INTEGER NOT NULL REFERENCES members_consolidated(member_id) ON DELETE CASCADE,
    
    -- Renewal event details
    renewal_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    renewal_year INTEGER NOT NULL,
    renewal_type VARCHAR(20) NOT NULL DEFAULT 'Annual' CHECK (renewal_type IN ('Annual', 'Late', 'Grace', 'Partial', 'Complimentary', 'Upgrade')),
    
    -- Expiry tracking
    previous_expiry_date DATE,
    new_expiry_date DATE NOT NULL,
    
    -- Payment info snapshot
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'Completed',
    
    -- Processing info
    processed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- Geographic tracking for provincial analytics
    province_code VARCHAR(10),
    province_name VARCHAR(100),
    district_code VARCHAR(10),
    municipality_code VARCHAR(10),
    ward_code VARCHAR(20),
    
    -- Source tracking
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'bulk_upload', 'online', 'api', 'system', 'migration')),
    source_reference VARCHAR(255),
    
    -- Additional metadata
    notes TEXT,
    metadata JSONB,
    
    -- Audit timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_member_renewal_log_member ON member_renewal_log(member_id);
CREATE INDEX IF NOT EXISTS idx_member_renewal_log_date ON member_renewal_log(renewal_date);
CREATE INDEX IF NOT EXISTS idx_member_renewal_log_year ON member_renewal_log(renewal_year);
CREATE INDEX IF NOT EXISTS idx_member_renewal_log_type ON member_renewal_log(renewal_type);
CREATE INDEX IF NOT EXISTS idx_member_renewal_log_province ON member_renewal_log(province_code);
CREATE INDEX IF NOT EXISTS idx_member_renewal_log_processed_by ON member_renewal_log(processed_by);
CREATE INDEX IF NOT EXISTS idx_member_renewal_log_source ON member_renewal_log(source);
CREATE INDEX IF NOT EXISTS idx_member_renewal_log_created ON member_renewal_log(created_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_member_renewal_log_province_date ON member_renewal_log(province_code, renewal_date);
CREATE INDEX IF NOT EXISTS idx_member_renewal_log_year_province ON member_renewal_log(renewal_year, province_code);
CREATE INDEX IF NOT EXISTS idx_member_renewal_log_processed_date ON member_renewal_log(processed_by, renewal_date);

-- Add comment to table
COMMENT ON TABLE member_renewal_log IS 'Dedicated renewal event log for accurate membership growth tracking. Separate from membership_renewals which tracks renewal transactions.';
COMMENT ON COLUMN member_renewal_log.renewal_type IS 'Type of renewal: Annual (standard), Late (after expiry), Grace (within grace period), Partial, Complimentary (free), Upgrade';
COMMENT ON COLUMN member_renewal_log.source IS 'How the renewal was processed: manual, bulk_upload, online, api, system, migration';

COMMIT;

