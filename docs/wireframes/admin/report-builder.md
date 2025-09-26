# Report Builder Interface Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]         Membership System                  [Notifications] [Profile] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────────────────┐ │
│ │ Admin Menu  │ │                                                         │ │
│ │             │ │  Report Builder: Johannesburg Metropolitan              │ │
│ │ Dashboard   │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │ Members     │ │  │ Report Configuration                                │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Applications│ │  │ Report Name: [Membership Status by Ward           ] │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Hierarchy   │ │  │ Description: [Analysis of membership status across ] │ │ │
│ │             │ │  │              [wards in Johannesburg Metropolitan  ] │ │ │
│ │ Voter       │ │  │                                                     │ │ │
│ │ Verification│ │  │ Report Type: [Tabular Report ▼]                     │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Analytics   │ │  │ Time Period: [Last 12 Months ▼]                     │ │ │
│ │  > Dashboard│ │  │                                                     │ │ │
│ │  > Reports  │ │  │ [Save Template]                                     │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │ Users       │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │ System      │ │  │ Data Selection                                      │ │ │
│ │ Config      │ │  │                                                     │ │ │
│ │             │ │  │ Rows: [Ward ▼]                                      │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Columns: [Membership Status ▼]                      │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Metrics: ☑ Count  ☑ Percentage  ☐ Growth Rate      │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Filters:                                           │ │ │
│ │             │ │  │ ┌────────────────┬────────────────┬───────────────┐ │ │ │
│ │             │ │  │ │Field           │Operator        │Value          │ │ │ │
│ │             │ │  │ ├────────────────┼────────────────┼───────────────┤ │ │ │
│ │             │ │  │ │Ward            │is in           │Ward 58, Ward..│ │ │ │
│ │             │ │  │ ├────────────────┼────────────────┼───────────────┤ │ │ │
│ │             │ │  │ │Member Since    │is after        │2023-01-01     │ │ │ │
│ │             │ │  │ └────────────────┴────────────────┴───────────────┘ │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ [+ Add Filter]                                      │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Preview                                             │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ ┌────────┬────────┬─────────┬─────────┬───────────┐ │ │ │
│ │             │ │  │ │Ward    │Active  │Expired  │Pending  │Total      │ │ │ │
│ │             │ │  │ ├────────┼────────┼─────────┼─────────┼───────────┤ │ │ │
│ │             │ │  │ │Ward 58 │320     │20       │5        │345        │ │ │ │
│ │             │ │  │ │        │(93%)   │(6%)     │(1%)     │(100%)     │ │ │ │
│ │             │ │  │ ├────────┼────────┼─────────┼─────────┼───────────┤ │ │ │
│ │             │ │  │ │Ward 59 │250     │18       │10       │278        │ │ │ │
│ │             │ │  │ │        │(90%)   │(6%)     │(4%)     │(100%)     │ │ │ │
│ │             │ │  │ ├────────┼────────┼─────────┼─────────┼───────────┤ │ │ │
│ │             │ │  │ │Ward 60 │290     │15       │7        │312        │ │ │ │
│ │             │ │  │ │        │(93%)   │(5%)     │(2%)     │(100%)     │ │ │ │
│ │             │ │  │ └────────┴────────┴─────────┴─────────┴───────────┘ │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ [Show as Chart]                                     │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Delivery Options                                    │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Format: ☑ PDF  ☐ Excel  ☐ CSV  ☐ HTML             │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Schedule: ☐ One-time  ☐ Daily  ☑ Weekly  ☐ Monthly │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Recipients: [admin@example.com, manager@example.com]│ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ [Run Now]  [Schedule]  [Save Report]                │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ └─────────────┘ └─────────────────────────────────────────────────────────┘ │
│                                                                             │
│ © 2025 Membership System                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

1. **Report Configuration Section**
   - Report name and description fields
   - Report type selection (Tabular, Chart, Dashboard, Summary)
   - Time period selection
   - Save as template option

2. **Data Selection Section**
   - Row and column field selectors
   - Metric options (Count, Percentage, Growth Rate, etc.)
   - Filter table with field, operator, and value columns
   - Add Filter button for additional filtering criteria

3. **Preview Section**
   - Real-time preview of report based on current configuration
   - Toggle between table and chart views
   - Sample data showing the expected output format

4. **Delivery Options Section**
   - Output format selection (PDF, Excel, CSV, HTML)
   - Schedule options (One-time, Daily, Weekly, Monthly)
   - Recipient email addresses
   - Action buttons (Run Now, Schedule, Save Report)

## Report Types

1. **Tabular Report**
   - Rows and columns with metrics
   - Sorting and grouping options
   - Totals and subtotals

2. **Chart Report**
   - Various chart types (Bar, Line, Pie, etc.)
   - Axis configuration
   - Legend and label options

3. **Dashboard Report**
   - Multiple visualizations on a single page
   - Layout configuration
   - Interactive elements

4. **Summary Report**
   - Key metrics and highlights
   - Trend indicators
   - Executive-level overview

## Interactions

- Field selectors show available options based on data model
- Adding filters updates the preview in real-time
- "Show as Chart" toggles between table and visual representation
- "Run Now" generates the report immediately
- "Schedule" configures automated delivery
- "Save Report" stores the configuration for future use
- "Save Template" creates a reusable template for similar reports
