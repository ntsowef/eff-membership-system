-- Geographic Data Restore Script
-- Created: 2025-09-29T01:21:01.019Z
-- Use this script to restore geographic data if needed

-- WARNING: This will overwrite current data!
-- Make sure you understand the implications before running

BEGIN;

-- Restore provinces
DELETE FROM provinces;
INSERT INTO provinces SELECT * FROM "provinces_backup_2025_09_29";

-- Restore districts
DELETE FROM districts;
INSERT INTO districts SELECT * FROM "districts_backup_2025_09_29";

-- Restore municipalities
DELETE FROM municipalities;
INSERT INTO municipalities SELECT * FROM "municipalities_backup_2025_09_29";

-- Restore wards
DELETE FROM wards;
INSERT INTO wards SELECT * FROM "wards_backup_2025_09_29";

-- Restore voting_districts
DELETE FROM voting_districts;
INSERT INTO voting_districts SELECT * FROM "voting_districts_backup_2025_09_29";

COMMIT;

-- Restore completed
