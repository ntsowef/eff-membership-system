# User and Role Management Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]         Membership System                  [Notifications] [Profile] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────────────────┐ │
│ │ Admin Menu  │ │                                                         │ │
│ │             │ │  User and Role Management                               │ │
│ │ Dashboard   │ │                                                         │ │
│ │             │ │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │ │
│ │ Members     │ │  │ Users       │  │ Roles       │  │ Permissions │     │ │
│ │             │ │  └─────────────┘  └─────────────┘  └─────────────┘     │ │
│ │ Applications│ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │ Hierarchy   │ │  │ User Management                         [Add User +]│ │ │
│ │             │ │  │                                                     │ │ │
│ │ Voter       │ │  │ [                Search users                      ]│ │ │
│ │ Verification│ │  │                                                     │ │ │
│ │             │ │  │ Filters: Role: [All Roles ▼]  Status: [All ▼]      │ │ │
│ │ Analytics   │ │  │         Entity: [Johannesburg Metropolitan ▼]       │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Reports     │ │  │ ┌──┬──────────┬─────────────┬────────┬────────────┐ │ │ │
│ │             │ │  │ │  │Username  │Name         │Role    │Status      │ │ │ │
│ │ Users       │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │jsmith    │John Smith   │Ward    │Active      │ │ │ │
│ │ System      │ │  │ │  │          │             │Admin   │            │ │ │ │
│ │ Config      │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │mjohnson  │Mary Johnson │Muni    │Active      │ │ │ │
│ │             │ │  │ │  │          │             │Admin   │            │ │ │ │
│ │             │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │jbrown    │James Brown  │Member  │Active      │ │ │ │
│ │             │ │  │ │  │          │             │        │            │ │ │ │
│ │             │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │swhite    │Susan White  │Member  │Locked      │ │ │ │
│ │             │ │  │ │  │          │             │        │            │ │ │ │
│ │             │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │rlee      │Robert Lee   │Ward    │Inactive    │ │ │ │
│ │             │ │  │ │  │          │             │Admin   │            │ │ │ │
│ │             │ │  │ └──┴──────────┴─────────────┴────────┴────────────┘ │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ [Bulk Actions ▼]                                    │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Showing 1-5 of 28 users                            │ │ │
│ │             │ │  │ [< Prev] [1] [2] [3] [4] [5] [Next >]              │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ User Details: jsmith                               │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Username: jsmith                                   │ │ │
│ │             │ │  │ Full Name: John Smith                              │ │ │
│ │             │ │  │ Email: john.smith@example.com                      │ │ │
│ │             │ │  │ Role: Ward Administrator                           │ │ │
│ │             │ │  │ Entity: Ward 58, Johannesburg Metropolitan         │ │ │
│ │             │ │  │ Status: Active                                     │ │ │
│ │             │ │  │ Last Login: 2025-04-26 14:30                       │ │ │
│ │             │ │  │ MFA Enabled: Yes                                   │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ [Edit User]  [Reset Password]  [Lock Account]       │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ └─────────────┘ └─────────────────────────────────────────────────────────┘ │
│                                                                             │
│ © 2025 Membership System                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

1. **Tab Navigation**
   - Users tab (current view)
   - Roles tab (for role management)
   - Permissions tab (for permission management)

2. **User Management Section**
   - Add User button
   - Search field for quick user lookup
   - Filters for role, status, and hierarchical entity
   - User table with columns for:
     - Selection checkbox
     - Username
     - Full name
     - Role
     - Status
   - Bulk Actions dropdown
   - Pagination controls

3. **User Details Panel**
   - Username and full name
   - Email address
   - Role assignment
   - Hierarchical entity assignment
   - Account status
   - Last login timestamp
   - MFA status
   - Action buttons (Edit, Reset Password, Lock/Unlock Account)

## Role Management Tab (Not Shown)
- List of system roles
- Role details (name, description, permissions)
- Add/Edit role functionality
- Permission assignment interface

## Permission Management Tab (Not Shown)
- List of system permissions
- Permission details (name, description, type)
- Add/Edit permission functionality
- Permission grouping and categorization

## Add/Edit User Modal (Not Shown)
- Form fields for user details:
  - Username
  - Full name
  - Email
  - Password (for new users)
  - Role selection
  - Entity assignment
  - Status
  - MFA requirement
- Save and Cancel buttons

## Bulk Actions (Dropdown Options)
- Activate Selected
- Deactivate Selected
- Lock Selected
- Unlock Selected
- Reset Password
- Change Role
- Export Selected

## Interactions

- Clicking username or row selects user and shows details in panel
- Tab navigation switches between Users, Roles, and Permissions views
- "Add User" opens the user creation modal
- "Edit User" opens the user edit modal
- "Reset Password" triggers password reset workflow
- "Lock/Unlock Account" toggles account status
- Checkboxes allow multiple selections for bulk actions
- Filters update the user list in real-time
