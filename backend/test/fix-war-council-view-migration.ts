/**
 * Fix vw_war_council_structure view to use members_consolidated
 */

import { executeQuery, initializeDatabase } from '../src/config/database';

async function fixView() {
  await initializeDatabase();
  
  try {
    console.log('\n🔧 Fixing vw_war_council_structure View\n');
    console.log('='.repeat(80));
    
    // Drop and recreate the view
    const migration = `
      DROP VIEW IF EXISTS vw_war_council_structure;

      CREATE OR REPLACE VIEW vw_war_council_structure AS
      SELECT 
        lp.id AS position_id,
        lp.position_name,
        lp.position_code,
        lp.hierarchy_level,
        lp.position_order AS order_index,
        lp.is_active,
        la.id AS appointment_id,
        la.member_id,
        TRIM(COALESCE(m.firstname || ' ' || m.surname, '')) AS current_appointee,
        la.start_date AS appointment_start_date,
        la.end_date AS appointment_end_date,
        la.appointment_status,
        CASE
          WHEN lp.position_code LIKE 'CCT_%' THEN
            CASE lp.position_code
              WHEN 'CCT_EC' THEN 'Eastern Cape'
              WHEN 'CCT_FS' THEN 'Free State'
              WHEN 'CCT_GP' THEN 'Gauteng'
              WHEN 'CCT_KZN' THEN 'KwaZulu-Natal'
              WHEN 'CCT_LP' THEN 'Limpopo'
              WHEN 'CCT_MP' THEN 'Mpumalanga'
              WHEN 'CCT_NC' THEN 'Northern Cape'
              WHEN 'CCT_NW' THEN 'North West'
              WHEN 'CCT_WC' THEN 'Western Cape'
              ELSE NULL
            END
          ELSE NULL
        END AS province_name,
        CASE
          WHEN la.id IS NOT NULL AND la.appointment_status = 'Active' THEN 'Filled'
          ELSE 'Vacant'
        END AS position_status
      FROM leadership_positions lp
      LEFT JOIN leadership_appointments la ON lp.id = la.position_id 
        AND la.appointment_status = 'Active'
      LEFT JOIN members_consolidated m ON la.member_id = m.member_id
      WHERE lp.id IN (1, 2, 3, 4, 5, 6, 17, 18, 19, 20, 21, 22, 23, 24, 25)
        AND lp.is_active = true
      ORDER BY lp.position_order;
    `;
    
    console.log('📝 Dropping old view...');
    console.log('📝 Creating new view with members_consolidated...\n');
    
    await executeQuery(migration);
    
    console.log('✅ View fixed successfully!\n');
    
    // Test the view
    console.log('🧪 Testing the view...\n');
    const testQuery = `SELECT * FROM vw_war_council_structure LIMIT 3;`;
    const result = await executeQuery(testQuery);
    console.table(result);
    
    console.log('\n✅ Migration complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixView();

