# National Administrator Metro Management Permissions

This document outlines the implementation of a feature that allows national administrators to add municipalities and wards only for metropolitan municipalities.

## Database Schema Updates

### 1. Permissions Table

Add a new table to track specific permissions for user roles:

```sql
CREATE TABLE permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert permissions related to metro management
INSERT INTO permissions (name, description) VALUES
('manage_all_hierarchy', 'Can manage the entire hierarchy structure'),
('manage_metro_municipalities', 'Can manage metropolitan municipalities'),
('manage_metro_wards', 'Can manage wards within metropolitan municipalities'),
('manage_district_municipalities', 'Can manage district municipalities'),
('manage_local_municipalities', 'Can manage local municipalities'),
('view_all_hierarchy', 'Can view the entire hierarchy structure');
```

### 2. Role Permissions Table

Create a junction table to associate roles with permissions:

```sql
CREATE TABLE role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('admin', 'member') NOT NULL,
  admin_level ENUM('national', 'province', 'region', 'municipality', 'ward', 'none') NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (role, admin_level, permission_id)
);

-- Assign metro management permissions to national admin
INSERT INTO role_permissions (role, admin_level, permission_id) VALUES
('admin', 'national', (SELECT id FROM permissions WHERE name = 'manage_all_hierarchy')),
('admin', 'national', (SELECT id FROM permissions WHERE name = 'manage_metro_municipalities')),
('admin', 'national', (SELECT id FROM permissions WHERE name = 'manage_metro_wards')),
('admin', 'national', (SELECT id FROM permissions WHERE name = 'view_all_hierarchy'));
```

## Backend Implementation

### 1. Middleware for Permission Checking

```javascript
// middleware/permissionMiddleware.js
const db = require('../config/database');

const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      
      // Get user role and admin level
      const [user] = await db.query(
        'SELECT role, admin_level FROM users WHERE id = ?',
        [userId]
      );
      
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          timestamp: new Date().toISOString()
        });
      }
      
      // Check if user has the required permission
      const [permission] = await db.query(
        `SELECT rp.id 
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role = ? AND rp.admin_level = ? AND p.name = ?`,
        [user.role, user.admin_level, permissionName]
      );
      
      if (permission) {
        next();
      } else {
        return res.status(403).json({
          status: 'error',
          message: 'Forbidden: Insufficient permissions',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

module.exports = { checkPermission };
```

### 2. Municipality Controller with Metro-Only Logic

```javascript
// controllers/municipalityController.js
const db = require('../config/database');

// Add a new municipality (restricted to metros for national admin)
const addMunicipality = async (req, res) => {
  try {
    const { name, code, region_id, municipality_type, description } = req.body;
    
    // For national admins, check if this is a metro municipality
    if (req.user.admin_level === 'national' && municipality_type !== 'Metropolitan') {
      return res.status(403).json({
        status: 'error',
        message: 'National administrators can only add metropolitan municipalities',
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if region exists
    const [region] = await db.query('SELECT * FROM regions WHERE id = ?', [region_id]);
    if (!region) {
      return res.status(404).json({
        status: 'error',
        message: 'Region not found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Insert new municipality
    const [result] = await db.query(
      'INSERT INTO municipalities (region_id, name, code, municipality_type, description) VALUES (?, ?, ?, ?, ?)',
      [region_id, name, code, municipality_type, description]
    );
    
    return res.status(201).json({
      status: 'success',
      message: 'Municipality added successfully',
      data: { id: result.insertId, name, code, municipality_type },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding municipality:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = { addMunicipality };
```

### 3. Ward Controller with Metro-Only Logic

```javascript
// controllers/wardController.js
const db = require('../config/database');

// Add a new ward (restricted to metro wards for national admin)
const addWard = async (req, res) => {
  try {
    const { name, ward_number, municipality_id, description } = req.body;
    
    // For national admins, check if this ward belongs to a metro municipality
    if (req.user.admin_level === 'national') {
      const [municipality] = await db.query(
        'SELECT municipality_type FROM municipalities WHERE id = ?', 
        [municipality_id]
      );
      
      if (!municipality || municipality.municipality_type !== 'Metropolitan') {
        return res.status(403).json({
          status: 'error',
          message: 'National administrators can only add wards to metropolitan municipalities',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Check if municipality exists
    const [municipality] = await db.query('SELECT * FROM municipalities WHERE id = ?', [municipality_id]);
    if (!municipality) {
      return res.status(404).json({
        status: 'error',
        message: 'Municipality not found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Insert new ward
    const [result] = await db.query(
      'INSERT INTO wards (municipality_id, name, ward_number, description, member_count) VALUES (?, ?, ?, ?, 0)',
      [municipality_id, name, ward_number, description]
    );
    
    return res.status(201).json({
      status: 'success',
      message: 'Ward added successfully',
      data: { id: result.insertId, name, ward_number },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding ward:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = { addWard };
```

### 4. API Routes with Permission Middleware

