# Admin Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]         Membership System                  [Notifications] [Profile] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────────────────┐ │
│ │ Admin Menu  │ │                                                         │ │
│ │             │ │  Admin Dashboard: Johannesburg Metropolitan             │ │
│ │ Dashboard   │ │                                                         │ │
│ │             │ │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────┐ │ │
│ │ Members     │ │  │ Total       │ │ New         │ │ Pending     │ │ Exp.│ │ │
│ │             │ │  │ Members     │ │ Applications│ │ Verifications│ │ Soon│ │ │
│ │ Applications│ │  │             │ │             │ │             │ │     │ │ │
│ │             │ │  │ 1,567       │ │ 24          │ │ 18          │ │ 45  │ │ │
│ │ Hierarchy   │ │  │             │ │             │ │             │ │     │ │ │
│ │             │ │  │ +3.2% ↑     │ │ View >      │ │ Process >   │ │ View│ │ │
│ │ Voter       │ │  └─────────────┘ └─────────────┘ └─────────────┘ └─────┘ │ │
│ │ Verification│ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │ Analytics   │ │  │ Membership Growth (Last 12 Months)                  │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Reports     │ │  │  [Chart: Line graph showing membership growth]      │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Users       │ │  │                                                     │ │ │
│ │             │ │  │                                                     │ │ │
│ │ System      │ │  │                                                     │ │ │
│ │ Config      │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌───────────────────────┐ ┌───────────────────────────┐ │ │
│ │             │ │  │ Demographics          │ │ Voter Registration Status │ │ │
│ │             │ │  │                       │ │                           │ │ │
│ │             │ │  │ [Chart: Pie charts    │ │ [Chart: Pie chart showing │ │ │
│ │             │ │  │  for age, gender]     │ │  registration status]     │ │ │
│ │             │ │  │                       │ │                           │ │ │
│ │             │ │  │                       │ │ Registered: 89%           │ │ │
│ │             │ │  │                       │ │ Not Registered: 7%        │ │ │
│ │             │ │  │                       │ │ Pending: 4%               │ │ │
│ │             │ │  └───────────────────────┘ └───────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Recent Activities                                   │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │  • New application submitted by John Smith (5m ago) │ │ │
│ │             │ │  │  • Document verified for Mary Johnson (1h ago)      │ │ │
│ │             │ │  │  • Voter status updated for James Brown (2h ago)    │ │ │
│ │             │ │  │  • Ward transfer approved for Susan White (3h ago)  │ │ │
│ │             │ │  │  • New member approved by Admin Jane (5h ago)       │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │                                     View All >      │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ └─────────────┘ └─────────────────────────────────────────────────────────┘ │
│                                                                             │
│ © 2025 Membership System                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

1. **Hierarchical Context Header**
   - Current administrative level displayed (Municipality in this example)
   - Can be changed to view different hierarchical levels based on permissions

2. **Key Metrics Cards**
   - Total Members with growth indicator
   - New Applications count with quick access
   - Pending Verifications with quick access
   - Expiring Soon memberships with quick access

3. **Membership Growth Chart**
   - Line graph showing membership trends over 12 months
   - Month-over-month comparison
   - Ability to filter by ward

4. **Demographics Charts**
   - Age distribution pie chart
   - Gender distribution pie chart
   - Filterable by ward or entire municipality

5. **Voter Registration Status**
   - Pie chart showing registration percentages
   - Quick statistics on registered, unregistered, and pending members

6. **Recent Activities Feed**
   - Real-time updates of system activities
   - Timestamps for each activity
   - Links to relevant records
   - "View All" option for complete activity log

## Admin Navigation Menu

- Dashboard (current view)
- Members - Member search and management
- Applications - Application review and processing
- Hierarchy - Hierarchical structure management
- Voter Verification - Verification processing
- Analytics - Detailed analytics and reporting
- Reports - Report builder and saved reports
- Users - User and role management
- System Config - System configuration options

## Interactions

- Cards provide quick access to relevant sections
- Charts support drill-down for detailed analysis
- Activity feed updates in real-time
- Admin can filter data by hierarchical level
- Responsive design adapts to screen size
