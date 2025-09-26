# Profile Management Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]         Membership System                  [Notifications] [Profile] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────────────────┐ │
│ │ Navigation  │ │                                                         │ │
│ │             │ │  Profile Management                                     │ │
│ │ Dashboard   │ │                                                         │ │
│ │             │ │  ┌─────────────────────┐  ┌─────────────────────────────┐ │ │
│ │ Profile     │ │  │                     │  │ Personal Information        │ │ │
│ │  > Personal │ │  │                     │  │                             │ │ │
│ │  > Address  │ │  │                     │  │ ID Number: 8001015012087    │ │ │
│ │  > Security │ │  │     [Photo]         │  │ (Cannot be changed)         │ │ │
│ │             │ │  │                     │  │                             │ │ │
│ │ Membership  │ │  │                     │  │ First Name: [John         ] │ │ │
│ │             │ │  │                     │  │                             │ │ │
│ │ Documents   │ │  │  [Change Photo]     │  │ Middle Name: [            ] │ │ │
│ │             │ │  │                     │  │                             │ │ │
│ │ Renewal     │ │  └─────────────────────┘  │ Last Name: [Smith         ] │ │ │
│ │             │ │                           │                             │ │ │
│ │ Notifications│ │                          │ Gender: ● Male ○ Female     │ │ │
│ │             │ │                           │         ○ Other ○ Prefer    │ │ │
│ │             │ │                           │                not to say   │ │ │
│ │             │ │                           │                             │ │ │
│ │             │ │                           │ Date of Birth: 01/01/1980   │ │ │
│ │             │ │                           │ (Cannot be changed)         │ │ │
│ │             │ │                           │                             │ │ │
│ │             │ │                           │ Email: [john.s@example.com] │ │ │
│ │             │ │                           │                             │ │ │
│ │             │ │                           │ Cell: [+27 82 123 4567    ] │ │ │
│ │             │ │                           │                             │ │ │
│ │             │ │                           │ Alt Number: [             ] │ │ │
│ │             │ │                           │                             │ │ │
│ │             │ │                           │ [Save Changes]              │ │ │
│ │             │ │                           └─────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Change History                                      │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ • Email updated on 2025-03-15                      │ │ │
│ │             │ │  │ • Cell number updated on 2025-02-10                │ │ │
│ │             │ │  │ • Profile photo changed on 2025-01-22              │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │                                     View All >      │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ └─────────────┘ └─────────────────────────────────────────────────────────┘ │
│                                                                             │
│ © 2025 Membership System                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

1. **Profile Photo Management**
   - Current profile photo display
   - Change photo button
   - Support for image cropping and resizing

2. **Personal Information Form**
   - Read-only fields for unchangeable information (ID Number, Date of Birth)
   - Editable fields for personal details
   - Form validation for email and phone formats

3. **Sub-Navigation**
   - Personal Information (current view)
   - Address Information (separate tab)
   - Security Settings (separate tab)

4. **Change History**
   - Timeline of recent profile changes
   - Date and description of each change
   - Option to view complete history

## Additional Screens (Not Shown)

### Address Information Tab
- Residential address fields
- Postal address fields
- Ward assignment (with change request option)
- Address verification status

### Security Settings Tab
- Password change functionality
- Two-factor authentication setup
- Account recovery options
- Login history

## Interactions

- Real-time validation of email and phone formats
- Confirmation dialog for saving changes
- Restricted fields clearly marked as non-editable
- Address change triggers ward reassignment process
- Profile photo upload with preview
