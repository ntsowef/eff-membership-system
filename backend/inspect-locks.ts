
import { executeQuery, initializeDatabase, closeDatabaseConnections } from './src/config/database-hybrid';
async function checkLocks() {
    try {
        await initializeDatabase();
        const res = await executeQuery(`
            SELECT pid, state, query, wait_event_type, wait_event 
            FROM pg_stat_activity 
            WHERE query IS NOT NULL AND query != ''
        `);
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await closeDatabaseConnections();
    }
    process.exit(0);
}
checkLocks();
