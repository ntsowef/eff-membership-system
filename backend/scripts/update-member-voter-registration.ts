/**
 * Production Update Script: Member Voter Registration Status
 *
 * Updates all existing records in members_consolidated table with correct voter
 * registration status by querying the IEC API.
 *
 * Features:
 * - Batch processing to avoid overwhelming the IEC API
 * - Rate limiting (configurable requests per minute)
 * - Dry-run mode to preview changes before applying
 * - Error handling and logging
 * - Progress tracking and summary statistics
 * - Resume capability (only processes unverified records)
 *
 * Usage:
 *   npx ts-node scripts/update-member-voter-registration.ts --dry-run
 *   npx ts-node scripts/update-member-voter-registration.ts
 *   npx ts-node scripts/update-member-voter-registration.ts --batch-size=50 --rate-limit=30
 *   npx ts-node scripts/update-member-voter-registration.ts --province=GP --limit=100
 */

import { PrismaClient } from '@prisma/client';
import iecApiService from '../src/services/iecApiService';

const prisma = new PrismaClient();

// Configuration
const CONFIG = {
  BATCH_SIZE: 100,
  RATE_LIMIT_PER_MINUTE: 60,
  DELAY_BETWEEN_BATCHES: 5000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
};

const VD_CODE_NOT_REGISTERED = '222222222';
const VOTER_REG_STATUS = { REGISTERED: 1, NOT_REGISTERED: 2, UNKNOWN: 3, VERIFICATION_FAILED: 4 };

// Types
interface MemberRecord {
  member_id: number;
  id_number: string;
  firstname: string;
  surname: string;
  voting_district_code: string | null;
}

interface UpdateStats {
  total_processed: number;
  registered: number;
  not_registered: number;
  failed: number;
  skipped: number;
  start_time: Date;
  end_time?: Date;
}

interface CommandLineArgs {
  dryRun: boolean;
  batchSize: number;
  rateLimit: number;
  province?: string;
  limit?: number;
}

