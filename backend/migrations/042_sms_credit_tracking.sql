-- SMS Credit Tracking System
-- Tracks purchased credits, deductions per send, and alerts on low balance

-- Single-row balance table
CREATE TABLE IF NOT EXISTS sms_credit_balance (
    id SERIAL PRIMARY KEY,
    credits_remaining INTEGER NOT NULL DEFAULT 0,
    total_purchased INTEGER NOT NULL DEFAULT 0,
    total_used INTEGER NOT NULL DEFAULT 0,
    low_credit_threshold INTEGER NOT NULL DEFAULT 1000,
    last_alert_sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction ledger
CREATE TABLE IF NOT EXISTS sms_credit_transactions (
    id SERIAL PRIMARY KEY,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'deduction', 'adjustment')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reference VARCHAR(255),
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast ledger queries
CREATE INDEX IF NOT EXISTS idx_sms_credit_transactions_created_at ON sms_credit_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_credit_transactions_type ON sms_credit_transactions (transaction_type);

-- Seed with a single balance row (0 credits — admin must add initial balance)
INSERT INTO sms_credit_balance (credits_remaining, total_purchased, total_used, low_credit_threshold, updated_at)
SELECT 0, 0, 0, 1000, NOW()
WHERE NOT EXISTS (SELECT 1 FROM sms_credit_balance);
