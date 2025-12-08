const fs = require('fs');
const path = require('path');

// Files to update with their specific replacements
const filesToUpdate = [
  // Models
  'src/models/analytics.ts',
  'src/models/bulkOperations.ts',
  'src/models/documents.ts',
  'src/models/elections.ts',
  'src/models/leadership.ts',
  'src/models/meetingDocuments.ts',
  'src/models/meetings.ts',
  'src/models/memberRenewalRequests.ts',
  'src/models/members.ts',
  'src/models/memberSearch.ts',
  'src/models/membershipRenewals.ts',
  'src/models/notifications.ts',
  'src/models/users.ts',
  'src/models/voterVerifications.ts',
  'src/models/wardAudit.ts',

  // Routes
  'src/routes/adminManagement.ts',
  'src/routes/bulkOperations.ts',
  'src/routes/externalRenewal.ts',
  'src/routes/hierarchicalMeetings.ts',
  'src/routes/memberRenewalSimple.ts',
  'src/routes/memberSearch.ts',
  'src/routes/members.ts',
  'src/routes/renewalAdministrative.ts',
  'src/routes/renewalBulkUpload.ts',
  'src/routes/statistics.ts',

  // Services
  'src/services/analyticsService.ts',
  'src/services/birthdaySMSService.ts',
  'src/services/excelReportService.ts',
  'src/services/hierarchicalMeetingService.ts',
  'src/services/importExportService.ts',
  'src/services/leadershipService.ts',
  'src/services/memberApplicationBulkUploadService.ts',
  'src/services/memberAuditService.ts',
  'src/services/meetingInvitationService.ts',
  'src/services/meetingNotificationService.ts',
  'src/services/membershipApprovalService.ts',
  'src/services/pdfExportService.ts',
  'src/services/queueService.ts',
  'src/services/renewalAdministrativeService.ts',
  'src/services/renewalBulkUploadService.ts',
  'src/services/renewalService.ts',
  'src/services/twoTierApprovalService.ts',
  'src/services/viewsService.ts',
  'src/services/votingDistrictsService.ts'
];

// Patterns to replace
const replacements = [
  { from: /FROM members m\b/g, to: 'FROM members_consolidated m' },
  { from: /FROM members\b(?!\w)/g, to: 'FROM members_consolidated' },
  { from: /JOIN members m\b/g, to: 'JOIN members_consolidated m' },
  { from: /JOIN members mem\b/g, to: 'JOIN members_consolidated mem' },
  { from: /JOIN members creator\b/g, to: 'JOIN members_consolidated creator' },
  { from: /JOIN members p\b/g, to: 'JOIN members_consolidated p' },
  { from: /JOIN members s\b/g, to: 'JOIN members_consolidated s' },
  { from: /JOIN members\b(?!\w)/g, to: 'JOIN members_consolidated' },
  { from: /DELETE FROM members WHERE/g, to: 'DELETE FROM members_consolidated WHERE' },
  { from: /INSERT INTO members\b/g, to: 'INSERT INTO members_consolidated' },
  { from: /UPDATE members SET/g, to: 'UPDATE members_consolidated SET' },
];

let totalFiles = 0;
let totalReplacements = 0;
const results = [];

console.log('🔧 Starting update of members table references...\n');

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let fileChanged = false;
  let fileReplacements = 0;
  
  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      fileChanged = true;
      fileReplacements += matches.length;
      totalReplacements += matches.length;
    }
  });
  
  if (fileChanged) {
    // Create backup
    const backupPath = fullPath + '.backup';
    fs.writeFileSync(backupPath, fs.readFileSync(fullPath));
    
    // Write updated content
    fs.writeFileSync(fullPath, content, 'utf8');
    
    totalFiles++;
    results.push({ file: filePath, replacements: fileReplacements });
    console.log(`✅ Updated: ${filePath} (${fileReplacements} replacements)`);
  } else {
    console.log(`⏭️  Skipped: ${filePath} (no changes needed)`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 Summary:');
console.log('='.repeat(60));
console.log(`Files updated: ${totalFiles}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log('');

if (results.length > 0) {
  console.log('📋 Detailed Results:');
  results.forEach(({ file, replacements }) => {
    console.log(`   ${file}: ${replacements} replacements`);
  });
  console.log('');
}

console.log('✅ Update complete!');
console.log('');
console.log('⚠️  IMPORTANT:');
console.log('   1. Backup files created with .backup extension');
console.log('   2. Please test the application thoroughly');
console.log('   3. Run: npm run build && npm start');
console.log('   4. If issues occur, restore from .backup files');
console.log('');
console.log('To remove backup files after testing:');
console.log('   find src -name "*.backup" -delete');