// Helper Functions
function parseArgs(): CommandLineArgs {
  const args = process.argv.slice(2);
  const result: CommandLineArgs = {
    dryRun: args.includes('--dry-run'),
    batchSize: CONFIG.BATCH_SIZE,
    rateLimit: CONFIG.RATE_LIMIT_PER_MINUTE,
  };
  for (const arg of args) {
    if (arg.startsWith('--batch-size=')) result.batchSize = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--rate-limit=')) result.rateLimit = parseInt(arg.split('=')[1], 10);
    if (arg.startsWith('--province=')) result.province = arg.split('=')[1];
    if (arg.startsWith('--limit=')) result.limit = parseInt(arg.split('=')[1], 10);
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(start: Date, end: Date): string {
  const diff = end.getTime() - start.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

// Database Functions
async function getMembersToProcess(args: CommandLineArgs): Promise<MemberRecord[]> {
  let query = `
    SELECT member_id, id_number, firstname, surname, voting_district_code
    FROM members_consolidated
    WHERE id_number IS NOT NULL AND LENGTH(id_number) = 13
      AND (voter_registration_id IS NULL OR voter_registration_id = 3)
  `;
  const params: any[] = [];
  let paramIndex = 1;
  if (args.province) {
    query += ` AND province_code = $${paramIndex}`;
    params.push(args.province);
    paramIndex++;
  }
  query += ' ORDER BY member_id';
  if (args.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(args.limit);
  }
  return await prisma.$queryRawUnsafe(query, ...params) as MemberRecord[];
}

async function verifyAndUpdateMember(
  member: MemberRecord, dryRun: boolean, retryCount: number = 0
): Promise<{ success: boolean; isRegistered?: boolean; error?: string }> {
  try {
    const iecData = await iecApiService.verifyVoter(member.id_number);
    if (!iecData) return { success: false, error: 'No data returned from IEC API' };

    const votingDistrictCode = iecData.voting_district_code;
    const isRegistered = iecData.is_registered &&
                         votingDistrictCode !== VD_CODE_NOT_REGISTERED &&
                         votingDistrictCode !== undefined;
    const voterRegistrationId = isRegistered ? VOTER_REG_STATUS.REGISTERED : VOTER_REG_STATUS.NOT_REGISTERED;

    if (!dryRun) {
      await prisma.$executeRawUnsafe(`
        UPDATE members_consolidated
        SET voter_registration_id = $1, is_registered_voter = $2,
            last_voter_verification_date = NOW(),
            voting_district_code = COALESCE($3, voting_district_code), updated_at = NOW()
        WHERE member_id = $4
      `, voterRegistrationId, isRegistered, votingDistrictCode || null, member.member_id);
    }
    return { success: true, isRegistered };
  } catch (error: any) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      await sleep(CONFIG.RETRY_DELAY);
      return verifyAndUpdateMember(member, dryRun, retryCount + 1);
    }
    return { success: false, error: error.message };
  }
}

async function processBatch(
  batch: MemberRecord[], stats: UpdateStats, args: CommandLineArgs, batchNumber: number, totalBatches: number
): Promise<void> {
  console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);
  const delayBetweenRequests = Math.ceil(60000 / args.rateLimit);

  for (let i = 0; i < batch.length; i++) {
    const member = batch[i];
    const globalIndex = stats.total_processed + 1;
    process.stdout.write(`   [${globalIndex}] ${member.id_number} (${member.firstname} ${member.surname})... `);

    const result = await verifyAndUpdateMember(member, args.dryRun);
    stats.total_processed++;

    if (result.success) {
      if (result.isRegistered) { stats.registered++; console.log('✅ Registered'); }
      else { stats.not_registered++; console.log('❌ Not Registered'); }
    } else {
      stats.failed++;
      console.log(`⚠️ Failed: ${result.error}`);
    }

    if (i < batch.length - 1) await sleep(delayBetweenRequests);
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('='.repeat(70));
  console.log('🗳️  MEMBER VOTER REGISTRATION UPDATE SCRIPT');
  console.log('='.repeat(70));
  console.log(`Mode: ${args.dryRun ? '🔍 DRY RUN (no changes will be made)' : '🚀 PRODUCTION RUN'}`);
  console.log(`Batch Size: ${args.batchSize}`);
  console.log(`Rate Limit: ${args.rateLimit} requests/minute`);
  if (args.province) console.log(`Province Filter: ${args.province}`);
  if (args.limit) console.log(`Record Limit: ${args.limit}`);
  console.log('='.repeat(70));

  const stats: UpdateStats = {
    total_processed: 0, registered: 0, not_registered: 0, failed: 0, skipped: 0, start_time: new Date()
  };

  try {
    console.log('\n📋 Fetching members to process...');
    const members = await getMembersToProcess(args);
    console.log(`   Found ${members.length} members requiring verification`);

    if (members.length === 0) {
      console.log('\n✅ No members require voter registration verification.');
      return;
    }

    const totalBatches = Math.ceil(members.length / args.batchSize);
    const estimatedTime = Math.ceil((members.length * 60) / args.rateLimit / 60);
    console.log(`   Will process in ${totalBatches} batches`);
    console.log(`   Estimated time: ~${estimatedTime} minutes`);

    if (!args.dryRun) {
      console.log('\n⚠️  WARNING: This will update the database!');
      console.log('   Press Ctrl+C within 5 seconds to cancel...');
      await sleep(5000);
    }

    for (let i = 0; i < members.length; i += args.batchSize) {
      const batch = members.slice(i, i + args.batchSize);
      const batchNumber = Math.floor(i / args.batchSize) + 1;
      await processBatch(batch, stats, args, batchNumber, totalBatches);

      if (i + args.batchSize < members.length) {
        console.log(`\n⏳ Waiting ${CONFIG.DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
        await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
      }
    }

    stats.end_time = new Date();
    console.log('\n' + '='.repeat(70));
    console.log('📊 PROCESSING SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Processed: ${stats.total_processed}`);
    console.log(`   ✅ Registered: ${stats.registered}`);
    console.log(`   ❌ Not Registered: ${stats.not_registered}`);
    console.log(`   ⚠️  Failed: ${stats.failed}`);
    console.log(`Duration: ${formatDuration(stats.start_time, stats.end_time)}`);
    console.log(`Mode: ${args.dryRun ? 'DRY RUN (no changes made)' : 'PRODUCTION'}`);
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
