import { executeQuery, initializeDatabase } from '../src/config/database-hybrid';

async function test() {
    try {
        await initializeDatabase();
        const res = await executeQuery("SELECT column_name FROM information_schema.columns WHERE table_name = 'members_consolidated'");
        console.log(res.map(r => r.column_name).join(', '));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
