import request from 'supertest';
import { app } from '../../src/app';
import { smsService } from '../../src/services/smsService';

describe('SMS Service Integration Tests', () => {
  let authToken: string;
  let testUserId: number;

  beforeAll(async () => {
    // Setup test user and get auth token
    const userData = {
      email: 'smstest@example.com',
      password: 'SMSTest123!',
      firstname: 'SMS',
      surname: 'Test',
      phone: '+1234567890',
      admin_level: 3
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);

    authToken = response.body.data.token;
    testUserId = response.body.data.user_id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      const { executeQuery } = require('../../src/config/database');
      await executeQuery('DELETE FROM users WHERE id = ?', [testUserId]);
    }
  });

  describe('SMS Provider Information', () => {
    it('should get current SMS provider information', async () => {
      const response = await request(app)
        .get('/api/v1/sms/provider')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('current_provider');
      expect(response.body.data).toHaveProperty('supported_providers');
      expect(response.body.data.supported_providers).toBeInstanceOf(Array);
      expect(response.body.data.supported_providers.length).toBeGreaterThan(0);

      // Check if SMPP is in supported providers
      const smppProvider = response.body.data.supported_providers.find(
        (p: any) => p.name === 'SMPP'
      );
      expect(smppProvider).toBeDefined();
      expect(smppProvider.description).toContain('SMPP protocol');
      expect(smppProvider.features).toContain('High volume');
    });

    it('should get SMS configuration status', async () => {
      const response = await request(app)
        .get('/api/v1/sms/config/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('provider');
      expect(response.body.data).toHaveProperty('configured');
      expect(response.body.data).toHaveProperty('features');
      expect(response.body.data.features).toHaveProperty('single_sms');
      expect(response.body.data.features).toHaveProperty('bulk_sms');
    });
  });

  describe('SMS Sending', () => {
    it('should send a single SMS', async () => {
      const smsData = {
        to: '+27123456789',
        message: 'Test SMS from GEOMAPS system'
      };

      const response = await request(app)
        .post('/api/v1/sms/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(smsData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message_id');
      expect(response.body.data).toHaveProperty('provider');
      expect(response.body.data).toHaveProperty('recipient', smsData.to);
      expect(response.body.data).toHaveProperty('status');
    });

    it('should validate phone number format', async () => {
      const smsData = {
        to: 'invalid-phone',
        message: 'Test SMS'
      };

      const response = await request(app)
        .post('/api/v1/sms/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(smsData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should validate message length', async () => {
      const smsData = {
        to: '+27123456789',
        message: 'A'.repeat(1601) // Exceed maximum length
      };

      const response = await request(app)
        .post('/api/v1/sms/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(smsData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should send bulk SMS', async () => {
      const bulkSMSData = {
        recipients: ['+27123456789', '+27987654321', '+27555666777'],
        message: 'Bulk SMS test from GEOMAPS system'
      };

      const response = await request(app)
        .post('/api/v1/sms/bulk-send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkSMSData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toHaveProperty('total', 3);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data.results).toHaveLength(3);
      expect(response.body.data).toHaveProperty('provider');
    });

    it('should limit bulk SMS recipients', async () => {
      const recipients = Array.from({ length: 1001 }, (_, i) => `+2712345${i.toString().padStart(4, '0')}`);
      
      const bulkSMSData = {
        recipients,
        message: 'Test message'
      };

      const response = await request(app)
        .post('/api/v1/sms/bulk-send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkSMSData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('SMS Testing', () => {
    it('should test SMS functionality', async () => {
      const testData = {
        to: '+27123456789'
      };

      const response = await request(app)
        .post('/api/v1/sms/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('provider');
      expect(response.body.data).toHaveProperty('recipient', testData.to);
      expect(response.body.data).toHaveProperty('test_result');
    });
  });

  describe('Member Notifications', () => {
    let testMemberIds: number[] = [];

    beforeAll(async () => {
      // Create test members
      const { executeQuery } = require('../../src/config/database');
      
      const members = [
        {
          member_id: 'SMS001',
          firstname: 'SMS',
          surname: 'Member1',
          email: 'smsmember1@example.com',
          phone: '+27123456789'
        },
        {
          member_id: 'SMS002',
          firstname: 'SMS',
          surname: 'Member2',
          email: 'smsmember2@example.com',
          phone: '+27987654321'
        }
      ];

      for (const member of members) {
        const result = await executeQuery(`
          INSERT INTO members (member_id, firstname, surname, email, phone, 
                             hierarchy_level, entity_id, membership_type, membership_status, 
                             join_date, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, 'Ward', 1, 'Regular', 'Active', NOW(), ?, NOW())
        `, [member.member_id, member.firstname, member.surname, member.email, 
            member.phone, testUserId]);
        
        testMemberIds.push(result.insertId);
      }
    });

    afterAll(async () => {
      // Cleanup test members
      if (testMemberIds.length > 0) {
        const { executeQuery } = require('../../src/config/database');
        await executeQuery('DELETE FROM members WHERE id IN (?)', [testMemberIds]);
      }
    });

    it('should send SMS notifications to members', async () => {
      const notificationData = {
        member_ids: testMemberIds,
        message: 'Important meeting reminder: General meeting tomorrow at 2 PM.'
      };

      const response = await request(app)
        .post('/api/v1/sms/notify-members')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toHaveProperty('total_members', 2);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data.results).toHaveLength(2);

      // Check that each result has member information
      response.body.data.results.forEach((result: any) => {
        expect(result).toHaveProperty('member_id');
        expect(result).toHaveProperty('member_name');
        expect(result).toHaveProperty('phone');
        expect(result).toHaveProperty('success');
      });
    });

    it('should handle members without phone numbers', async () => {
      // Create a member without phone number
      const { executeQuery } = require('../../src/config/database');
      const result = await executeQuery(`
        INSERT INTO members (member_id, firstname, surname, email, 
                           hierarchy_level, entity_id, membership_type, membership_status, 
                           join_date, created_by, created_at)
        VALUES ('SMS003', 'SMS', 'NoPhone', 'smsnoPhone@example.com', 
                'Ward', 1, 'Regular', 'Active', NOW(), ?, NOW())
      `, [testUserId]);

      const memberWithoutPhone = result.insertId;

      const notificationData = {
        member_ids: [memberWithoutPhone],
        message: 'Test message'
      };

      const response = await request(app)
        .post('/api/v1/sms/notify-members')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No members found with valid phone numbers');

      // Cleanup
      await executeQuery('DELETE FROM members WHERE id = ?', [memberWithoutPhone]);
    });
  });

  describe('Authorization', () => {
    it('should require authentication for SMS endpoints', async () => {
      const response = await request(app)
        .post('/api/v1/sms/send')
        .send({
          to: '+27123456789',
          message: 'Test'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require admin level for SMS operations', async () => {
      // Create a regular user (admin_level 1)
      const regularUserData = {
        email: 'regularuser@example.com',
        password: 'Regular123!',
        firstname: 'Regular',
        surname: 'User',
        phone: '+1234567890',
        admin_level: 1
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(regularUserData);

      const regularToken = registerResponse.body.data.token;

      const response = await request(app)
        .post('/api/v1/sms/send')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          to: '+27123456789',
          message: 'Test'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient admin level');

      // Cleanup
      const { executeQuery } = require('../../src/config/database');
      await executeQuery('DELETE FROM users WHERE id = ?', [registerResponse.body.data.user_id]);
    });
  });

  describe('SMS Service Direct Tests', () => {
    it('should get provider name', () => {
      const providerName = smsService.getProviderName();
      expect(typeof providerName).toBe('string');
      expect(providerName.length).toBeGreaterThan(0);
    });

    it('should send SMS through service', async () => {
      const result = await smsService.sendSMS('+27123456789', 'Direct service test');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('provider');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.provider).toBe('string');
      
      if (result.success) {
        expect(result).toHaveProperty('messageId');
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('should test SMS through service', async () => {
      const result = await smsService.testSMS('+27123456789');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('provider');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.provider).toBe('string');
    });
  });
});
