# Ward Audit System - User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Ward Compliance Criteria](#ward-compliance-criteria)
4. [Recording Ward Meetings](#recording-ward-meetings)
5. [Managing Ward Delegates](#managing-ward-delegates)
6. [Approving Ward Compliance](#approving-ward-compliance)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

The Ward Audit System is a comprehensive tool designed to help EFF administrators manage and track ward compliance across all organizational levels. This system ensures that wards meet the required standards before being approved for full operational status.

### Who Should Use This Guide?
- **National Administrators**: Full access to all wards nationwide
- **Provincial Administrators**: Access to wards within their province
- **Regional Administrators**: Access to wards within their region
- **Municipal Administrators**: Access to wards within their municipality

---

## System Overview

### Accessing the Ward Audit System

1. Log in to the EFF Membership Management System
2. Navigate to **Ward Audit** from the main menu
3. Use the geographic filters to select:
   - **Province** (e.g., Gauteng, Western Cape)
   - **Region** (formerly District)
   - **Sub-Region** (formerly Municipality)
   - **Ward**

### Dashboard Features

The Ward Audit Dashboard displays:
- **Total Wards**: Number of wards in selected area
- **Compliant Wards**: Wards meeting all criteria
- **Non-Compliant Wards**: Wards requiring attention
- **Compliance Rate**: Percentage of compliant wards

---

## Ward Compliance Criteria

Each ward must meet **5 compliance criteria** to be approved:

### Criterion 1: Membership & Voting District Compliance
**Requirement**: Ward must have ≥200 members AND all voting districts must have ≥5 members each

**How to Check**:
- View ward details to see total member count
- Check voting district breakdown table
- Green checkmark (✓) indicates compliance

**Common Issues**:
- Insufficient total members: Conduct membership drives
- Voting districts with <5 members: Focus recruitment in those areas

---

### Criterion 2: Meeting Quorum Verification ⭐ NEW
**Requirement**: Ward achieved quorum in previous BPA/BGA meeting AND manually verified by administrator

**How to Verify**:
1. Click **"Record Meeting"** or **"View Meetings"** button
2. Enter meeting details:
   - Meeting Type (BPA or BGA)
   - Quorum Required (e.g., 50)
   - Quorum Achieved (e.g., 65)
   - Total Attendees
3. **Check the verification box**: ✅ "I verify that the meeting quorum was met"
4. Add verification notes (optional but recommended)
5. Click **"Save Meeting"**

**Important Notes**:
- The system automatically calculates if quorum was met (Achieved ≥ Required)
- **Manual verification is required** - simply meeting the number is not enough
- Add notes explaining how quorum was verified (e.g., "Verified through attendance register")
- Only administrators can verify quorum

**Example**:
```
Meeting Type: BPA
Quorum Required: 50
Quorum Achieved: 65
✅ I verify that the meeting quorum was met
Notes: "Verified through signed attendance register. 65 members present out of 120 total ward members."
```

---

### Criterion 3: Meeting Attendance ⭐ NEW
**Requirement**: Required meeting actually took place AND manually verified by administrator

**How to Verify**:
1. In the meeting record form (same as Criterion 2)
2. **Check the verification box**: ✅ "I confirm that the meeting took place as recorded"
3. Add verification notes (optional but recommended)
4. Click **"Save Meeting"**

**Important Notes**:
- This confirms the meeting physically occurred (not just planned)
- Add notes with evidence (e.g., "Meeting held at Community Hall, photos available")
- Verification should be done by someone who attended or has proof
- Both Criterion 2 and 3 can be verified in the same meeting record

**Example**:
```
✅ I confirm that the meeting took place as recorded
Notes: "Meeting held on 2025-10-06 at Ward Community Hall. Minutes and photos on file."
```

---

### Criterion 4: Presiding Officer Information ⭐ ENHANCED
**Requirement**: Presiding officer recorded for ward meeting

**How to Select Presiding Officer**:
1. Click **"Record Meeting"** or **"View Meetings"** button
2. In the **Presiding Officer** field, start typing the member's name
3. The system will show **only members from the same province** as the ward
4. Select the appropriate member from the dropdown
5. The system displays:
   - Member's full name
   - ID number
   - Ward information
   - Membership status

**Important Notes**:
- **Province filtering**: Only members from the ward's province are eligible
- This ensures presiding officers are from the correct geographic area
- If you can't find a member, verify they are:
  - Registered in the system
  - Have an active membership status
  - Located in the correct province

**Example**:
```
Presiding Officer: [Start typing name]
→ Dropdown shows: "John Doe (8501015800089) - Ward 79800044 - Active"
→ Select member
→ System confirms: "Presiding officer from Gauteng province"
```

---

### Criterion 5: Delegate Selection ⭐ ENHANCED
**Requirement**: Delegates selected for assemblies (SRPA/PPA/NPA)

**How to Assign Delegates**:
1. Click **"Manage Delegates"** button
2. Click **"Assign New Delegate"**
3. Fill in the form:
   - **Assembly Type**: SRPA, PPA, or NPA
   - **Member**: Search and select from available members
   - **Selection Method**: Elected, Appointed, or Ex-Officio
   - **Term Start Date**: When delegate term begins
   - **Term End Date**: When delegate term ends
   - **Notes**: Any additional information
4. Click **"Assign Delegate"**

**Visual Indicator**:
- When SRPA delegates are successfully assigned, a **green checkmark (✓)** appears next to Criterion 5
- This provides instant visual confirmation of compliance
- Maximum of 3 SRPA delegates per ward

**Delegate Limits**:
- **SRPA**: Maximum 3 delegates
- **PPA**: Maximum 2 delegates
- **NPA**: Maximum 1 delegate

**Example**:
```
Assembly Type: SRPA
Member: Jane Smith (Member ID: 12345)
Selection Method: Elected
Term: 2025-10-06 to 2026-10-06
Notes: "Elected at BPA meeting on 2025-10-05"

Result: ✅ Green checkmark appears on Criterion 5
```

---

## Recording Ward Meetings

### Step-by-Step Guide

#### 1. Navigate to Ward Details
- Select ward from the Ward Audit dashboard
- Click on ward name to view details
- Click **"Record Meeting"** button

#### 2. Enter Meeting Information
Fill in all required fields:

**Basic Information**:
- **Meeting Type**: BPA (Branch People's Assembly) or BGA (Branch General Assembly)
- **Presiding Officer**: Select from province-filtered dropdown
- **Secretary**: Enter member ID (optional)
- **Total Attendees**: Number of members present

**Quorum Information**:
- **Quorum Required**: Minimum members needed (e.g., 50)
- **Quorum Achieved**: Actual members present (e.g., 65)
- System automatically shows: ✓ Quorum met or ✗ Quorum not met

**Meeting Details**:
- **Meeting Outcome**: e.g., "Successful", "Postponed", "Cancelled"
- **Key Decisions**: Summary of decisions made
- **Action Items**: Follow-up tasks
- **Next Meeting Date**: When next meeting is scheduled

#### 3. Verify Compliance (NEW)

**Criterion 2 - Quorum Verification**:
- ✅ Check: "I verify that the meeting quorum was met"
- Add notes: Explain how you verified (e.g., "Attendance register reviewed")

**Criterion 3 - Meeting Attendance**:
- ✅ Check: "I confirm that the meeting took place as recorded"
- Add notes: Provide evidence (e.g., "Meeting held at Community Hall, minutes available")

#### 4. Save Meeting Record
- Review all information
- Click **"Save Meeting"**
- System confirms: "Meeting record created successfully"
- Compliance criteria automatically update

### Viewing Meeting History
- Click **"View Meetings"** button
- See table of all recorded meetings:
  - Meeting date and type
  - Presiding officer
  - Quorum status (✓ Met or ✗ Not met)
  - Total attendees
  - Meeting outcome
- Click **Edit** icon to update meeting details

---

## Managing Ward Delegates

### Assigning Delegates

#### 1. Access Delegate Management
- Navigate to ward details
- Click **"Manage Delegates"** button
- View current delegates by assembly type

#### 2. Assign New Delegate
- Click **"Assign New Delegate"** button
- Fill in the form:

**Assembly Selection**:
- Choose: SRPA, PPA, or NPA
- System shows remaining slots (e.g., "SRPA: 1/3 assigned")

**Member Selection**:
- Search by name or member ID
- System displays:
  - Full name
  - ID number
  - Ward information
  - Membership status
- Select appropriate member

**Term Information**:
- **Selection Method**: Elected, Appointed, or Ex-Officio
- **Term Start Date**: When delegate term begins
- **Term End Date**: When delegate term ends
- **Notes**: Additional information (optional)

#### 3. Confirm Assignment
- Review all details
- Click **"Assign Delegate"**
- System confirms: "Delegate assigned successfully"
- Green checkmark (✓) appears on Criterion 5 for SRPA delegates

### Viewing Current Delegates
The delegate management screen shows:
- **Assembly Type** (SRPA/PPA/NPA)
- **Delegate Name** and Member ID
- **Selection Method**
- **Term Dates** (Start and End)
- **Status** (Active, Expired, Replaced)
- **Actions** (Edit, Remove)

### Removing Delegates
1. Find delegate in the list
2. Click **"Remove"** button
3. Enter removal reason
4. Confirm removal
5. System updates delegate status to "Inactive"

---

## Approving Ward Compliance

### When to Approve a Ward

A ward can be approved when **all 5 criteria** are met:
- ✅ Criterion 1: Membership & Voting District Compliance
- ✅ Criterion 2: Meeting Quorum Verification (with manual verification)
- ✅ Criterion 3: Meeting Attendance (with manual verification)
- ✅ Criterion 4: Presiding Officer Information
- ✅ Criterion 5: Delegate Selection (green checkmark visible)

### Approval Process

#### 1. Review Ward Compliance
- Navigate to ward details
- Check all 5 criteria show green checkmarks (✓)
- Review detailed information for each criterion
- Verify all data is accurate and complete

#### 2. Approve Ward
- Click **"Approve Ward Compliance"** button
- Add approval notes (optional but recommended)
- Click **"Confirm Approval"**
- System confirms: "Ward compliance approved successfully"

#### 3. Post-Approval
- Ward status changes to "Compliant"
- Approval date and approver are recorded
- Ward appears in "Compliant Wards" dashboard
- Compliance certificate can be generated (if applicable)

### Important Notes
- Only administrators with appropriate permissions can approve wards
- Approval is permanent and creates an audit trail
- If ward later becomes non-compliant, it must be re-audited

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Cannot verify quorum (Criterion 2)
**Problem**: Checkbox is disabled or not saving
**Solutions**:
1. Ensure quorum was actually met (Achieved ≥ Required)
2. Check you have administrator permissions
3. Refresh the page and try again
4. Contact system administrator if issue persists

#### Issue: Cannot verify meeting attendance (Criterion 3)
**Problem**: Verification checkbox not working
**Solutions**:
1. Ensure meeting record is saved first
2. Check you have appropriate permissions
3. Add verification notes for better record-keeping
4. Contact support if problem continues

#### Issue: Cannot find presiding officer in dropdown (Criterion 4)
**Problem**: Member not appearing in presiding officer selection
**Solutions**:
1. Verify member is from the same province as the ward
2. Check member has active membership status
3. Confirm member is registered in the system
4. Try searching by ID number instead of name
5. Contact membership team to verify member details

#### Issue: Green checkmark not appearing for delegates (Criterion 5)
**Problem**: Assigned SRPA delegates but no visual indicator
**Solutions**:
1. Refresh the page to update display
2. Verify delegate was successfully assigned (check delegate list)
3. Ensure delegate is for SRPA assembly (not PPA or NPA)
4. Check delegate status is "Active"
5. Clear browser cache and reload

#### Issue: Validation errors when saving meeting
**Problem**: "Presiding officer ID must be a number" or similar errors
**Solutions**:
1. Use the dropdown to select presiding officer (don't type ID manually)
2. Leave optional fields empty if not needed (don't enter empty strings)
3. Ensure all required fields are filled
4. Check date formats are correct
5. Contact support with error message details

### Getting Help

If you encounter issues not covered in this guide:

1. **Check System Status**: Verify backend server is running
2. **Clear Browser Cache**: Sometimes resolves display issues
3. **Try Different Browser**: Test in Chrome, Firefox, or Edge
4. **Contact Support**:
   - Email: support@eff.org.za
   - Phone: [Support Number]
   - Include: Ward code, error message, screenshots

---

## Best Practices

### For Recording Meetings
- ✅ Record meetings promptly after they occur
- ✅ Always add verification notes for Criteria 2 and 3
- ✅ Keep attendance registers as supporting documentation
- ✅ Take photos of meetings for evidence
- ✅ Update meeting records if information changes

### For Managing Delegates
- ✅ Verify delegate eligibility before assignment
- ✅ Keep term dates accurate and up-to-date
- ✅ Document selection method clearly
- ✅ Remove delegates promptly when terms end
- ✅ Maintain communication with delegates

### For Ward Compliance
- ✅ Review all criteria thoroughly before approval
- ✅ Add detailed approval notes
- ✅ Keep supporting documentation on file
- ✅ Monitor ward compliance regularly
- ✅ Address non-compliance issues promptly

---

## Appendix

### Glossary

- **BPA**: Branch People's Assembly
- **BGA**: Branch General Assembly
- **SRPA**: Sub-Regional People's Assembly
- **PPA**: Provincial People's Assembly
- **NPA**: National People's Assembly
- **Quorum**: Minimum number of members required for valid meeting
- **Voting District**: Geographic subdivision within a ward
- **Compliance**: Meeting all required criteria for ward approval

### Related Documentation

- [Ward Audit System - Admin Guide](./ward-audit-system-admin-guide.md)
- [Ward Audit System - API Documentation](./ward-audit-system-api-docs.md)
- [Membership Management User Guide](./membership-management-user-guide.md)

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-06  
**Author**: EFF IT Department

