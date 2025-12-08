/**
 * List All API Endpoints
 * Generates a comprehensive list of all available API endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// All registered route prefixes from app.ts
const routePrefixes = [
  { prefix: '/auth', name: 'Authentication' },
  { prefix: '/health', name: 'Health Check' },
  { prefix: '/prisma-health', name: 'Prisma Health Check' },
  { prefix: '/maintenance', name: 'Maintenance Mode' },
  { prefix: '/geographic', name: 'Geographic Data' },
  { prefix: '/members', name: 'Members Management' },
  { prefix: '/memberships', name: 'Memberships' },
  { prefix: '/membership-applications', name: 'Membership Applications' },
  { prefix: '/reference', name: 'Reference Data' },
  { prefix: '/documents', name: 'Documents' },
  { prefix: '/notifications', name: 'Notifications' },
  { prefix: '/audit-logs', name: 'Audit Logs' },
  { prefix: '/profile', name: 'Member Profile' },
  { prefix: '/lookups', name: 'Lookups' },
  { prefix: '/statistics', name: 'Statistics' },
  { prefix: '/membership-expiration', name: 'Membership Expiration' },
  { prefix: '/membership-renewal', name: 'Membership Renewal' },
  { prefix: '/renewal-admin', name: 'Renewal Administration' },
  { prefix: '/renewal-bulk-upload', name: 'Renewal Bulk Upload' },
  { prefix: '/member-application-bulk-upload', name: 'Member Application Bulk Upload' },
  { prefix: '/digital-cards', name: 'Digital Membership Cards' },
  { prefix: '/optimized-cards', name: 'Optimized Digital Cards' },
  { prefix: '/voter-verifications', name: 'Voter Verifications' },
  { prefix: '/renewals', name: 'Renewals' },
  { prefix: '/search', name: 'Member Search' },
  { prefix: '/audit', name: 'Member Audit' },
  { prefix: '/audit/ward-membership', name: 'Ward Membership Audit' },
  { prefix: '/ward-audit', name: 'Ward Audit (Compliance)' },
  { prefix: '/leadership', name: 'Leadership Management' },
  { prefix: '/elections', name: 'Elections' },
  { prefix: '/meetings', name: 'Meetings' },
  { prefix: '/hierarchical-meetings', name: 'Hierarchical Meetings' },
  { prefix: '/meeting-documents', name: 'Meeting Documents' },
  { prefix: '/analytics', name: 'Analytics' },
  { prefix: '/bulk-operations', name: 'Bulk Operations' },
  { prefix: '/system', name: 'System Management' },
  { prefix: '/security', name: 'Security' },
  { prefix: '/import-export', name: 'Import/Export' },
  { prefix: '/sms', name: 'SMS Management' },
  { prefix: '/sms-webhooks', name: 'SMS Webhooks' },
  { prefix: '/sms-test', name: 'SMS Integration Test' },
  { prefix: '/communication', name: 'Communication' },
  { prefix: '/birthday-sms', name: 'Birthday SMS' },
  { prefix: '/cache', name: 'Cache Management' },
  { prefix: '/session', name: 'Session Management' },
  { prefix: '/admin-management', name: 'Admin Management' },
  { prefix: '/mfa', name: 'Multi-Factor Authentication' },
  { prefix: '/views', name: 'Database Views' },
  { prefix: '/file-processing', name: 'File Processing' },
  { prefix: '/two-tier-approval', name: 'Two-Tier Approval' },
  { prefix: '/financial-dashboard', name: 'Financial Dashboard' },
  { prefix: '/financial-transactions', name: 'Financial Transactions' },
  { prefix: '/payments', name: 'Payments' },
  { prefix: '/simple-dashboard', name: 'Simple Dashboard' },
  { prefix: '/iec', name: 'IEC API Integration' },
  { prefix: '/iec-electoral-events', name: 'IEC Electoral Events' },
  { prefix: '/lge-ballot-results', name: 'LGE Ballot Results' }
];

// Known endpoint patterns for each route
const knownEndpoints = {
  '/auth': [
    'POST /login - User login',
    'POST /logout - User logout',
    'POST /refresh - Refresh token',
    'GET /me - Get current user info',
    'POST /change-password - Change password',
    'POST /forgot-password - Request password reset',
    'POST /reset-password - Reset password with token'
  ],
  '/health': [
    'GET / - Basic health check',
    'GET /detailed - Detailed health check with database',
    'GET /database - Database-specific health check',
    'GET /ready - Readiness probe (Kubernetes)',
    'GET /live - Liveness probe (Kubernetes)'
  ],
  '/geographic': [
    'GET / - List all geographic endpoints',
    'GET /provinces - Get all provinces',
    'GET /provinces/:code - Get province by code',
    'GET /districts - Get all districts',
    'GET /districts/:code - Get district by code',
    'GET /municipalities - Get all municipalities',
    'GET /municipalities/:code - Get municipality by code',
    'GET /subregions - Get all sub-regions (metros)',
    'GET /wards - Get all wards',
    'GET /wards/:code - Get ward by code',
    'GET /voting-districts - Get all voting districts',
    'GET /hierarchy/province/:provinceCode - Get province hierarchy',
    'GET /hierarchy/district/:districtCode - Get district hierarchy',
    'GET /hierarchy/municipality/:municipalityCode - Get municipality hierarchy'
  ],
  '/members': [
    'GET / - Get all members (paginated)',
    'GET /:id - Get member by ID',
    'POST / - Create new member',
    'PUT /:id - Update member',
    'DELETE /:id - Delete member',
    'GET /search - Search members',
    'GET /export - Export members data',
    'POST /bulk-import - Bulk import members',
    'GET /:id/history - Get member history',
    'GET /:id/audit-trail - Get member audit trail'
  ],
  '/leadership': [
    'GET /positions - Get all leadership positions',
    'GET /positions/:id - Get position by ID',
    'POST /positions - Create leadership position',
    'PUT /positions/:id - Update leadership position',
    'DELETE /positions/:id - Delete leadership position',
    'GET /appointments - Get all appointments',
    'GET /appointments/:id - Get appointment by ID',
    'POST /appointments - Create appointment',
    'PUT /appointments/:id - Update appointment',
    'DELETE /appointments/:id - Delete appointment',
    'GET /hierarchy/:level - Get positions by hierarchy level',
    'GET /available-positions - Get vacant positions',
    'POST /assign - Assign member to position'
  ],
  '/hierarchical-meetings': [
    'GET / - Get all meetings',
    'GET /:id - Get meeting by ID',
    'POST / - Create new meeting',
    'PUT /:id - Update meeting',
    'DELETE /:id - Delete meeting',
    'GET /by-level/:level - Get meetings by hierarchy level',
    'POST /:id/attendance - Record attendance',
    'GET /:id/attendance - Get meeting attendance',
    'POST /:id/minutes - Add meeting minutes',
    'GET /:id/minutes - Get meeting minutes'
  ],
  '/ward-audit': [
    'GET /wards - Get wards by municipality with compliance data',
    'GET /ward/:ward_code/compliance - Get ward compliance summary',
    'POST /ward/:ward_code/approve - Approve ward compliance',
    'GET /ward/:ward_code/voting-districts - Get voting district compliance',
    'POST /ward/:ward_code/meeting - Create meeting record',
    'GET /ward/:ward_code/meetings - Get ward meetings',
    'GET /ward/:ward_code/meeting/latest - Get latest meeting',
    'GET /ward/:ward_code/compliance/details - Get detailed compliance (5 criteria)'
  ],
  '/audit/ward-membership': [
    'GET /wards - Get wards with membership statistics',
    'GET /municipalities - Get municipalities with performance data',
    'GET /ward/:wardCode/details - Get detailed ward information',
    'GET /municipality/:municipalityCode/details - Get detailed municipality information',
    'GET /export - Export audit report (PDF/Excel/CSV)',
    'GET /ward/:wardCode/export - Export ward details report',
    'GET /municipality/:municipalityCode/export - Export municipality details report'
  ],
  '/statistics': [
    'GET / - List all statistics endpoints',
    'GET /ward-membership - Ward membership statistics',
    'GET /demographics - Overall demographics',
    'GET /demographics/ward/:wardCode - Ward demographics',
    'GET /demographics/municipality/:municipalityCode - Municipality demographics',
    'GET /demographics/district/:districtCode - District demographics',
    'GET /demographics/province/:provinceCode - Province demographics',
    'GET /membership-trends - Membership trends over time',
    'GET /system - System statistics',
    'GET /dashboard - Dashboard statistics',
    'GET /compare - Compare statistics',
    'GET /export - Export statistics'
  ],
  '/digital-cards': [
    'GET /:memberId - Get digital membership card',
    'GET /:memberId/qr - Get QR code for card',
    'POST /:memberId/regenerate - Regenerate card',
    'GET /:memberId/download - Download card as PDF/PNG',
    'POST /verify - Verify card authenticity'
  ],
  '/payments': [
    'POST /initiate - Initiate payment',
    'GET /:transactionId - Get payment status',
    'POST /webhook - Payment webhook (Peach Payments)',
    'GET /history/:memberId - Get payment history',
    'POST /verify - Verify payment'
  ],
  '/sms': [
    'GET /templates - Get SMS templates',
    'POST /templates - Create SMS template',
    'PUT /templates/:id - Update SMS template',
    'DELETE /templates/:id - Delete SMS template',
    'POST /send - Send SMS',
    'POST /send-bulk - Send bulk SMS',
    'GET /history - Get SMS history',
    'GET /statistics - Get SMS statistics'
  ],
  '/communication': [
    'POST /announcements - Create announcement',
    'GET /announcements - Get announcements',
    'POST /messages - Send message',
    'GET /messages - Get messages',
    'POST /campaigns - Create campaign',
    'GET /campaigns - Get campaigns',
    'GET /analytics - Get communication analytics'
  ],
  '/financial-dashboard': [
    'GET /overview - Get financial overview',
    'GET /metrics - Get financial metrics',
    'GET /trends - Get financial trends',
    'GET /config - Get dashboard configuration',
    'GET /health - Dashboard health check'
  ],
  '/mfa': [
    'POST /setup - Setup MFA',
    'POST /verify - Verify MFA code',
    'POST /disable - Disable MFA',
    'GET /status - Get MFA status',
    'POST /backup-codes - Generate backup codes'
  ],
  '/security': [
    'GET /audit-logs - Get security audit logs',
    'GET /sessions - Get active sessions',
    'DELETE /sessions/:id - Terminate session',
    'GET /login-attempts - Get login attempts',
    'POST /block-ip - Block IP address',
    'GET /blocked-ips - Get blocked IPs'
  ]
};

async function listAllEndpoints() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 COMPLETE API ENDPOINTS LIST');
  console.log('='.repeat(80));
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Total Route Groups: ${routePrefixes.length}`);
  console.log('\n' + '='.repeat(80));

  let totalEndpoints = 0;

  for (const route of routePrefixes) {
    console.log(`\n\n🔹 ${route.name.toUpperCase()}`);
    console.log(`   Base Path: ${BASE_URL}${route.prefix}`);
    console.log('   ' + '-'.repeat(76));

    if (knownEndpoints[route.prefix]) {
      knownEndpoints[route.prefix].forEach(endpoint => {
        console.log(`   ${endpoint}`);
        totalEndpoints++;
      });
    } else {
      console.log(`   [Endpoints available - check route file for details]`);
      totalEndpoints++;
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Route Groups: ${routePrefixes.length}`);
  console.log(`Documented Endpoints: ${totalEndpoints}`);
  console.log(`\nNote: Some route groups may have additional endpoints not listed here.`);
  console.log(`Check individual route files in backend/src/routes/ for complete details.`);
  console.log('='.repeat(80) + '\n');
}

// Run the listing
listAllEndpoints().catch(console.error);

