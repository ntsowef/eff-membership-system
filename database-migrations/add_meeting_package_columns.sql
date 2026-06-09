-- Migration: Add meeting package columns to ward_meeting_records
-- Date: 2026-06-09
-- Description: Adds columns for storing uploaded meeting package file references
--              so national admin can retrieve/view them in case of disputes.

ALTER TABLE ward_meeting_records
  ADD COLUMN IF NOT EXISTS meeting_package_path VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS meeting_package_original_name VARCHAR(500) DEFAULT NULL;

COMMENT ON COLUMN ward_meeting_records.meeting_package_path
  IS 'Server-side filename of the uploaded meeting package (stored in uploads/meeting-packages/)';

COMMENT ON COLUMN ward_meeting_records.meeting_package_original_name
  IS 'Original filename of the uploaded meeting package (used for download)';
