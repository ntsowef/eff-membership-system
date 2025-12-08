const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123'
});

// All 135 wards for City of Johannesburg
// Ward codes follow the pattern: JHB + ward_number padded to 3 digits
const jhbWards = [
  // Region G (Deep South) - Wards 1-23
  { ward_number: 1, ward_name: 'Orange Farm Extension 1', description: 'Orange Farm Extension 1' },
  { ward_number: 2, ward_name: 'Orange Farm Extension 2', description: 'Orange Farm Extension 2' },
  { ward_number: 3, ward_name: 'Orange Farm Extension 3', description: 'Orange Farm Extension 3' },
  { ward_number: 4, ward_name: 'Orange Farm Extension 4', description: 'Orange Farm Extension 4' },
  { ward_number: 5, ward_name: 'Stretford and Orange Farm Extension 5', description: 'Stretford and Orange Farm Extension 5' },
  { ward_number: 6, ward_name: 'Orlando East and West', description: 'Orlando East and West' },
  { ward_number: 7, ward_name: 'Drieziek and Orange Farm Extension 7', description: 'Drieziek and Orange Farm Extension 7' },
  { ward_number: 8, ward_name: 'Drieziek Extensions', description: 'Drieziek Extensions' },
  { ward_number: 9, ward_name: 'Meadowlands East Zone 3 and 4', description: 'Meadowlands East Zone 3 and 4' },
  { ward_number: 10, ward_name: 'Lenasia South', description: 'Lenasia South' },
  { ward_number: 11, ward_name: 'Pimville Zone 1 and 2', description: 'Pimville Zone 1 and 2' },
  { ward_number: 12, ward_name: 'Lenasia Extension 13', description: 'Lenasia Extension 13' },
  { ward_number: 13, ward_name: 'Dobsonville and Dobsonville Gardens', description: 'Dobsonville and Dobsonville Gardens' },
  { ward_number: 14, ward_name: 'Zakariyya Park and Ennerdale', description: 'Zakariyya Park and Ennerdale' },
  { ward_number: 15, ward_name: 'Noordgesig and Pennyville', description: 'Noordgesig and Pennyville' },
  { ward_number: 16, ward_name: 'Eldorado Park Extensions', description: 'Eldorado Park Extensions' },
  { ward_number: 17, ward_name: 'Meadowlands West Zone 9', description: 'Meadowlands West Zone 9' },
  { ward_number: 18, ward_name: 'Eldorado Park Proper', description: 'Eldorado Park Proper' },
  { ward_number: 19, ward_name: 'Diepkloof Zone 1-5', description: 'Diepkloof Zone 1-5' },
  { ward_number: 20, ward_name: 'Freedom Park and Devland', description: 'Freedom Park and Devland' },
  { ward_number: 21, ward_name: 'Orlando West', description: 'Orlando West' },
  { ward_number: 22, ward_name: 'Winchester Hills and Mayfield Park', description: 'Winchester Hills and Mayfield Park' },
  { ward_number: 23, ward_name: 'Naturena and Ridgeway', description: 'Naturena and Ridgeway' },
  
  // Region D (Soweto) - Wards 24-44, 76
  { ward_number: 24, ward_name: 'Protea Glen', description: 'Protea Glen' },
  { ward_number: 25, ward_name: 'Soweto Ward 25', description: 'Soweto Ward 25' },
  { ward_number: 26, ward_name: 'Soweto Ward 26', description: 'Soweto Ward 26' },
  { ward_number: 27, ward_name: 'Soweto Ward 27', description: 'Soweto Ward 27' },
  { ward_number: 28, ward_name: 'Zola and Jabulani', description: 'Zola and Jabulani' },
  { ward_number: 29, ward_name: 'Meadowlands East Zone 1', description: 'Meadowlands East Zone 1' },
  { ward_number: 30, ward_name: 'Meadowlands East Zone 2', description: 'Meadowlands East Zone 2' },
  { ward_number: 31, ward_name: 'Meadowlands West Zone 6-8', description: 'Meadowlands West Zone 6-8' },
  { ward_number: 32, ward_name: 'Dube and Mofolo Central', description: 'Dube and Mofolo Central' },
  { ward_number: 33, ward_name: 'Moroka and White City', description: 'Moroka and White City' },
  { ward_number: 34, ward_name: 'Klipspruit and Klipspruit West', description: 'Klipspruit and Klipspruit West' },
  { ward_number: 35, ward_name: 'Protea South and Chiawelo', description: 'Protea South and Chiawelo' },
  { ward_number: 36, ward_name: 'Protea North and Jabavu', description: 'Protea North and Jabavu' },
  { ward_number: 37, ward_name: 'Naledi and Slovoville', description: 'Naledi and Slovoville' },
  { ward_number: 38, ward_name: 'Moletsane and Molapo', description: 'Moletsane and Molapo' },
  { ward_number: 39, ward_name: 'Tladi and Phiri', description: 'Tladi and Phiri' },
  { ward_number: 40, ward_name: 'Mapetla and Phiri', description: 'Mapetla and Phiri' },
  { ward_number: 41, ward_name: 'Dobsonville Extension', description: 'Dobsonville Extension' },
  { ward_number: 42, ward_name: 'Meadowlands West Zone 10', description: 'Meadowlands West Zone 10' },
  { ward_number: 43, ward_name: 'Meadowlands West Zone 11', description: 'Meadowlands West Zone 11' },
  { ward_number: 44, ward_name: 'Orlando East', description: 'Orlando East' },
  { ward_number: 45, ward_name: 'Soweto Ward 45', description: 'Soweto Ward 45' },
  { ward_number: 46, ward_name: 'Soweto Ward 46', description: 'Soweto Ward 46' },
  { ward_number: 47, ward_name: 'Soweto Ward 47', description: 'Soweto Ward 47' },
  { ward_number: 48, ward_name: 'Soweto Ward 48', description: 'Soweto Ward 48' },
  { ward_number: 49, ward_name: 'Soweto Ward 49', description: 'Soweto Ward 49' },
  { ward_number: 50, ward_name: 'Soweto Ward 50', description: 'Soweto Ward 50' },
  
  // Region G (Deep South continued) - Wards 51-58
  { ward_number: 51, ward_name: 'Lenasia South and Ennerdale', description: 'Lenasia South and Ennerdale' },
  { ward_number: 52, ward_name: 'Kibler Park and Alveda', description: 'Kibler Park and Alveda' },
  { ward_number: 53, ward_name: 'Meredale and Southfork', description: 'Meredale and Southfork' },
  { ward_number: 54, ward_name: 'Mondeor and Alan Manor', description: 'Mondeor and Alan Manor' },
  { ward_number: 55, ward_name: 'Southgate and Tulisa Park', description: 'Southgate and Tulisa Park' },
  { ward_number: 56, ward_name: 'Mulbarton and Glenvista', description: 'Mulbarton and Glenvista' },
  { ward_number: 57, ward_name: 'Robertsham and The Hill', description: 'Robertsham and The Hill' },
  { ward_number: 58, ward_name: 'South Hills and Regents Park', description: 'South Hills and Regents Park' },
  
  // Region F (Inner City) - Wards 59-66, 120-126
  { ward_number: 59, ward_name: 'Doornfontein and Bertrams', description: 'Doornfontein and Bertrams' },
  { ward_number: 60, ward_name: 'Johannesburg CBD and Marshalltown', description: 'Johannesburg CBD and Marshalltown' },
  { ward_number: 61, ward_name: 'Inner City Ward 61', description: 'Inner City Ward 61' },
  { ward_number: 62, ward_name: 'Hillbrow and Berea', description: 'Hillbrow and Berea' },
  { ward_number: 63, ward_name: 'Joubert Park and End Street', description: 'Joubert Park and End Street' },
  { ward_number: 64, ward_name: 'Yeoville and Bellevue', description: 'Yeoville and Bellevue' },
  { ward_number: 65, ward_name: 'Inner City Ward 65', description: 'Inner City Ward 65' },
  { ward_number: 66, ward_name: 'Braamfontein and Parktown', description: 'Braamfontein and Parktown' },
  { ward_number: 67, ward_name: 'Inner City Ward 67', description: 'Inner City Ward 67' },
  { ward_number: 68, ward_name: 'Inner City Ward 68', description: 'Inner City Ward 68' },
  { ward_number: 69, ward_name: 'Inner City Ward 69', description: 'Inner City Ward 69' },
  
  // Region C (Roodepoort) - Wards 70-71, 83-85, 97, 127-129, 133
  { ward_number: 70, ward_name: 'Florida and Florida Park', description: 'Florida and Florida Park' },
  { ward_number: 71, ward_name: 'Constantia Kloof and Weltevreden Park', description: 'Constantia Kloof and Weltevreden Park' },
  { ward_number: 72, ward_name: 'Roodepoort Ward 72', description: 'Roodepoort Ward 72' },
  { ward_number: 73, ward_name: 'Roodepoort Ward 73', description: 'Roodepoort Ward 73' },
  { ward_number: 74, ward_name: 'Roodepoort Ward 74', description: 'Roodepoort Ward 74' },
  { ward_number: 75, ward_name: 'Roodepoort Ward 75', description: 'Roodepoort Ward 75' },
  { ward_number: 76, ward_name: 'Soweto Central', description: 'Soweto Central' },
  
  // Region A (Diepsloot/Midrand) - Wards 77-82, 92-93, 95-96, 105, 110-112
  { ward_number: 77, ward_name: 'Midrand Central and Halfway House', description: 'Midrand Central and Halfway House' },
  { ward_number: 78, ward_name: 'Ivory Park East', description: 'Ivory Park East' },
  { ward_number: 79, ward_name: 'Ivory Park Central', description: 'Ivory Park Central' },
  { ward_number: 80, ward_name: 'Rabie Ridge and Ebony Park', description: 'Rabie Ridge and Ebony Park' },
  { ward_number: 81, ward_name: 'Glen Austin and President Park', description: 'Glen Austin and President Park' },
  { ward_number: 82, ward_name: 'Carlswald and Vorna Valley', description: 'Carlswald and Vorna Valley' },
  { ward_number: 83, ward_name: 'Helderkruin and Roodekrans', description: 'Helderkruin and Roodekrans' },
  { ward_number: 84, ward_name: 'Northgate and Northriding', description: 'Northgate and Northriding' },
  { ward_number: 85, ward_name: 'Radiokop and Willowbrook', description: 'Radiokop and Willowbrook' },
  { ward_number: 86, ward_name: 'Johannesburg Ward 86', description: 'Johannesburg Ward 86' },
  { ward_number: 87, ward_name: 'Johannesburg East', description: 'Johannesburg East' },
  { ward_number: 88, ward_name: 'Randpark Ridge and Bromhof', description: 'Randpark Ridge and Bromhof' },
  { ward_number: 89, ward_name: 'Fairland and Roosevelt Park', description: 'Fairland and Roosevelt Park' },
  { ward_number: 90, ward_name: 'Gallo Manor and Wendywood', description: 'Gallo Manor and Wendywood' },
  { ward_number: 91, ward_name: 'Sandton Central and Morningside', description: 'Sandton Central and Morningside' },
  { ward_number: 92, ward_name: 'Sunninghill and Barbeque Downs', description: 'Sunninghill and Barbeque Downs' },
  { ward_number: 93, ward_name: 'Diepsloot West', description: 'Diepsloot West' },
  { ward_number: 94, ward_name: 'Parkmore and Benmore', description: 'Parkmore and Benmore' },
  { ward_number: 95, ward_name: 'Diepsloot East', description: 'Diepsloot East' },
  { ward_number: 96, ward_name: 'Riversands and Fourways', description: 'Riversands and Fourways' },
  { ward_number: 97, ward_name: 'Discovery and Florida Glen', description: 'Discovery and Florida Glen' },
  { ward_number: 98, ward_name: 'Linden and Victory Park', description: 'Linden and Victory Park' },
  { ward_number: 99, ward_name: 'Parktown North and Rosebank', description: 'Parktown North and Rosebank' },
  { ward_number: 100, ward_name: 'Johannesburg Ward 100', description: 'Johannesburg Ward 100' },
  { ward_number: 101, ward_name: 'Johannesburg Ward 101', description: 'Johannesburg Ward 101' },
  { ward_number: 102, ward_name: 'Blairgowrie and Craighall', description: 'Blairgowrie and Craighall' },
  { ward_number: 103, ward_name: 'Illovo and Atholl', description: 'Illovo and Atholl' },
  { ward_number: 104, ward_name: 'Parkview and Westcliff', description: 'Parkview and Westcliff' },
  { ward_number: 105, ward_name: 'Midrand South', description: 'Midrand South' },
  { ward_number: 106, ward_name: 'Johannesburg Ward 106', description: 'Johannesburg Ward 106' },
  { ward_number: 107, ward_name: 'Alexandra East Bank', description: 'Alexandra East Bank' },
  { ward_number: 108, ward_name: 'Alexandra West Bank', description: 'Alexandra West Bank' },
  { ward_number: 109, ward_name: 'Alexandra and Marlboro', description: 'Alexandra and Marlboro' },
  { ward_number: 110, ward_name: 'Marlboro Gardens and Kew', description: 'Marlboro Gardens and Kew' },
  { ward_number: 111, ward_name: 'Lombardy East and Rembrandt Park', description: 'Lombardy East and Rembrandt Park' },
  { ward_number: 112, ward_name: 'Diepsloot South', description: 'Diepsloot South' },
  { ward_number: 113, ward_name: 'Johannesburg Ward 113', description: 'Johannesburg Ward 113' },
  { ward_number: 114, ward_name: 'Johannesburg Ward 114', description: 'Johannesburg Ward 114' },
  { ward_number: 115, ward_name: 'Johannesburg Ward 115', description: 'Johannesburg Ward 115' },
  { ward_number: 116, ward_name: 'Wynberg and Bramley', description: 'Wynberg and Bramley' },
  { ward_number: 117, ward_name: 'Bryanston East', description: 'Bryanston East' },
  { ward_number: 118, ward_name: 'Johannesburg Ward 118', description: 'Johannesburg Ward 118' },
  { ward_number: 119, ward_name: 'Johannesburg Ward 119', description: 'Johannesburg Ward 119' },
  { ward_number: 120, ward_name: 'Jeppestown and Troyeville', description: 'Jeppestown and Troyeville' },
  { ward_number: 121, ward_name: 'Benrose and Denver', description: 'Benrose and Denver' },
  { ward_number: 122, ward_name: 'Malvern and Kensington', description: 'Malvern and Kensington' },
  { ward_number: 123, ward_name: 'City and Suburban', description: 'City and Suburban' },
  { ward_number: 124, ward_name: 'Newtown and Fordsburg', description: 'Newtown and Fordsburg' },
  { ward_number: 125, ward_name: 'Ferreirasdorp and Westgate', description: 'Ferreirasdorp and Westgate' },
  { ward_number: 126, ward_name: 'Vrededorp and Pageview', description: 'Vrededorp and Pageview' },
  { ward_number: 127, ward_name: 'Roodepoort CBD', description: 'Roodepoort CBD' },
  { ward_number: 128, ward_name: 'Princess and Grobler Park', description: 'Princess and Grobler Park' },
  { ward_number: 129, ward_name: 'Little Falls and Strubensvallei', description: 'Little Falls and Strubensvallei' },
  { ward_number: 130, ward_name: 'Randburg CBD', description: 'Randburg CBD' },
  { ward_number: 131, ward_name: 'Ferndale and Bordeaux', description: 'Ferndale and Bordeaux' },
  { ward_number: 132, ward_name: 'Northcliff and Montgomery Park', description: 'Northcliff and Montgomery Park' },
  { ward_number: 133, ward_name: 'Honeydew and Zandspruit', description: 'Honeydew and Zandspruit' },
  { ward_number: 134, ward_name: 'Bryanston West', description: 'Bryanston West' },
  { ward_number: 135, ward_name: 'Alexandra North', description: 'Alexandra North' },
];

