# Document Upload Interface Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]         Membership System                  [Notifications] [Profile] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────────────────────┐ │
│ │ Navigation  │ │                                                         │ │
│ │             │ │  Document Upload                                        │ │
│ │ Dashboard   │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │ Profile     │ │  │ Required Documents                                  │ │ │
│ │             │ │  │                                                     │ │ │
│ │ Membership  │ │  │  ┌────────────┬────────────┬────────────┬─────────┐ │ │ │
│ │             │ │  │  │ Document   │ Status     │ Uploaded   │ Actions │ │ │ │
│ │ Documents   │ │  │  ├────────────┼────────────┼────────────┼─────────┤ │ │ │
│ │             │ │  │  │ ID Copy    │ Verified   │ 2024-10-20 │ View    │ │ │ │
│ │ Renewal     │ │  │  │            │            │            │ Replace │ │ │ │
│ │             │ │  │  ├────────────┼────────────┼────────────┼─────────┤ │ │ │
│ │ Notifications│ │  │  │ Proof of   │ Pending    │ 2025-04-15 │ View    │ │ │ │
│ │             │ │  │  │ Address    │ Verification│            │ Replace │ │ │ │
│ │             │ │  │  └────────────┴────────────┴────────────┴─────────┘ │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Optional Documents                                  │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │  ┌────────────┬────────────┬────────────┬─────────┐ │ │ │
│ │             │ │  │  │ Document   │ Status     │ Uploaded   │ Actions │ │ │ │
│ │             │ │  │  ├────────────┼────────────┼────────────┼─────────┤ │ │ │
│ │             │ │  │  │ Profile    │ Verified   │ 2024-11-05 │ View    │ │ │ │
│ │             │ │  │  │ Photo      │            │            │ Replace │ │ │ │
│ │             │ │  │  ├────────────┼────────────┼────────────┼─────────┤ │ │ │
│ │             │ │  │  │ Add New    │     -      │     -      │ Upload  │ │ │ │
│ │             │ │  │  │ Document   │            │            │         │ │ │ │
│ │             │ │  │  └────────────┴────────────┴────────────┴─────────┘ │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                         │ │
│ │             │ │  ┌─────────────────────────────────────────────────────┐ │ │
│ │             │ │  │ Document Upload Guidelines                          │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  │ • Supported formats: PDF, JPG, PNG                  │ │ │
│ │             │ │  │ • Maximum file size: 5MB                            │ │ │
│ │             │ │  │ • Documents must be clearly legible                 │ │ │
│ │             │ │  │ • Proof of address must be less than 3 months old   │ │ │
│ │             │ │  │ • ID copy must show both sides of ID card           │ │ │
│ │             │ │  │                                                     │ │ │
│ │             │ │  └─────────────────────────────────────────────────────┘ │ │
│ └─────────────┘ └─────────────────────────────────────────────────────────┘ │
│                                                                             │
│ © 2025 Membership System                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

1. **Required Documents Section**
   - Table of mandatory documents
   - Status indicator (Verified, Pending Verification, Rejected, Not Uploaded)
   - Upload date
   - Actions (View, Replace)

2. **Optional Documents Section**
   - Table of additional documents
   - Status indicator
   - Upload date
   - Actions (View, Replace)
   - Option to add new document types

3. **Document Upload Guidelines**
   - Supported file formats
   - Maximum file size
   - Document quality requirements
   - Specific requirements for each document type

## Document Upload Modal (Not Shown)
- File selection interface
   - Drag and drop area
   - File browser button
- Document type selection dropdown
- Document description field
- Upload progress indicator
- Preview before submission

## Document View Modal (Not Shown)
- Document preview
- Download option
- Verification status details
- Rejection reason (if applicable)
- Document metadata (upload date, file size, etc.)

## Interactions

- "View" opens a modal with document preview
- "Replace" opens the upload modal with the document type pre-selected
- "Upload" for new document opens the upload modal with document type selection
- Real-time validation of file format and size during upload
- Confirmation dialog before replacing existing documents
