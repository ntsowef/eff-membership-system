import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function main() {
  // 1. Load production environment
  const envPath = path.join(__dirname, '..', '.env.production');
  dotenv.config({ path: envPath });

  const pool = new Pool({
    host: '69.164.245.173',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('🔍 Starting Production Dry-Run (69.164.245.173)...');
    console.log(`📡 Connected to: ${process.env.DB_NAME} as ${process.env.DB_USER}`);

    // Check if is_duplicate column exists
    const colCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'members_consolidated' AND column_name = 'is_duplicate'
    `);
    
    if (colCheck.rows.length === 0) {
      console.log('ℹ️  Column "is_duplicate" does not exist yet on production.');
    } else {
      console.log('ℹ️  Column "is_duplicate" already exists on production.');
    }

    // 1. Analyze Normalization
    console.log('\n--- Normalization Analysis ---');
    const normAnalysis = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE (length(clean) = 10 AND clean LIKE '0%') OR (length(clean) = 9 AND (clean LIKE '6%' OR clean LIKE '7%' OR clean LIKE '8%'))) as needs_prefix,
        COUNT(*) FILTER (WHERE cell_number != clean) as has_non_numeric,
        COUNT(*) as total_populated
      FROM (
        SELECT cell_number, regexp_replace(cell_number, '\\D', '', 'g') as clean
        FROM members_consolidated
        WHERE cell_number IS NOT NULL AND cell_number != ''
      ) s
    `);
    
    const { needs_prefix, has_non_numeric, total_populated } = normAnalysis.rows[0];
    console.log(`Total populated cell_numbers: ${total_populated}`);
    console.log(`Records needing '27' prefix normalization: ${needs_prefix}`);
    console.log(`Records with non-numeric characters to be cleaned: ${has_non_numeric}`);

    // 2. Analyze Duplicates (based on current raw numbers vs normalized)
    console.log('\n--- Duplicate Analysis (Pre-normalization) ---');
    const rawDupAnalysis = await pool.query(`
      SELECT COUNT(*) as raw_dups
      FROM (
        SELECT cell_number
        FROM members_consolidated
        WHERE cell_number IS NOT NULL AND cell_number != ''
        GROUP BY cell_number
        HAVING COUNT(*) > 1
      ) s
    `);
    console.log(`Unique phone numbers shared by multiple records (raw): ${rawDupAnalysis.rows[0].raw_dups}`);

    console.log('\n--- Duplicate Analysis (Post-normalization Simulation) ---');
    const normDupAnalysis = await pool.query(`
      SELECT 
        COUNT(*) as unique_shared_numbers,
        SUM(member_count) as total_flagged_records
      FROM (
        SELECT normalized_number, COUNT(*) as member_count
        FROM (
          SELECT 
            CASE 
              WHEN length(clean) = 10 AND clean LIKE '0%' THEN '27' || substr(clean, 2)
              WHEN length(clean) = 9 AND (clean LIKE '6%' OR clean LIKE '7%' OR clean LIKE '8%') THEN '27' || clean
              ELSE clean
            END as normalized_number
          FROM (
            SELECT regexp_replace(cell_number, '\\D', '', 'g') as clean
            FROM members_consolidated
            WHERE cell_number IS NOT NULL AND cell_number != ''
          ) s
        ) t
        GROUP BY normalized_number
        HAVING COUNT(*) > 1
      ) final
    `);
    
    const { unique_shared_numbers, total_flagged_records } = normDupAnalysis.rows[0];
    console.log(`Unique phone numbers shared by multiple records (normalized): ${unique_shared_numbers}`);
    console.log(`Total records that will be flagged as duplicates: ${total_flagged_records}`);

    console.log('\n✅ Dry-Run completed. No changes were made to the production database.');
    
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Dry-Run failed:', err);
    await pool.end();
    process.exit(1);
  }
}

main();
