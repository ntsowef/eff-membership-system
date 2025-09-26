# Organizational Leadership Structure

This document outlines the comprehensive organizational leadership structure implementation from National to Ward level, as specified in the requirements.

## Overview

The organizational leadership structure consists of four hierarchical levels, each with specific leadership positions and responsibilities:

- **National Level**: 66 positions (6 core officials + 60 other leaders)
- **Provincial Level**: 35 positions (5 core officials + 30 other leaders)
- **Municipal Level**: 30 positions (5 core officials + 25 other leaders)
- **Ward Level**: 20 positions (5 core officials + 15 other leaders)

**Total**: 151 leadership positions across all levels

## Leadership Structure Details

### National Level (66 Positions)

#### Core Officials (6 positions)
1. **President** - Chief Executive Officer, overall leadership and strategic direction
2. **Deputy President** - Second in command, assists President
3. **Secretary General** - Chief administrative officer, operations and communications
4. **Deputy Secretary General** - Assists Secretary General
5. **National Chairperson** - Chairs national meetings, oversees governance
6. **Treasurer General** - Chief financial officer, fiscal oversight

#### Additional National Leaders (60 positions)
- National Executive Committee Members (10 positions)
- National Working Committee Members (10 positions)
- National Specialized Committees (10 positions)
- National Regional Coordinators (9 positions)
- National Advisory Positions (5 positions)
- National Task Team Leaders (10 positions)
- National Support Positions (6 positions)

### Provincial Level (35 Positions)

#### Core Officials (5 positions)
1. **Chairperson** - Provincial leader, overall coordination
2. **Deputy Chairperson** - Assists Chairperson
3. **Secretary** - Administrative officer, operations
4. **Deputy Secretary** - Assists Secretary
5. **Treasurer** - Financial officer, budget oversight

#### Additional Provincial Leaders (30 positions)
- Provincial Executive Committee Members (8 positions)
- Provincial Working Committee Members (7 positions)
- Provincial Specialized Committees (8 positions)
- Provincial Regional Coordinators (5 positions)
- Provincial Support Positions (2 positions)

### Municipal Level (30 Positions)

#### Core Officials (5 positions)
1. **Chairperson** - Municipal leader, overall coordination
2. **Deputy Chairperson** - Assists Municipal Chairperson
3. **Secretary** - Administrative officer, operations
4. **Deputy Secretary** - Assists Municipal Secretary
5. **Treasurer** - Financial officer, budget oversight

#### Additional Municipal Leaders (25 positions)
- Municipal Executive Committee Members (8 positions)
- Municipal Working Committee Members (6 positions)
- Municipal Specialized Committees (6 positions)
- Municipal Ward Coordinators (4 positions)
- Municipal Support Positions (1 position)

### Ward Level (20 Positions)

#### Core Officials (5 positions)
1. **Chairperson** - Ward leader, overall coordination
2. **Deputy Chairperson** - Assists Ward Chairperson
3. **Secretary** - Administrative officer, operations
4. **Deputy Secretary** - Assists Ward Secretary
5. **Treasurer** - Financial officer, budget oversight

#### Additional Ward Leaders (15 positions)
- Ward Executive Committee Members (8 positions)
- Ward Working Committee Members (4 positions)
- Ward Specialized Positions (3 positions)

## Database Implementation

### Tables

#### leadership_positions
Stores all leadership position definitions:
- `id` - Primary key
- `position_name` - Name of the position
- `position_level` - Level (national, province, municipality, ward)
- `description` - Position description
- `display_order` - Order for display purposes
- `is_active` - Whether position is active

#### leadership_roles
Stores actual leadership assignments:
- `id` - Primary key
- `position_id` - Foreign key to leadership_positions
- `member_id` - Foreign key to members
- `start_date` - Assignment start date
- `end_date` - Assignment end date (nullable)
- `is_active` - Whether assignment is active
- `appointment_type` - Type of appointment
- `notes` - Additional notes

## API Endpoints

### GET /api/organizational-leadership/structure
Returns the complete organizational leadership structure with statistics.

**Response:**
```json
{
  "status": "success",
  "data": {
    "structure": {
      "national": [...],
      "province": [...],
      "municipality": [...],
      "ward": [...]
    },
    "statistics": [...],
    "summary": {
      "total_positions": 151,
      "filled_positions": 45,
      "vacant_positions": 106
    }
  }
}
```

### GET /api/organizational-leadership/positions/:level
Returns leadership positions for a specific level.

**Parameters:**
- `level` - Leadership level (national, province, municipality, ward)
- `entity_id` - Optional entity ID for filtering
- `include_vacant` - Include vacant positions (default: true)

### POST /api/organizational-leadership/assign
Assigns a member to a leadership position.

**Request Body:**
```json
{
  "position_id": 1,
  "member_id": 123,
  "start_date": "2024-01-01",
  "appointment_type": "appointment",
  "notes": "Appointed by executive committee"
}
```

## Frontend Components

### OrganizationalStructure.tsx
React component that displays the complete organizational leadership structure with:
- Tabbed interface for different levels
- Position cards showing assignment status
- Statistics dashboard
- Filter options (vacant positions only)
- Assignment management buttons

## Setup Instructions

### 1. Database Setup
Run the leadership structure seed script:

```bash
# Using PowerShell
.\scripts\run-leadership-seed.ps1

# Using Batch
scripts\run-leadership-seed.bat

# Using MySQL directly
mysql -u root -p membership_system < scripts/seed-leadership-structure.sql
```

### 2. Backend Setup
The organizational leadership routes are automatically included in the main application.

### 3. Frontend Integration
Import and use the OrganizationalStructure component:

```tsx
import OrganizationalStructure from '../components/leadership/OrganizationalStructure';

function LeadershipPage() {
  return <OrganizationalStructure />;
}
```

### 4. Testing
Run the comprehensive test script:

```bash
node backend/testOrganizationalLeadership.js
```

## Features

### ✅ Implemented
- Complete leadership position definitions (151 positions)
- Database schema and seed data
- API endpoints for structure management
- Frontend component for visualization
- Assignment management
- Statistics and reporting
- Data integrity validation

### 🔄 Future Enhancements
- Leadership election management
- Term limits and rotation
- Performance evaluation
- Succession planning
- Training and development tracking
- Reporting and analytics dashboard

## Usage Examples

### Viewing Leadership Structure
1. Navigate to the Leadership section
2. Select the desired level (National, Provincial, Municipal, Ward)
3. View position details and current assignments
4. Filter by vacant positions if needed

### Assigning Leadership Positions
1. Find a vacant position
2. Click "Assign Member"
3. Select member from dropdown
4. Set start date and appointment type
5. Add notes if needed
6. Submit assignment

### Managing Leadership Data
- Use the API endpoints to integrate with other systems
- Export leadership data for reporting
- Track assignment history and changes
- Monitor fill rates and vacant positions

## Support

For questions or issues related to the organizational leadership structure:
1. Check the API documentation
2. Review the test scripts for examples
3. Examine the database schema
4. Refer to the frontend component implementation
