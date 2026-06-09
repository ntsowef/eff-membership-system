-- Migration: Create SMS MO Callbacks table
-- Created: 2026-03-15

CREATE TABLE IF NOT EXISTS sms_mo_callbacks (
    callback_id SERIAL PRIMARY KEY,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    msisdn VARCHAR(20) NOT NULL,
    destination VARCHAR(20),
    message_content TEXT,
    provider_name VARCHAR(50),
    id_number VARCHAR(20),
    member_id INTEGER REFERENCES members(member_id),
    processed_successfully BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for searching by MSISDN (common for lookups)
CREATE INDEX IF NOT EXISTS idx_sms_mo_msisdn ON sms_mo_callbacks(msisdn);

-- Index for searching by ID Number
CREATE INDEX IF NOT EXISTS idx_sms_mo_id_number ON sms_mo_callbacks(id_number);

-- Index for received date
CREATE INDEX IF NOT EXISTS idx_sms_mo_received_at ON sms_mo_callbacks(received_at);
