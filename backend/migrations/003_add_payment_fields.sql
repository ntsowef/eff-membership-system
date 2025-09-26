-- Migration: Add payment information fields to membership_applications table
-- Date: 2025-01-20
-- Description: Adds payment-related columns to support payment information collection during application

USE membership_new;

-- Add payment information columns to membership_applications table
ALTER TABLE membership_applications 
ADD COLUMN payment_method VARCHAR(50) NULL AFTER membership_type,
ADD COLUMN payment_reference VARCHAR(100) NULL AFTER payment_method,
ADD COLUMN last_payment_date DATE NULL AFTER payment_reference,
ADD COLUMN payment_amount DECIMAL(10,2) NULL AFTER last_payment_date,
ADD COLUMN payment_notes TEXT NULL AFTER payment_amount;

-- Add indexes for better query performance
CREATE INDEX idx_membership_applications_payment_method ON membership_applications(payment_method);
CREATE INDEX idx_membership_applications_payment_date ON membership_applications(last_payment_date);
CREATE INDEX idx_membership_applications_payment_amount ON membership_applications(payment_amount);

-- Add comments to document the new columns
ALTER TABLE membership_applications 
MODIFY COLUMN payment_method VARCHAR(50) NULL COMMENT 'Payment method used (Cash, Bank Transfer, EFT, Credit Card, Debit Card, Mobile Payment)',
MODIFY COLUMN payment_reference VARCHAR(100) NULL COMMENT 'Transaction reference number or receipt number',
MODIFY COLUMN last_payment_date DATE NULL COMMENT 'Date when payment was made',
MODIFY COLUMN payment_amount DECIMAL(10,2) NULL COMMENT 'Amount paid for membership',
MODIFY COLUMN payment_notes TEXT NULL COMMENT 'Additional notes about the payment';

-- Verify the changes
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'membership_new' 
AND TABLE_NAME = 'membership_applications' 
AND COLUMN_NAME IN ('payment_method', 'payment_reference', 'last_payment_date', 'payment_amount', 'payment_notes')
ORDER BY ORDINAL_POSITION;
