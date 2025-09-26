# EFF Membership Management System - PostgreSQL Setup Guide

## Overview

This guide will help you set up a complete PostgreSQL environment using Docker containers to replace your corrupted MySQL database. The setup includes PostgreSQL 16, pgAdmin 4, automated backups, and optional Redis caching.

## Prerequisites

- Windows 10/11 with Docker Desktop installed
- PowerShell 5.1 or later
- At least 4GB RAM available for containers
- 10GB free disk space

## Quick Start

### 1. Prepare the Environment

```powershell
# Create project directory structure
mkdir -p data/postgres, data/pgadmin, data/redis, backups/postgres, logs/nginx

# Copy environment file
cp .env.postgres .env

# Edit the .env file with your secure passwords
notepad .env
```

### 2. Create Required Directories

```powershell
# Create all required directories
$directories = @(
    "data/postgres",
    "data/pgadmin", 
    "data/redis",
    "backups/postgres",
    "logs/nginx",
    "postgres-config",
    "pgadmin-config",
    "redis-config",
    "nginx-config/conf.d",
    "ssl-certs",
    "backup-scripts"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path $dir -Force
}
```

### 3. Start PostgreSQL and pgAdmin

```powershell
# Create the Docker network
docker network create membership-network

# Start PostgreSQL and pgAdmin
docker compose -f docker-compose.postgres.yml up -d postgres pgadmin

# Check container status
docker ps
```

### 4. Verify Setup

```powershell
# Check PostgreSQL health
docker exec -it eff-membership-postgres pg_isready -U eff_admin -d eff_membership_db

# Check logs
docker logs eff-membership-postgres
docker logs eff-membership-pgadmin
```

## Accessing pgAdmin

1. Open your browser and navigate to: `http://localhost:5050`
2. Login with credentials from your `.env` file:
   - Email: `admin@eff.local`
   - Password: `ChangeThis!AnotherSecure123`

### Connecting to PostgreSQL in pgAdmin

1. Right-click "Servers" → "Register" → "Server..."
2. **General Tab:**
   - Name: `EFF Membership DB`
3. **Connection Tab:**
   - Host: `postgres` (Docker service name)
   - Port: `5432`
   - Maintenance database: `eff_membership_db`
   - Username: `eff_admin`
   - Password: `ChangeThis!SuperSecure123`
   - Save password: ✓

## Database Schema Setup

The database schema will be automatically created when the container starts using the SQL files in the `database-recovery/` directory.

### Manual Schema Setup (if needed)

```powershell
# Connect to PostgreSQL container
docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db

# Or run SQL files manually
docker exec -i eff-membership-postgres psql -U eff_admin -d eff_membership_db < database-recovery/01_core_lookup_tables.sql
docker exec -i eff-membership-postgres psql -U eff_admin -d eff_membership_db < database-recovery/02_geographic_hierarchy.sql
docker exec -i eff-membership-postgres psql -U eff_admin -d eff_membership_db < database-recovery/03_members_and_memberships.sql
docker exec -i eff-membership-postgres psql -U eff_admin -d eff_membership_db < database-recovery/04_users_and_roles.sql
docker exec -i eff-membership-postgres psql -U eff_admin -d eff_membership_db < database-recovery/05_membership_views.sql
```

## Backend Migration from MySQL to PostgreSQL

### 1. Update Dependencies

```powershell
# Navigate to backend directory
cd backend

# Install PostgreSQL driver
npm install pg @types/pg

# Remove MySQL driver (after migration is complete)
# npm uninstall mysql2 @types/mysql2
```

### 2. Update Database Configuration

Update `backend/src/config/database.ts`:

