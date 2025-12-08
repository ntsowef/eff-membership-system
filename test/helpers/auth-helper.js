/**
 * Authentication Helper for Test Scripts
 * 
 * Provides authentication functionality for test scripts
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';

/**
 * Test user credentials
 * You can override these with environment variables
 */
const TEST_USERS = {
  super_admin: {
    email: process.env.TEST_SUPER_ADMIN_EMAIL || 'super.admin@eff.org.za',
    password: process.env.TEST_SUPER_ADMIN_PASSWORD || 'Admin@123'
  },
  national_admin: {
    email: process.env.TEST_NATIONAL_ADMIN_EMAIL || 'national.admin@eff.org.za',
    password: process.env.TEST_NATIONAL_ADMIN_PASSWORD || 'Admin@123'
  },
  province_admin: {
    email: process.env.TEST_PROVINCE_ADMIN_EMAIL || 'province.admin@eff.org.za',
    password: process.env.TEST_PROVINCE_ADMIN_PASSWORD || 'Admin@123'
  },
  municipality_admin: {
    email: process.env.TEST_MUNICIPALITY_ADMIN_EMAIL || 'municipality.admin@eff.org.za',
    password: process.env.TEST_MUNICIPALITY_ADMIN_PASSWORD || 'Admin@123'
  }
};

/**
 * Generate test user credentials (for concurrent testing)
 * @param {number} userNumber - User number (1-20)
 * @returns {object} User credentials
 */
function getTestUser(userNumber) {
  return {
    email: `test.national.admin${userNumber}@eff.test.local`,
    password: 'TestAdmin@123'
  };
}

/**
 * Authenticate and get JWT token
 * @param {string|number} userType - Type of user (super_admin, national_admin, etc.) or user number (1-20)
 * @returns {Promise<string>} JWT token
 */
async function authenticate(userType = 'super_admin') {
  try {
    let credentials;

    // If userType is a number, use test user
    if (typeof userType === 'number') {
      credentials = getTestUser(userType);
      console.log(`🔐 Authenticating as test user ${userType}...`);
    } else {
      credentials = TEST_USERS[userType];

      if (!credentials) {
        throw new Error(`Unknown user type: ${userType}`);
      }

      console.log(`🔐 Authenticating as ${userType}...`);
    }

    console.log(`   Email: ${credentials.email}`);
    
    const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
      email: credentials.email,
      password: credentials.password
    });
    
    if (response.data.success && response.data.data.token) {
      const token = response.data.data.token;
      const user = response.data.data.user;
      
      console.log(`✅ Authentication successful`);
      console.log(`   User: ${user.name}`);
      console.log(`   Role: ${user.role || user.role_name}`);
      console.log(`   Token: ${token.substring(0, 20)}...`);
      
      return token;
    } else {
      throw new Error('Authentication failed: No token in response');
    }
  } catch (error) {
    if (error.response) {
      console.error(`❌ Authentication failed: ${error.response.status} ${error.response.statusText}`);
      console.error(`   Message: ${error.response.data?.message || error.response.data?.error?.message || 'Unknown error'}`);
    } else {
      console.error(`❌ Authentication failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create axios instance with authentication
 * @param {string} token - JWT token
 * @returns {object} Axios instance with auth headers
 */
function createAuthenticatedAxios(token) {
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Get authentication headers
 * @param {string} token - JWT token
 * @returns {object} Headers object
 */
function getAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`
  };
}

module.exports = {
  authenticate,
  createAuthenticatedAxios,
  getAuthHeaders,
  getTestUser,
  TEST_USERS,
  API_URL
};

