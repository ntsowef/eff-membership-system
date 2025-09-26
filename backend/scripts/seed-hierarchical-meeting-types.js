const mysql = require('mysql2/promise');

(async function seedMeetingTypes() {
  const connectionConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new',
    multipleStatements: false,
  };

  const TYPES = [
    {
      type_name: 'Ordinary PCT Meeting',
      type_code: 'pct_ordinary',
      description: 'Provincial Command Team ordinary meeting including Youth and Women leadership',
      hierarchy_level: 'Provincial',
      meeting_category: 'Regular',
      default_duration_minutes: 180,
      requires_quorum: 1,
      min_notice_days: 3,
      frequency_type: 'Monthly',
    },
    {
      type_name: 'Ordinary SRCT Meeting',
      type_code: 'srct_ordinary',
      description: 'Sub-Regional (Municipal) Command Team ordinary meeting including Youth and Women leadership',
      hierarchy_level: 'Municipal',
      meeting_category: 'Regular',
      default_duration_minutes: 180,
      requires_quorum: 1,
      min_notice_days: 3,
      frequency_type: 'Monthly',
    },
    {
      type_name: 'Ordinary BCT Meeting',
      type_code: 'bct_ordinary',
      description: 'Branch Command Team ordinary meeting including Youth and Women leadership',
      hierarchy_level: 'Ward',
      meeting_category: 'Regular',
      default_duration_minutes: 120,
      requires_quorum: 1,
      min_notice_days: 2,
      frequency_type: 'Monthly',
    },
    {
      type_name: 'Branch General Meeting',
      type_code: 'branch_general_meeting',
      description: 'Branch General Meeting inviting all ward members',
      hierarchy_level: 'Ward',
      meeting_category: 'Assembly',
      default_duration_minutes: 180,
      requires_quorum: 1,
      min_notice_days: 7,
      frequency_type: 'Quarterly',
    },
    {
      type_name: 'BGA Meeting',
      type_code: 'bga',
      description: 'Branch General Assembly meeting including leadership',
      hierarchy_level: 'Ward',
      meeting_category: 'Assembly',
      default_duration_minutes: 240,
      requires_quorum: 1,
      min_notice_days: 7,
      frequency_type: 'Annual',
    },
    {
      type_name: 'BPA Meeting',
      type_code: 'bpa',
      description: 'Branch People\'s Assembly meeting including leadership',
      hierarchy_level: 'Ward',
      meeting_category: 'Assembly',
      default_duration_minutes: 240,
      requires_quorum: 1,
      min_notice_days: 7,
      frequency_type: 'Annual',
    },
  ];

  let connection;
  try {
    console.log('Seeding hierarchical meeting types...');
    connection = await mysql.createConnection(connectionConfig);

    // Ensure meeting_types table exists and columns align (best-effort)
    const [exists] = await connection.execute(
      "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'meeting_types'"
    );
    if (!exists[0] || !exists[0].cnt) {
      throw new Error("meeting_types table does not exist. Please run migrations first.");
    }

    // Prepare UPSERT using type_code unique index
    const sql = `
      INSERT INTO meeting_types (
        type_name, type_code, description, hierarchy_level, meeting_category,
        default_duration_minutes, requires_quorum, min_notice_days, frequency_type, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        type_name = VALUES(type_name),
        description = VALUES(description),
        hierarchy_level = VALUES(hierarchy_level),
        meeting_category = VALUES(meeting_category),
        default_duration_minutes = VALUES(default_duration_minutes),
        requires_quorum = VALUES(requires_quorum),
        min_notice_days = VALUES(min_notice_days),
        frequency_type = VALUES(frequency_type),
        is_active = 1`;

    for (const t of TYPES) {
      const params = [
        t.type_name,
        t.type_code,
        t.description,
        t.hierarchy_level,
        t.meeting_category,
        t.default_duration_minutes,
        t.requires_quorum,
        t.min_notice_days,
        t.frequency_type,
      ];
      await connection.execute(sql, params);
      console.log(`  ✓ Upserted meeting type: ${t.type_code}`);
    }

    // Verify
    const [rows] = await connection.execute(
      "SELECT type_id, type_name, type_code, hierarchy_level, is_active FROM meeting_types WHERE type_code IN (?,?,?,?,?,?) ORDER BY type_code",
      TYPES.map(t => t.type_code)
    );
    console.table(rows);

    console.log('✅ Seeding completed successfully');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
})();

