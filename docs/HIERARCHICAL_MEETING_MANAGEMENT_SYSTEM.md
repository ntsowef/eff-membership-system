# Hierarchical Meeting Management System

## Overview

The Hierarchical Meeting Management System is a comprehensive solution designed to support the organizational structure of the EFF with automatic invitation management based on meeting types and hierarchy levels. The system supports all organizational levels from National to Ward level meetings with specific attendance rules and invitation logic.

## System Architecture

### Database Schema

The system uses an enhanced database schema with the following key tables:

#### Core Tables
- **meeting_types**: Defines meeting types with hierarchical support and auto-invitation rules
- **meetings**: Enhanced meetings table with hierarchical entity support
- **organizational_roles**: Defines roles across all hierarchy levels with invitation priorities
- **member_roles**: Assigns roles to members with entity-specific assignments
- **meeting_attendance**: Enhanced attendance tracking with invitation status
- **meeting_invitation_log**: Tracks invitation history and delivery status

#### Supporting Tables
- **meeting_invitation_rules**: Complex invitation logic rules
- **meeting_recurring_schedule**: Automated recurring meeting creation
- **meeting_templates**: Standardized meeting setups
- **meeting_agenda_items**: Meeting agenda management
- **meeting_minutes**: Meeting minutes and documentation
- **meeting_action_items**: Action item tracking
- **meeting_documents**: Document management
- **meeting_votes**: Formal voting system

### Meeting Types and Hierarchy

#### National Level Meetings

1. **War Council Meetings** (`war_council`)
   - **Frequency**: Weekly/Bi-weekly
   - **Attendees**: National Officials + NEC members
   - **Auto-Invitation**: President, Deputy President, Secretary General, Deputy Secretary General, National Chairperson, Treasurer General, NEC Members, Central Command Team Members

2. **National People's Assembly** (`npa`)
   - **Type**: Convention/Assembly
   - **Attendees**: Representatives from all branches across all nine provinces
   - **Auto-Invitation**: All branch delegates, ward chairpersons, ward secretaries + national leadership

3. **National General Assembly** (`nga`)
   - **Type**: Formal assembly meeting
   - **Scope**: National level governance
   - **Auto-Invitation**: National delegates and leadership

4. **CCT/NEC Quarterly Meetings** (`cct_nec_quarterly`)
   - **Frequency**: Quarterly
   - **Attendees**: Central Command Team + National Youth Leadership + National Women's Leadership + All Provincial Chairpersons + All Provincial Secretaries
   - **Auto-Invitation**: CCT members, NEC members, National Youth President/Secretary General, National Women President/Secretary General, all Provincial Chairpersons and Secretaries

5. **Policy Conferences** (`policy_conference`)
   - **Type**: Special events for policy development
   - **Auto-Invitation**: Policy delegates and national leadership

6. **Elective Conferences** (`elective_conference`)
   - **Type**: Leadership election meetings
   - **Auto-Invitation**: Voting delegates and election officials

#### Provincial Level Meetings

1. **Provincial People's Assembly** (`ppa`)
   - **Attendees**: All provincial branches within the specific province
   - **Auto-Invitation**: All branches within the specified province

2. **Provincial Elective Conference** (`provincial_elective`)
   - **Type**: Leadership election meetings at provincial level
   - **Auto-Invitation**: Provincial voting delegates

3. **Provincial General Assembly** (`pga`)
   - **Type**: Regular provincial governance meetings
   - **Auto-Invitation**: Provincial leadership and delegates

4. **Special Provincial General Assembly** (`special_pga`)
   - **Attendees**: All branches within the province + Provincial Leadership
   - **Auto-Invitation**: All provincial branches and leadership

#### Regional/District Level Meetings

- **Regional Coordination Meeting** (`regional_coord`)
  - **Type**: District-level coordination and governance
  - **Auto-Invitation**: Regional leadership and representatives

#### Municipal Level Meetings

- **Sub-Regional Meeting** (`sub_regional`)
  - **Type**: Municipal-level coordination
  - **Auto-Invitation**: Municipal leadership and representatives

#### Ward Level Meetings

- **Branch Meeting** (`branch_meeting`)
  - **Type**: Ward/local level grassroots governance
  - **Auto-Invitation**: Ward leadership and branch members

## API Endpoints

### Hierarchical Meeting Management

#### Base URL: `/api/hierarchical-meetings`

#### Meeting Types
- `GET /meeting-types` - Get hierarchical meeting types
- `GET /meeting-types?hierarchy_level=National` - Filter by hierarchy level

#### Organizational Roles
- `GET /organizational-roles` - Get all organizational roles
- `GET /organizational-roles?hierarchy_level=Provincial` - Filter by hierarchy level

#### Members with Roles
- `GET /members-with-roles?hierarchy_level=National` - Get members with roles for invitation targeting

