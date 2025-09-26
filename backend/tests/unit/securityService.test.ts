import { SecurityService } from '../../src/services/securityService';
import { executeQuery, executeQuerySingle } from '../../src/config/database';
import { cacheService } from '../../src/services/cacheService';

// Mock dependencies
jest.mock('../../src/config/database');
jest.mock('../../src/services/cacheService');
jest.mock('bcrypt');
jest.mock('speakeasy');
jest.mock('qrcode');

const mockExecuteQuery = executeQuery as jest.MockedFunction<typeof executeQuery>;
const mockExecuteQuerySingle = executeQuerySingle as jest.MockedFunction<typeof executeQuerySingle>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('SecurityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MFA Setup', () => {
    it('should setup MFA for a user', async () => {
      const userId = 1;
      const appName = 'Test App';

      // Mock speakeasy
      const mockSpeakeasy = require('speakeasy');
      mockSpeakeasy.generateSecret.mockReturnValue({
        base32: 'TESTSECRET123',
        otpauth_url: 'otpauth://totp/Test%20App?secret=TESTSECRET123'
      });

      // Mock QRCode
      const mockQRCode = require('qrcode');
      mockQRCode.toDataURL.mockResolvedValue('data:image/png;base64,test');

      // Mock database insert
      mockExecuteQuery.mockResolvedValue({ insertId: 1 });

      const result = await SecurityService.setupMFA(userId, appName);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_mfa_settings'),
        expect.arrayContaining([userId])
      );
    });

    it('should enable MFA with valid token', async () => {
      const userId = 1;
      const token = '123456';

      // Mock MFA settings
      mockExecuteQuerySingle.mockResolvedValue({
        secret_key: 'TESTSECRET123',
        backup_codes: '[]'
      });

      // Mock speakeasy verification
      const mockSpeakeasy = require('speakeasy');
      mockSpeakeasy.totp.verify.mockReturnValue(true);

      // Mock database update
      mockExecuteQuery.mockResolvedValue({ affectedRows: 1 });

      const result = await SecurityService.enableMFA(userId, token);

      expect(result).toBe(true);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_mfa_settings'),
        expect.arrayContaining([userId])
      );
    });

    it('should not enable MFA with invalid token', async () => {
      const userId = 1;
      const token = '000000';

      // Mock MFA settings
      mockExecuteQuerySingle.mockResolvedValue({
        secret_key: 'TESTSECRET123',
        backup_codes: '[]'
      });

      // Mock speakeasy verification failure
      const mockSpeakeasy = require('speakeasy');
      mockSpeakeasy.totp.verify.mockReturnValue(false);

      const result = await SecurityService.enableMFA(userId, token);

      expect(result).toBe(false);
    });
  });

  describe('Account Lockout', () => {
    it('should record failed login attempt', async () => {
      const userId = 1;
      const ipAddress = '192.168.1.1';
      const userAgent = 'Test Browser';

      mockExecuteQuery.mockResolvedValue({ insertId: 1 });
      mockExecuteQuerySingle.mockResolvedValue({ count: 3 }); // Less than max attempts

      await SecurityService.recordLoginAttempt(userId, ipAddress, userAgent, false, 'Invalid password');

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO login_attempts'),
        expect.arrayContaining([userId, ipAddress, userAgent, false, 'Invalid password'])
      );
    });

    it('should lock account after max failed attempts', async () => {
      const userId = 1;
      const ipAddress = '192.168.1.1';
      const userAgent = 'Test Browser';

      mockExecuteQuery.mockResolvedValue({ insertId: 1 });
      mockExecuteQuerySingle.mockResolvedValue({ count: 5 }); // Max attempts reached

      await SecurityService.recordLoginAttempt(userId, ipAddress, userAgent, false, 'Invalid password');

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([expect.any(Date), userId])
      );
    });

    it('should check if account is locked', async () => {
      const userId = 1;

      // Mock cache miss
      mockCacheService.get.mockResolvedValue(null);

      // Mock database query
      mockExecuteQuerySingle.mockResolvedValue({
        account_locked: true,
        locked_until: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      });

      const result = await SecurityService.isAccountLocked(userId);

      expect(result).toBe(true);
      expect(mockCacheService.get).toHaveBeenCalledWith(`account_locked:${userId}`);
    });

    it('should clear expired lockout', async () => {
      const userId = 1;

      // Mock cache miss
      mockCacheService.get.mockResolvedValue(null);

      // Mock database query with expired lockout
      mockExecuteQuerySingle.mockResolvedValue({
        account_locked: true,
        locked_until: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      });

      mockExecuteQuery.mockResolvedValue({ affectedRows: 1 });

      const result = await SecurityService.isAccountLocked(userId);

      expect(result).toBe(false);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([userId])
      );
    });
  });

  describe('Session Management', () => {
    it('should create a new session', async () => {
      const userId = 1;
      const ipAddress = '192.168.1.1';
      const userAgent = 'Test Browser';

      mockExecuteQuery.mockResolvedValue({ insertId: 1 });
      mockCacheService.set.mockResolvedValue(true);

      const sessionId = await SecurityService.createSession(userId, ipAddress, userAgent);

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_sessions'),
        expect.arrayContaining([sessionId, userId, ipAddress, userAgent])
      );
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should validate active session', async () => {
      const sessionId = 'test-session-id';
      const userId = 1;

      // Mock cache hit
      mockCacheService.get.mockResolvedValue({
        userId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      });

      const result = await SecurityService.validateSession(sessionId);

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(userId);
    });

    it('should invalidate expired session', async () => {
      const sessionId = 'test-session-id';

      // Mock cache hit with expired session
      mockCacheService.get.mockResolvedValue({
        userId: 1,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      });

      const result = await SecurityService.validateSession(sessionId);

      expect(result.valid).toBe(false);
    });

    it('should invalidate session', async () => {
      const sessionId = 'test-session-id';

      mockExecuteQuery.mockResolvedValue({ affectedRows: 1 });
      mockCacheService.del.mockResolvedValue(true);

      await SecurityService.invalidateSession(sessionId);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_sessions'),
        [sessionId]
      );
      expect(mockCacheService.del).toHaveBeenCalledWith(`session:${sessionId}`);
    });
  });

  describe('Security Events', () => {
    it('should log security event', async () => {
      const userId = 1;
      const eventType = 'login';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Test Browser';
      const details = { success: true };

      mockExecuteQuery.mockResolvedValue({ insertId: 1 });

      await SecurityService.logSecurityEvent(userId, eventType, ipAddress, userAgent, details);

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_events'),
        expect.arrayContaining([userId, eventType, ipAddress, userAgent, JSON.stringify(details)])
      );
    });
  });

  describe('Security Settings', () => {
    it('should get user security settings', async () => {
      const userId = 1;
      const mockSettings = {
        mfa_enabled: true,
        session_timeout_minutes: 1440,
        max_failed_attempts: 5,
        lockout_duration_minutes: 30,
        password_expiry_days: 90,
        require_password_change: false
      };

      mockExecuteQuerySingle.mockResolvedValue(mockSettings);

      const result = await SecurityService.getUserSecuritySettings(userId);

      expect(result).toEqual(mockSettings);
      expect(mockExecuteQuerySingle).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM user_security_settings'),
        [userId]
      );
    });

    it('should return default settings if none exist', async () => {
      const userId = 1;

      mockExecuteQuerySingle.mockResolvedValue(null);

      const result = await SecurityService.getUserSecuritySettings(userId);

      expect(result).toHaveProperty('mfa_enabled', false);
      expect(result).toHaveProperty('session_timeout_minutes');
      expect(result).toHaveProperty('max_failed_attempts');
    });
  });

  describe('Password Security', () => {
    it('should check password expiry', async () => {
      const userId = 1;

      mockExecuteQuerySingle.mockResolvedValue({ id: userId }); // Password expired

      const result = await SecurityService.checkPasswordExpiry(userId);

      expect(result).toBe(true);
      expect(mockExecuteQuerySingle).toHaveBeenCalledWith(
        expect.stringContaining('SELECT password_changed_at FROM users'),
        expect.arrayContaining([userId])
      );
    });

    it('should detect password not expired', async () => {
      const userId = 1;

      mockExecuteQuerySingle.mockResolvedValue(null); // Password not expired

      const result = await SecurityService.checkPasswordExpiry(userId);

      expect(result).toBe(false);
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should detect suspicious activity with multiple IPs', async () => {
      const userId = 1;
      const ipAddress = '192.168.1.1';

      // Mock multiple IPs in recent attempts
      mockExecuteQuery.mockResolvedValue([
        { ip_address: '192.168.1.1' },
        { ip_address: '192.168.1.2' },
        { ip_address: '192.168.1.3' },
        { ip_address: '192.168.1.4' }
      ]);

      const result = await SecurityService.detectSuspiciousActivity(userId, ipAddress);

      expect(result).toBe(true);
      expect(mockExecuteQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT ip_address FROM login_attempts'),
        expect.arrayContaining([userId])
      );
    });

    it('should not detect suspicious activity with normal usage', async () => {
      const userId = 1;
      const ipAddress = '192.168.1.1';

      // Mock normal IP usage
      mockExecuteQuery.mockResolvedValue([
        { ip_address: '192.168.1.1' },
        { ip_address: '192.168.1.2' }
      ]);

      const result = await SecurityService.detectSuspiciousActivity(userId, ipAddress);

      expect(result).toBe(false);
    });
  });
});
