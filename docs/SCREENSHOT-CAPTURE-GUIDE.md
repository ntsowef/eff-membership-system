# Screenshot Capture Guide for Ward Audit Documentation

This guide explains how to create the images referenced in the Ward Audit Visual Guide.

---

## 📋 Prerequisites

### 1. Running Application
```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

### 2. Test Data
- **Login**: national.admin@eff.org.za / Admin@123
- **Test Ward**: 79800044 (Rustenburg, Gauteng)
- **Test Members**: Ensure some members exist in the database

### 3. Screenshot Tools

**Windows**:
- Built-in: `Win + Shift + S` (Snipping Tool)
- Or install: ShareX (free, powerful)

**Mac**:
- Built-in: `Cmd + Shift + 4` (area selection)
- Or: `Cmd + Shift + 5` (screenshot toolbar)

**Browser Extensions** (Recommended):
- **Awesome Screenshot** - Full page capture, annotations
- **Nimbus Screenshot** - Video recording, editing
- **FireShot** - Full page, PDF export

---

## 📸 Screenshot Checklist

### Required Screenshots (17 total)

#### Basic Screenshots (6)
- [ ] `login-page.png` - Login screen
- [ ] `dashboard-overview.png` - Main ward audit dashboard
- [ ] `compliance-criteria.png` - Ward compliance detail view
- [ ] `meeting-form-basic.png` - Meeting form (empty)
- [ ] `meeting-form-complete.png` - Meeting form (filled)
- [ ] `all-criteria-met.png` - All 5 criteria showing green checkmarks

#### New Features Screenshots (4)
- [ ] `quorum-verification.png` - Criterion 2 verification section
- [ ] `meeting-attendance.png` - Criterion 3 verification section
- [ ] `presiding-officer-dropdown.png` - Province-filtered dropdown
- [ ] `delegate-list.png` - Delegate list with green checkmark

#### Workflow Screenshots (3)
- [ ] `delegate-assignment.png` - Delegate assignment form
- [ ] `validation-error.png` - Error message example
- [ ] `success-message.png` - Success confirmation

#### Mobile Screenshots (2)
- [ ] `mobile-dashboard.png` - Dashboard on mobile
- [ ] `mobile-meeting-form.png` - Meeting form on mobile

#### Optional Screenshots (2)
- [ ] `ward-selection.png` - Geographic filter in action
- [ ] `meeting-history.png` - List of recorded meetings

---

## 🎯 Step-by-Step Capture Instructions

### 1. Dashboard Overview
```
1. Login to application
2. Navigate to Ward Audit section
3. Ensure some wards are visible
4. Capture full screen showing:
   - Geographic filters
   - Summary statistics
   - Ward table
   - Action buttons
5. Save as: dashboard-overview.png
```

### 2. Compliance Criteria
```
1. Click on a ward (e.g., 79800044)
2. Wait for ward details to load
3. Scroll to show all 5 criteria
4. Capture showing:
   - All 5 criteria with status icons
   - Details for each criterion
   - Action buttons
5. Save as: compliance-criteria.png
```

### 3. Meeting Form - Basic
```
1. Click "Record Meeting" button
2. Wait for dialog to open
3. Don't fill any fields yet
4. Capture showing:
   - Empty form fields
   - Meeting type dropdown
   - Presiding officer field
   - Quorum fields
5. Save as: meeting-form-basic.png
```

### 4. Quorum Verification (NEW)
```
1. In meeting form, scroll to Criterion 2 section
2. Ensure the info alert is visible
3. Capture showing:
   - Blue info alert with explanation
   - Unchecked verification checkbox
   - "I verify that the meeting quorum was met" text
   - Verification notes field (hidden)
4. Save as: quorum-verification-unchecked.png

5. Check the verification checkbox
6. Fill notes: "Verified through attendance register"
7. Capture showing:
   - Checked verification checkbox
   - Visible verification notes field
   - Filled notes text
8. Save as: quorum-verification.png
```

### 5. Meeting Attendance (NEW)
```
1. In meeting form, scroll to Criterion 3 section
2. Capture showing:
   - Blue info alert with explanation
   - Unchecked attendance checkbox
   - "I confirm that the meeting took place" text
   - Verification notes field (hidden)
3. Save as: meeting-attendance-unchecked.png

4. Check the attendance checkbox
5. Fill notes: "Meeting held at Community Hall"
6. Capture showing:
   - Checked attendance checkbox
   - Visible verification notes field
   - Filled notes text
7. Save as: meeting-attendance.png
```

### 6. Presiding Officer Dropdown (NEW)
```
1. In meeting form, click on Presiding Officer field
2. Start typing a name (e.g., "John")
3. Wait for dropdown to appear
4. Capture showing:
   - Search field with text
   - Dropdown list of members
   - Member details (name, ID, ward, status)
   - Helper text showing province
5. Save as: presiding-officer-dropdown.png
```

### 7. Completed Meeting Form
```
1. Fill all fields in meeting form:
   - Meeting Type: BPA
   - Presiding Officer: Select from dropdown
   - Quorum Required: 50
   - Quorum Achieved: 65
   - Total Attendees: 65
   - ✅ Quorum verified checkbox
   - Quorum notes: "Verified through register"
   - ✅ Meeting attendance checkbox
   - Meeting notes: "Meeting held at Community Hall"
