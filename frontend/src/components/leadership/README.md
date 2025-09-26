# Leadership Assignment System

A comprehensive UI system for allocating members to leadership positions in the membership management system.

## Overview

This system provides a complete solution for managing organizational leadership assignments with the following components:

- **LeadershipManagement.tsx** - Main dashboard with overview and navigation
- **LeadershipAssignment.tsx** - Core assignment interface
- **MemberSelector.tsx** - Advanced member selection component
- **leadershipApi.ts** - API service layer

## Features

### ✅ Implemented Features

1. **Complete Leadership Assignment Workflow**
   - Position filtering by hierarchy level (National/Province/Municipality/Ward)
   - Search functionality for positions
   - Vacant position highlighting
   - Advanced member selection with eligibility validation
   - Assignment form with validation
   - Support for appointment types (Elected/Appointed/Acting/Interim)

2. **Advanced Member Selection**
   - Search by name, ID number, email, phone
   - Geographic filtering capabilities
   - Member eligibility validation
   - Member profile preview
   - Real-time search results

3. **Comprehensive Dashboard**
   - Leadership statistics overview
   - Quick action buttons for assignments
   - Tabbed interface for different functions
   - Recent appointments tracking
   - Hierarchy-based analytics

4. **API Integration**
   - Full integration with backend leadership endpoints
   - Error handling and validation
   - Real-time data updates
   - Optimistic UI updates

## Components

### LeadershipManagement.tsx

Main dashboard component providing:
- Overview of leadership statistics
- Quick action buttons
- Recent appointments list
- Tabbed interface (Overview, Assignment, Structure, Reports)
- Integration with existing LeadershipPage.tsx

**Usage:**
```tsx
import { LeadershipManagement } from '../components/leadership';

function LeadershipPage() {
  return <LeadershipManagement />;
}
```

### LeadershipAssignment.tsx

Core assignment interface featuring:
- Position filtering by hierarchy level
- Search functionality for positions
- Vacant position highlighting
- Assignment form with validation
- Date picker integration
- Appointment type selection

**Usage:**
```tsx
import { LeadershipAssignment } from '../components/leadership';

function AssignmentPage() {
  return (
    <LeadershipAssignment 
      onAssignmentComplete={() => console.log('Assignment completed!')}
    />
  );
}
```

### MemberSelector.tsx

Advanced member selection component with:
- Search by multiple criteria
- Geographic filtering
- Member eligibility validation
- Member profile preview
- Pagination support

**Usage:**
```tsx
import { MemberSelector } from '../components/leadership';

function CustomAssignment() {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleMemberSelect = (member) => {
    console.log('Selected member:', member);
    setIsOpen(false);
  };

  return (
    <MemberSelector
      open={isOpen}
      onClose={() => setIsOpen(false)}
      onSelect={handleMemberSelect}
      title="Select Team Leader"
      filterByLevel="Municipality"
      entityId={123}
    />
  );
}
```

### leadershipApi.ts

API service layer providing:
- `getPositions()` - Fetch leadership positions
- `createAppointment()` - Create new assignment
- `getMembers()` - Fetch members with filtering
- `validateMemberEligibility()` - Check member eligibility
- `isPositionVacant()` - Check position vacancy

**Usage:**
```tsx
import { LeadershipAPI } from '../services/leadershipApi';

// Create appointment
const appointmentData = {
  position_id: 1,
  member_id: 123,
  hierarchy_level: 'National',
  entity_id: 1,
  appointment_type: 'Appointed',
  start_date: '2024-01-01',
  appointment_notes: 'Appointed during restructuring'
};

const appointmentId = await LeadershipAPI.createAppointment(appointmentData);
```

## Integration

### With Existing LeadershipPage

The system integrates seamlessly with the existing `LeadershipPage.tsx`:

1. **Overview Mode** - Shows existing leadership structure and analytics
2. **Management Mode** - Full leadership assignment interface
3. **Toggle Button** - Switch between modes

### API Endpoints Used

- `GET /api/v1/leadership/positions` - Fetch positions
- `POST /api/v1/leadership/appointments` - Create appointments
- `GET /api/v1/leadership/structures` - Get organizational structures
- `GET /api/v1/members` - Fetch members
- `GET /api/v1/analytics/leadership` - Leadership analytics

### Authentication

Requires admin level 3 authentication for appointment creation:
```typescript
// Backend validation
router.post('/appointments', authenticate, requireAdminLevel(3), ...)
```

## Workflow

### Complete Assignment Process

1. **Select Hierarchy Level** → Choose National/Province/Municipality/Ward
2. **Filter Positions** → View available positions for the level
3. **Choose Position** → Select vacant position to fill
4. **Select Member** → Open member selector and choose eligible member
5. **Fill Assignment Form** → Set appointment type, dates, and notes
6. **Submit Assignment** → Create the appointment
7. **Confirmation** → Success message and data refresh

### Validation Rules

- Only active members can be appointed
- Positions must be vacant before assignment
- Start date is required
- End date is optional
- Appointment notes are optional but recommended

## Error Handling

- Network error handling with retry logic
- Form validation with user-friendly messages
- Member eligibility validation
- Position vacancy checking
- Comprehensive error messages

## Dependencies

- Material-UI components
- React Query for data fetching
- Date picker components
- Notistack for notifications
- TypeScript for type safety

## Future Enhancements

- Election management interface
- Bulk appointment operations
- Advanced reporting and analytics
- Appointment history tracking
- Term limit management
- Automated notifications

## Troubleshooting

### Common Issues

1. **API Endpoints Not Found**
   - Ensure backend server is running
   - Check that leadership routes are properly registered

2. **Authentication Errors**
   - Verify user has admin level 3 permissions
   - Check JWT token validity

3. **Member Selection Issues**
   - Verify member data is properly formatted
   - Check geographic filtering parameters

4. **Date Picker Issues**
   - Ensure LocalizationProvider is properly configured
   - Check date format compatibility

## Support

For issues or questions about the leadership assignment system, please refer to:
- Backend API documentation
- Component prop interfaces
- TypeScript type definitions
- Error handling patterns
