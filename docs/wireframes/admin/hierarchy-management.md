# Hierarchical Structure Management Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]         Membership System                  [Notifications] [Profile] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────────────────┐ │
│ │ Admin Menu  │ │                                                         │ │
│ │             │ │  Hierarchical Structure Management                      │ │
│ │ Dashboard   │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │ Members     │ │  │ Hierarchy Navigator                                 │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Applications│ │  │ [National ▼] > [Gauteng ▼] > [City of Johannesburg ▼]│ │ │
│ │             │ │  │                                                     │ │ │
│ │ Hierarchy   │ │  │ [Search Hierarchy...]                   [Add New +] │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │ Voter       │ │                                                         │ │
│ │ Verification│ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Johannesburg Metropolitan Municipality              │ │ │
│ │ Analytics   │ │  │                                                     │ │ │
│ │             │ │  │ Code: JHB-METRO                                     │ │ │
│ │ Reports     │ │  │ Status: Active                                      │ │ │
│ │             │ │  │ Members: 1,567                                      │ │ │
│ │ Users       │ │  │ Capacity: 5,000                                     │ │ │
│ │             │ │  │ Description: Metropolitan municipality covering the │ │ │
│ │ System      │ │  │ greater Johannesburg area.                         │ │ │
│ │ Config      │ │  │                                                     │ │ │
│ │             │ │  │ [Edit]                                 [Deactivate] │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Child Entities: Wards                    [Add Ward] │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ ┌────────┬──────────────┬────────┬────────┬────────┐ │ │ │
│ │             │ │  │ │Code    │Name          │Status  │Members │Actions │ │ │ │
│ │             │ │  │ ├────────┼──────────────┼────────┼────────┼────────┤ │ │ │
│ │             │ │  │ │JHB-W58 │Ward 58       │Active  │345     │Edit    │ │ │ │
│ │             │ │  │ │        │              │        │        │Manage  │ │ │ │
│ │             │ │  │ ├────────┼──────────────┼────────┼────────┼────────┤ │ │ │
│ │             │ │  │ │JHB-W59 │Ward 59       │Active  │278     │Edit    │ │ │ │
│ │             │ │  │ │        │              │        │        │Manage  │ │ │ │
│ │             │ │  │ ├────────┼──────────────┼────────┼────────┼────────┤ │ │ │
│ │             │ │  │ │JHB-W60 │Ward 60       │Active  │312     │Edit    │ │ │ │
│ │             │ │  │ │        │              │        │        │Manage  │ │ │ │
│ │             │ │  │ ├────────┼──────────────┼────────┼────────┼────────┤ │ │ │
│ │             │ │  │ │JHB-W61 │Ward 61       │Active  │289     │Edit    │ │ │ │
│ │             │ │  │ │        │              │        │        │Manage  │ │ │ │
│ │             │ │  │ ├────────┼──────────────┼────────┼────────┼────────┤ │ │ │
│ │             │ │  │ │JHB-W62 │Ward 62       │Inactive│0       │Edit    │ │ │ │
│ │             │ │  │ │        │              │        │        │Activate│ │ │ │
│ │             │ │  │ └────────┴──────────────┴────────┴────────┴────────┘ │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Showing 1-5 of 35 wards                            │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ [< Prev] [1] [2] [3] [4] [5] ... [7] [Next >]      │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ └─────────────┘ └─────────────────────────────────────────────────────────┘ │
│                                                                             │
│ © 2025 Membership System                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

1. **Hierarchy Navigator**
   - Breadcrumb-style navigation showing current position in hierarchy
   - Dropdown selectors for each level
   - Search functionality for quick access to specific entities
   - "Add New" button for creating new entities at the current level

2. **Entity Details Panel**
   - Name, code, and status of the current entity
   - Member count and capacity
   - Description
   - Edit and Deactivate/Activate buttons

3. **Child Entities Table**
   - List of entities one level below current selection
   - Add button for creating new child entities
   - Code and name for each entity
   - Status indicator (Active/Inactive)
   - Member count
   - Action buttons (Edit, Manage, Activate/Deactivate)
   - Pagination controls

## Entity Edit Modal (Not Shown)
- Form fields for entity properties:
  - Name
  - Code
  - Description
  - Capacity
  - Status
- Save and Cancel buttons

## Add Entity Modal (Not Shown)
- Form fields for new entity:
  - Name
  - Code (with automatic suggestion)
  - Description
  - Capacity
  - Status (Active by default)
- Create and Cancel buttons

## Interactions

- Clicking breadcrumb elements navigates up the hierarchy
- Dropdown selectors allow jumping to specific entities
- "Edit" button opens edit modal for the entity
- "Manage" navigates to the selected child entity
- "Deactivate/Activate" toggles entity status with confirmation
- "Add New" and "Add Ward" open the creation modal
- Search provides real-time filtering of entities
- Table supports sorting by columns
