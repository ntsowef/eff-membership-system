
/**
 * Deceased Member Purge Service
 *
 * Scans the entire membership database through the IEC API every month (1st–5th)
 * to identify deceased members. Archives their records then permanently deletes
 * them from members_consolidated and all related tables.
 *
 * Processing order: Gauteng → KZN → Eastern Cape → Limpopo/MP/NW → WC/FS/NC
 * Rate limit: 10,000 IEC requests/hour (80% utilisation target = ~8,000/hr)
 */

import { executeQuery } from '../config/database-hybrid';
import { iecApiService } from './iecApiService';
import { IECRateLimitService } from './iecRateLimitService';
import { redisService } from './redisService';
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROVINCE_ORDER = ['GP', 'KZN', 'EC', 'LP', 'MP', 'NW', 'WC', 'FS', 'NC'];
const BATCH_SIZE = 25;                // concurrent IEC calls per batch
const TARGET_CALLS_PER_HOUR = 9_800; // 98% of the 10,000/hr IEC limit
// Window per batch cycle (ms): 3,600,000 ÷ (TARGET ÷ BATCH_SIZE)
// = 3,600,000 ÷ 392 ≈ 9,184 ms
// The inter-batch sleep fills whatever is left of this window after the batch
// itself completes, keeping throughput steady regardless of IEC response time.
const BATCH_WINDOW_MS = Math.round(3_600_000 / (TARGET_CALLS_PER_HOUR / BATCH_SIZE));
const CHECKPOINT_KEY_PREFIX = 'deceased_purge:checkpoint:';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PurgeMember {
  member_id: number;
  id_number: string;
  firstname: string;
  surname: string;
  province_code: string;
  ward_code: string;
  municipality_code: string;
  cell_number: string;
  membership_number: string;
  date_joined: string | null;
}

export interface ProvinceStats {
  scanned: number;
  deceased: number;
  deleted: number;
  errors: number;
  not_found: number;
}

