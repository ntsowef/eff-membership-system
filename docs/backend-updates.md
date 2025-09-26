# Backend Updates for Member-User Relationship Changes

This document outlines the necessary backend changes to support the updated database schema where:
1. Members have direct references to province, region, and municipality (not just ward)
2. Members include voting district information
3. Users reference members (not members referencing users)

## API Controller Updates

### 1. MemberController.js

```javascript
// controllers/MemberController.js
const db = require('../config/database');

// Create a new member
exports.createMember = async (req, res) => {
  try {
    const {
      first_name, last_name, id_number, gender, date_of_birth,
      email, contact_number, alternative_contact, residential_address, postal_address,
      province_id, region_id, municipality_id, ward_id,
      voting_district_name, voting_district_id,
      membership_number, membership_start_date, membership_expiry_date,
      membership_status, voter_status, branch
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !id_number || !gender || !date_of_birth || 
        !contact_number || !residential_address || !province_id || !region_id || 
        !municipality_id || !ward_id || !membership_start_date || !membership_expiry_date) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
        timestamp: new Date().toISOString()
      });
    }

    // Validate hierarchy relationships
    const hierarchyValid = await validateHierarchy(province_id, region_id, municipality_id, ward_id);
    if (!hierarchyValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid hierarchy relationship between province, region, municipality, and ward',
        timestamp: new Date().toISOString()
      });
    }

    // Check if ID number already exists
    const [existingMember] = await db.query(
      'SELECT id FROM members WHERE id_number = ?',
      [id_number]
    );

    if (existingMember.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Member with this ID number already exists',
        timestamp: new Date().toISOString()
      });
    }

    // Insert new member
    const [result] = await db.query(
      `INSERT INTO members (
        first_name, last_name, id_number, gender, date_of_birth,
        email, contact_number, alternative_contact, residential_address, postal_address,
        province_id, region_id, municipality_id, ward_id,
        voting_district_name, voting_district_id,
        membership_number, membership_start_date, membership_expiry_date,
        membership_status, voter_status, branch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name, last_name, id_number, gender, date_of_birth,
        email, contact_number, alternative_contact, residential_address, postal_address,
        province_id, region_id, municipality_id, ward_id,
        voting_district_name, voting_district_id,
        membership_number, membership_start_date, membership_expiry_date,
        membership_status || 'Active', voter_status || 'Pending Verification', branch
      ]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Member created successfully',
      data: {
        id: result.insertId,
        first_name,
        last_name,
        id_number,
        membership_number
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating member:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Get member by ID
exports.getMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    const [member] = await db.query(
      `SELECT m.*, 
        p.name as province_name, 
        r.name as region_name, 
        mu.name as municipality_name, 
        w.name as ward_name
      FROM members m
      JOIN provinces p ON m.province_id = p.id
      JOIN regions r ON m.region_id = r.id
      JOIN municipalities mu ON m.municipality_id = mu.id
      JOIN wards w ON m.ward_id = w.id
      WHERE m.id = ?`,
      [id]
    );

    if (member.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Member not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check if member has a user account
    const [user] = await db.query(
      'SELECT id, email, role, admin_level, is_active FROM users WHERE member_id = ?',
      [id]
    );

    const memberData = {
      ...member[0],
      user: user.length > 0 ? user[0] : null
    };

    return res.status(200).json({
      status: 'success',
      data: memberData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Update member
exports.updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name, last_name, gender, date_of_birth,
      email, contact_number, alternative_contact, residential_address, postal_address,
      province_id, region_id, municipality_id, ward_id,
      voting_district_name, voting_district_id,
      membership_status, voter_status, branch
    } = req.body;

    // Check if member exists
    const [existingMember] = await db.query(
      'SELECT id FROM members WHERE id = ?',
      [id]
    );

    if (existingMember.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Member not found',
        timestamp: new Date().toISOString()
      });
    }

    // Validate hierarchy if provided
    if (province_id && region_id && municipality_id && ward_id) {
      const hierarchyValid = await validateHierarchy(province_id, region_id, municipality_id, ward_id);
      if (!hierarchyValid) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid hierarchy relationship between province, region, municipality, and ward',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Build update query dynamically
    let updateFields = [];
    let queryParams = [];

    if (first_name) {
      updateFields.push('first_name = ?');
      queryParams.push(first_name);
    }
    if (last_name) {
      updateFields.push('last_name = ?');
      queryParams.push(last_name);
    }
    if (gender) {
      updateFields.push('gender = ?');
      queryParams.push(gender);
    }
    if (date_of_birth) {
      updateFields.push('date_of_birth = ?');
      queryParams.push(date_of_birth);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      queryParams.push(email);
    }
    if (contact_number) {
      updateFields.push('contact_number = ?');
      queryParams.push(contact_number);
    }
    if (alternative_contact !== undefined) {
      updateFields.push('alternative_contact = ?');
      queryParams.push(alternative_contact);
    }
    if (residential_address) {
      updateFields.push('residential_address = ?');
      queryParams.push(residential_address);
    }
    if (postal_address !== undefined) {
      updateFields.push('postal_address = ?');
      queryParams.push(postal_address);
    }
    if (province_id) {
      updateFields.push('province_id = ?');
      queryParams.push(province_id);
    }
    if (region_id) {
      updateFields.push('region_id = ?');
      queryParams.push(region_id);
    }
    if (municipality_id) {
      updateFields.push('municipality_id = ?');
      queryParams.push(municipality_id);
    }
    if (ward_id) {
      updateFields.push('ward_id = ?');
      queryParams.push(ward_id);
    }
    if (voting_district_name !== undefined) {
      updateFields.push('voting_district_name = ?');
      queryParams.push(voting_district_name);
    }
    if (voting_district_id !== undefined) {
      updateFields.push('voting_district_id = ?');
      queryParams.push(voting_district_id);
    }
    if (membership_status) {
      updateFields.push('membership_status = ?');
      queryParams.push(membership_status);
    }
    if (voter_status) {
      updateFields.push('voter_status = ?');
      queryParams.push(voter_status);
    }
    if (branch !== undefined) {
      updateFields.push('branch = ?');
      queryParams.push(branch);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No fields to update',
        timestamp: new Date().toISOString()
      });
    }

    // Add member ID to query params
    queryParams.push(id);

    // Execute update query
    await db.query(
      `UPDATE members SET ${updateFields.join(', ')} WHERE id = ?`,
      queryParams
    );

    return res.status(200).json({
      status: 'success',
      message: 'Member updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating member:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Helper function to validate hierarchy relationships
async function validateHierarchy(province_id, region_id, municipality_id, ward_id) {
  try {
    // Check if ward belongs to the specified municipality
    const [wardCheck] = await db.query(
      'SELECT id FROM wards WHERE id = ? AND municipality_id = ?',
      [ward_id, municipality_id]
    );
    
    if (wardCheck.length === 0) return false;
    
    // Check if municipality belongs to the specified region
    const [municipalityCheck] = await db.query(
      'SELECT id FROM municipalities WHERE id = ? AND region_id = ?',
      [municipality_id, region_id]
    );
    
    if (municipalityCheck.length === 0) return false;
    
    // Check if region belongs to the specified province
    const [regionCheck] = await db.query(
      'SELECT id FROM regions WHERE id = ? AND province_id = ?',
      [region_id, province_id]
    );
    
    if (regionCheck.length === 0) return false;
    
    return true;
  } catch (error) {
    console.error('Error validating hierarchy:', error);
    return false;
  }
}
```

### 2. UserController.js

```javascript
// controllers/UserController.js
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Create a user account for an existing member
exports.createMemberUser = async (req, res) => {
  try {
    const { member_id, email, password, name } = req.body;

    // Validate required fields
    if (!member_id || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
        timestamp: new Date().toISOString()
      });
    }

    // Check if member exists
    const [memberCheck] = await db.query(
      'SELECT id, email, province_id, region_id, municipality_id, ward_id FROM members WHERE id = ?',
      [member_id]
    );

    if (memberCheck.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Member not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user with this member_id already exists
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE member_id = ?',
      [member_id]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'User account already exists for this member',
        timestamp: new Date().toISOString()
      });
    }

    // Check if email is already in use
    const [emailCheck] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (emailCheck.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Email already in use',
        timestamp: new Date().toISOString()
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use member's email if not provided
    const userEmail = email || memberCheck[0].email;
    
    if (!userEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required',
        timestamp: new Date().toISOString()
      });
    }

    // Insert new user
    const [result] = await db.query(
      `INSERT INTO users (
        name, email, password, role, admin_level, 
        province_id, region_id, municipality_id, ward_id, member_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name || `${memberCheck[0].first_name} ${memberCheck[0].last_name}`,
        userEmail,
        hashedPassword,
        'member',
        'none',
        memberCheck[0].province_id,
        memberCheck[0].region_id,
        memberCheck[0].municipality_id,
        memberCheck[0].ward_id,
        member_id,
        true
      ]
    );

    return res.status(201).json({
      status: 'success',
      message: 'User account created successfully',
      data: {
        id: result.insertId,
        email: userEmail,
        role: 'member'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating user account:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Create an admin user (not linked to a member)
exports.createAdminUser = async (req, res) => {
  try {
    const { 
      name, email, password, admin_level, 
      province_id, region_id, municipality_id, ward_id 
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !admin_level) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
        timestamp: new Date().toISOString()
      });
    }

    // Validate admin level
    const validAdminLevels = ['national', 'province', 'region', 'municipality', 'ward'];
    if (!validAdminLevels.includes(admin_level)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid admin level',
        timestamp: new Date().toISOString()
      });
    }

    // Check admin level and required IDs
    if (admin_level === 'province' && !province_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Province ID is required for province admin',
        timestamp: new Date().toISOString()
      });
    }
    
    if (admin_level === 'region' && (!province_id || !region_id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Province ID and Region ID are required for region admin',
        timestamp: new Date().toISOString()
      });
    }
    
    if (admin_level === 'municipality' && (!province_id || !region_id || !municipality_id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Province ID, Region ID, and Municipality ID are required for municipality admin',
        timestamp: new Date().toISOString()
      });
    }
    
    if (admin_level === 'ward' && (!province_id || !region_id || !municipality_id || !ward_id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Province ID, Region ID, Municipality ID, and Ward ID are required for ward admin',
        timestamp: new Date().toISOString()
      });
    }

    // Check if email is already in use
    const [emailCheck] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (emailCheck.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Email already in use',
        timestamp: new Date().toISOString()
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new admin user
    const [result] = await db.query(
      `INSERT INTO users (
        name, email, password, role, admin_level, 
        province_id, region_id, municipality_id, ward_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hashedPassword,
        'admin',
        admin_level,
        province_id || null,
        region_id || null,
        municipality_id || null,
        ward_id || null,
        true
      ]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Admin user created successfully',
      data: {
        id: result.insertId,
        name,
        email,
        admin_level
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [user] = await db.query(
      `SELECT id, name, email, role, admin_level, 
        province_id, region_id, municipality_id, ward_id, member_id, 
        is_active, last_login, created_at, updated_at 
      FROM users WHERE id = ?`,
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    // If user is linked to a member, get member details
    let memberData = null;
    if (user[0].member_id) {
      const [member] = await db.query(
        `SELECT m.*, 
          p.name as province_name, 
          r.name as region_name, 
          mu.name as municipality_name, 
          w.name as ward_name
        FROM members m
        JOIN provinces p ON m.province_id = p.id
        JOIN regions r ON m.region_id = r.id
        JOIN municipalities mu ON m.municipality_id = mu.id
        JOIN wards w ON m.ward_id = w.id
        WHERE m.id = ?`,
        [user[0].member_id]
      );

      if (member.length > 0) {
        memberData = member[0];
      }
    }

    const userData = {
      ...user[0],
      member: memberData
    };

    return res.status(200).json({
      status: 'success',
      data: userData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};
```

## API Routes Updates

### 1. memberRoutes.js

```javascript
// routes/memberRoutes.js
const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// Public routes
router.get('/verify/:idNumber', memberController.verifyMemberByIdNumber);

// Protected routes
router.post(
  '/', 
  authenticateJWT,
  checkPermission('manage_members'),
  memberController.createMember
);

router.get(
  '/:id', 
  authenticateJWT,
  memberController.getMemberById
);

router.put(
  '/:id', 
  authenticateJWT,
  checkPermission('manage_members'),
  memberController.updateMember
);

router.get(
  '/ward/:wardId', 
  authenticateJWT,
  memberController.getMembersByWard
);

router.get(
  '/municipality/:municipalityId', 
  authenticateJWT,
  memberController.getMembersByMunicipality
);

router.get(
  '/region/:regionId', 
  authenticateJWT,
  memberController.getMembersByRegion
);

router.get(
  '/province/:provinceId', 
  authenticateJWT,
  memberController.getMembersByProvince
);

router.get(
  '/search', 
  authenticateJWT,
  memberController.searchMembers
);

module.exports = router;
```

### 2. userRoutes.js

```javascript
// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// Auth routes
router.post('/login', userController.login);
router.post('/refresh-token', userController.refreshToken);

// User management routes
router.post(
  '/member-user', 
  authenticateJWT,
  checkPermission('manage_users'),
  userController.createMemberUser
);

router.post(
  '/admin', 
  authenticateJWT,
  checkPermission('manage_admins'),
  userController.createAdminUser
);

router.get(
  '/profile', 
  authenticateJWT,
  userController.getUserProfile
);

router.put(
  '/profile', 
  authenticateJWT,
  userController.updateProfile
);

router.put(
  '/change-password', 
  authenticateJWT,
  userController.changePassword
);

router.get(
  '/admins', 
  authenticateJWT,
  checkPermission('view_admins'),
  userController.getAdminUsers
);

module.exports = router;
```

## Data Migration Script

To migrate existing data to the new schema, create a migration script:

```javascript
// scripts/migrateUserMemberRelationship.js
const db = require('../config/database');

async function migrateUserMemberRelationship() {
  try {
    console.log('Starting migration of user-member relationship...');
    
    // 1. Get all members with user_id (from old schema)
    const [members] = await db.query(
      'SELECT id, user_id FROM members WHERE user_id IS NOT NULL'
    );
    
    console.log(`Found ${members.length} members with user_id references`);
    
    // 2. Update users table to reference member_id
    for (const member of members) {
      await db.query(
        'UPDATE users SET member_id = ? WHERE id = ?',
        [member.id, member.user_id]
      );
      console.log(`Updated user ${member.user_id} to reference member ${member.id}`);
    }
    
    // 3. Remove user_id column from members table
    await db.query('ALTER TABLE members DROP COLUMN user_id');
    console.log('Removed user_id column from members table');
    
    // 4. Add province_id, region_id, municipality_id to members based on ward
    await db.query(`
      UPDATE members m
      JOIN wards w ON m.ward_id = w.id
      JOIN municipalities mu ON w.municipality_id = mu.id
      JOIN regions r ON mu.region_id = r.id
      SET 
        m.municipality_id = mu.id,
        m.region_id = r.id,
        m.province_id = r.province_id
    `);
    console.log('Updated province_id, region_id, municipality_id for all members');
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateUserMemberRelationship();
```

## Frontend Service Updates

Update the API service to match the new backend structure:

```typescript
// services/apiService.ts
import axios from 'axios';
import { getAuthToken } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Configure axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Format responses
api.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.message || 'An error occurred';
    return Promise.reject({ message });
  }
);

// Member API
const memberApi = {
  createMember: (data) => api.post('/members', data),
  getMemberById: (id) => api.get(`/members/${id}`),
  updateMember: (id, data) => api.put(`/members/${id}`, data),
  getMembersByWard: (wardId) => api.get(`/members/ward/${wardId}`),
  getMembersByMunicipality: (municipalityId) => api.get(`/members/municipality/${municipalityId}`),
  getMembersByRegion: (regionId) => api.get(`/members/region/${regionId}`),
  getMembersByProvince: (provinceId) => api.get(`/members/province/${provinceId}`),
  searchMembers: (params) => api.get('/members/search', { params }),
  verifyMemberByIdNumber: (idNumber) => api.get(`/members/verify/${idNumber}`)
};

// User API
const userApi = {
  login: (email, password) => api.post('/users/login', { email, password }),
  refreshToken: (refreshToken) => api.post('/users/refresh-token', { refreshToken }),
  createMemberUser: (data) => api.post('/users/member-user', data),
  createAdminUser: (data) => api.post('/users/admin', data),
  getUserProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
  getAdminUsers: () => api.get('/users/admins')
};

export const apiService = {
  member: memberApi,
  user: userApi,
  // Other API services...
};
```

## Conclusion

These updates ensure that:

1. Members have complete hierarchy information (province, region, municipality, ward)
2. Members include voting district information
3. The relationship between users and members is correctly structured (users reference members)
4. All API endpoints and services are updated to reflect the new schema
5. A migration script is provided to transition from the old schema to the new one

These changes maintain backward compatibility with existing frontend code while providing the enhanced functionality required by the updated schema.
