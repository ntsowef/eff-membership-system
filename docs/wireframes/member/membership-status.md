# Membership Status and History Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]         Membership System                  [Notifications] [Profile] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────────────────┐ │
│ │ Navigation  │ │                                                         │ │
│ │             │ │  Membership Status and History                          │ │
│ │ Dashboard   │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │ Profile     │ │  │ Current Status                                      │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Membership  │ │  │  Status: ACTIVE                                     │ │ │
│ │             │ │  │  Member Since: 2020-05-10                           │ │ │
│ │ Documents   │ │  │  Current Term: 2024-10-20 to 2025-10-20             │ │ │
│ │             │ │  │  Membership ID: MEM-2020-12345                      │ │ │
│ │ Renewal     │ │  │  Ward: Ward 58, Johannesburg Metropolitan           │ │ │
│ │             │ │  │  Region: City of Johannesburg                       │ │ │
│ │ Notifications│ │  │  Province: Gauteng                                  │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │  [Request Ward Transfer]        [Renew Membership]  │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Membership History                                  │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │  ┌────────────┬────────────┬────────────┬─────────┐ │ │ │
│ │             │ │  │  │ Period     │ Status     │ Ward       │ Actions │ │ │ │
│ │             │ │  │  ├────────────┼────────────┼────────────┼─────────┤ │ │ │
│ │             │ │  │  │ 2024-10-20 │ Active     │ Ward 58,   │ View    │ │ │ │
│ │             │ │  │  │ to         │            │ Johannesburg│ Details │ │ │ │
│ │             │ │  │  │ 2025-10-20 │            │ Metropolitan│         │ │ │ │
│ │             │ │  │  ├────────────┼────────────┼────────────┼─────────┤ │ │ │
│ │             │ │  │  │ 2023-10-20 │ Active     │ Ward 58,   │ View    │ │ │ │
│ │             │ │  │  │ to         │            │ Johannesburg│ Details │ │ │ │
│ │             │ │  │  │ 2024-10-20 │            │ Metropolitan│         │ │ │ │
│ │             │ │  │  ├────────────┼────────────┼────────────┼─────────┤ │ │ │
│ │             │ │  │  │ 2022-10-20 │ Active     │ Ward 58,   │ View    │ │ │ │
│ │             │ │  │  │ to         │            │ Johannesburg│ Details │ │ │ │
│ │             │ │  │  │ 2023-10-20 │            │ Metropolitan│         │ │ │ │
│ │             │ │  │  ├────────────┼────────────┼────────────┼─────────┤ │ │ │
│ │             │ │  │  │ 2021-10-20 │ Active     │ Ward 45,   │ View    │ │ │ │
│ │             │ │  │  │ to         │            │ Johannesburg│ Details │ │ │ │
│ │             │ │  │  │ 2022-10-20 │            │ Metropolitan│         │ │ │ │
│ │             │ │  │  ├────────────┼────────────┼────────────┼─────────┤ │ │ │
│ │             │ │  │  │ 2020-05-10 │ Active     │ Ward 45,   │ View    │ │ │ │
│ │             │ │  │  │ to         │            │ Johannesburg│ Details │ │ │ │
│ │             │ │  │  │ 2021-10-20 │            │ Metropolitan│         │ │ │ │
│ │             │ │  │  └────────────┴────────────┴────────────┴─────────┘ │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │  [Download Membership Certificate]                  │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ └─────────────┘ └─────────────────────────────────────────────────────────┘ │
│                                                                             │
│ © 2025 Membership System                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

1. **Current Status Section**
   - Membership status (Active, Expired, Suspended, etc.)
   - Member since date
   - Current membership term with dates
   - Unique membership ID
   - Hierarchical assignment (Ward, Region, Province)
   - Action buttons for ward transfer and renewal

2. **Membership History Table**
   - Chronological list of all membership periods
   - Status for each period
   - Ward assignment for each period
   - View details action for each entry
   - Download membership certificate option

## Membership Status Details (Modal - Not Shown)
- Detailed information about a specific membership period
- Payment information (if applicable)
- Approval details
- Ward transfer history within the period
- Any status changes during the period

## Interactions

- "Request Ward Transfer" initiates the ward transfer workflow
- "Renew Membership" navigates to the renewal form
- "View Details" opens a modal with detailed information
- "Download Membership Certificate" generates a PDF certificate
- Table supports sorting and filtering options
