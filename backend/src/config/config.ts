import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

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

// Configuration interface
interface Config {
  server: {
    port: number;
    env: string;
    apiPrefix: string;
    apiVersion: string;
  };
  database: {
    host: string;
    user: string;
    password: string;
    name: string;
    port: number;
    connectionLimit: number;
    timeout: number;
  };
  security: {
    jwtSecret: string;
    bcryptRounds: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string | string[];
  };
  logging: {
    level: string;
    file: string;
  };
  sms?: {
    enabled?: boolean;
    provider?: string;
    twilio?: {
      accountSid: string;
      authToken: string;
      fromNumber: string;
    };
    clickatell?: {
      apiKey: string;
    };
    gateway?: {
      apiUrl: string;
      apiKey: string;
      username?: string;
      password?: string;
    };
    jsonApplink?: {
      apiUrl: string;
      authenticationCode: string;
      affiliateCode: string;
      fromNumber?: string;
      rateLimitPerMinute?: number;
    };
    smpp?: {
      host: string;
      port?: number;
      system_id: string;
      password: string;
      system_type?: string;
      addr_ton?: number;
      addr_npi?: number;
      address_range?: string;
      source_addr_ton?: number;
      source_addr_npi?: number;
      dest_addr_ton?: number;
      dest_addr_npi?: number;
      data_coding?: number;
      default_sender?: string;
      delivery_receipt?: boolean;
      debug?: boolean;
      enquire_link_period?: number;
    };
  };
  iec: {
    apiUrl: string;
    username: string;
    password: string;
    timeout: number;
    rateLimit: number;
  };
}

// Parse environment variables with defaults
export const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    env: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || '/api',
    apiVersion: process.env.API_VERSION || 'v1'
  },
  database: {
    host: process.env.DB_HOST!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME!,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    timeout: parseInt(process.env.DB_TIMEOUT || '60000', 10)
  },
  security: {
    jwtSecret: process.env.JWT_SECRET!,
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
    enabled: process.env.SMS_ENABLED === 'true',
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
      authenticationCode: process.env.JSON_APPLINK_AUTH_CODE || process.env.JSON_APPLINK_API_KEY || '',
      affiliateCode: process.env.JSON_APPLINK_AFFILIATE_CODE || '',
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
export const validateConfig = (): void => {
  const errors: string[] = [];

  // Validate port
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  // Validate database port
  if (config.database.port < 1 || config.database.port > 65535) {
    errors.push('DB_PORT must be between 1 and 65535');
  }

  // Validate connection limit
  if (config.database.connectionLimit < 1 || config.database.connectionLimit > 100) {
    errors.push('DB_CONNECTION_LIMIT must be between 1 and 100');
  }

  // Validate JWT secret length
  if (config.security.jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // Validate bcrypt rounds
  if (config.security.bcryptRounds < 10 || config.security.bcryptRounds > 15) {
    errors.push('BCRYPT_ROUNDS must be between 10 and 15');
  }

  // Validate rate limit settings
  if (config.rateLimit.windowMs < 60000) { // Minimum 1 minute
    errors.push('RATE_LIMIT_WINDOW_MS must be at least 60000 (1 minute)');
  }

  if (config.rateLimit.maxRequests < 1) {
    errors.push('RATE_LIMIT_MAX_REQUESTS must be at least 1');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration validation errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
};

// Get full API path
export const getApiPath = (endpoint: string = ''): string => {
  return `${config.server.apiPrefix}/${config.server.apiVersion}${endpoint}`;
};

// Check if running in production
export const isProduction = (): boolean => {
  return config.server.env === 'production';
};

// Check if running in development
export const isDevelopment = (): boolean => {
  return config.server.env === 'development';
};

// Check if running in test mode
export const isTest = (): boolean => {
  return config.server.env === 'test';
};

// Log configuration (without sensitive data)
export const logConfig = (): void => {
  console.log('🔧 Server Configuration:');
  console.log(`  Environment: ${config.server.env}`);
  console.log(`  Port: ${config.server.port}`);
  console.log(`  API Path: ${config.server.apiPrefix}/${config.server.apiVersion}`);
  console.log(`  Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
  console.log(`  CORS Origin: ${config.cors.origin}`);
  console.log(`  Rate Limit: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000}s`);
  console.log(`  Log Level: ${config.logging.level}`);
};
