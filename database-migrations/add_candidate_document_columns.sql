-- =====================================================================
-- Add CV and IEC Form C2 document columns to lge2026_candidates
-- Allows candidates to upload supporting documents during nomination
-- =====================================================================

ALTER TABLE lge2026_candidates
    ADD COLUMN IF NOT EXISTS cv_path VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS cv_original_name VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS iec_form_c2_path VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS iec_form_c2_original_name VARCHAR(500) NULL;

COMMENT ON COLUMN lge2026_candidates.cv_path IS 'Server-side filename for the candidate CV upload';
COMMENT ON COLUMN lge2026_candidates.cv_original_name IS 'Original filename of the uploaded CV';
COMMENT ON COLUMN lge2026_candidates.iec_form_c2_path IS 'Server-side filename for the IEC Form C2 upload';
COMMENT ON COLUMN lge2026_candidates.iec_form_c2_original_name IS 'Original filename of the uploaded IEC Form C2';
