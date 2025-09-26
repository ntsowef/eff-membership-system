# War Council Structure Documentation

## Overview

The War Council Structure is a national-level leadership hierarchy implemented in the membership management system. It provides a comprehensive framework for managing the highest level of organizational leadership with specific positions and province-based representation.

## Structure Composition

### Core Executive Positions (6 positions)
1. **President** - The highest executive position
2. **Deputy President** - Second-in-command executive position
3. **Secretary General** - Chief administrative officer
4. **Deputy Secretary General** - Assistant administrative officer
5. **National Chairperson** - Presiding officer for meetings and governance
6. **Treasurer General** - Chief financial officer

### CCT Deployees (9 positions)
Province-specific representatives covering all South African provinces:
- Eastern Cape (EC)
- Free State (FS)
- Gauteng (GP)
- KwaZulu-Natal (KZN)
- Limpopo (LP)
- Mpumalanga (MP)
- Northern Cape (NC)
- North West (NW)
- Western Cape (WC)

## Key Features

### 1. Position Uniqueness
- Each core position can only be held by one person at a time
- CCT Deployee positions are unique per province
- System enforces appointment validation to prevent conflicts

### 2. Province-Specific Validation
- CCT Deployees must be members from their respective provinces
- System validates member province against position requirements
- Automatic filtering of eligible members based on geographic constraints

### 3. Comprehensive Access Control
- **National Admin**: Full management access (create, modify, terminate appointments)
- **Provincial Admin**: View-only access to War Council structure
- **Other Users**: No access to War Council functionality

### 4. Real-time Dashboard
- Live statistics on position fill rates
- Recent appointment tracking
- Vacant position monitoring
- Core vs CCT Deployee breakdown

## Database Schema

### Tables

#### leadership_structures
```sql
CREATE TABLE leadership_structures (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### leadership_positions (Enhanced)
```sql
ALTER TABLE leadership_positions ADD COLUMN structure_id INT;
ALTER TABLE leadership_positions ADD COLUMN province_specific BOOLEAN DEFAULT FALSE;
ALTER TABLE leadership_positions ADD COLUMN province_code VARCHAR(10);
ALTER TABLE leadership_positions ADD COLUMN is_unique_position BOOLEAN DEFAULT TRUE;
```

#### leadership_appointments (Existing)
Used to track actual appointments to War Council positions.

### Views

#### vw_war_council_structure
Comprehensive view combining position details with current appointments:
```sql
CREATE VIEW vw_war_council_structure AS
SELECT 
  lp.id as position_id,
  lp.position_name,
  lp.position_code,
  lp.description,
  lp.responsibilities,
  lp.requirements,
  lp.order_index,
  lp.province_specific,
  lp.province_code,
  p.name as province_name,
  la.id as appointment_id,
  la.member_id,
  CONCAT(m.first_name, ' ', m.last_name) as member_name,
  m.membership_number,
  la.appointment_type,
  la.start_date,
  la.end_date,
  la.appointment_status,
  CASE 
    WHEN la.id IS NULL THEN 'Vacant'
    ELSE 'Filled'
  END as position_status
FROM leadership_positions lp
JOIN leadership_structures ls ON lp.structure_id = ls.id
LEFT JOIN provinces p ON lp.province_code = p.code
LEFT JOIN leadership_appointments la ON lp.id = la.position_id 
  AND la.appointment_status = 'Active'
LEFT JOIN members m ON la.member_id = m.id
WHERE ls.name = 'War Council Structure'
ORDER BY lp.order_index;
```

## API Endpoints

### Public Endpoints (Require Authentication)

#### GET /api/leadership/war-council/structure
Returns complete War Council structure with statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "structure": {
      "core_positions": [...],
      "cct_deployees": [...],
      "all_positions": [...]
    },
    "statistics": {
      "total_positions": 15,
      "filled_positions": 8,
      "vacant_positions": 7,
      "fill_rate_percentage": 53,
      "core_positions_filled": 4,
      "core_positions_total": 6,
      "cct_deployees_filled": 4,
      "cct_deployees_total": 9
    }
  }
}
```

#### GET /api/leadership/war-council/dashboard
Returns dashboard data including recent appointments and vacant positions.

#### GET /api/leadership/war-council/positions
Returns all War Council positions with details.

#### GET /api/leadership/war-council/positions/available
Returns only vacant positions available for appointment.

### Management Endpoints (Require National Admin)

#### POST /api/leadership/war-council/appointments
Creates new War Council appointment.

**Request Body:**
```json
{
  "position_id": 1,
  "member_id": 123,
  "hierarchy_level": "National",
  "entity_id": 1,
  "appointment_type": "Appointed",
  "start_date": "2025-01-19",
  "end_date": "2027-01-19",
  "appointment_notes": "Appointed by National Executive Committee"
}
```

#### POST /api/leadership/war-council/appointments/validate
Validates appointment before creation.

