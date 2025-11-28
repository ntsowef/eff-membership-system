import { Pool } from 'pg';
import { iecApiService, IECVoterDetails } from '../iecApiService';
import { IECRateLimitService } from '../iecRateLimitService';
import { BulkUploadRecord, IECVerificationResult, VerifiedRecord, IECVerificationBatchResult } from './types';

/**
 * Rate limit error marker - used to detect rate limit errors in batch results
 */
const RATE_LIMIT_ERROR_PREFIX = 'IEC API rate limit exceeded';

/**
 * Batch verification result with rate limit info
 */
interface BatchVerificationResult {
  results: Map<string, IECVerificationResult>;
  rateLimitHit: boolean;
  rateLimitResetTime: number;
  rowsProcessedBeforeLimit: number;
  rateLimitMessage: string;
}

/**
 * IEC Verification Service for Bulk Upload
 *
 * Wrapper around the existing iecApiService with additional features:
 * - Parallel batch processing (10 records at a time)
 * - Rate limiting (10,000 requests per hour via Redis)
 * - VD code mapping (22222222, 99999999) - 8 digits to match database
 * - Progress tracking
 * - Error handling and retry logic
 * - **STOP FLAG**: Immediately stops processing when rate limit is reached
 *
 * Performance Optimization:
 * - Increased batch size from 5 to 10 for better throughput
 * - Reduced batch delay from 1000ms to 100ms
 * - Rate limiter handles throttling, no need for long delays
 */
export class IECVerificationService {
  private static readonly BATCH_SIZE = 10; // Process 10 records at a time (increased from 5)
  private static readonly BATCH_DELAY_MS = 100; // 100ms delay between batches (reduced from 1000ms)
  private static readonly VD_CODE_REGISTERED_NO_VD = '22222222'; // Registered voters without VD code (8 digits)
  private static readonly VD_CODE_NOT_REGISTERED = '99999999'; // Non-registered voters (8 digits)

  /**
   * Check rate limit status before starting batch processing
   * Returns true if uploads should be blocked
   */
  static async checkRateLimitBeforeUpload(): Promise<{
    isLimited: boolean;
    resetTime: number;
    currentCount: number;
    maxLimit: number;
    remaining: number;
    message: string;
  }> {
    const status = await IECRateLimitService.checkStatus();

    return {
      isLimited: status.is_limited,
      resetTime: status.reset_time,
      currentCount: status.current_count,
      maxLimit: status.max_limit,
      remaining: status.remaining,
      message: status.is_limited
        ? `IEC API rate limit exceeded (${status.current_count}/${status.max_limit}). Resets at ${new Date(status.reset_time).toLocaleTimeString()}`
        : `IEC API available: ${status.remaining}/${status.max_limit} remaining`
    };
  }