#### Invitation Preview
- `POST /invitation-preview` - Preview automatic invitations for a meeting type
  ```json
  {
    "meeting_type_id": 1,
    "hierarchy_level": "National",
    "entity_id": 1,
    "entity_type": "Province"
  }
  ```

#### Meeting Management
- `POST /` - Create hierarchical meeting with automatic invitations
- `POST /:meetingId/send-invitations` - Send invitations for existing meeting
- `GET /statistics` - Get meeting statistics by hierarchy

## Frontend Components

### Pages

1. **HierarchicalMeetingCreatePage** (`/admin/meetings/hierarchical/new`)
   - Enhanced meeting creation with automatic invitation preview
   - Meeting type selection with hierarchy-specific filtering
   - Real-time invitation preview with role-based attendee lists
   - Support for all meeting platforms (In-Person, Virtual, Hybrid)

2. **HierarchicalMeetingsDashboard** (`/admin/meetings/hierarchical`)
   - Comprehensive dashboard with hierarchical statistics
   - Advanced filtering by hierarchy level, status, and category
   - Meeting analytics with attendance tracking
   - Hierarchical meeting overview with expandable statistics

### Key Features

#### Automatic Invitation System
- **Rule-Based Invitations**: Automatic invitation generation based on meeting type and hierarchy
- **Role-Based Targeting**: Invitations sent to members based on their organizational roles
- **Priority System**: Invitation priority based on role importance and meeting requirements
- **Preview System**: Real-time preview of who will be invited before creating meetings

#### Hierarchical Support
- **Multi-Level Hierarchy**: Support for National, Provincial, Regional, Municipal, and Ward levels
- **Entity-Specific Meetings**: Meetings can be tied to specific provinces, regions, municipalities, or wards
- **Cross-Hierarchy Invitations**: Higher-level meetings can include representatives from lower levels

#### Meeting Management
- **Comprehensive Scheduling**: Full meeting lifecycle management from creation to completion
- **Attendance Tracking**: Real-time attendance tracking with check-in/check-out functionality
- **Document Management**: Meeting documents, agendas, and minutes management
- **Action Items**: Track action items and follow-ups from meetings

## Installation and Setup

### Database Migration

1. Run the hierarchical meeting system migrations:
   ```bash
   # Run the migrations in order
   node run-single-migration.js 017_hierarchical_meeting_management_system.sql
   node run-single-migration.js 018_enhanced_meetings_and_invitations.sql
   ```

### Backend Setup

1. The hierarchical meeting routes are automatically registered in the main app
2. Ensure the `HierarchicalMeetingService` is properly imported
3. Verify database connections and permissions

### Frontend Setup

1. The new pages are automatically included in the routing system
2. Navigation menu includes hierarchical meeting options
3. Ensure all required dependencies are installed

## Testing

### Automated Testing

Run the comprehensive test suite:

```bash
node test/hierarchical-meeting-system-test.js
```

The test suite covers:
- Database schema validation
- Meeting types and organizational roles
- API endpoint functionality
- Invitation preview logic
- Meeting creation and management

### Manual Testing

1. **Meeting Type Selection**: Test different meeting types and verify correct invitation rules
2. **Invitation Preview**: Verify invitation previews show correct attendees for each meeting type
3. **Meeting Creation**: Create meetings and verify automatic invitations are sent
4. **Hierarchy Filtering**: Test filtering by different hierarchy levels
5. **Attendance Tracking**: Test attendance management and reporting

## Security Considerations

- **Role-Based Access**: Only authorized users can create meetings at their hierarchy level
- **Entity Restrictions**: Users can only create meetings for entities they have access to
- **Invitation Validation**: Automatic validation of invitation targets based on roles
- **Audit Trail**: Complete audit trail of meeting creation and invitation activities

## Performance Optimization

- **Database Indexing**: Optimized indexes for hierarchical queries
- **Caching**: Meeting types and organizational roles are cached for performance
- **Batch Operations**: Bulk invitation creation and updates
- **Query Optimization**: Efficient queries for large-scale invitation generation

## Future Enhancements

1. **Real-time Notifications**: WebSocket-based real-time meeting notifications
2. **Calendar Integration**: Integration with external calendar systems
3. **Video Conferencing**: Direct integration with video conferencing platforms
4. **Mobile App**: Mobile application for meeting management
5. **Advanced Analytics**: Enhanced meeting analytics and reporting
6. **AI-Powered Scheduling**: Intelligent meeting scheduling based on availability

## Support and Maintenance

- **Documentation**: Comprehensive API and user documentation
- **Monitoring**: System monitoring and performance tracking
- **Backup**: Regular database backups and disaster recovery
- **Updates**: Regular system updates and security patches

## Conclusion

The Hierarchical Meeting Management System provides a comprehensive solution for managing organizational meetings across all hierarchy levels with automatic invitation management, attendance tracking, and comprehensive reporting. The system is designed to scale with the organization and support complex meeting scenarios while maintaining ease of use and reliability.
