const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'eff_admin',
  password: process.env.DB_PASSWORD || 'Frames!123',
  database: process.env.DB_NAME || 'eff_membership_database'
});

const indexes = [
  // All indexes on members_consolidated table (the correct table)
  {
    name: 'idx_members_consolidated_created_at',
    sql: 'CREATE INDEX IF NOT EXISTS idx_members_consolidated_created_at ON members_consolidated(created_at)',
    description: 'Index for growth statistics and trend analysis'
  },
  {
    name: 'idx_members_consolidated_expiry_date',
    sql: 'CREATE INDEX IF NOT EXISTS idx_members_consolidated_expiry_date ON members_consolidated(expiry_date)',
    description: 'Index for expiry analysis and expired member counts'
  },
  {
    name: 'idx_members_consolidated_membership_status_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_members_consolidated_membership_status_id ON members_consolidated(membership_status_id)',
    description: 'Index for active member counts and status filtering'
  },
  {
    name: 'idx_members_consolidated_province_code',
    sql: 'CREATE INDEX IF NOT EXISTS idx_members_consolidated_province_code ON members_consolidated(province_code)',
    description: 'Index for province filtering'
  },
  {
    name: 'idx_members_consolidated_municipality_code',
    sql: 'CREATE INDEX IF NOT EXISTS idx_members_consolidated_municipality_code ON members_consolidated(municipality_code)',
    description: 'Index for municipality filtering'
  },
  {
    name: 'idx_members_consolidated_ward_code',
    sql: 'CREATE INDEX IF NOT EXISTS idx_members_consolidated_ward_code ON members_consolidated(ward_code)',
    description: 'Index for ward filtering'
  },
  {
    name: 'idx_members_consolidated_gender_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_members_consolidated_gender_id ON members_consolidated(gender_id)',
    description: 'Index for demographic queries (gender distribution)'
  },
  {
    name: 'idx_members_consolidated_age',
    sql: 'CREATE INDEX IF NOT EXISTS idx_members_consolidated_age ON members_consolidated(age)',
    description: 'Index for age distribution queries'
  },
  {
    name: 'idx_members_consolidated_subscription_type_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_members_consolidated_subscription_type_id ON members_consolidated(subscription_type_id)',
    description: 'Index for new vs renewal analysis'
  },
  {
    name: 'idx_members_consolidated_date_joined',
    sql: 'CREATE INDEX IF NOT EXISTS idx_members_consolidated_date_joined ON members_consolidated(date_joined)',
    description: 'Index for membership date queries'
  },
  {
    name: 'idx_voting_stations_is_active',
    sql: 'CREATE INDEX IF NOT EXISTS idx_voting_stations_is_active ON voting_stations(is_active)',
    description: 'Index for active station counts'
  }
];

async function addIndexes() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting performance index creation...\n');
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const index of indexes) {
      try {
        console.log(`📝 Creating index: ${index.name}`);
        console.log(`   ${index.description}`);
        
        const startTime = Date.now();
        await client.query(index.sql);
        const duration = Date.now() - startTime;
        
        console.log(`   ✅ Created in ${duration}ms\n`);
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⏭️  Already exists\n`);
          skipCount++;
        } else {
          console.error(`   ❌ Error: ${error.message}\n`);
          errorCount++;
        }
      }
    }
    
    // Analyze tables
    console.log('📊 Analyzing tables to update statistics...\n');
    const tables = ['members_consolidated', 'wards', 'municipalities', 'districts', 'provinces', 'voting_stations', 'membership_statuses', 'genders'];
    
    for (const table of tables) {
      try {
        await client.query(`ANALYZE ${table}`);
        console.log(`   ✅ Analyzed ${table}`);
      } catch (error) {
        console.error(`   ❌ Error analyzing ${table}: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 Index Creation Summary:');
    console.log(`   ✅ Successfully created: ${successCount}`);
    console.log(`   ⏭️  Already existed: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));
    
    if (successCount > 0 || skipCount > 0) {
      console.log('\n✨ Performance indexes are now in place!');
      console.log('🚀 Dashboard queries should be significantly faster.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addIndexes();

