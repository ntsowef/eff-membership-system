import { initializeDatabase, executeQuerySingle } from '../src/config/database';

async function main() {
  try {
    await initializeDatabase();
    const result = await executeQuerySingle('SELECT COUNT(*) as count FROM members_consolidated');
    console.log('Total members:', result.count);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
