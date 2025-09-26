# Membership Application Form Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]         Membership System                  [Notifications] [Profile] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────────────────┐ │
│ │ Navigation  │ │                                                         │ │
│ │             │ │  Membership Application                                 │ │
│ │ Dashboard   │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │ Profile     │ │  │ Progress:                                           │ │ │
│ │             │ │  │ [Personal Info] → [Address] → [Documents] → [Review]│ │ │
│ │ Membership  │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │ Documents   │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Personal Information                                │ │ │
│ │ Renewal     │ │  │                                                     │ │ │
│ │             │ │  │ ID Number*: [                                     ] │ │ │
│ │ Notifications│ │  │                                                     │ │ │
│ │             │ │  │ First Name*: [                                    ] │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Middle Name:  [                                   ] │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Last Name*:   [                                   ] │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Gender*:      ○ Male  ○ Female  ○ Other  ○ Prefer  │ │ │
│ │             │ │  │                                        not to say   │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Date of Birth*: [DD] / [MM] / [YYYY]               │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Email*:       [                                   ] │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Cell Number*:  [                                  ] │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ Alternative Number: [                             ] │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ * Required fields                                   │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ [Save & Exit]                     [Next: Address >] │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ └─────────────┘ └─────────────────────────────────────────────────────────┘ │
│                                                                             │
│ © 2025 Membership System                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

1. **Multi-step Application Process**
   - Progress indicator showing current step
   - Four steps: Personal Info, Address, Documents, Review
   - Current step highlighted

2. **Personal Information Form**
   - ID Number field with validation
   - Name fields (First, Middle, Last)
   - Gender selection with inclusive options
   - Date of Birth with calendar picker
   - Contact information (Email, Cell Number, Alternative Number)
   - Required fields marked with asterisk

3. **Navigation Controls**
   - "Save & Exit" button to save progress and return later
   - "Next" button to proceed to Address step
   - Form validation before proceeding

## Additional Screens (Not Shown)

### Address Step
- Residential address fields
- Postal address fields (with option to use same as residential)
- Ward selection based on address (automatic or manual)

### Documents Step
- ID copy upload
- Proof of address upload
- Profile photo upload (optional)
- Supported file formats and size limits

### Review Step
- Summary of all entered information
- Terms and conditions acceptance
- Final submission button

## Interactions

- Real-time validation of ID number format
- Address lookup integration for standardization
- Automatic ward assignment based on residential address
- Save progress functionality to continue later
- Duplicate detection based on ID number or contact details
