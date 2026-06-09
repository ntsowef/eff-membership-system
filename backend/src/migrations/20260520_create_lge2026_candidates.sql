-- =====================================================================
-- LGE2026: Ward Candidate Selection
-- Creates table to store nominated/approved Ward Councillor Candidates
-- for the 2026 Local Government Elections (one active candidate per ward).
-- =====================================================================

CREATE TABLE IF NOT EXISTS lge2026_candidates (
    candidate_id        SERIAL PRIMARY KEY,
    ward_code           VARCHAR(20) NOT NULL,
    member_id           INTEGER NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'nominated',

    -- Audit / workflow
    nominated_by        INTEGER NULL,
    nominated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_by          INTEGER NULL,
    decided_at          TIMESTAMPTZ NULL,

    -- Candidate metadata
    notes               TEXT NULL,
    campaign_statement  TEXT NULL,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_lge2026_status CHECK (status IN ('nominated','approved','withdrawn')),

    CONSTRAINT fk_lge2026_ward
        FOREIGN KEY (ward_code)
        REFERENCES wards(ward_code) ON DELETE CASCADE,

    CONSTRAINT fk_lge2026_member
        FOREIGN KEY (member_id)
        REFERENCES members_consolidated(member_id) ON DELETE CASCADE,

    CONSTRAINT fk_lge2026_nominated_by
        FOREIGN KEY (nominated_by)
        REFERENCES users(user_id) ON DELETE SET NULL,

    CONSTRAINT fk_lge2026_decided_by
        FOREIGN KEY (decided_by)
        REFERENCES users(user_id) ON DELETE SET NULL
);

-- Only one active (nominated or approved) candidate per ward at any time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lge2026_active_candidate_per_ward
    ON lge2026_candidates (ward_code)
    WHERE status IN ('nominated','approved');

-- Lookup helpers
CREATE INDEX IF NOT EXISTS idx_lge2026_member ON lge2026_candidates (member_id);
CREATE INDEX IF NOT EXISTS idx_lge2026_ward_status ON lge2026_candidates (ward_code, status);

-- Auto-bump updated_at on UPDATE (matches pattern used elsewhere in DB).
CREATE OR REPLACE FUNCTION trg_lge2026_candidates_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lge2026_candidates_set_updated_at ON lge2026_candidates;
CREATE TRIGGER lge2026_candidates_set_updated_at
BEFORE UPDATE ON lge2026_candidates
FOR EACH ROW EXECUTE FUNCTION trg_lge2026_candidates_set_updated_at();