```typescript
import { Pool, PoolClient } from 'pg';
import { config } from './config';

// PostgreSQL connection pool
let pool: Pool | null = null;

// Database configuration interface
interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

// Get optimized database configuration
const getDatabaseConfig = (): DatabaseConfig => ({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  port: config.database.port,
  max: parseInt(process.env.DB_CONNECTION_LIMIT || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

// Initialize database connection pool
export const initializeDatabase = async (): Promise<void> => {
  try {
    const dbConfig = getDatabaseConfig();
    pool = new Pool(dbConfig);
    
    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    console.log('✅ PostgreSQL connection pool initialized successfully');
    console.log(`📊 Connected to PostgreSQL database: ${dbConfig.database}`);
  } catch (error) {
    console.error('❌ Failed to initialize database connection pool:', error);
    throw error;
  }
};

// Convert MySQL placeholders to PostgreSQL
function convertPlaceholders(query: string, params?: any[]): { text: string; values: any[] } {
  if (!params || params.length === 0) {
    return { text: query, values: [] };
  }
  
  let paramIndex = 1;
  const text = query.replace(/\?/g, () => `$${paramIndex++}`);
  return { text, values: params };
}

// Execute query with automatic connection management
export const executeQuery = async <T = any>(
  query: string,
  params?: any[]
): Promise<T[]> => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  
  try {
    const { text, values } = convertPlaceholders(query, params);
    const result = await pool.query(text, values);
    return result.rows;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Execute single query
export const executeQuerySingle = async <T = any>(
  query: string,
  params?: any[]
): Promise<T | null> => {
  const results = await executeQuery<T>(query, params);
  return results.length > 0 ? results[0] : null;
};

// Execute transaction
export const executeTransaction = async <T = any>(
  queries: Array<{ query: string; params?: any[] }>
): Promise<T[]> => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  
  const client = await pool.connect();
  const results: T[] = [];
  
  try {
    await client.query('BEGIN');
    
    for (const { query, params } of queries) {
      const { text, values } = convertPlaceholders(query, params);
      const result = await client.query(text, values);
      results.push(result.rows);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
```

### 3. Update Environment Variables

Update your backend `.env` file:

```env
# Database Configuration (PostgreSQL)
DB_HOST=localhost
DB_USER=eff_admin
DB_PASSWORD=ChangeThis!SuperSecure123
DB_NAME=eff_membership_db
DB_PORT=5432
DB_CONNECTION_LIMIT=20
DB_TIMEOUT=30000
```

### 4. SQL Syntax Conversion

Key differences between MySQL and PostgreSQL:

| MySQL | PostgreSQL |
|-------|------------|
| `NOW()` | `CURRENT_TIMESTAMP` or `now()` |
| `CURDATE()` | `CURRENT_DATE` |
| `IFNULL(x,y)` | `COALESCE(x,y)` |
| `DATE_FORMAT(dt, '%Y-%m-01')` | `to_char(dt, 'YYYY-MM-01')` |
| `DATE_SUB(CURDATE(), INTERVAL 24 MONTH)` | `CURRENT_DATE - INTERVAL '24 months'` |
| `CONCAT(a,b)` | `a \|\| b` or `CONCAT(a,b)` |
| `AUTO_INCREMENT` | `SERIAL` or `GENERATED ALWAYS AS IDENTITY` |
| `TINYINT(1)` | `BOOLEAN` |
| `ENUM('a','b')` | `CHECK (column IN ('a','b'))` |

## Testing the Setup

### 1. Basic Database Test

```sql
-- Connect via pgAdmin or psql
SELECT version();
SELECT COUNT(*) FROM genders;
SELECT COUNT(*) FROM provinces;
SELECT * FROM vw_member_directory LIMIT 5;
```

### 2. Backend Connection Test

```powershell
# Test backend connection
cd backend
npm run dev

# Check logs for successful database connection
```

## Backup and Maintenance

### Automated Backups

Backups are configured to run daily at 2 AM:

```powershell
# Manual backup
docker exec eff-membership-postgres pg_dump -U eff_admin -d eff_membership_db > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i eff-membership-postgres psql -U eff_admin -d eff_membership_db < backup_20250123.sql
```

### Monitoring

```powershell
# View container logs
docker logs -f eff-membership-postgres
docker logs -f eff-membership-pgadmin

# Monitor resource usage
docker stats eff-membership-postgres
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change `POSTGRES_HOST_PORT` in `.env`
2. **Permission errors**: Ensure Docker has access to bind mount directories
3. **Connection refused**: Check if containers are running and healthy

### Useful Commands

```powershell
# Restart services
docker compose -f docker-compose.postgres.yml restart

# View container details
docker inspect eff-membership-postgres

# Access PostgreSQL shell
docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db

# Reset everything (CAUTION: This deletes all data)
docker compose -f docker-compose.postgres.yml down -v
docker volume prune -f
```

## Next Steps

1. ✅ Set up PostgreSQL environment
2. ✅ Create database schema
3. 🔄 Migrate backend code from MySQL to PostgreSQL
4. 🔄 Test all API endpoints
5. 🔄 Import existing data (if recoverable)
6. 🔄 Update frontend connection strings
7. 🔄 Deploy to production

## Support

If you encounter issues:

1. Check container logs: `docker logs eff-membership-postgres`
2. Verify network connectivity: `docker network ls`
3. Test database connection: `docker exec -it eff-membership-postgres pg_isready`
4. Review environment variables: `docker exec eff-membership-postgres env | grep POSTGRES`
