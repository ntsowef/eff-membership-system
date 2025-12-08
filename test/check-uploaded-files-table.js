const { PrismaClient } = require('../backend/node_modules/@prisma/client');

async function checkTable() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking if uploaded_files table exists...\n');
    
    // Check if table exists
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'uploaded_files'
    `;
    
    if (tables.length === 0) {
      console.log('❌ uploaded_files table does NOT exist!');
      console.log('\n📝 You need to run the migration:');
      console.log('   node backend/migrations/create-self-data-management-tables.sql');
      return;
    }
    
    console.log('✅ uploaded_files table exists');
    
    // Check table structure
    console.log('\n📋 Table structure:');
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'uploaded_files'
      ORDER BY ordinal_position
    `;
    
    console.table(columns);
    
    // Check if there are any records
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM uploaded_files
    `;
    
    console.log(`\n📊 Total records in uploaded_files: ${count[0].count}`);
    
    // Check recent uploads
    const recentUploads = await prisma.$queryRaw`
      SELECT file_id, original_filename, status, upload_timestamp, error_message
      FROM uploaded_files
      ORDER BY upload_timestamp DESC
      LIMIT 5
    `;
    
    if (recentUploads.length > 0) {
      console.log('\n📁 Recent uploads:');
      console.table(recentUploads);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === '42P01') {
      console.log('\n💡 The uploaded_files table does not exist.');
      console.log('   Run the migration script to create it.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();

