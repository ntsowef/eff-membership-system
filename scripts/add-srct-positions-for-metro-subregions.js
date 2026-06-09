/**
 * Add SRCT-style leadership positions for Metro Sub-Regions.
 *
 * Regular municipalities have positions coded as:
 *   MCHAIR_{code}, MSEC_{code}, MTREAS_{code}, SRCT01-13_{code}
 *
 * Metro sub-regions were created with different codes:
 *   SRCHAIR_{code}, SRSEC_{code}, SRTREAS_{code}, SRCOM01-10_{code}
 *
 * This script adds the MCHAIR/MSEC/MTREAS/SRCT01-13 positions so the
 * bulk upload engine works consistently across all municipality types.
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost', port: 5432,
  user: 'eff_admin', password: 'Frames!123',
  database: 'eff_membership_database',
});

const POSITIONS = [
  { suffix: 'MCHAIR',  label: 'Municipal Chairperson', category: 'Executive',  core: true,  order: 1 },
  { suffix: 'MSEC',    label: 'Municipal Secretary',    category: 'Executive',  core: true,  order: 2 },
  { suffix: 'MTREAS',  label: 'Municipal Treasurer',    category: 'Executive',  core: true,  order: 3 },
  { suffix: 'MYOUTH',  label: 'Municipal Youth Leader', category: 'Sectoral',   core: true,  order: 4 },
  { suffix: 'MWOMEN',  label: 'Municipal Women Leader', category: 'Sectoral',   core: true,  order: 5 },
];
// SRCT Members 1-13
for (let i = 1; i <= 13; i++) {
  POSITIONS.push({
    suffix: `SRCT${String(i).padStart(2, '0')}`,
    label: `SRCT Member ${i}`,
    category: 'Committee',
    core: false,
    order: 5 + i,
  });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);

  // Get all metro sub-regions
  const { rows: metros } = await pool.query(`
    SELECT municipality_id, municipality_name, municipality_code
    FROM municipalities
    WHERE municipality_type = 'Metro Sub-Region' AND is_active = true
    ORDER BY municipality_code
  `);
  console.log(`Found ${metros.length} metro sub-regions\n`);

  // Get max position ID
  const { rows: [{ max_id }] } = await pool.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM leadership_positions`);
  let nextId = parseInt(max_id) + 1;

  let created = 0;
  let skipped = 0;

  for (const m of metros) {
    const muniId = m.municipality_id;
    const muniCode = m.municipality_code;
    const muniName = m.municipality_name;

    // Check which SRCT-style positions already exist for this sub-region
    const { rows: existing } = await pool.query(`
      SELECT position_code FROM leadership_positions
      WHERE entity_id = $1 AND hierarchy_level = 'Municipality'
    `, [muniId]);
    const existingCodes = new Set(existing.map(r => r.position_code));

    for (const pos of POSITIONS) {
      const code = `${pos.suffix}_${muniCode}`;
      if (existingCodes.has(code)) {
        skipped++;
        continue;
      }

      const name = `${muniName} Local Municipality ${pos.label}`;
      if (dryRun) {
        console.log(`  [DRY RUN] Would create: ${code} | ${name}`);
      } else {
        await pool.query(`
          INSERT INTO leadership_positions (
            id, position_name, position_code, position_description,
            hierarchy_level, position_category, is_core_position,
            requires_election, term_duration_months, max_concurrent_appointments,
            position_order, is_active, entity_id, entity_type
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        `, [
          nextId++, name, code,
          `${pos.label} for ${muniName}`,
          'Municipality', pos.category, pos.core,
          true, 60, 1,
          pos.order, true, muniId, 'Metro Sub-Region',
        ]);
        console.log(`  Created: ${code} | ${name}`);
      }
      created++;
    }
  }

  // Update sequence
  if (!dryRun && created > 0) {
    await pool.query(`SELECT setval('leadership_positions_id_seq', (SELECT MAX(id) FROM leadership_positions))`);
    console.log('\nSequence updated.');
  }

  console.log(`\n=== Summary ===`);
  console.log(`Metro sub-regions: ${metros.length}`);
  console.log(`Positions per sub-region: ${POSITIONS.length}`);
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exist): ${skipped}`);

  pool.end();
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });

