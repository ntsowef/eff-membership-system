"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrismaClient = exports.closeDatabasePool = exports.checkDatabaseHealth = exports.executeTransaction = exports.executeQuerySingle = exports.executeQuery = exports.initializeDatabase = void 0;
// DEPRECATED: This file is being replaced by database-hybrid.ts
// Keeping for backward compatibility during migration
const database_hybrid_1 = require("./database-hybrid");
const sqlMigrationService_1 = require("../services/sqlMigrationService");
// =====================================================================================
// BACKWARD COMPATIBILITY LAYER
// This provides the same interface as the old MySQL-based database.ts
// but uses the new hybrid PostgreSQL system under the hood
// =====================================================================================
// Initialize database (now uses hybrid system)
const initializeDatabase = async () => {
    console.log('🔄 Initializing hybrid database system (Prisma + Raw SQL)...');
    await (0, database_hybrid_1.initializeDatabase)();
};
exports.initializeDatabase = initializeDatabase;
// Execute query (now uses hybrid system with automatic MySQL->PostgreSQL conversion)
const executeQuery = async (query, params) => {
    try {
        // Use the migration service to convert and execute MySQL queries
        return await sqlMigrationService_1.SQLMigrationService.executeConvertedQuery(query, params);
    }
    catch (error) {
        console.error('❌ Database query error (hybrid system):', error);
        console.error('Original Query:', query);
        console.error('Params:', params);
        throw error;
    }
};
exports.executeQuery = executeQuery;
// Execute query and return first result (now uses hybrid system)
const executeQuerySingle = async (query, params) => {
    try {
        return await sqlMigrationService_1.SQLMigrationService.executeConvertedQuerySingle(query, params);
    }
    catch (error) {
        console.error('❌ Database single query error (hybrid system):', error);
        throw error;
    }
};
exports.executeQuerySingle = executeQuerySingle;
// Execute transaction (now uses hybrid system)
const executeTransaction = async (queries) => {
    try {
        return await (0, database_hybrid_1.executeTransaction)(queries);
    }
    catch (error) {
        console.error('❌ Transaction error (hybrid system):', error);
        throw error;
    }
};
exports.executeTransaction = executeTransaction;
// Check database health (now uses hybrid system)
const checkDatabaseHealth = async () => {
    return await (0, database_hybrid_1.checkDatabaseHealth)();
};
exports.checkDatabaseHealth = checkDatabaseHealth;
// Close database connection pool (now uses hybrid system)
const closeDatabasePool = async () => {
    await (0, database_hybrid_1.closeDatabaseConnections)();
};
exports.closeDatabasePool = closeDatabasePool;
// Backward compatibility exports
var database_hybrid_2 = require("./database-hybrid");
Object.defineProperty(exports, "getPrismaClient", { enumerable: true, get: function () { return database_hybrid_2.getPrismaClient; } });
