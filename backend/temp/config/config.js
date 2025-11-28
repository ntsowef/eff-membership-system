"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logConfig = exports.isTest = exports.isDevelopment = exports.isProduction = exports.getApiPath = exports.validateConfig = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from the correct path
dotenv_1.default.config({ path: path_1.default.join(__dirname, '..', '..', '.env') });
// Validate required environment variables
const requiredEnvVars = [
    'PORT',
    'DB_HOST',
    'DB_USER',
    'DB_NAME',
    'JWT_SECRET'
];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
}
// Parse environment variables with defaults
exports.config = {
    server: {
        port: parseInt(process.env.PORT || '5000', 10),
        env: process.env.NODE_ENV || 'development',
        apiPrefix: process.env.API_PREFIX || '/api',
        apiVersion: process.env.API_VERSION || 'v1'
    },
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '3306', 10),
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
        timeout: parseInt(process.env.DB_TIMEOUT || '60000', 10)
    },
    security: {
        jwtSecret: process.env.JWT_SECRET,
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10)
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
    },
    cors: {
        origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001']
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'logs/app.log'
    },
    sms: {
        provider: process.env.SMS_PROVIDER || 'mock',
        twilio: {
            accountSid: process.env.TWILIO_ACCOUNT_SID || '',
            authToken: process.env.TWILIO_AUTH_TOKEN || '',
            fromNumber: process.env.TWILIO_FROM_NUMBER || ''
        },
        clickatell: {
            apiKey: process.env.CLICKATELL_API_KEY || ''
        },
        gateway: {
            apiUrl: process.env.SMS_GATEWAY_URL || '',
            apiKey: process.env.SMS_GATEWAY_API_KEY || '',
            username: process.env.SMS_GATEWAY_USERNAME,
            password: process.env.SMS_GATEWAY_PASSWORD
        },
        jsonApplink: {
            apiUrl: process.env.JSON_APPLINK_API_URL || '',
            apiKey: process.env.JSON_APPLINK_API_KEY || '',
            username: process.env.JSON_APPLINK_USERNAME,
            password: process.env.JSON_APPLINK_PASSWORD,
            fromNumber: process.env.JSON_APPLINK_FROM_NUMBER || '',
            rateLimitPerMinute: parseInt(process.env.JSON_APPLINK_RATE_LIMIT || '100', 10)
        },
        smpp: {
            host: process.env.SMPP_HOST || '',
            port: parseInt(process.env.SMPP_PORT || '2775', 10),
            system_id: process.env.SMPP_SYSTEM_ID || '',
            password: process.env.SMPP_PASSWORD || '',
            system_type: process.env.SMPP_SYSTEM_TYPE || '',
            addr_ton: parseInt(process.env.SMPP_ADDR_TON || '0', 10),
            addr_npi: parseInt(process.env.SMPP_ADDR_NPI || '0', 10),
            address_range: process.env.SMPP_ADDRESS_RANGE || '',
            source_addr_ton: parseInt(process.env.SMPP_SOURCE_ADDR_TON || '1', 10),
            source_addr_npi: parseInt(process.env.SMPP_SOURCE_ADDR_NPI || '1', 10),
            dest_addr_ton: parseInt(process.env.SMPP_DEST_ADDR_TON || '1', 10),
            dest_addr_npi: parseInt(process.env.SMPP_DEST_ADDR_NPI || '1', 10),
            data_coding: parseInt(process.env.SMPP_DATA_CODING || '0', 10),
            default_sender: process.env.SMPP_DEFAULT_SENDER || 'GEOMAPS',
            delivery_receipt: process.env.SMPP_DELIVERY_RECEIPT === 'true',
            debug: process.env.SMPP_DEBUG === 'true',
            enquire_link_period: parseInt(process.env.SMPP_ENQUIRE_LINK_PERIOD || '30000', 10)
        }
    },
    // IEC API Configuration
    iec: {
        apiUrl: process.env.IEC_API_URL || 'https://api.iec.org.za',
        username: process.env.IEC_API_USERNAME || '',
        password: process.env.IEC_API_PASSWORD || '',
        timeout: parseInt(process.env.IEC_API_TIMEOUT || '30000', 10),
        rateLimit: parseInt(process.env.IEC_API_RATE_LIMIT || '100', 10)
    }
};
// Validate configuration
const validateConfig = () => {
    const errors = [];
    // Validate port
    if (exports.config.server.port < 1 || exports.config.server.port > 65535) {
        errors.push('PORT must be between 1 and 65535');
    }
    // Validate database port
    if (exports.config.database.port < 1 || exports.config.database.port > 65535) {
        errors.push('DB_PORT must be between 1 and 65535');
    }
    // Validate connection limit
    if (exports.config.database.connectionLimit < 1 || exports.config.database.connectionLimit > 100) {
        errors.push('DB_CONNECTION_LIMIT must be between 1 and 100');
    }
    // Validate JWT secret length
    if (exports.config.security.jwtSecret.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long');
    }
    // Validate bcrypt rounds
    if (exports.config.security.bcryptRounds < 10 || exports.config.security.bcryptRounds > 15) {
        errors.push('BCRYPT_ROUNDS must be between 10 and 15');
    }
    // Validate rate limit settings
    if (exports.config.rateLimit.windowMs < 60000) { // Minimum 1 minute
        errors.push('RATE_LIMIT_WINDOW_MS must be at least 60000 (1 minute)');
    }
    if (exports.config.rateLimit.maxRequests < 1) {
        errors.push('RATE_LIMIT_MAX_REQUESTS must be at least 1');
    }
    if (errors.length > 0) {
        console.error('❌ Configuration validation errors:');
        errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
    }
};
exports.validateConfig = validateConfig;
// Get full API path
const getApiPath = (endpoint = '') => {
    return `${exports.config.server.apiPrefix}/${exports.config.server.apiVersion}${endpoint}`;
};
exports.getApiPath = getApiPath;
// Check if running in production
const isProduction = () => {
    return exports.config.server.env === 'production';
};
exports.isProduction = isProduction;
// Check if running in development
const isDevelopment = () => {
    return exports.config.server.env === 'development';
};
exports.isDevelopment = isDevelopment;
// Check if running in test mode
const isTest = () => {
    return exports.config.server.env === 'test';
};
exports.isTest = isTest;
// Log configuration (without sensitive data)
const logConfig = () => {
    console.log('🔧 Server Configuration:');
    console.log(`  Environment: ${exports.config.server.env}`);
    console.log(`  Port: ${exports.config.server.port}`);
    console.log(`  API Path: ${exports.config.server.apiPrefix}/${exports.config.server.apiVersion}`);
    console.log(`  Database: ${exports.config.database.host}:${exports.config.database.port}/${exports.config.database.name}`);
    console.log(`  CORS Origin: ${exports.config.cors.origin}`);
    console.log(`  Rate Limit: ${exports.config.rateLimit.maxRequests} requests per ${exports.config.rateLimit.windowMs / 1000}s`);
    console.log(`  Log Level: ${exports.config.logging.level}`);
};
exports.logConfig = logConfig;
