# Application Review Interface Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]         Membership System                  [Notifications] [Profile] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────────────────┐ │
│ │ Admin Menu  │ │                                                         │ │
│ │             │ │  Application Review: Johannesburg Metropolitan          │ │
│ │ Dashboard   │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │ Members     │ │  │ Filter Applications                                 │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Applications│ │  │ Status: [Submitted ▼]  Type: [All Types ▼]         │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Hierarchy   │ │  │ Ward: [All Wards ▼]  Date: [Last 30 Days ▼]        │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Voter       │ │  │ [Reset]                              [Apply Filters]│ │ │
│ │ Verification│ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │ Analytics   │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Applications (24)                    [Bulk Actions ▼]│ │ │
│ │ Reports     │ │  │                                                     │ │ │
│ │             │ │  │ ┌──┬──────────┬─────────────┬────────┬────────────┐ │ │ │
│ │ Users       │ │  │ │  │App ID    │Applicant    │Type    │Submitted   │ │ │ │
│ │             │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │ System      │ │  │ │☐ │APP-34501 │John Smith   │New     │2025-04-26  │ │ │ │
│ │ Config      │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │APP-34502 │Mary Johnson │New     │2025-04-25  │ │ │ │
│ │             │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │APP-34503 │James Brown  │Transfer│2025-04-24  │ │ │ │
│ │             │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │APP-34504 │Susan White  │New     │2025-04-23  │ │ │ │
│ │             │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │APP-34505 │Robert Lee   │Renewal │2025-04-22  │ │ │ │
│ │             │ │  │ └──┴──────────┴─────────────┴────────┴────────────┘ │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Showing 1-5 of 24 applications                     │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ [< Prev] [1] [2] [3] [4] [5] [Next >]              │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Application Details: APP-34501                      │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Applicant: John Smith                              │ │ │
│ │             │ │  │ ID Number: 8001015012087                           │ │ │
│ │             │ │  │ Type: New Application                              │ │ │
│ │             │ │  │ Submitted: 2025-04-26 14:30                        │ │ │
│ │             │ │  │ Ward: Ward 58, Johannesburg Metropolitan           │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ [View Full Application]                            │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Documents:                                         │ │ │
│ │             │ │  │ ✓ ID Copy [View]                                   │ │ │
│ │             │ │  │ ✓ Proof of Address [View]                          │ │ │
│ │             │ │  │ ✓ Profile Photo [View]                             │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Voter Verification:                                │ │ │
│ │             │ │  │ ⚠ Pending Verification [Verify Now]                │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Notes:                                             │ │ │
│ │             │ │  │ [                                                 ]│ │ │
│ │             │ │  │ [                                                 ]│ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Decision:                                          │ │ │
│ │             │ │  │ [Reject] [Request More Info] [Approve Application] │ │ │
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

2. **Filter Section**
   - Status filter (Submitted, Under Review, Approved, Rejected)
   - Application type filter (New, Renewal, Transfer)
   - Ward filter (based on administrator's jurisdiction)
   - Date range filter
   - Reset and Apply buttons

3. **Applications List**
   - Total count of matching applications
   - Bulk actions dropdown
   - Checkbox for selection
   - Application ID (clickable)
   - Applicant name
   - Application type
   - Submission date
   - Pagination controls

4. **Application Details Panel**
   - Application summary information
   - "View Full Application" button for complete details
   - Document section with verification status and view links
   - Voter verification status with action button
   - Notes field for administrative comments
   - Decision buttons (Reject, Request More Info, Approve)

## Full Application View (Not Shown)
- Complete application form data
- All submitted documents
- Address verification results
- Duplicate check results
- Applicant history (if existing member)

## Bulk Actions (Dropdown Options)
- Approve Selected
- Reject Selected
- Request More Information
- Assign to Administrator
- Export Selected

## Interactions

- Clicking application in the list loads details in the panel below
- "View" links for documents open document preview modals
- "Verify Now" initiates voter verification process
- Decision buttons trigger confirmation dialogs
- Notes are saved automatically or with explicit save button
- "View Full Application" opens complete application in new view