async function importWards() {
  const client = await pool.connect();

  try {
    console.log('🏛️  Importing City of Johannesburg Wards');
    console.log('==========================================\n');

    // Start transaction
    await client.query('BEGIN');

    // Check existing wards
    const existingResult = await client.query(`
      SELECT COUNT(*) as count
      FROM wards
      WHERE municipality_code = 'JHB'
    `);
    console.log(`� Existing JHB wards: ${existingResult.rows[0].count}\n`);

    // Insert all wards
    let insertedCount = 0;
    let skippedCount = 0;

    for (const ward of jhbWards) {
      const wardCode = `JHB${String(ward.ward_number).padStart(3, '0')}`;

      try {
        await client.query(`
          INSERT INTO wards (
            ward_code,
            ward_name,
            ward_number,
            municipality_code,
            is_active
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (ward_code) DO UPDATE SET
            ward_name = EXCLUDED.ward_name,
            ward_number = EXCLUDED.ward_number,
            updated_at = CURRENT_TIMESTAMP
        `, [wardCode, ward.ward_name, ward.ward_number, 'JHB', true]);

        insertedCount++;

        if (insertedCount % 20 === 0) {
          console.log(`✅ Inserted ${insertedCount} wards...`);
        }
      } catch (error) {
        console.error(`❌ Failed to insert ward ${wardCode}:`, error.message);
        skippedCount++;
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n✅ Import Complete!');
    console.log(`   - Total wards: ${jhbWards.length}`);
    console.log(`   - Inserted: ${insertedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);

    // Verify the import
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count
      FROM wards
      WHERE municipality_code = 'JHB'
    `);

    console.log(`\n📊 Total JHB wards in database: ${verifyResult.rows[0].count}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importWards().catch(console.error);

