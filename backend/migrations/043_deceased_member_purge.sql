-- Deceased Member Purge System
-- Creates archive and run-tracking tables for the monthly IEC deceased-member scan

-- Archive table: stores full record snapshot before deletion
CREATE TABLE IF NOT EXISTS deceased_members_archive (
    archive_id        SERIAL PRIMARY KEY,
    member_id         INTEGER NOT NULL,
    id_number         VARCHAR(13) NOT NULL,
    firstname         VARCHAR(100),
    surname           VARCHAR(100),
    province_code     VARCHAR(10),
    ward_code         VARCHAR(20),
    municipality_code VARCHAR(10),
    cell_number       VARCHAR(20),
    membership_number VARCHAR(20),
    date_joined       DATE,
    iec_voter_status  VARCHAR(100),
    detected_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    purge_run_id      INTEGER,
    original_record   JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deceased_archive_member_id   ON deceased_members_archive (member_id);
CREATE INDEX IF NOT EXISTS idx_deceased_archive_id_number   ON deceased_members_archive (id_number);
CREATE INDEX IF NOT EXISTS idx_deceased_archive_purge_run   ON deceased_members_archive (purge_run_id);
CREATE INDEX IF NOT EXISTS idx_deceased_archive_detected    ON deceased_members_archive (detected_date DESC);
CREATE INDEX IF NOT EXISTS idx_deceased_archive_province    ON deceased_members_archive (province_code);

-- Run-tracking table: one row per monthly execution
CREATE TABLE IF NOT EXISTS deceased_purge_runs (
    run_id             SERIAL PRIMARY KEY,
    run_date           DATE NOT NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'STARTED'
                           CHECK (status IN ('STARTED', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED')),
    total_scanned      INTEGER NOT NULL DEFAULT 0,
    deceased_found     INTEGER NOT NULL DEFAULT 0,
    records_deleted    INTEGER NOT NULL DEFAULT 0,
    errors_count       INTEGER NOT NULL DEFAULT 0,
    province_breakdown JSONB,
    checkpoint         JSONB,  -- tracks last processed member_id per province for resumability
    started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at       TIMESTAMPTZ,
    triggered_by       INTEGER,
    notes              TEXT
);

-- Uniqueness per calendar month is enforced at the application level
-- in DeceasedPurgeService.startRun() — no DB-level functional index needed.

CREATE INDEX IF NOT EXISTS idx_deceased_runs_status ON deceased_purge_runs (status);
CREATE INDEX IF NOT EXISTS idx_deceased_runs_date   ON deceased_purge_runs (run_date DESC);
