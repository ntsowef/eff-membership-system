import { initializeDatabase, executeQuery, executeQuerySingle } from '../src/config/database';

async function main() {
  try {
    await initializeDatabase();
    
    // 1. Check normalization
    const leadingZeroCount = await executeQuerySingle("SELECT COUNT(*) as count FROM members_consolidated WHERE cell_number LIKE '0%' AND length(cell_number) = 11");
    console.log('Numbers starting with 0 (expected 0):', leadingZeroCount.count);
    
    const nineDigitCount = await executeQuerySingle("SELECT COUNT(*) as count FROM members_consolidated WHERE length(cell_number) = 9 AND (cell_number LIKE '6%' OR cell_number LIKE '7%' OR cell_number LIKE '8%')");
    console.log('9-digit mobile numbers (expected 0):', nineDigitCount.count);

    // 2. Check duplicate flagging
    const isDuplicateCount = await executeQuerySingle("SELECT COUNT(*) as count FROM members_consolidated WHERE is_duplicate = TRUE");
    console.log('Total flagged as duplicate:', isDuplicateCount.count);
    
    const duplicateValidation = await executeQuery("SELECT cell_number, COUNT(*) FROM members_consolidated WHERE is_duplicate = TRUE GROUP BY cell_number HAVING COUNT(*) < 2 LIMIT 5");
    console.log('Flagged as duplicate but NOT sharing a number (expected 0):', duplicateValidation.length);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
