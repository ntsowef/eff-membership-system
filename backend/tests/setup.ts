// Test setup file
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'membership_test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);

// Mock external services
jest.mock('../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendBulkEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../src/services/smsService', () => ({
  sendSMS: jest.fn().mockResolvedValue(true),
  sendBulkSMS: jest.fn().mockResolvedValue(true),
}));

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Mock multer for file uploads
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req: any, res: any, next: any) => {
      req.file = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        destination: '/tmp',
        filename: 'test.jpg',
        path: '/tmp/test.jpg',
        buffer: Buffer.from('test'),
      };
      next();
    },
    array: () => (req: any, res: any, next: any) => {
      req.files = [
        {
          fieldname: 'files',
          originalname: 'test1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          destination: '/tmp',
          filename: 'test1.jpg',
          path: '/tmp/test1.jpg',
          buffer: Buffer.from('test1'),
        },
        {
          fieldname: 'files',
          originalname: 'test2.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024,
          destination: '/tmp',
          filename: 'test2.jpg',
          path: '/tmp/test2.jpg',
          buffer: Buffer.from('test2'),
        },
      ];
      next();
    },
  });
  
  multer.diskStorage = jest.fn();
  multer.memoryStorage = jest.fn();
  
  return multer;
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toBeValidEmail(): R;
      toBeValidPhoneNumber(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeValidPhoneNumber(received: string) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const pass = typeof received === 'string' && phoneRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid phone number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid phone number`,
        pass: false,
      };
    }
  },
});

// Test database setup and teardown helpers
export const setupTestDatabase = async () => {
  // This would typically set up a test database
  // For now, we'll mock the database operations
};

export const teardownTestDatabase = async () => {
  // This would typically clean up the test database
  // For now, we'll just clear mocks
  jest.clearAllMocks();
};

// Test data factories
export const createTestUser = (overrides: any = {}) => ({
  id: 1,
  email: 'test@example.com',
  password: 'hashedpassword',
  firstname: 'Test',
  surname: 'User',
  phone: '+1234567890',
  is_active: true,
  admin_level: 1,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createTestMember = (overrides: any = {}) => ({
  member_id: 'MEM001',
  firstname: 'Test',
  surname: 'Member',
  email: 'member@example.com',
  phone: '+1234567890',
  date_of_birth: '1990-01-01',
  gender: 'Male',
  hierarchy_level: 'Ward',
  entity_id: 1,
  membership_type: 'Regular',
  membership_status: 'Active',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createTestMeeting = (overrides: any = {}) => ({
  id: 1,
  title: 'Test Meeting',
  description: 'Test meeting description',
  meeting_type_id: 1,
  hierarchy_level: 'Ward',
  entity_id: 1,
  scheduled_date: new Date(),
  duration_minutes: 60,
  location: 'Test Location',
  status: 'Scheduled',
  created_by: 1,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createTestElection = (overrides: any = {}) => ({
  id: 1,
  title: 'Test Election',
  description: 'Test election description',
  position_id: 1,
  hierarchy_level: 'Ward',
  entity_id: 1,
  nomination_start: new Date(),
  nomination_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  voting_start: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  voting_end: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
  status: 'Nomination',
  created_by: 1,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

// Mock authentication helper
export const mockAuthenticatedRequest = (user: any = createTestUser()) => ({
  user,
  headers: {
    authorization: 'Bearer mock-jwt-token',
  },
});

// Mock request/response helpers
export const mockRequest = (overrides: any = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ip: '127.0.0.1',
  ...overrides,
});

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

export const mockNext = jest.fn();

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global cleanup
afterAll(async () => {
  await teardownTestDatabase();
});
