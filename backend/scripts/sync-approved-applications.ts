import { executeQuery, executeQuerySingle } from '../src/config/database';
import { MembershipApplicationModel } from '../src/models/membershipApplications';
import { MembershipApprovalService } from '../src/services/membershipApprovalService';

async function syncApprovedApplications() {
  console.log('====================================================');
  console.log('SYNC APPROVED APPLICATIONS TO MEMBERS_CONSOLIDATED');
  console.log('====================================================\n');

  try {
    // 1. Fetch all approved applications
    const approvedApps = await executeQuery<{
      application_id: number;
      application_number: string;
      id_number: string;
      first_name: string;
      last_name: string;
      status: string;
      created_at: string;
    }>(`
      SELECT application_id, application_number, id_number, first_name, last_name, status, created_at
      FROM membership_applications
      WHERE LOWER(status) = 'approved'
      ORDER BY application_id ASC
    `);

    console.log(`📊 Found ${approvedApps.length} approved applications in total.\n`);

    let syncedCount = 0;
    let existingCount = 0;
    let errorCount = 0;

    for (const appSummary of approvedApps) {
      const { application_id, id_number, first_name, last_name } = appSummary;

      // Check if member record already exists in members_consolidated
      const existingMember = await executeQuerySingle<{ member_id: number; membership_number: string }>(
        'SELECT member_id, membership_number FROM members_consolidated WHERE id_number = $1',
        [id_number]
      );

      if (existingMember) {
        console.log(`ℹ️ [ALREADY EXISTS] Application #${application_id} (${first_name} ${last_name}, ID: ${id_number}) -> Member ID ${existingMember.member_id} (${existingMember.membership_number})`);
        existingCount++;
        continue;
      }

      // Member missing in members_consolidated! Sync now.
      console.log(`⏳ [SYNCING] Application #${application_id} (${first_name} ${last_name}, ID: ${id_number}) is missing from members_consolidated. Creating member record...`);

      try {
        const fullApplication = await MembershipApplicationModel.getApplicationById(application_id);
        if (!fullApplication) {
          console.error(`❌ Could not load full application details for application #${application_id}`);
          errorCount++;
          continue;
        }

        const result = await MembershipApprovalService.createMemberWithMembershipFromApplication(fullApplication);
        console.log(`✅ [CREATED] Application #${application_id} -> Member ID ${result.member_id} (${result.membership_number})`);
        syncedCount++;
      } catch (err: any) {
        console.error(`❌ [ERROR] Failed to sync application #${application_id}:`, err?.message || err);
        errorCount++;
      }
    }

    console.log('\n====================================================');
    console.log('SYNC SUMMARY');
    console.log('====================================================');
    console.log(`- Total Approved Applications: ${approvedApps.length}`);
    console.log(`- Already Existing in members_consolidated: ${existingCount}`);
    console.log(`- Newly Synced to members_consolidated: ${syncedCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log('====================================================\n');

  } catch (error: any) {
    console.error('❌ Fatal error during sync:', error);
  } process.exit(0);
}

syncApprovedApplications();
