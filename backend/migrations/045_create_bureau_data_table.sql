-- Migration: Bureau Data Table
-- Description: Stores supplementary contact / bureau-sourced data per member.
--              One row per member_id (1:1 with members_consolidated). Linked
--              via FK with ON DELETE CASCADE so bureau rows are removed when
--              the parent member is deleted.

CREATE TABLE IF NOT EXISTS bureau_data (
    id                  BIGSERIAL PRIMARY KEY,

    -- FK to members_consolidated; cascade so bureau rows follow their member
    member_id           INTEGER NOT NULL
                            REFERENCES members_consolidated(member_id)
                            ON DELETE CASCADE,

    -- Bureau-sourced contact numbers (up to three)
    bureau_cellphone1   VARCHAR(20),
    bureau_cellphone2   VARCHAR(20),
    bureau_cellphone3   VARCHAR(20),

    -- Supplementary payload from the bureau (raw response, address blocks,
    -- employer info, etc.). JSONB for indexable, queryable storage.
    bureau_data         JSONB,

    -- Audit timestamps
    date_created        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_updated        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance: lookups by member_id are the primary access path.
CREATE INDEX IF NOT EXISTS idx_bureau_data_member_id
    ON bureau_data (member_id);

-- Auto-update date_updated on row modification.
-- Follows the per-table function pattern used by migration 033 (sms_send_log).
CREATE OR REPLACE FUNCTION update_bureau_data_date_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bureau_data_date_updated ON bureau_data;
CREATE TRIGGER trigger_bureau_data_date_updated
    BEFORE UPDATE ON bureau_data
    FOR EACH ROW
    EXECUTE FUNCTION update_bureau_data_date_updated();

COMMENT ON TABLE bureau_data IS
'Supplementary contact and bureau-sourced data per member. Linked 1:1 to members_consolidated via member_id (ON DELETE CASCADE).';

COMMENT ON COLUMN bureau_data.bureau_data IS
'JSONB payload of supplementary data returned by the credit / contact bureau.';

COMMENT ON TRIGGER trigger_bureau_data_date_updated ON bureau_data IS
'Automatically refreshes date_updated to CURRENT_TIMESTAMP on every UPDATE.';

DO $$
BEGIN
    RAISE NOTICE '✅ bureau_data table created with FK to members_consolidated and date_updated trigger.';
END $$;
