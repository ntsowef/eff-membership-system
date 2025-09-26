# Notification Center Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]         Membership System                  [Notifications] [Profile] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────────────────┐ │
│ │ Navigation  │ │                                                         │ │
│ │             │ │  Notification Center                                    │ │
│ │ Dashboard   │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │ Profile     │ │  │ Filters:  ○ All  ● Unread  ○ Read                  │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Membership  │ │  │ Type: [All Types ▼]  Date: [Last 30 Days ▼]        │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Documents   │ │  │ [Mark All as Read]                                  │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │ Renewal     │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │ Notifications│ │  │ ● Membership Renewal Reminder                      │ │ │
│ │             │ │  │   Your membership will expire in 176 days on        │ │ │
│ │             │ │  │   2025-10-20. Please renew your membership.         │ │ │
│ │             │ │  │   2025-04-27 08:15                                  │ │ │
│ │             │ │  │   [Mark as Read]                    [Renew Now]     │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ ● Document Verification Update                      │ │ │
│ │             │ │  │   Your proof of address document is pending         │ │ │
│ │             │ │  │   verification. We'll notify you once verified.     │ │ │
│ │             │ │  │   2025-04-15 14:30                                  │ │ │
│ │             │ │  │   [Mark as Read]                [View Document]     │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ ○ Ward Meeting Announcement                         │ │ │
│ │             │ │  │   Ward 58 meeting scheduled for May 15, 2025 at     │ │ │
│ │             │ │  │   18:00. Venue: Community Hall, 123 Main Street.    │ │ │
│ │             │ │  │   2025-04-10 09:45                                  │ │ │
│ │             │ │  │   [Mark as Unread]                  [Add to Calendar]│ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ ○ Voter Registration Verified                       │ │ │
│ │             │ │  │   Your voter registration has been verified          │ │ │
│ │             │ │  │   successfully. Thank you for your cooperation.     │ │ │
│ │             │ │  │   2025-03-10 11:20                                  │ │ │
│ │             │ │  │   [Mark as Unread]              [View Details]      │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Showing 4 of 12 notifications                       │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ [Load More]                                         │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ └─────────────┘ └─────────────────────────────────────────────────────────┘ │
│                                                                             │
│ © 2025 Membership System                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

1. **Notification Filters**
   - Read/Unread status filter
   - Notification type dropdown (All, Membership, Documents, Events, System)
   - Date range filter (Last 30 Days, Last 90 Days, Last Year, Custom Range)
   - "Mark All as Read" button

2. **Notification Cards**
   - Read/Unread status indicator (● for unread, ○ for read)
   - Notification title
   - Notification message
   - Timestamp
   - Context-specific action buttons
   - "Mark as Read/Unread" toggle

3. **Pagination**
   - Count of displayed notifications
   - "Load More" button for pagination

## Notification Types

1. **Membership Notifications**
   - Renewal reminders
   - Status changes
   - Expiry warnings

2. **Document Notifications**
   - Upload confirmations
   - Verification status updates
   - Document expiry warnings

3. **Event Notifications**
   - Ward meetings
   - Regional conferences
   - System maintenance

4. **System Notifications**
   - Profile updates
   - Security alerts
   - General announcements

## Interactions

- Clicking notification title expands/collapses details
- "Mark as Read/Unread" toggles notification status
- Context-specific buttons navigate to relevant sections
- "Load More" fetches additional notifications
- Type and date filters can be combined
- Unread count updates in real-time
