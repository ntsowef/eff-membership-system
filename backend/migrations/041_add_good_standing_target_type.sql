-- Migration 041: Add 'Good Standing' to sms_campaigns target_type CHECK constraint

ALTER TABLE sms_campaigns DROP CONSTRAINT IF EXISTS sms_campaigns_target_type_check;

ALTER TABLE sms_campaigns ADD CONSTRAINT sms_campaigns_target_type_check
  CHECK (target_type IN ('Manual', 'Ward', 'Municipality', 'District', 'Province', 'National', 'Status', 'Custom', 'Good Standing'));

