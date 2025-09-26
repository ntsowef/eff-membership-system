const { executeQuery, initializeDatabase } = require('./dist/config/database');

async function checkMemberFields() {
  try {
    console.log('🔍 Checking member table structure...\n');
    
    // Initialize database connection
    await initializeDatabase();

    // Check vw_member_details structure
    console.log('📋 vw_member_details view structure:');
    const viewStructureQuery = `DESCRIBE vw_member_details`;
    const viewStructure = await executeQuery(viewStructureQuery);
    
    console.log('Available fields:');
    viewStructure.forEach(field => {
      console.log(`- ${field.Field}: ${field.Type} (${field.Null === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Look for any date-related fields
    console.log('\n📅 Date-related fields:');
    const dateFields = viewStructure.filter(field => 
      field.Field.includes('date') || 
      field.Field.includes('expir') || 
      field.Field.includes('created') ||
      field.Field.includes('updated')
    );
    
    if (dateFields.length > 0) {
      dateFields.forEach(field => {
        console.log(`- ${field.Field}: ${field.Type}`);
      });
    } else {
      console.log('No obvious date/expiry fields found');
    }

    // Check if there's a members table directly
    console.log('\n📋 Checking members table structure:');
    try {
      const membersStructureQuery = `DESCRIBE members`;
      const membersStructure = await executeQuery(membersStructureQuery);
      
      console.log('Members table fields:');
      membersStructure.forEach(field => {
        console.log(`- ${field.Field}: ${field.Type} (${field.Null === 'YES' ? 'nullable' : 'not null'})`);
      });

      // Look for expiry fields in members table
      const memberDateFields = membersStructure.filter(field => 
        field.Field.includes('date') || 
        field.Field.includes('expir') || 
        field.Field.includes('created') ||
        field.Field.includes('updated')
      );
      
      if (memberDateFields.length > 0) {
        console.log('\n📅 Date-related fields in members table:');
        memberDateFields.forEach(field => {
          console.log(`- ${field.Field}: ${field.Type}`);
        });
      }

    } catch (error) {
      console.log('❌ Members table not found or not accessible');
    }

    // Check what tables exist
    console.log('\n📊 Available tables:');
    const tablesQuery = `SHOW TABLES`;
    const tables = await executeQuery(tablesQuery);
    
    const memberRelatedTables = tables.filter(table => 
      Object.values(table)[0].toLowerCase().includes('member')
    );
    
    console.log('Member-related tables:');
    memberRelatedTables.forEach(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });

    // Sample some data to understand the structure
    console.log('\n📊 Sample member data:');
    const sampleQuery = `SELECT * FROM vw_member_details LIMIT 3`;
    const sampleData = await executeQuery(sampleQuery);
    
    if (sampleData.length > 0) {
      console.log('Sample record fields:');
      Object.keys(sampleData[0]).forEach(key => {
        const value = sampleData[0][key];
        console.log(`- ${key}: ${value} (${typeof value})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking member fields:', error);
    process.exit(1);
  }
}

checkMemberFields();
