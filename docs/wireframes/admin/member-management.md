# Member Search and Management Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]         Membership System                  [Notifications] [Profile] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────────────────┐ │
│ │ Admin Menu  │ │                                                         │ │
│ │             │ │  Member Management: Johannesburg Metropolitan           │ │
│ │ Dashboard   │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │ Members     │ │  │ Search Members                                      │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Applications│ │  │ [                Search by name or ID number       ]│ │ │
│ │             │ │  │                                                     │ │ │
│ │ Hierarchy   │ │  │ Advanced Filters:                                   │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Voter       │ │  │ Status: [All ▼]  Ward: [All ▼]  Gender: [All ▼]    │ │ │
│ │ Verification│ │  │                                                     │ │ │
│ │             │ │  │ Voter Status: [All ▼]  Join Date: [Any Time ▼]     │ │ │
│ │ Analytics   │ │  │                                                     │ │ │
│ │             │ │  │ [Reset Filters]                     [Search]        │ │ │
│ │ Reports     │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │ Users       │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Search Results (345 members)        [Export ▼]      │ │ │
│ │ System      │ │  │                                                     │ │ │
│ │ Config      │ │  │ [Select All] [Bulk Actions ▼]                       │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ ┌──┬──────────┬─────────────┬────────┬────────────┐ │ │ │
│ │             │ │  │ │  │Member ID │Name         │Status  │Ward        │ │ │ │
│ │             │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │MEM-12345 │John Smith   │Active  │Ward 58     │ │ │ │
│ │             │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │MEM-12346 │Mary Johnson │Active  │Ward 58     │ │ │ │
│ │             │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │MEM-12347 │James Brown  │Expired │Ward 58     │ │ │ │
│ │             │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │MEM-12348 │Susan White  │Active  │Ward 58     │ │ │ │
│ │             │ │  │ ├──┼──────────┼─────────────┼────────┼────────────┤ │ │ │
│ │             │ │  │ │☐ │MEM-12349 │Robert Lee   │Pending │Ward 58     │ │ │ │
│ │             │ │  │ └──┴──────────┴─────────────┴────────┴────────────┘ │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Showing 1-5 of 345 members                         │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ [< Prev] [1] [2] [3] [4] [5] ... [69] [Next >]     │ │ │
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

2. **Search and Filter Section**
   - Quick search by name or ID number
   - Advanced filters:
     - Membership status (Active, Expired, Pending, Suspended)
     - Ward selection (filtered by current hierarchy level)
     - Gender filter
     - Voter registration status
     - Join date range
   - Reset filters button
   - Search button

3. **Results Management**
   - Total count of matching members
   - Export options (CSV, Excel, PDF)
   - Bulk actions dropdown (Send Notification, Update Status, Transfer Ward)
   - Select all checkbox

4. **Results Table**
   - Checkbox for selection
   - Member ID (clickable for details)
   - Name (clickable for details)
   - Membership status
   - Ward assignment
   - Additional columns available (configurable)

5. **Pagination Controls**
   - Page navigation
   - Items per page selector (not shown)
   - Current page indicator

## Member Details Modal (Not Shown)
- Comprehensive member information
- Membership history
- Document status
- Voter verification status
- Action buttons for common tasks
- Edit functionality

## Bulk Actions (Dropdown Options)
- Send Notification
- Update Status
- Transfer Ward
- Verify Voter Registration
- Export Selected
- Print Member Cards

## Interactions

- Clicking member name or ID opens detailed view
- Checkboxes allow multiple selections for bulk actions
- Advanced filters can be combined for precise searches
- Export creates downloadable file in selected format
- Pagination controls for navigating large result sets
- Sorting by clicking column headers (not shown in wireframe)