export interface PurgeRunProgress {
  run_id: number;
  status: string;
  total_scanned: number;
  deceased_found: number;
  records_deleted: number;
  errors_count: number;
  province_breakdown: Record<string, ProvinceStats>;
  started_at: string;
  completed_at: string | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DeceasedPurgeService {

  // In-memory pause flags — shared with background executeRun in same process.
  // Checked first so pause is detected without waiting for a Redis round-trip.
  private static pauseRequested = new Set<number>();

  // Tracks which run_id each active executeRun() token belongs to.
  // When a run is resumed, the token increments so the old background execution
  // recognises it is stale and exits without processing more members.
  private static runTokens = new Map<number, number>();

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Start (or resume) the monthly purge run.
   * Returns immediately; processing runs asynchronously.
   */
  static async startRun(triggeredBy?: number): Promise<{ run_id: number; message: string }> {
    const existingRun = await this.getRunForCurrentMonth();

    if (existingRun && existingRun.status === 'RUNNING') {
      return { run_id: existingRun.run_id, message: 'A run is already in progress for this month.' };
    }
    if (existingRun && existingRun.status === 'COMPLETED') {
      return { run_id: existingRun.run_id, message: 'The monthly purge run has already completed this month.' };
    }

    let runId: number;

    if (existingRun && existingRun.status === 'PAUSED') {
      runId = existingRun.run_id;
      // Clear pause flags so the new execution is not immediately halted
      this.pauseRequested.delete(runId);
      await redisService.del(`deceased_purge:pause:${runId}`);
      await executeQuery(
        `UPDATE deceased_purge_runs SET status = 'RUNNING', notes = $1 WHERE run_id = $2`,
        [`Resumed at ${new Date().toISOString()}`, runId]
      );
      logger.info(`▶️  Resuming deceased purge run #${runId}`);
    } else {
      const rows = await executeQuery<{ run_id: number }>(
        `INSERT INTO deceased_purge_runs (run_date, status, triggered_by)
         VALUES (CURRENT_DATE, 'STARTED', $1)
         RETURNING run_id`,
        [triggeredBy ?? null]
      );
      runId = rows[0].run_id;
      logger.info(`Started deceased purge run #${runId}`);
    }

    // Assign a new token for this execution; used to detect stale background runs
    const token = (this.runTokens.get(runId) ?? 0) + 1;
    this.runTokens.set(runId, token);

    // Fire-and-forget — process asynchronously
    this.executeRun(runId, token).catch(err => {
      logger.error(` Deceased purge run #${runId} failed fatally:`, { error: err });
      executeQuery(
        `UPDATE deceased_purge_runs SET status = 'FAILED', completed_at = NOW(), notes = $1 WHERE run_id = $2`,
        [String(err), runId]
      ).catch(() => { /* best effort */ });
    });

    return { run_id: runId, message: `Purge run #${runId} started. Monitor via GET /deceased-purge/runs/${runId}.` };
  }

  /**
   * Request a graceful pause (stops after the current batch).
   * Updates the DB status immediately so the frontend reflects the change on
   * the next poll, without waiting for the background worker to detect the flag.
   */
  static async pauseRun(runId: number): Promise<void> {
    // 1. In-memory flag — detected by the background executeRun in this process
    this.pauseRequested.add(runId);
    // 2. Redis flag — survives process restarts / multi-instance setups
    await redisService.set(`deceased_purge:pause:${runId}`, '1', 3600);
    // 3. Update DB status immediately so the frontend sees PAUSED on next poll.
    //    Only update if the run is still active (avoid overwriting COMPLETED/FAILED).
    await executeQuery(
      `UPDATE deceased_purge_runs
       SET status = 'PAUSED', notes = COALESCE(notes, '') || $1
       WHERE run_id = $2 AND status IN ('RUNNING', 'STARTED')`,
      [`\nPause requested at ${new Date().toISOString()}`, runId]
    );
    logger.info(`Pause requested for run #${runId}`);
  }

  /**
   * Get the latest run for the current calendar month.
   */
  static async getRunForCurrentMonth(): Promise<{ run_id: number; status: string } | null> {
    const rows = await executeQuery<{ run_id: number; status: string }>(
      `SELECT run_id, status
       FROM deceased_purge_runs
       WHERE DATE_TRUNC('month', run_date) = DATE_TRUNC('month', CURRENT_DATE)
       ORDER BY run_id DESC
       LIMIT 1`
    );
    return rows[0] ?? null;
  }

  /**
   * Get full progress for a specific run.
   */
  static async getRunProgress(runId: number): Promise<PurgeRunProgress | null> {
    const rows = await executeQuery<PurgeRunProgress>(
      `SELECT run_id, status, total_scanned, deceased_found, records_deleted,
              errors_count, province_breakdown, started_at, completed_at
       FROM deceased_purge_runs
       WHERE run_id = $1`,
      [runId]
    );
    return rows[0] ?? null;
  }

  /**
   * List recent runs (newest first).
   */
  static async listRuns(limit = 12): Promise<PurgeRunProgress[]> {
    return executeQuery<PurgeRunProgress>(
      `SELECT run_id, status, total_scanned, deceased_found, records_deleted,
              errors_count, province_breakdown, started_at, completed_at
       FROM deceased_purge_runs
       ORDER BY run_id DESC
       LIMIT $1`,
      [limit]
    );
  }

  /**
   * List archived deceased members.
   */
  static async listArchived(options: {
    run_id?: number;
    province_code?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ rows: unknown[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (options.run_id) {
      conditions.push(`purge_run_id = $${p++}`);
      params.push(options.run_id);
    }
    if (options.province_code) {
      conditions.push(`province_code = $${p++}`);
      params.push(options.province_code);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;

    const countRows = await executeQuery<{ total: string }>(
      `SELECT COUNT(*) AS total FROM deceased_members_archive ${where}`,
      params as any[]
    );
    const total = parseInt(countRows[0]?.total ?? '0', 10);

    const rows = await executeQuery(
      `SELECT archive_id, member_id, id_number, firstname, surname,
              province_code, ward_code, municipality_code, cell_number,
              membership_number, date_joined, iec_voter_status, detected_date, purge_run_id
       FROM deceased_members_archive
       ${where}
       ORDER BY detected_date DESC
       LIMIT $${p++} OFFSET $${p++}`,
      [...(params as any[]), limit, offset]
    );

    return { rows, total };
  }

  // -------------------------------------------------------------------------
  // Core execution
  // -------------------------------------------------------------------------

  private static async executeRun(runId: number, token: number): Promise<void> {
    // Only advance STARTED → RUNNING; never overwrite PAUSED set by pauseRun()
    await executeQuery(
      `UPDATE deceased_purge_runs SET status = 'RUNNING' WHERE run_id = $1 AND status = 'STARTED'`,
      [runId]
    );

    const provinceStats: Record<string, ProvinceStats> = {};
    let totalScanned = 0;
    let totalDeceased = 0;
    let totalDeleted = 0;
    let totalErrors = 0;

    const isStale = () => this.runTokens.get(runId) !== token;

    for (const province of PROVINCE_ORDER) {
      // Abort if a newer execution has taken over (e.g. pause → immediate resume)
      if (isStale()) {
        logger.info(` Run #${runId} token ${token} is stale — aborting background loop`);
        return;
      }
      if (await this.isPauseRequested(runId)) {
        await executeQuery(
          `UPDATE deceased_purge_runs
           SET status = 'PAUSED', total_scanned = $1, deceased_found = $2,
               records_deleted = $3, errors_count = $4, province_breakdown = $5
           WHERE run_id = $6`,
          [totalScanned, totalDeceased, totalDeleted, totalErrors, JSON.stringify(provinceStats), runId]
        );
        logger.info(` Run #${runId} paused before province ${province}`);
        this.pauseRequested.delete(runId);
        return;
      }

      logger.info(`Run #${runId}: processing province ${province}`);
      const stats = await this.processProvince(runId, province);
      provinceStats[province] = stats;

      totalScanned += stats.scanned;
      totalDeceased += stats.deceased;
      totalDeleted += stats.deleted;
      totalErrors += stats.errors;

      // Check pause / stale after processProvince returns (it may have exited early mid-province)
      if (isStale()) {
        logger.info(` Run #${runId} token ${token} is stale after province ${province} — aborting`);
        return;
      }
      if (await this.isPauseRequested(runId)) {
        await executeQuery(
          `UPDATE deceased_purge_runs
           SET status = 'PAUSED', total_scanned = $1, deceased_found = $2,
               records_deleted = $3, errors_count = $4, province_breakdown = $5
           WHERE run_id = $6`,
          [totalScanned, totalDeceased, totalDeleted, totalErrors, JSON.stringify(provinceStats), runId]
        );
        logger.info(` Run #${runId} paused after partial province ${province}`);
        this.pauseRequested.delete(runId);
        return;
      }

      await executeQuery(
        `UPDATE deceased_purge_runs
         SET total_scanned = $1, deceased_found = $2, records_deleted = $3,
             errors_count = $4, province_breakdown = $5
         WHERE run_id = $6`,
        [totalScanned, totalDeceased, totalDeleted, totalErrors, JSON.stringify(provinceStats), runId]
      );

      logger.info(
        ` Run #${runId}: ${province} done — scanned=${stats.scanned} deceased=${stats.deceased} ` +
        `deleted=${stats.deleted} errors=${stats.errors}`
      );
    }

    this.pauseRequested.delete(runId);
    await executeQuery(
      `UPDATE deceased_purge_runs
       SET status = 'COMPLETED', completed_at = NOW(),
           total_scanned = $1, deceased_found = $2, records_deleted = $3,
           errors_count = $4, province_breakdown = $5
       WHERE run_id = $6`,
      [totalScanned, totalDeceased, totalDeleted, totalErrors, JSON.stringify(provinceStats), runId]
    );

    logger.info(
      `🎉 Deceased purge run #${runId} COMPLETED — ` +
      `scanned=${totalScanned} deceased=${totalDeceased} deleted=${totalDeleted} errors=${totalErrors}`
    );
  }

  private static async processProvince(runId: number, provinceCode: string): Promise<ProvinceStats> {
    const stats: ProvinceStats = { scanned: 0, deceased: 0, deleted: 0, errors: 0, not_found: 0 };

    const checkpointKey = `${CHECKPOINT_KEY_PREFIX}${runId}:${provinceCode}`;
    const checkpointRaw = await redisService.get(checkpointKey);
    const lastProcessedId = checkpointRaw ? parseInt(checkpointRaw, 10) : 0;

    const members = await executeQuery<PurgeMember>(
      `SELECT member_id, id_number, firstname, surname, province_code,
              COALESCE(ward_code, '') AS ward_code,
              COALESCE(municipality_code, '') AS municipality_code,
              COALESCE(cell_number, '') AS cell_number,
              COALESCE(membership_number, '') AS membership_number,
              date_joined
       FROM members_consolidated
       WHERE province_code = $1 AND member_id > $2
       ORDER BY member_id ASC`,
      [provinceCode, lastProcessedId]
    );

    logger.info(`  Province ${provinceCode}: ${members.length} members to process`);

    let pauseDetected = false;

    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      if (await this.isPauseRequested(runId)) {
        logger.info(`  Pause detected mid-province ${provinceCode} at index ${i}`);
        pauseDetected = true;
        break;
      }

      // ── Pre-batch rate-limit guard ──────────────────────────────────────────
      // Check BEFORE firing the batch so we never send calls that will be
      // rejected because the hourly window is already exhausted.
      const preStatus = await IECRateLimitService.getStatus();
      if (preStatus.is_limited || preStatus.remaining < BATCH_SIZE) {
        const waitMs = Math.max(preStatus.reset_time - Date.now(), 1000);
        logger.warn(
          ` IEC rate limit — ${preStatus.remaining} remaining, waiting ${Math.ceil(waitMs / 1000)}s for window reset`
        );
        await this.sleep(waitMs);
      }

      const batchStart = Date.now();
      const batch = members.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map(m => this.processMember(m, runId, stats)));
      stats.scanned += batch.length;

      // Save checkpoint so a resume can skip already-processed members
      const lastId = batch[batch.length - 1].member_id;
      await redisService.set(checkpointKey, String(lastId), 86400 * 7);

      // Sleep for whatever remains of the fixed batch window.
      // This keeps throughput at TARGET_CALLS_PER_HOUR (~9,800/hr) regardless
      // of how long the IEC API took to respond for this batch.
      const elapsed = Date.now() - batchStart;
      const remainder = BATCH_WINDOW_MS - elapsed;
      if (remainder > 0) await this.sleep(remainder);
    }

    // Only clean up the checkpoint on normal completion; keep it on pause so
    // a resume can skip already-processed members in this province.
    if (!pauseDetected) {
      await redisService.del(checkpointKey);
    }
    return stats;
  }

  private static async processMember(
    member: PurgeMember,
    runId: number,
    stats: ProvinceStats
  ): Promise<void> {
    try {
      // Increment BEFORE the call so the counter reflects in-flight requests,
      // not just completed ones.
      await IECRateLimitService.incrementAndCheck();
      const iecResult = await iecApiService.verifyVoter(member.id_number);

      if (!iecResult) {
        // IEC returned null — treat as not found, do not delete
        stats.not_found++;
        return;
      }

      const voterStatus = (iecResult.voter_status ?? '').toUpperCase();

      if (voterStatus.includes('DECEASED')) {
        stats.deceased++;
        await this.archiveAndDelete(member, runId, iecResult.voter_status ?? 'DECEASED');
        stats.deleted++;
      } else if (!iecResult.is_registered && !iecResult.voting_district_code) {
        stats.not_found++;
        logger.debug(`  ${member.id_number} not found in IEC (not deleting)`);
      }
      // Alive — no action
    } catch (err) {
      stats.errors++;
      logger.error(`  IEC check failed for ${member.id_number}:`, { error: err });
    }
  }

  private static async archiveAndDelete(
    member: PurgeMember,
    runId: number,
    iecVoterStatus: string
  ): Promise<void> {
    await executeQuery(
      `INSERT INTO deceased_members_archive
         (member_id, id_number, firstname, surname, province_code, ward_code,
          municipality_code, cell_number, membership_number, date_joined,
          iec_voter_status, detected_date, purge_run_id, original_record)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12,$13)
       ON CONFLICT DO NOTHING`,
      [
        member.member_id, member.id_number, member.firstname, member.surname,
        member.province_code, member.ward_code, member.municipality_code,
        member.cell_number, member.membership_number, member.date_joined,
        iecVoterStatus, runId, JSON.stringify(member)
      ]
    );

    await executeQuery(
      `DELETE FROM members_consolidated WHERE member_id = $1`,
      [member.member_id]
    );

    await executeQuery(
      `INSERT INTO audit_logs (action, entity_type, entity_id, new_values, created_at)
       VALUES ('DECEASED_PURGE', 'member', $1, $2, NOW())`,
      [
        member.member_id,
        JSON.stringify({
          id_number: member.id_number,
          name: `${member.firstname} ${member.surname}`,
          province_code: member.province_code,
          iec_voter_status: iecVoterStatus,
          purge_run_id: runId
        })
      ]
    );

    logger.info(
      ` Archived & deleted ${member.id_number} ` +
      `(${member.firstname} ${member.surname}) — ${iecVoterStatus}`
    );
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private static async isPauseRequested(runId: number): Promise<boolean> {
    // In-memory check is instant and doesn't depend on Redis availability
    if (this.pauseRequested.has(runId)) return true;
    // Redis fallback (handles server restarts / multi-instance deployments)
    const flag = await redisService.get(`deceased_purge:pause:${runId}`);
    return flag === '1';
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
