import request from 'supertest';
import { app } from '../../src/app';
import { executeQuery } from '../../src/config/database';

describe('Membership System Integration Tests', () => {
  let authToken: string;
  let testMemberId: number;
  let testUserId: number;

  beforeAll(async () => {
    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  describe('Authentication System', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstname: 'Test',
        surname: 'User',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user_id');
      expect(response.body.data).toHaveProperty('token');
      
      testUserId = response.body.data.user_id;
      authToken = response.body.data.token;
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Member Management', () => {
    it('should create a new member', async () => {
      const memberData = {
        firstname: 'John',
        surname: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567891',
        date_of_birth: '1990-01-01',
        gender: 'Male',
        hierarchy_level: 'Ward',
        entity_id: 1,
        membership_type: 'Regular'
      };

      const response = await request(app)
        .post('/api/v1/members')
        .set('Authorization', `Bearer ${authToken}`)
        .send(memberData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('member_id');
      
      testMemberId = response.body.data.member_id;
    });

    it('should get member by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/members/${testMemberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.member.member_id).toBe(testMemberId);
      expect(response.body.data.member.firstname).toBe('John');
    });

    it('should update member information', async () => {
      const updateData = {
        phone: '+1234567892',
        membership_status: 'Active'
      };

      const response = await request(app)
        .put(`/api/v1/members/${testMemberId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should search members', async () => {
      const response = await request(app)
        .get('/api/v1/search/members?query=John')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.members).toBeInstanceOf(Array);
    });
  });

  describe('Leadership System', () => {
    it('should get leadership positions', async () => {
      const response = await request(app)
        .get('/api/v1/leadership/positions?hierarchy_level=National')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.positions).toBeInstanceOf(Array);
    });

    it('should create leadership appointment', async () => {
      const appointmentData = {
        member_id: testMemberId,
        position_id: 1,
        hierarchy_level: 'National',
        entity_id: 1,
        appointment_type: 'Appointed',
        start_date: '2024-01-01',
        appointment_notes: 'Test appointment'
      };

      const response = await request(app)
        .post('/api/v1/leadership/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('appointment_id');
    });

    it('should get current appointments', async () => {
      const response = await request(app)
        .get('/api/v1/leadership/appointments?hierarchy_level=National')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.appointments).toBeInstanceOf(Array);
    });
  });

  describe('Meeting System', () => {
    let testMeetingId: number;

    it('should create a new meeting', async () => {
      const meetingData = {
        meeting_title: 'Test Meeting',
        meeting_type_id: 1,
        hierarchy_level: 'National',
        entity_id: 1,
        meeting_date: '2024-12-31',
        meeting_time: '10:00',
        duration_minutes: 120,
        location: 'Conference Room A',
        description: 'Test meeting description'
      };

      const response = await request(app)
        .post('/api/v1/meetings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(meetingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('meeting_id');
      
      testMeetingId = response.body.data.meeting_id;
    });

    it('should get meeting by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/meetings/${testMeetingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.meeting.meeting_id).toBe(testMeetingId);
    });

    it('should get meeting types', async () => {
      const response = await request(app)
        .get('/api/v1/meetings/types')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.meeting_types).toBeInstanceOf(Array);
    });
  });

  describe('Analytics System', () => {
    it('should get dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toHaveProperty('total_members');
      expect(response.body.data.statistics).toHaveProperty('active_members');
    });

    it('should get membership analytics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/membership')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analytics).toHaveProperty('total_members');
      expect(response.body.data.analytics).toHaveProperty('membership_by_hierarchy');
    });
  });

  describe('System Management', () => {
    it('should get system health', async () => {
      const response = await request(app)
        .get('/api/v1/system/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('services');
    });

    it('should get cache statistics', async () => {
      const response = await request(app)
        .get('/api/v1/system/cache/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cache_stats');
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create test geographic entities if they don't exist
    try {
      await executeQuery(`
        INSERT IGNORE INTO provinces (province_id, province_name, province_code) 
        VALUES (1, 'Test Province', 'TP')
      `);
      
      await executeQuery(`
        INSERT IGNORE INTO regions (region_id, region_name, region_code, province_id) 
        VALUES (1, 'Test Region', 'TR', 1)
      `);
      
      await executeQuery(`
        INSERT IGNORE INTO municipalities (municipality_id, municipality_name, municipality_code, region_id) 
        VALUES (1, 'Test Municipality', 'TM', 1)
      `);
      
      await executeQuery(`
        INSERT IGNORE INTO wards (ward_id, ward_number, ward_name, municipality_id) 
        VALUES (1, 1, 'Test Ward', 1)
      `);
    } catch (error) {
      console.error('Error setting up test data:', error);
    }
  }

  async function cleanupTestData() {
    try {
      // Clean up in reverse order due to foreign key constraints
      if (testMemberId) {
        await executeQuery('DELETE FROM members WHERE member_id = ?', [testMemberId]);
      }
      
      if (testUserId) {
        await executeQuery('DELETE FROM users WHERE id = ?', [testUserId]);
      }
      
      // Clean up test geographic entities
      await executeQuery('DELETE FROM wards WHERE ward_id = 1');
      await executeQuery('DELETE FROM municipalities WHERE municipality_id = 1');
      await executeQuery('DELETE FROM regions WHERE region_id = 1');
      await executeQuery('DELETE FROM provinces WHERE province_id = 1');
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }
  }
});