```javascript
// routes/hierarchyRoutes.js
const express = require('express');
const router = express.Router();
const municipalityController = require('../controllers/municipalityController');
const wardController = require('../controllers/wardController');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { authenticateJWT } = require('../middleware/authMiddleware');

// Municipality routes
router.post(
  '/municipalities', 
  authenticateJWT,
  checkPermission('manage_metro_municipalities'),
  municipalityController.addMunicipality
);

// Ward routes
router.post(
  '/wards', 
  authenticateJWT,
  checkPermission('manage_metro_wards'),
  wardController.addWard
);

module.exports = router;
```

## Frontend Implementation

### 1. Municipality Form Component with Metro Restriction

```typescript
// components/admin/AddMunicipalityForm.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';

const AddMunicipalityForm = () => {
  const { user } = useAuth();
  const [regions, setRegions] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    region_id: '',
    municipality_type: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Determine if user is national admin
  const isNationalAdmin = user?.role === 'admin' && user?.admin_level === 'national';
  
  useEffect(() => {
    // Fetch regions
    const fetchRegions = async () => {
      try {
        const response = await apiService.hierarchy.getRegions();
        if (response.status === 'success') {
          setRegions(response.data);
        }
      } catch (error) {
        console.error('Error fetching regions:', error);
      }
    };
    
    fetchRegions();
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      const response = await apiService.hierarchy.addMunicipality(formData);
      if (response.status === 'success') {
        setSuccess('Municipality added successfully');
        setFormData({
          name: '',
          code: '',
          region_id: '',
          municipality_type: '',
          description: ''
        });
      }
    } catch (error) {
      setError(error.message || 'Failed to add municipality');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Add New Municipality</h2>
      
      {isNationalAdmin && (
        <div className="bg-blue-50 p-4 mb-4 rounded-md">
          <p className="text-blue-700">
            As a National Administrator, you can only add Metropolitan municipalities.
          </p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 p-4 mb-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 p-4 mb-4 rounded-md">
          <p className="text-green-700">{success}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Municipality Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Municipality Code</label>
          <input
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Region</label>
          <select
            name="region_id"
            value={formData.region_id}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select Region</option>
            {regions.map(region => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Municipality Type</label>
          <select
            name="municipality_type"
            value={formData.municipality_type}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
            disabled={isNationalAdmin}
          >
            <option value="">Select Type</option>
            <option value="Metropolitan" selected={isNationalAdmin}>Metropolitan</option>
            {!isNationalAdmin && (
              <>
                <option value="District">District</option>
                <option value="Local">Local</option>
              </>
            )}
          </select>
          {isNationalAdmin && (
            <input 
              type="hidden" 
              name="municipality_type" 
              value="Metropolitan" 
            />
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>
        
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Municipality'}
        </button>
      </form>
    </div>
  );
};

export default AddMunicipalityForm;
```

### 2. Ward Form Component with Metro Restriction

```typescript
// components/admin/AddWardForm.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';

const AddWardForm = () => {
  const { user } = useAuth();
  const [municipalities, setMunicipalities] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    ward_number: '',
    municipality_id: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Determine if user is national admin
  const isNationalAdmin = user?.role === 'admin' && user?.admin_level === 'national';
  
  useEffect(() => {
    // Fetch municipalities (filtered for national admin)
    const fetchMunicipalities = async () => {
      try {
        const response = await apiService.hierarchy.getMunicipalities();
        if (response.status === 'success') {
          // For national admin, filter to only show metropolitan municipalities
          if (isNationalAdmin) {
            const metroMunicipalities = response.data.filter(
              muni => muni.municipality_type === 'Metropolitan'
            );
            setMunicipalities(metroMunicipalities);
          } else {
            setMunicipalities(response.data);
          }
        }
      } catch (error) {
        console.error('Error fetching municipalities:', error);
      }
    };
    
    fetchMunicipalities();
  }, [isNationalAdmin]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      const response = await apiService.hierarchy.addWard(formData);
      if (response.status === 'success') {
        setSuccess('Ward added successfully');
        setFormData({
          name: '',
          ward_number: '',
          municipality_id: '',
          description: ''
        });
      }
    } catch (error) {
      setError(error.message || 'Failed to add ward');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Add New Ward</h2>
      
      {isNationalAdmin && (
        <div className="bg-blue-50 p-4 mb-4 rounded-md">
          <p className="text-blue-700">
            As a National Administrator, you can only add wards to Metropolitan municipalities.
          </p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 p-4 mb-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 p-4 mb-4 rounded-md">
          <p className="text-green-700">{success}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Ward Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Ward Number</label>
          <input
            type="text"
            name="ward_number"
            value={formData.ward_number}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Municipality</label>
          <select
            name="municipality_id"
            value={formData.municipality_id}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select Municipality</option>
            {municipalities.map(municipality => (
              <option key={municipality.id} value={municipality.id}>
                {municipality.name} ({municipality.municipality_type})
              </option>
            ))}
          </select>
          {isNationalAdmin && municipalities.length === 0 && (
            <p className="text-yellow-600 mt-2">
              No metropolitan municipalities available. Please add a metropolitan municipality first.
            </p>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>
        
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Ward'}
        </button>
      </form>
    </div>
  );
};

export default AddWardForm;
```