  /**
   * Verify multiple voters in batches with rate limiting and STOP FLAG
   *
   * IMPORTANT: When rate limit is reached, processing STOPS IMMEDIATELY.
   * Returns rate limit information so caller can handle appropriately.
   *
   * @param records - Array of records to verify
   * @param onProgress - Optional progress callback (current, total)
   * @returns BatchVerificationResult with rate limit info
   */
  static async verifyRecordsBatchWithStopFlag(
    records: BulkUploadRecord[],
    onProgress?: (current: number, total: number) => void
  ): Promise<BatchVerificationResult> {
    const results = new Map<string, IECVerificationResult>();
    const total = records.length;

    // Rate limit tracking
    let rateLimitHit = false;
    let rateLimitResetTime = 0;
    let rowsProcessedBeforeLimit = 0;
    let rateLimitMessage = '';

    console.log(`\n🔍 IEC VERIFICATION: Processing ${total} records in batches of ${this.BATCH_SIZE}`);

    // Process in batches with STOP FLAG check
    for (let i = 0; i < total; i += this.BATCH_SIZE) {
      // CHECK STOP FLAG - If rate limit was hit in previous batch, stop immediately
      if (rateLimitHit) {
        console.log(`\n🚫 STOP FLAG: Rate limit hit, stopping batch processing at record ${rowsProcessedBeforeLimit}/${total}`);
        break;
      }

      const batch = records.slice(i, i + this.BATCH_SIZE);

      // Verify batch in parallel
      const batchPromises = batch.map(record =>
        this.verifyRecord(record).catch(error => {
          console.error(`   ❌ Failed to verify ${record['ID Number']}:`, error.message);
          return {
            id_number: record['ID Number'],
            is_registered: false,
            voter_status: 'Verification Error',
            verification_date: new Date(),
            error: error.message
          };
        })
      );

      const batchResults = await Promise.all(batchPromises);

      // Check for rate limit errors in batch results and set STOP FLAG
      for (const result of batchResults) {
        results.set(result.id_number, result);

        // Detect rate limit error and set STOP FLAG
        if (result.error && result.error.startsWith(RATE_LIMIT_ERROR_PREFIX)) {
          rateLimitHit = true;
          rateLimitMessage = result.error;

          // Extract reset time from error message if possible
          const resetMatch = result.error.match(/Resets at (.+)$/);
          if (resetMatch) {
            // Get current rate limit status for accurate reset time
            const status = await IECRateLimitService.checkStatus();
            rateLimitResetTime = status.reset_time;
          }

          // Count how many were processed before hitting limit
          rowsProcessedBeforeLimit = results.size;

          console.log(`\n🚫 RATE LIMIT HIT: Processed ${rowsProcessedBeforeLimit}/${total} records before limit`);
          console.log(`   Reset time: ${new Date(rateLimitResetTime).toLocaleTimeString()}`);
          break;
        }
      }

      const processed = Math.min(i + this.BATCH_SIZE, total);

      // Only log if we haven't hit rate limit
      if (!rateLimitHit) {
        console.log(`   ✅ Verified ${processed}/${total} records`);

        // Call progress callback
        if (onProgress) {
          onProgress(processed, total);
        }
      }

      // Delay between batches to respect rate limits
      if (i + this.BATCH_SIZE < total && !rateLimitHit) {
        await this.delay(this.BATCH_DELAY_MS);
      }
    }

    if (rateLimitHit) {
      console.log(`\n⚠️ IEC VERIFICATION STOPPED: Rate limit hit after ${rowsProcessedBeforeLimit}/${total} records`);
    } else {
      console.log(`\n✅ IEC VERIFICATION COMPLETE: ${results.size} records verified`);
    }

    return {
      results,
      rateLimitHit,
      rateLimitResetTime,
      rowsProcessedBeforeLimit,
      rateLimitMessage
    };
  }

