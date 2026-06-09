import { initializeDatabase, executeUpdate } from '../src/config/database';

async function main() {
  try {
    console.log('🚀 Starting phone number normalization and duplicate flagging...');
    await initializeDatabase();

    // 1. Normalize phone numbers
    console.log('--- Step 1: Normalizing phone numbers (27 prefix, remove non-numeric) ---');
    const normalizeResult = await executeUpdate(`
      UPDATE members_consolidated
      SET cell_number = normalized.cleaned
      FROM (
        SELECT 
          member_id,
          CASE 
            WHEN length(clean) = 10 AND clean LIKE '0%' THEN '27' || substr(clean, 2)
            WHEN length(clean) = 9 AND (clean LIKE '6%' OR clean LIKE '7%' OR clean LIKE '8%') THEN '27' || clean
            ELSE clean
          END as cleaned
        FROM (
          SELECT member_id, regexp_replace(cell_number, '\\D', '', 'g') as clean
          FROM members_consolidated
          WHERE cell_number IS NOT NULL AND cell_number != ''
        ) s
      ) normalized
      WHERE members_consolidated.member_id = normalized.member_id 
        AND (members_consolidated.cell_number IS DISTINCT FROM normalized.cleaned)
    `);
    console.log('✅ Normalized ' + normalizeResult.affectedRows + ' records.');

    // 2. Identify and flag duplicates
    console.log('--- Step 2: Flagging duplicate phone numbers ---');
    
    // First, reset any existing flags
    await executeUpdate("UPDATE members_consolidated SET is_duplicate = FALSE WHERE is_duplicate = TRUE");

    const flagResult = await executeUpdate(`
      UPDATE members_consolidated
      SET is_duplicate = TRUE
      WHERE cell_number IN (
        SELECT cell_number 
        FROM members_consolidated 
        WHERE cell_number IS NOT NULL AND cell_number != ''
        GROUP BY cell_number 
        HAVING COUNT(*) > 1
      )
    `);
    console.log('✅ Flagged ' + flagResult.affectedRows + ' duplicate records.');

    console.log('🎉 Processing completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during processing:', error);
    process.exit(1);
  }
}

main();
