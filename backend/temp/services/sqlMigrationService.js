"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLMigrationService = void 0;
const database_hybrid_1 = require("../config/database-hybrid");
// =====================================================================================
// SQL MIGRATION SERVICE - Handles conversion of existing MySQL queries to PostgreSQL
// =====================================================================================
class SQLMigrationService {
    // Convert and execute MySQL queries for PostgreSQL
    static async executeConvertedQuery(mysqlQuery, params) {
        try {
            // Convert MySQL syntax to PostgreSQL
            const pgQuery = this.convertComplexMySQLQuery(mysqlQuery);
            return await (0, database_hybrid_1.executeQuery)(pgQuery, params);
        }
        catch (error) {
            console.error('❌ Error executing converted query:', error);
            console.error('Original MySQL Query:', mysqlQuery);
            throw error;
        }
    }
    // Convert and execute single result MySQL queries
    static async executeConvertedQuerySingle(mysqlQuery, params) {
        const results = await this.executeConvertedQuery(mysqlQuery, params);
        return results.length > 0 ? results[0] : null;
    }
    // Advanced MySQL to PostgreSQL conversion
    static convertComplexMySQLQuery(query) {
        let convertedQuery = query;
        // CRITICAL: Convert MySQL parameter placeholders (?) to PostgreSQL ($1, $2, $3, etc.)
        let parameterIndex = 1;
        convertedQuery = convertedQuery.replace(/\?/g, () => {
            return '$' + (parameterIndex++);
        });
        // Handle boolean comparisons (PostgreSQL uses true/false, not 1/0)
        // Handle table-prefixed boolean columns
        convertedQuery = convertedQuery.replace(/(\w+\.is_active)\s*=\s*1\b/gi, '$1 = true');
        convertedQuery = convertedQuery.replace(/(\w+\.is_active)\s*=\s*0\b/gi, '$1 = false');
        convertedQuery = convertedQuery.replace(/(\w+\.is_deleted)\s*=\s*1\b/gi, '$1 = true');
        convertedQuery = convertedQuery.replace(/(\w+\.is_deleted)\s*=\s*0\b/gi, '$1 = false');
        convertedQuery = convertedQuery.replace(/(\w+\.is_verified)\s*=\s*1\b/gi, '$1 = true');
        convertedQuery = convertedQuery.replace(/(\w+\.is_verified)\s*=\s*0\b/gi, '$1 = false');
        convertedQuery = convertedQuery.replace(/(\w+\.is_enabled)\s*=\s*1\b/gi, '$1 = true');
        convertedQuery = convertedQuery.replace(/(\w+\.is_enabled)\s*=\s*0\b/gi, '$1 = false');
        // Handle non-prefixed boolean columns (common in CASE statements)
        // Use simple replacement after table-prefixed ones to avoid conflicts
        convertedQuery = convertedQuery.replace(/\bis_active\s*=\s*1\b/gi, 'is_active = true');
        convertedQuery = convertedQuery.replace(/\bis_active\s*=\s*0\b/gi, 'is_active = false');
        convertedQuery = convertedQuery.replace(/\bis_deleted\s*=\s*1\b/gi, 'is_deleted = true');
        convertedQuery = convertedQuery.replace(/\bis_deleted\s*=\s*0\b/gi, 'is_deleted = false');
        convertedQuery = convertedQuery.replace(/\bis_verified\s*=\s*1\b/gi, 'is_verified = true');
        convertedQuery = convertedQuery.replace(/\bis_verified\s*=\s*0\b/gi, 'is_verified = false');
        convertedQuery = convertedQuery.replace(/\bis_enabled\s*=\s*1\b/gi, 'is_enabled = true');
        convertedQuery = convertedQuery.replace(/\bis_enabled\s*=\s*0\b/gi, 'is_enabled = false');
        convertedQuery = convertedQuery.replace(/\bis_eligible_to_vote\s*=\s*1\b/gi, 'is_eligible_to_vote = true');
        convertedQuery = convertedQuery.replace(/\bis_eligible_to_vote\s*=\s*0\b/gi, 'is_eligible_to_vote = false');
        // Handle MySQL "WHERE 1 = TRUE" pattern (common in dynamic queries)
        convertedQuery = convertedQuery.replace(/WHERE\s+1\s*=\s*TRUE\b/gi, 'WHERE TRUE');
        convertedQuery = convertedQuery.replace(/WHERE\s+1\s*=\s*1\b/gi, 'WHERE TRUE');
        convertedQuery = convertedQuery.replace(/AND\s+1\s*=\s*TRUE\b/gi, 'AND TRUE');
        convertedQuery = convertedQuery.replace(/AND\s+1\s*=\s*1\b/gi, 'AND TRUE');
        convertedQuery = convertedQuery.replace(/OR\s+1\s*=\s*TRUE\b/gi, 'OR TRUE');
        convertedQuery = convertedQuery.replace(/OR\s+1\s*=\s*1\b/gi, 'OR TRUE');
        // Handle MySQL COLLATE clauses (PostgreSQL doesn't use MySQL collations)
        // Remove MySQL-specific collations like utf8mb4_unicode_ci, utf8_general_ci, etc.
        convertedQuery = convertedQuery.replace(/\s+COLLATE\s+utf8mb4_unicode_ci\b/gi, '');
        convertedQuery = convertedQuery.replace(/\s+COLLATE\s+utf8mb4_general_ci\b/gi, '');
        convertedQuery = convertedQuery.replace(/\s+COLLATE\s+utf8_unicode_ci\b/gi, '');
        convertedQuery = convertedQuery.replace(/\s+COLLATE\s+utf8_general_ci\b/gi, '');
        convertedQuery = convertedQuery.replace(/\s+COLLATE\s+latin1_swedish_ci\b/gi, '');
        convertedQuery = convertedQuery.replace(/\s+COLLATE\s+ascii_general_ci\b/gi, '');
        // Handle more generic MySQL collation patterns
        convertedQuery = convertedQuery.replace(/\s+COLLATE\s+[a-zA-Z0-9_]+_ci\b/gi, '');
        convertedQuery = convertedQuery.replace(/\s+COLLATE\s+[a-zA-Z0-9_]+_bin\b/gi, '');
        convertedQuery = convertedQuery.replace(/\s+COLLATE\s+[a-zA-Z0-9_]+_cs\b/gi, '');
        // Handle SUBSTRING_INDEX function (MySQL specific)
        convertedQuery = convertedQuery.replace(/SUBSTRING_INDEX\(([^,]+),\s*'([^']+)',\s*(\d+)\)/g, (match, str, delimiter, count) => {
            if (count === '1') {
                return 'SPLIT_PART(' + str + ', \'' + delimiter + '\', 1)';
            }
            else if (count === '-1') {
                return 'SPLIT_PART(' + str + ', \'' + delimiter + '\', -1)';
            }
            return 'SPLIT_PART(' + str + ', \'' + delimiter + '\', ' + count + ')';
        });
        // Handle LOCATE function
        convertedQuery = convertedQuery.replace(/LOCATE\(([^,]+),\s*([^)]+)\)/g, 'POSITION($1 IN $2)');
        // Handle LPAD function - preserve PostgreSQL cast syntax
        convertedQuery = convertedQuery.replace(/LPAD\(([^,]+),\s*(\d+),\s*'([^']+)'\)/g, 'LPAD($1, $2, \'$3\')');
        // Handle GROUP_CONCAT FIRST (before CONCAT conversion to avoid conflicts)
        // First handle complex multi-line GROUP_CONCAT with SEPARATOR
        convertedQuery = convertedQuery.replace(/GROUP_CONCAT\s*\(\s*([\s\S]*?)\s+SEPARATOR\s+([^)]+)\s*\)/gi, (match, expression, separator) => {
            // Clean up the separator (remove quotes if present)
            const cleanSeparator = separator.replace(/['"]/g, '');
            // Clean up the expression (remove extra whitespace and newlines)
            const cleanExpression = expression.replace(/\s+/g, ' ').trim();
            return `STRING_AGG(${cleanExpression}, '${cleanSeparator}')`;
        });
        // Handle simple GROUP_CONCAT without SEPARATOR (default comma)
        convertedQuery = convertedQuery.replace(/GROUP_CONCAT\s*\(\s*([^)]+)\s*\)/gi, (match, expression) => {
            const cleanExpression = expression.replace(/\s+/g, ' ').trim();
            return `STRING_AGG(${cleanExpression}, ', ')`;
        });
        // Handle CONCAT function with multiple arguments (AFTER GROUP_CONCAT)
        convertedQuery = convertedQuery.replace(/CONCAT\(([^)]+)\)/g, (match, args) => {
            const argList = args.split(',').map((arg) => arg.trim());
            return argList.join(' || ');
        });
        // Handle DATE_ADD function
        convertedQuery = convertedQuery.replace(/DATE_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+(\w+)\)/g, (match, date, amount, unit) => {
            const pgUnit = unit.toLowerCase().replace(/s$/, ''); // Remove plural 's'
            return '(' + date + ' + INTERVAL \'' + amount + ' ' + pgUnit + '\')';
        });
        // Handle DATE_SUB function with parameters
        convertedQuery = convertedQuery.replace(/DATE_SUB\(([^,]+),\s*INTERVAL\s+(\$\d+)\s+(\w+)\)/g, (match, date, param, unit) => {
            const pgUnit = unit.toLowerCase().replace(/s$/, ''); // Remove plural 's'
            return '(' + date + ' - (' + param + ' || \' ' + pgUnit + '\')::INTERVAL)';
        });
        // Handle DATE_SUB function with literal values
        convertedQuery = convertedQuery.replace(/DATE_SUB\(([^,]+),\s*INTERVAL\s+(\d+)\s+(\w+)\)/g, (match, date, amount, unit) => {
            const pgUnit = unit.toLowerCase().replace(/s$/, ''); // Remove plural 's'
            return '(' + date + ' - INTERVAL \'' + amount + ' ' + pgUnit + '\')';
        });
        // IMPORTANT: Fix ORDER BY with table.column that's not in GROUP BY BEFORE other conversions
        // This handles cases like "ORDER BY ms.date_joined DESC" where ms.date_joined is not in GROUP BY
        let needsOrderByFix = false;
        let orderByDirection = '';
        if (convertedQuery.includes('GROUP BY') && /ORDER BY\s+ms\.date_joined\s+(DESC|ASC)/i.test(convertedQuery)) {
            // Store the original ORDER BY for replacement after conversions
            const orderByMatch = convertedQuery.match(/ORDER BY\s+ms\.date_joined\s+(DESC|ASC)/i);
            if (orderByMatch) {
                needsOrderByFix = true;
                orderByDirection = orderByMatch[1];
                // Remove the original ORDER BY completely - we'll add it back later
                convertedQuery = convertedQuery.replace(/ORDER BY\s+ms\.date_joined\s+(DESC|ASC)/gi, '');
            }
        }
        // Handle DATE_FORMAT function (basic patterns)
        convertedQuery = convertedQuery.replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m'\)/g, 'TO_CHAR($1, \'YYYY-MM\')');
        convertedQuery = convertedQuery.replace(/DATE_FORMAT\(([^,]+),\s*'%Y'\)/g, 'TO_CHAR($1, \'YYYY\')');
        convertedQuery = convertedQuery.replace(/DATE_FORMAT\(([^,]+),\s*'%m'\)/g, 'TO_CHAR($1, \'MM\')');
        // Handle MONTHNAME function
        convertedQuery = convertedQuery.replace(/MONTHNAME\(([^)]+)\)/g, 'TO_CHAR($1, \'Month\')');
        // Handle DATE function
        convertedQuery = convertedQuery.replace(/\bDATE\(([^)]+)\)/g, '$1::DATE');
        // Handle YEAR, MONTH, DAY functions
        convertedQuery = convertedQuery.replace(/YEAR\(([^)]+)\)/g, 'EXTRACT(YEAR FROM $1)');
        convertedQuery = convertedQuery.replace(/MONTH\(([^)]+)\)/g, 'EXTRACT(MONTH FROM $1)');
        convertedQuery = convertedQuery.replace(/DAY\(([^)]+)\)/g, 'EXTRACT(DAY FROM $1)');
        // Handle TIMESTAMPDIFF function (MySQL to PostgreSQL conversion)
        // First, handle NOW() conversion to avoid issues with nested parentheses
        convertedQuery = convertedQuery.replace(/NOW\(\)/g, 'CURRENT_TIMESTAMP');
        // Handle TIMESTAMPDIFF MONTH with a more direct approach
        convertedQuery = convertedQuery.replace(/TIMESTAMPDIFF\(\s*MONTH\s*,\s*([^,]+),\s*COALESCE\(([^,]+),\s*CURRENT_TIMESTAMP\)\)/gi, (match, startDate, endDate) => {
            const cleanStart = startDate.trim();
            const cleanEnd = endDate.trim();
            return `EXTRACT(EPOCH FROM (COALESCE(${cleanEnd}, CURRENT_TIMESTAMP) - ${cleanStart})) / 2629746`;
        });
        // Handle other TIMESTAMPDIFF MONTH cases
        convertedQuery = convertedQuery.replace(/TIMESTAMPDIFF\(\s*MONTH\s*,\s*([^,]+),\s*([^)]+)\)/gi, (match, startDate, endDate) => {
            const cleanStart = startDate.trim();
            const cleanEnd = endDate.trim();
            return `EXTRACT(EPOCH FROM (${cleanEnd} - ${cleanStart})) / 2629746`;
        });
        convertedQuery = convertedQuery.replace(/TIMESTAMPDIFF\(\s*YEAR\s*,\s*([^,]+),\s*([^)]+(?:\([^)]*\))*[^)]*)\)/gi, (match, startDate, endDate) => {
            const cleanStart = startDate.trim();
            const cleanEnd = endDate.trim();
            return `EXTRACT(YEAR FROM AGE(${cleanEnd}, ${cleanStart}))`;
        });
        convertedQuery = convertedQuery.replace(/TIMESTAMPDIFF\(\s*DAY\s*,\s*([^,]+),\s*([^)]+(?:\([^)]*\))*[^)]*)\)/gi, (match, startDate, endDate) => {
            const cleanStart = startDate.trim();
            const cleanEnd = endDate.trim();
            return `(${cleanEnd}::DATE - ${cleanStart}::DATE)`;
        });
        convertedQuery = convertedQuery.replace(/TIMESTAMPDIFF\(\s*HOUR\s*,\s*([^,]+),\s*([^)]+(?:\([^)]*\))*[^)]*)\)/gi, (match, startDate, endDate) => {
            const cleanStart = startDate.trim();
            const cleanEnd = endDate.trim();
            return `EXTRACT(EPOCH FROM (${cleanEnd} - ${cleanStart})) / 3600`;
        });
        convertedQuery = convertedQuery.replace(/TIMESTAMPDIFF\(\s*MINUTE\s*,\s*([^,]+),\s*([^)]+(?:\([^)]*\))*[^)]*)\)/gi, (match, startDate, endDate) => {
            const cleanStart = startDate.trim();
            const cleanEnd = endDate.trim();
            return `EXTRACT(EPOCH FROM (${cleanEnd} - ${cleanStart})) / 60`;
        });
        convertedQuery = convertedQuery.replace(/TIMESTAMPDIFF\(\s*SECOND\s*,\s*([^,]+),\s*([^)]+(?:\([^)]*\))*[^)]*)\)/gi, (match, startDate, endDate) => {
            const cleanStart = startDate.trim();
            const cleanEnd = endDate.trim();
            return `EXTRACT(EPOCH FROM (${cleanEnd} - ${cleanStart}))`;
        });
        // Handle CURRENT_DATE (NOW() already handled above for TIMESTAMPDIFF)
        convertedQuery = convertedQuery.replace(/CURDATE\(\)/g, 'CURRENT_DATE');
        // Handle NULLIF function FIRST (PostgreSQL supports NULLIF natively, so no conversion needed)
        // This preserves NULLIF and prevents it from being matched by other IF-related rules
        const nullifMatches = convertedQuery.match(/NULLIF\([^)]+\)/g) || [];
        const nullifPlaceholders = [];
        nullifMatches.forEach((match, index) => {
            const placeholder = `__NULLIF_PLACEHOLDER_${index}__`;
            nullifPlaceholders.push(match);
            convertedQuery = convertedQuery.replace(match, placeholder);
        });
        // Handle IFNULL function (but NOT NULLIF - already protected above)
        convertedQuery = convertedQuery.replace(/\bIFNULL\(([^,]+),\s*([^)]+)\)/g, 'COALESCE($1, $2)');
        // Handle IF function (but NOT NULLIF - already protected above)
        convertedQuery = convertedQuery.replace(/\bIF\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'CASE WHEN $1 THEN $2 ELSE $3 END');
        // Restore NULLIF placeholders
        nullifPlaceholders.forEach((original, index) => {
            const placeholder = `__NULLIF_PLACEHOLDER_${index}__`;
            convertedQuery = convertedQuery.replace(placeholder, original);
        });
        // Handle MySQL specific LIMIT with OFFSET
        convertedQuery = convertedQuery.replace(/LIMIT\s+(\d+)\s*,\s*(\d+)/g, 'OFFSET $1 LIMIT $2');
        // Handle AUTO_INCREMENT references (convert to SERIAL)
        convertedQuery = convertedQuery.replace(/AUTO_INCREMENT/gi, 'SERIAL');
        // Handle backticks (MySQL) to double quotes (PostgreSQL)
        convertedQuery = convertedQuery.replace(/`([^`]+)`/g, '"$1"');
        // Handle SHOW commands
        convertedQuery = convertedQuery.replace(/SHOW\s+TABLES\s+LIKE\s+"([^"]+)"/gi, "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '$1'");
        // Handle PostgreSQL GROUP BY strictness issues
        // Fix ORDER BY with aggregate aliases - PostgreSQL requires the actual aggregate expression
        convertedQuery = convertedQuery.replace(/ORDER BY\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(ASC|DESC)/gi, (match, columnAlias, direction) => {
            // Check if this appears to be an aggregate alias by looking for common patterns
            if (convertedQuery.includes(`COUNT(`) && convertedQuery.includes(`as ${columnAlias}`)) {
                // Find the actual aggregate expression
                const aggregateMatch = convertedQuery.match(new RegExp(`(COUNT\\([^)]+\\))\\s+as\\s+${columnAlias}`, 'i'));
                if (aggregateMatch) {
                    return `ORDER BY ${aggregateMatch[1]} ${direction}`;
                }
            }
            // Also handle SUM, AVG, MAX, MIN aggregates
            const aggregateTypes = ['SUM', 'AVG', 'MAX', 'MIN'];
            for (const aggType of aggregateTypes) {
                if (convertedQuery.includes(`${aggType}(`) && convertedQuery.includes(`as ${columnAlias}`)) {
                    const aggregateMatch = convertedQuery.match(new RegExp(`(${aggType}\\([^)]+\\))\\s+as\\s+${columnAlias}`, 'i'));
                    if (aggregateMatch) {
                        return `ORDER BY ${aggregateMatch[1]} ${direction}`;
                    }
                }
            }
            return match; // Return original if no aggregate found
        });
        // Add ORDER BY clause if we need to fix it
        if (needsOrderByFix && convertedQuery.includes('GROUP BY')) {
            // Extract the first GROUP BY expression using character-by-character parsing
            const groupByStart = convertedQuery.indexOf('GROUP BY') + 9; // 9 = length of 'GROUP BY '
            let firstGroupByExpr = '';
            let parenCount = 0;
            let i = groupByStart;
            // Skip leading whitespace
            while (i < convertedQuery.length && /\s/.test(convertedQuery[i]))
                i++;
            // Extract the first expression, handling nested parentheses
            while (i < convertedQuery.length) {
                const char = convertedQuery[i];
                if (char === '(')
                    parenCount++;
                if (char === ')')
                    parenCount--;
                // Add the character to our expression
                firstGroupByExpr += char;
                // Stop at comma only if we're not inside parentheses
                if (char === ',' && parenCount === 0) {
                    // Remove the trailing comma
                    firstGroupByExpr = firstGroupByExpr.slice(0, -1);
                    break;
                }
                i++;
            }
            firstGroupByExpr = firstGroupByExpr.trim();
            if (firstGroupByExpr) {
                // Add the ORDER BY clause at the end
                convertedQuery = convertedQuery.trim();
                if (!convertedQuery.endsWith(';')) {
                    convertedQuery += `\n        ORDER BY ${firstGroupByExpr} ${orderByDirection}`;
                }
                else {
                    // Insert before the semicolon
                    convertedQuery = convertedQuery.slice(0, -1) + `\n        ORDER BY ${firstGroupByExpr} ${orderByDirection};`;
                }
            }
        }
        // Fix HAVING with aggregate aliases - PostgreSQL requires the actual aggregate expression
        convertedQuery = convertedQuery.replace(/HAVING\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*([><=!]+)\s*(\d+)/gi, (match, columnAlias, operator, value) => {
            // Check if this appears to be an aggregate alias
            if (convertedQuery.includes(`COUNT(`) && convertedQuery.includes(`as ${columnAlias}`)) {
                // Find the actual aggregate expression
                const aggregateMatch = convertedQuery.match(new RegExp(`(COUNT\\([^)]+\\))\\s+as\\s+${columnAlias}`, 'i'));
                if (aggregateMatch) {
                    return `HAVING ${aggregateMatch[1]} ${operator} ${value}`;
                }
            }
            // Also handle SUM, AVG, MAX, MIN aggregates
            const aggregateTypes = ['SUM', 'AVG', 'MAX', 'MIN'];
            for (const aggType of aggregateTypes) {
                if (convertedQuery.includes(`${aggType}(`) && convertedQuery.includes(`as ${columnAlias}`)) {
                    const aggregateMatch = convertedQuery.match(new RegExp(`(${aggType}\\([^)]+\\))\\s+as\\s+${columnAlias}`, 'i'));
                    if (aggregateMatch) {
                        return `HAVING ${aggregateMatch[1]} ${operator} ${value}`;
                    }
                }
            }
            return match; // Return original if no aggregate found
        });
        // Fix PostgreSQL GROUP BY and ORDER BY with CASE expressions (like age_group)
        // PostgreSQL requires the full CASE expression in GROUP BY and ORDER BY, not just the alias
        if (convertedQuery.includes('CASE') && convertedQuery.includes('as age_group')) {
            // Extract the full CASE expression more carefully
            const caseExpressionMatch = convertedQuery.match(/(CASE\s+WHEN[\s\S]*?END)\s+as\s+age_group/i);
            if (caseExpressionMatch) {
                const fullCaseExpression = caseExpressionMatch[1].replace(/\s+/g, ' ').trim();
                console.log('Found CASE expression:', fullCaseExpression);
                // Replace GROUP BY age_group with the full CASE expression
                convertedQuery = convertedQuery.replace(/GROUP BY age_group/gi, `GROUP BY (${fullCaseExpression})`);
                // Also fix ORDER BY with CASE expressions that reference the alias in WHEN clauses
                convertedQuery = convertedQuery.replace(/ORDER BY\s+CASE\s+age_group[\s\S]*?END/gi, (match) => {
                    // Replace age_group references in the ORDER BY CASE with the full expression
                    return match.replace(/age_group/g, `(${fullCaseExpression})`);
                });
            }
        }
        return convertedQuery;
    }
    // Specific conversions for common queries in your codebase
    static convertMemberSearchQuery(query) {
        let converted = this.convertComplexMySQLQuery(query);
        // Handle member-specific conversions
        converted = converted.replace(/CONCAT\('MEM',\s*LPAD\(([^,]+),\s*6,\s*'0'\)\)/g, "'MEM' || LPAD($1::TEXT, 6, '0')");
        // Handle full name concatenation
        converted = converted.replace(/CONCAT\(([^,]+),\s*'\s*',\s*COALESCE\(([^,]+),\s*''\)\)/g, '$1 || \' \' || COALESCE($2, \'\')');
        return converted;
    }
    // Convert optimized member queries
    static convertOptimizedMemberQuery(query) {
        let converted = this.convertComplexMySQLQuery(query);
        // Handle SUBSTRING_INDEX for name splitting
        converted = converted.replace(/SUBSTRING_INDEX\(full_name,\s*'\s*',\s*1\)/g, 'SPLIT_PART(full_name, \' \', 1)');
        converted = converted.replace(/CASE\s+WHEN\s+LOCATE\('\s*',\s*full_name\)\s*>\s*0\s+THEN\s+SUBSTRING\(full_name,\s*LOCATE\('\s*',\s*full_name\)\s*\+\s*1\)\s+ELSE\s+''\s+END/g, 'CASE WHEN POSITION(\' \' IN full_name) > 0 THEN SUBSTRING(full_name FROM POSITION(\' \' IN full_name) + 1) ELSE \'\' END');
        return converted;
    }
    // Convert view creation queries
    static convertViewQuery(query) {
        let converted = this.convertComplexMySQLQuery(query);
        // Handle CREATE OR REPLACE VIEW
        converted = converted.replace(/CREATE\s+VIEW/gi, 'CREATE OR REPLACE VIEW');
        // Handle MySQL specific view syntax
        converted = converted.replace(/FORCE\s+INDEX\s*\([^)]+\)/gi, '');
        return converted;
    }
    // Test query conversion without execution
    static testQueryConversion(mysqlQuery) {
        const warnings = [];
        const converted = this.convertComplexMySQLQuery(mysqlQuery);
        // Check for potential issues
        if (mysqlQuery.includes('FORCE INDEX')) {
            warnings.push('FORCE INDEX removed - PostgreSQL uses different query optimization');
        }
        if (mysqlQuery.includes('AUTO_INCREMENT')) {
            warnings.push('AUTO_INCREMENT converted to SERIAL - verify sequence behavior');
        }
        if (mysqlQuery.includes('SHOW ')) {
            warnings.push('SHOW commands converted to PostgreSQL system catalog queries');
        }
        return {
            original: mysqlQuery,
            converted,
            warnings
        };
    }
    // Batch convert multiple queries
    static async batchConvertQueries(queries) {
        const results = [];
        for (const { name, query, params } of queries) {
            try {
                const result = await this.executeConvertedQuery(query, params);
                results.push({
                    name,
                    success: true,
                    result
                });
            }
            catch (error) {
                results.push({
                    name,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return results;
    }
    // Get PostgreSQL equivalent for MySQL system queries
    static getPostgreSQLSystemQuery(mysqlSystemQuery) {
        const systemQueries = {
            'SHOW TABLES': "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
            'SHOW STATUS LIKE "Threads_connected"': 'SELECT count(*) as value FROM pg_stat_activity',
            'SHOW VARIABLES LIKE "max_connections"': 'SELECT setting as value FROM pg_settings WHERE name = \'max_connections\'',
            'SELECT CONNECTION_ID()': 'SELECT pg_backend_pid()',
            'SELECT DATABASE()': 'SELECT current_database()',
            'SELECT USER()': 'SELECT current_user',
            'SELECT VERSION()': 'SELECT version()'
        };
        return systemQueries[mysqlSystemQuery.toUpperCase()] || mysqlSystemQuery;
    }
}
exports.SQLMigrationService = SQLMigrationService;