#### GET /api/leadership/war-council/positions/{id}/eligible-members
Returns members eligible for specific position.

#### GET /api/leadership/war-council/positions/{id}/vacancy
Checks if position is vacant.

## Frontend Components

### WarCouncilDashboard
Main dashboard component showing:
- Statistics overview
- Recent appointments
- Vacant positions
- Fill rate progress

### WarCouncilStructure
Detailed structure view with:
- Tabbed interface (Overview, Core Positions, CCT Deployees, All Positions)
- Position cards with appointment status
- Appointment buttons (for authorized users)

### WarCouncilAppointmentDialog
Modal dialog for creating appointments:
- Member selection with filtering
- Appointment details form
- Validation feedback
- Province-specific member filtering for CCT positions

## Permission System

### Access Levels

#### National Admin
- View War Council structure and dashboard
- Create new appointments
- Terminate existing appointments
- Access all War Council management features

#### Provincial Admin
- View War Council structure and dashboard
- Cannot create or modify appointments
- Read-only access to all War Council data

#### Other Users
- No access to War Council functionality
- War Council tab hidden in navigation

### Implementation

#### Backend Middleware
```javascript
// General leadership management (National + Provincial)
requireLeadershipManagementPermission()

// War Council specific (National only)
requireWarCouncilManagementPermission()
```

#### Frontend Permission Checks
```javascript
import { WarCouncilPermissions } from '../utils/warCouncilPermissions';

const canManage = WarCouncilPermissions.canManageWarCouncilAppointments(user);
const uiConfig = WarCouncilPermissions.getUIConfig(user);
```

## Usage Guide

### For National Administrators

#### Viewing War Council Structure
1. Navigate to Leadership Management
2. Click on "War Council" tab
3. View dashboard with statistics and recent activity
4. Click "View Full Structure" for detailed position view

#### Creating Appointments
1. In War Council Structure view, find vacant position
2. Click "Appoint" button
3. Search and select eligible member
4. Fill appointment details (type, dates, notes)
5. Submit appointment

#### Managing Existing Appointments
1. View current appointments in structure view
2. Use leadership management tools for modifications
3. Track appointment history and changes

### For Provincial Administrators

#### Viewing War Council Information
1. Access War Council dashboard (read-only)
2. View structure and current appointments
3. Monitor provincial representation (CCT Deployees)
4. Generate reports on War Council composition

## Validation Rules

### Appointment Validation
1. **Position Uniqueness**: Only one active appointment per position
2. **Member Eligibility**: Member must meet position requirements
3. **Province Matching**: CCT Deployees must be from correct province
4. **Date Validation**: Start date cannot be in the past
5. **Conflict Check**: Member cannot hold multiple War Council positions

### Data Integrity
1. **Position Codes**: Must be unique within War Council structure
2. **Province Coverage**: All 9 provinces must have CCT positions
3. **Order Index**: Positions must have valid ordering
4. **Status Consistency**: Appointment status must match position status

## Testing

### Test Suite Location
```
test/war-council/
├── test-war-council-database.js     # Database schema tests
├── test-war-council-api.js          # API endpoint tests
├── test-war-council-frontend.html   # Frontend component tests
├── test-war-council-integration.js  # Integration tests
├── run-all-tests.js                 # Test runner
└── README.md                        # Test documentation
```

### Running Tests
```bash
# Run all tests
cd test/war-council
node run-all-tests.js

# Individual test categories
node test-war-council-database.js
node test-war-council-api.js
node test-war-council-integration.js

# Frontend tests (open in browser)
open test-war-council-frontend.html
```

## Deployment Checklist

### Pre-Deployment
- [ ] Database migration executed successfully
- [ ] All test suites pass
- [ ] Permission system configured
- [ ] API endpoints accessible
- [ ] Frontend components integrated

### Post-Deployment
- [ ] Verify War Council structure creation
- [ ] Test appointment workflow
- [ ] Validate permission restrictions
- [ ] Monitor system performance
- [ ] Train administrators on new functionality

## Troubleshooting

### Common Issues

#### War Council Tab Not Visible
- **Cause**: User lacks required permissions
- **Solution**: Ensure user has National or Provincial admin level

#### Cannot Create Appointments
- **Cause**: User lacks National admin permissions
- **Solution**: Verify user has National admin level access

#### Position Validation Errors
- **Cause**: Member doesn't meet position requirements
- **Solution**: Check member province for CCT positions, verify eligibility

#### Database Errors
- **Cause**: Migration not executed or incomplete
- **Solution**: Run War Council migration script

## Support and Maintenance

### Regular Maintenance
1. Monitor appointment expiration dates
2. Review vacant positions quarterly
3. Validate data integrity monthly
4. Update position descriptions as needed

### Performance Monitoring
1. Track API response times
2. Monitor database query performance
3. Review user access patterns
4. Optimize based on usage metrics

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-19  
**Compatibility**: Backend API v1.0+, Frontend React 18+
