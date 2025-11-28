"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabaseConnections = exports.checkDatabaseHealth = exports.convertMySQLToPostgreSQL = exports.executePrismaTransaction = exports.executeTransaction = exports.executeQuerySingle = exports.executeQuery = exports.getConnection = exports.isPrismaAvailable = exports.getPrismaClient = exports.initializeDatabase = void 0;
const prisma_1 = require("../generated/prisma");
const pg_1 = require("pg");
const config_1 = require("./config");
// =====================================================================================
// HYBRID DATABASE SERVICE - Combines Prisma ORM with Raw SQL capabilities
// =====================================================================================
// Prisma client instance
let prisma = null;
// PostgreSQL connection pool for raw SQL queries
let pool = null;
// Get database configuration for PostgreSQL
const getDatabaseConfig = () => ({
    host: config_1.config.database.host,
    user: config_1.config.database.user,
    password: config_1.config.database.password,
    database: config_1.config.database.name,
    port: config_1.config.database.port,
    max: parseInt(process.env.DB_CONNECTION_LIMIT || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '300000', 10), // 5 minutes
    connectionTimeoutMillis: parseInt(process.env.DB_TIMEOUT || '30000', 10), // 30 seconds
});
// Initialize hybrid database system
const initializeDatabase = async () => {
    try {
        const dbConfig = getDatabaseConfig();
        // Initialize Prisma Client with error handling
        try {
            prisma = new prisma_1.PrismaClient({
                datasources: {
                    db: {
                        url: `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
                    }
                },
                log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
            });
            // Test Prisma connection
            await prisma.$connect();
            console.log('✅ Prisma ORM connected successfully');
        }
        catch (prismaError) {
            console.warn('⚠️  Prisma client initialization failed, continuing with raw SQL only:', prismaError.message);
            prisma = null;
        }
        // Initialize PostgreSQL pool for raw SQL
        pool = new pg_1.Pool(dbConfig);
        // Test raw SQL connection
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ PostgreSQL raw SQL pool initialized successfully');
        console.log(`📊 Connected to PostgreSQL database: ${dbConfig.database}`);
    }
    catch (error) {
        console.error('❌ Failed to initialize hybrid database system:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
// Get Prisma client instance
const getPrismaClient = () => {
    if (!prisma) {
        throw new Error('Prisma client not available. System running in raw SQL mode only.');
    }
    return prisma;
};
exports.getPrismaClient = getPrismaClient;
// Check if Prisma is available
const isPrismaAvailable = () => {
    return prisma !== null;
};
exports.isPrismaAvailable = isPrismaAvailable;
// Get PostgreSQL connection from pool for raw SQL
const getConnection = async () => {
    if (!pool) {
        throw new Error('Database pool not initialized. Call initializeDatabase() first.');
    }
    try {
        return await pool.connect();
    }
    catch (error) {
        console.error('❌ Failed to get database connection:', error);
        throw error;
    }
};
exports.getConnection = getConnection;
// Execute raw SQL query with automatic connection management
const executeQuery = async (query, params) => {
    const client = await (0, exports.getConnection)();
    try {
        // Convert MySQL-style ? placeholders to PostgreSQL $1, $2, etc.
        const pgQuery = convertPlaceholders(query);
        const result = await client.query(pgQuery, params);
        return result.rows;
    }
    catch (error) {
        console.error('❌ Database query error:', error);
        console.error('Query:', query);
        console.error('Params:', params);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.executeQuery = executeQuery;
// Execute query and return first result
const executeQuerySingle = async (query, params) => {
    const results = await (0, exports.executeQuery)(query, params);
    return results.length > 0 ? results[0] : null;
};
exports.executeQuerySingle = executeQuerySingle;
// Execute transaction with raw SQL
const executeTransaction = async (queries) => {
    const client = await (0, exports.getConnection)();
    try {
        await client.query('BEGIN');
        const results = [];
        for (const { query, params } of queries) {
            const pgQuery = convertPlaceholders(query);
            const result = await client.query(pgQuery, params);
            results.push(result.rows);
        }
        await client.query('COMMIT');
        return results;
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Transaction error:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
exports.executeTransaction = executeTransaction;
// Execute transaction with Prisma
const executePrismaTransaction = async (callback) => {
    const client = (0, exports.getPrismaClient)();
    return await client.$transaction(async (tx) => {
        return await callback(tx);
    });
};
exports.executePrismaTransaction = executePrismaTransaction;
// Convert MySQL-style ? placeholders to PostgreSQL $1, $2, etc.
function convertPlaceholders(query) {
    let paramIndex = 1;
    return query.replace(/\?/g, () => `$${paramIndex++}`);
}
// Convert MySQL-specific SQL functions to PostgreSQL equivalents
const convertMySQLToPostgreSQL = (query) => {
    return query
        // String functions
        .replace(/CONCAT\(/g, 'CONCAT(')
        .replace(/SUBSTRING_INDEX\(/g, 'SPLIT_PART(')
        .replace(/LOCATE\(/g, 'POSITION(')
        .replace(/LPAD\(/g, 'LPAD(')
        // Date functions
        .replace(/CURDATE\(\)/g, 'CURRENT_DATE')
        .replace(/NOW\(\)/g, 'CURRENT_TIMESTAMP')
        .replace(/DATE_ADD\(/g, 'DATE_ADD(')
        .replace(/YEAR\(/g, 'EXTRACT(YEAR FROM ')
        .replace(/MONTH\(/g, 'EXTRACT(MONTH FROM ')
        .replace(/DAY\(/g, 'EXTRACT(DAY FROM ')
        // Conditional functions
        .replace(/IF\(/g, 'CASE WHEN ')
        .replace(/IFNULL\(/g, 'COALESCE(')
        // Limit syntax
        .replace(/LIMIT (\d+) OFFSET (\d+)/g, 'OFFSET $2 LIMIT $1')
        // Show commands (convert to PostgreSQL equivalents)
        .replace(/SHOW TABLES/g, "SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
        .replace(/SHOW STATUS LIKE "([^"]+)"/g, "SELECT name, setting FROM pg_settings WHERE name LIKE '$1'")
        .replace(/SHOW VARIABLES LIKE "([^"]+)"/g, "SELECT name, setting FROM pg_settings WHERE name LIKE '$1'");
};
exports.convertMySQLToPostgreSQL = convertMySQLToPostgreSQL;
// Check database health
const checkDatabaseHealth = async () => {
    try {
        let prismaStatus = 'unavailable';
        // Test Prisma connection if available
        if ((0, exports.isPrismaAvailable)()) {
            try {
                const prismaClient = (0, exports.getPrismaClient)();
                await prismaClient.$queryRaw `SELECT 1`;
                prismaStatus = 'healthy';
            }
            catch (error) {
                prismaStatus = 'error';
            }
        }
        // Test raw SQL connection
        const client = await (0, exports.getConnection)();
        const result = await client.query('SELECT COUNT(*) as active_connections FROM pg_stat_activity WHERE state = $1', ['active']);
        client.release();
        return {
            status: 'healthy',
            details: {
                prisma: prismaStatus,
                rawSql: 'connected',
                activeConnections: result.rows[0]?.active_connections || 0,
                poolStatus: pool ? {
                    totalCount: pool.totalCount,
                    idleCount: pool.idleCount,
                    waitingCount: pool.waitingCount
                } : null
            }
        };
    }
    catch (error) {
        return {
            status: 'unhealthy',
            details: {
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
// Close database connections
const closeDatabaseConnections = async () => {
    try {
        if (prisma) {
            await prisma.$disconnect();
            prisma = null;
            console.log('🔒 Prisma client disconnected');
        }
        if (pool) {
            await pool.end();
            pool = null;
            console.log('🔒 PostgreSQL connection pool closed');
        }
    }
    catch (error) {
        console.error('❌ Error closing database connections:', error);
    }
};
exports.closeDatabaseConnections = closeDatabaseConnections;
// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT, closing database connections...');
    await (0, exports.closeDatabaseConnections)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, closing database connections...');
    await (0, exports.closeDatabaseConnections)();
    process.exit(0);
});