  /**
   * Verify multiple voters in batches with rate limiting (legacy method for compatibility)
   * NOTE: This method does NOT stop on rate limit - use verifyRecordsBatchWithStopFlag instead
   *
   * @param records - Array of records to verify
   * @param onProgress - Optional progress callback (current, total)
   * @returns Map of ID number to IEC verification result
   * @deprecated Use verifyRecordsBatchWithStopFlag for proper rate limit handling
   */
  static async verifyRecordsBatch(
    records: BulkUploadRecord[],
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, IECVerificationResult>> {
    // Use new method with stop flag and return just the results map
    const result = await this.verifyRecordsBatchWithStopFlag(records, onProgress);
    return result.results;
  }

  /**
   * Verify a single record with IEC API
   * 
   * @param record - Record to verify
   * @returns IEC verification result
   */
  static async verifyRecord(record: BulkUploadRecord): Promise<IECVerificationResult> {
    const idNumber = record['ID Number'];

    try {
      // Check rate limit before making request
      const rateLimitStatus = await IECRateLimitService.incrementAndCheck();
      
      if (rateLimitStatus.is_limited) {
        throw new Error(
          `IEC API rate limit exceeded (${rateLimitStatus.current_count}/${rateLimitStatus.max_limit}). ` +
          `Resets at ${new Date(rateLimitStatus.reset_time).toLocaleTimeString()}`
        );
      }

      // Verify voter with IEC API
      const iecDetails = await iecApiService.verifyVoter(idNumber);

      if (!iecDetails) {
        // Voter not found
        return {
          id_number: idNumber,
          is_registered: false,
          voter_status: 'Not Registered',
          voting_district_code: this.VD_CODE_NOT_REGISTERED,
          verification_date: new Date()
        };
      }

      // Map IEC response to our format
      const result: IECVerificationResult = {
        id_number: idNumber,
        is_registered: iecDetails.is_registered,
        voter_status: iecDetails.voter_status,
        province_code: iecDetails.province_code,
        district_code: iecDetails.district_code,
        municipality_code: iecDetails.municipality_code,
        ward_code: iecDetails.ward_code,
        voting_district_code: this.mapVotingDistrictCode(iecDetails),
        voting_station_name: iecDetails.voting_station_name,
        verification_date: new Date()
      };

      return result;
    } catch (error: any) {
      console.error(`❌ Error verifying ${idNumber}:`, error.message);
      
      return {
        id_number: idNumber,
        is_registered: false,
        voter_status: 'Verification Error',
        verification_date: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Map voting district code with special handling
   * Business rules:
   * - Registered voters without VD code: 22222222 (8 digits)
   * - Non-registered voters: 99999999 (8 digits)
   *
   * @param iecDetails - IEC voter details
   * @returns Mapped voting district code
   */
  private static mapVotingDistrictCode(iecDetails: IECVoterDetails): string {
    if (!iecDetails.is_registered) {
      return this.VD_CODE_NOT_REGISTERED;
    }

    if (iecDetails.voting_district_code) {
      return iecDetails.voting_district_code;
    }

    // Registered but no VD code
    return this.VD_CODE_REGISTERED_NO_VD;
  }

  /**
   * Delay helper for batch processing
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verify voters batch and return IECVerificationBatchResult
   * (For orchestrator compatibility)
   *
   * IMPORTANT: Now includes rate limit info and STOPS when limit is hit
   */
  static async verifyVotersBatch(
    idNumbers: string[],
    pool: Pool
  ): Promise<IECVerificationBatchResult> {
    const records: BulkUploadRecord[] = idNumbers.map(id => ({
      row_number: 0,
      'ID Number': id
    }));

    // Use new method with stop flag
    const batchResult = await this.verifyRecordsBatchWithStopFlag(records);

    const verifiedRecords: VerifiedRecord[] = [];
    const failedVerifications: { id_number: string; error: string }[] = [];

    let registered = 0;
    let notRegistered = 0;
    let failed = 0;

    batchResult.results.forEach((result, idNumber) => {
      if (result.error) {
        failedVerifications.push({
          id_number: idNumber,
          error: result.error
        });
        failed++;
      } else {
        // Convert IECVerificationResult to VerifiedRecord
        const originalRecord = records.find(r => r['ID Number'] === idNumber);
        verifiedRecords.push({
          ...originalRecord!,
          iec_registered: result.is_registered,
          iec_ward: result.ward_code,
          iec_vd_code: result.voting_district_code,
          iec_voting_station: result.voting_station_name,
          iec_verification_date: result.verification_date,
          iec_error: result.error
        });

        if (result.is_registered) {
          registered++;
        } else {
          notRegistered++;
        }
      }
    });

    return {
      verified_records: verifiedRecords,
      failed_verifications: failedVerifications,
      verification_stats: {
        total_records: idNumbers.length,
        registered,
        not_registered: notRegistered,
        failed
      },
      // Include rate limit information
      rate_limit_hit: batchResult.rateLimitHit,
      rate_limit_reset_time: batchResult.rateLimitResetTime,
      rows_processed_before_limit: batchResult.rowsProcessedBeforeLimit,
      rate_limit_message: batchResult.rateLimitMessage
    };
  }
}