2. Capture full form (may need full page screenshot)
3. Save as: meeting-form-complete.png
```

### 8. Delegate List with Visual Indicator (NEW)
```
1. Navigate to ward details
2. Click "Manage Delegates" button
3. Ensure at least 1 SRPA delegate is assigned
4. Capture showing:
   - SRPA Delegates section with count (e.g., "2/3")
   - Green checkmark ✅ next to SRPA
   - List of assigned delegates
   - Delegate details (name, method, dates, status)
5. Save as: delegate-list.png
```

### 9. Delegate Assignment Form
```
1. Click "Assign New Delegate" button
2. Fill form partially:
   - Assembly Type: SRPA
   - Member: Start typing name
   - Selection Method: Elected
   - Term dates: 2025-10-06 to 2026-10-06
   - Notes: "Elected at BPA meeting"
3. Capture showing:
   - All form fields
   - Member search/selection
   - Date pickers
4. Save as: delegate-assignment.png
```

### 10. All Criteria Met
```
1. Navigate to a compliant ward
2. Ensure all 5 criteria show green checkmarks
3. Capture showing:
   - Ward status: COMPLIANT
   - All 5 criteria with ✅
   - Details for each criterion
   - "Approve Ward Compliance" button
4. Save as: all-criteria-met.png
```

### 11. Validation Error
```
1. Open meeting form
2. Leave required fields empty
3. Click "Save Meeting" button
4. Wait for error message
5. Capture showing:
   - Error dialog/alert
   - Error message text
   - List of validation errors
6. Save as: validation-error.png
```

### 12. Success Message
```
1. Fill meeting form correctly
2. Click "Save Meeting"
3. Wait for success message
4. Capture showing:
   - Success dialog/alert
   - Success message text
   - Confirmation details
5. Save as: success-message.png
```

### 13. Mobile Dashboard
```
1. Open browser DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select "iPhone SE" or similar (375x667)
4. Navigate to ward audit dashboard
5. Capture showing:
   - Mobile-optimized layout
   - Stacked cards
   - Touch-friendly buttons
6. Save as: mobile-dashboard.png
```

### 14. Mobile Meeting Form
```
1. Keep mobile view active
2. Click "Record Meeting"
3. Capture showing:
   - Full-screen form
   - Large touch targets
   - Mobile-optimized inputs
4. Save as: mobile-meeting-form.png
```

---

## 🎨 Screenshot Best Practices

### Resolution & Quality
- **Desktop**: 1920x1080 (Full HD)
- **Mobile**: 375x667 (iPhone SE) or 414x896 (iPhone 11)
- **Format**: PNG (lossless)
- **Quality**: Maximum (no compression)

### Framing
- Include relevant UI elements
- Remove personal/sensitive data
- Show enough context
- Avoid excessive whitespace

### Consistency
- Use same test data across screenshots
- Use same browser (Chrome recommended)
- Use same zoom level (100%)
- Use same theme (light/dark)

### Annotations (Optional)
- Add arrows to highlight new features
- Add numbered callouts for steps
- Add colored borders for emphasis
- Use tools like:
  - Snagit
  - Greenshot
  - Skitch

---

## 🤖 Automated Capture (Advanced)

### Using the Provided Script

1. **Install Playwright**:
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

2. **Run the script**:
   ```bash
   node scripts/capture-screenshots.js
   ```

3. **Review captured images**:
   ```bash
   # Images saved to:
   docs/images/ward-audit/
   ```

### Customize the Script

Edit `scripts/capture-screenshots.js`:
- Change `CONFIG.credentials` for different user
- Change `CONFIG.testWard` for different ward
- Add/remove screenshot steps
- Adjust wait times if needed

---

## 📁 File Organization

### Directory Structure
```
docs/
└── images/
    └── ward-audit/
        ├── dashboard-overview.png
        ├── compliance-criteria.png
        ├── meeting-form-basic.png
        ├── quorum-verification.png
        ├── meeting-attendance.png
        ├── presiding-officer-dropdown.png
        ├── delegate-list.png
        ├── delegate-assignment.png
        ├── meeting-form-complete.png
        ├── all-criteria-met.png
        ├── validation-error.png
        ├── success-message.png
        ├── mobile-dashboard.png
        └── mobile-meeting-form.png
```

### Naming Convention
- Use lowercase with hyphens
- Be descriptive but concise
- Match placeholder names in visual guide
- Use `.png` extension

---

## ✅ Verification Checklist

After capturing all screenshots:

- [ ] All 17 required screenshots captured
- [ ] Images are clear and readable
- [ ] No personal/sensitive data visible
- [ ] Consistent resolution and quality
- [ ] Files named correctly
- [ ] Saved in correct directory
- [ ] Visual guide updated with actual images
- [ ] Images display correctly in Markdown

---

## 🔄 Updating the Visual Guide

After capturing screenshots, update the visual guide:

```markdown
<!-- Before -->
![Dashboard Overview](../images/ward-audit/dashboard-overview.png)

<!-- After (if images are in place, they'll display automatically) -->
<!-- No changes needed - Markdown will load the images -->
```

---

## 📞 Need Help?

**Issues with screenshots**:
- Check application is running
- Verify test data exists
- Try different browser
- Clear cache and reload

**Technical issues**:
- Contact: documentation@eff.org.za
- Include: Error message, browser, OS

---

**Guide Version**: 1.0  
**Last Updated**: 2025-10-06  
**Next Review**: When UI changes

