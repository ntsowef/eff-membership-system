const { Pool } = require('pg');

const pool = new Pool({
  host: '69.164.245.173',
  port: 5432,
  user: 'eff_admin',
  password: 'Frames!123',
  database: 'eff_membership_database'
});

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE expelled_suspended_members (
        id SERIAL PRIMARY KEY,
        row_number INTEGER,
        subregion VARCHAR(100),
        ward_no VARCHAR(20),
        name_and_surname VARCHAR(200),
        id_number VARCHAR(13),
        firstname VARCHAR(100),
        surname VARCHAR(100),
        original_member_id INTEGER,
        original_member_data JSONB,
        province_code VARCHAR(10),
        province_name VARCHAR(100),
        municipality_code VARCHAR(20),
        municipality_name VARCHAR(200),
        ward_code VARCHAR(20),
        ward_name VARCHAR(200),
        cell_number VARCHAR(20),
        email VARCHAR(255),
        removal_reason VARCHAR(100) DEFAULT 'Termination of Membership',
        removal_type VARCHAR(50) DEFAULT 'terminated',
        removal_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        removed_by_user_id INTEGER,
        removal_notes TEXT,
        search_method VARCHAR(50),
        match_confidence VARCHAR(20),
        batch_id VARCHAR(50),
        source_file VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
      )
    `);
    console.log('✅ Table expelled_suspended_members created');

    // Create indexes
    await pool.query('CREATE INDEX idx_expelled_id_number ON expelled_suspended_members (id_number)');
    console.log('✅ Index: idx_expelled_id_number');

    await pool.query('CREATE INDEX idx_expelled_original_member_id ON expelled_suspended_members (original_member_id)');
    console.log('✅ Index: idx_expelled_original_member_id');

    await pool.query('CREATE INDEX idx_expelled_removal_date ON expelled_suspended_members (removal_date)');
    console.log('✅ Index: idx_expelled_removal_date');

    await pool.query('CREATE INDEX idx_expelled_batch_id ON expelled_suspended_members (batch_id)');
    console.log('✅ Index: idx_expelled_batch_id');

    await pool.query('CREATE INDEX idx_expelled_province ON expelled_suspended_members (province_code)');
    console.log('✅ Index: idx_expelled_province');

    await pool.query('CREATE INDEX idx_expelled_name ON expelled_suspended_members (firstname, surname)');
    console.log('✅ Index: idx_expelled_name');

    await pool.query('CREATE INDEX idx_expelled_subregion ON expelled_suspended_members (subregion)');
    console.log('✅ Index: idx_expelled_subregion');

    // Verify
    const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'expelled_suspended_members' ORDER BY ordinal_position");
    console.log(`\n✅ Done! Table created with ${result.rows.length} columns and 7 indexes on production.`);

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

createTable();

