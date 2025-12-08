/**
 * Analyze Data Source: Check when and how data was inserted
 */

import { executeQuery, initializeDatabase } from '../src/config/database';

async function analyzeDataSource() {
  await initializeDatabase();
  
  try {
    console.log('\n🔍 DATA SOURCE ANALYSIS\n');
    console.log('='.repeat(80));
    
    // 1. Check created_at timestamps for MP members
    console.log('\n📅 1. MP Members Creation Timestamps (Sample):');
    console.log('-'.repeat(80));
    
    const mpTimestampsQuery = `
      SELECT 
        member_id,
        firstname,
        surname,
        province_code,
        district_code,
        municipality_code,
        ward_code,
        created_at
      FROM members_consolidated 
      WHERE province_code = 'MP'
      ORDER BY created_at ASC
      LIMIT 10;
    `;
    
    const mpTimestamps = await executeQuery(mpTimestampsQuery);
    console.table(mpTimestamps);
    
    // 2. Check created_at timestamps for EC members
    console.log('\n📅 2. EC Members Creation Timestamps (Sample):');
    console.log('-'.repeat(80));
    
    const ecTimestampsQuery = `
      SELECT 
        member_id,
        firstname,
        surname,
        province_code,
        district_code,
        municipality_code,
        ward_code,
        created_at
      FROM members_consolidated 
      WHERE province_code = 'EC'
      ORDER BY created_at ASC
      LIMIT 10;
    `;
    
    const ecTimestamps = await executeQuery(ecTimestampsQuery);
    console.table(ecTimestamps);
    
    // 3. Check if there's a pattern in member_id ranges
    console.log('\n🔢 3. Member ID Ranges by Province:');
    console.log('-'.repeat(80));
    
    const idRangesQuery = `
      SELECT 
        province_code,
        MIN(member_id) as min_member_id,
        MAX(member_id) as max_member_id,
        COUNT(*) as total_members,
        MIN(created_at) as earliest_created,
        MAX(created_at) as latest_created
      FROM members_consolidated 
      WHERE province_code IN ('MP', 'EC')
      GROUP BY province_code
      ORDER BY province_code;
    `;
    
    const idRanges = await executeQuery(idRangesQuery);
    console.table(idRanges);
    
    // 4. Check members_consolidated table columns
    console.log('\n📋 4. members_consolidated Table Structure:');
    console.log('-'.repeat(80));
    
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'members_consolidated'
        AND column_name IN ('municipality_code', 'district_code', 'ward_code', 'province_code')
      ORDER BY ordinal_position;
    `;
    
    const columns = await executeQuery(columnsQuery);
    console.table(columns);
    
    // 5. Check if there's an import log table
    console.log('\n📊 5. Check for Import/Export Logs:');
    console.log('-'.repeat(80));
    
    const importLogsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'import_export_logs'
      ) as import_logs_table_exists;
    `;
    
    const importLogsExists = await executeQuery(importLogsQuery);
    console.table(importLogsExists);
    
    if (importLogsExists[0]?.import_logs_table_exists) {
      console.log('\n📜 Import/Export Logs (Recent):');
      const logsQuery = `
        SELECT 
          import_id,
          operation_type,
          entity_type,
          total_records,
          status,
          created_at
        FROM import_export_logs
        ORDER BY created_at DESC
        LIMIT 10;
      `;
      
      const logs = await executeQuery(logsQuery);
      console.table(logs);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis Complete!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    process.exit(0);
  }
}

analyzeDataSource();