## Testing the Implementation

### 1. Unit Tests for Permission Middleware

```javascript
// tests/middleware/permissionMiddleware.test.js
const { checkPermission } = require('../../middleware/permissionMiddleware');
const db = require('../../config/database');

// Mock database
jest.mock('../../config/database');

describe('Permission Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      user: { id: 1 }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('should allow access when user has permission', async () => {
    // Mock database responses
    db.query.mockImplementation((query, params) => {
      if (query.includes('SELECT role, admin_level')) {
        return [{ role: 'admin', admin_level: 'national' }];
      }
      if (query.includes('SELECT rp.id')) {
        return [{ id: 1 }]; // Permission exists
      }
      return [];
    });
    
    const middleware = checkPermission('manage_metro_municipalities');
    await middleware(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
  
  test('should deny access when user does not have permission', async () => {
    // Mock database responses
    db.query.mockImplementation((query, params) => {
      if (query.includes('SELECT role, admin_level')) {
        return [{ role: 'admin', admin_level: 'province' }];
      }
      if (query.includes('SELECT rp.id')) {
        return []; // No permission
      }
      return [];
    });
    
    const middleware = checkPermission('manage_metro_municipalities');
    await middleware(req, res, next);
    
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      message: 'Forbidden: Insufficient permissions'
    }));
  });
});
```

### 2. Integration Tests for Municipality Controller

```javascript
// tests/controllers/municipalityController.test.js
const municipalityController = require('../../controllers/municipalityController');
const db = require('../../config/database');

// Mock database
jest.mock('../../config/database');

describe('Municipality Controller', () => {
  let req, res;
  
  beforeEach(() => {
    req = {
      body: {
        name: 'Test Municipality',
        code: 'TEST01',
        region_id: 1,
        municipality_type: 'Metropolitan',
        description: 'Test description'
      },
      user: {
        id: 1,
        admin_level: 'national'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('should allow national admin to add a metro municipality', async () => {
    // Mock database responses
    db.query.mockImplementation((query, params) => {
      if (query.includes('SELECT * FROM regions')) {
        return [{ id: 1, name: 'Test Region' }];
      }
      if (query.includes('INSERT INTO municipalities')) {
        return [{ insertId: 1 }];
      }
      return [];
    });
    
    await municipalityController.addMunicipality(req, res);
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      message: 'Municipality added successfully'
    }));
  });
  
  test('should not allow national admin to add a non-metro municipality', async () => {
    req.body.municipality_type = 'Local';
    
    await municipalityController.addMunicipality(req, res);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      message: 'National administrators can only add metropolitan municipalities'
    }));
  });
  
  test('should allow provincial admin to add any municipality type', async () => {
    req.user.admin_level = 'province';
    req.body.municipality_type = 'Local';
    
    // Mock database responses
    db.query.mockImplementation((query, params) => {
      if (query.includes('SELECT * FROM regions')) {
        return [{ id: 1, name: 'Test Region' }];
      }
      if (query.includes('INSERT INTO municipalities')) {
        return [{ insertId: 1 }];
      }
      return [];
    });
    
    await municipalityController.addMunicipality(req, res);
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      message: 'Municipality added successfully'
    }));
  });
});
```

## Documentation Updates

### 1. Update to User Guide

Add the following section to the admin user guide:

```markdown
## National Administrator Permissions

As a National Administrator, you have special permissions to manage metropolitan municipalities and their wards:

1. **Metropolitan Municipalities**: You can add, edit, and delete metropolitan municipalities across all provinces.

2. **Metro Wards**: You can add, edit, and delete wards within metropolitan municipalities.

3. **Restrictions**: You cannot add or modify district or local municipalities. These are managed by Provincial Administrators.

This permission structure ensures proper governance while allowing national oversight of major metropolitan areas.
```

### 2. Update to API Documentation

Add the following to the API documentation:

```markdown
## Hierarchy Management API

### POST /api/hierarchy/municipalities

Creates a new municipality.

**Permission Requirements:**
- National Administrators: Can only create Metropolitan municipalities
- Provincial Administrators: Can create any municipality type within their province
- Regional Administrators: Can create any municipality type within their region

**Request Body:**
```json
{
  "name": "Municipality Name",
  "code": "MUN01",
  "region_id": 1,
  "municipality_type": "Metropolitan", // "Metropolitan", "District", or "Local"
  "description": "Description of the municipality"
}
```

### POST /api/hierarchy/wards

Creates a new ward.

**Permission Requirements:**
- National Administrators: Can only create wards in Metropolitan municipalities
- Provincial Administrators: Can create wards in any municipality within their province
- Regional Administrators: Can create wards in any municipality within their region
- Municipal Administrators: Can create wards in their municipality

**Request Body:**
```json
{
  "name": "Ward Name",
  "ward_number": "123",
  "municipality_id": 1,
  "description": "Description of the ward"
}
```
```
