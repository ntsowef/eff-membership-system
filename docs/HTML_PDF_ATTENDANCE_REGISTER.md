# HTML-based PDF Ward Attendance Register Generation

## Overview

This document describes the implementation of HTML-based PDF generation for Ward Attendance Registers, replacing the previous Word-to-PDF conversion approach. The new implementation uses `html-pdf-node` to generate PDFs directly from HTML templates, similar to the reference code provided.

## Key Features

1. **Direct PDF Generation**: Generates PDFs directly from HTML using `html-pdf-node` (powered by Puppeteer)
2. **Email Delivery**: Automatically emails the generated PDF to the logged-in user
3. **Professional Layout**: Matches the FORM A: ATTENDANCE REGISTER format with proper styling
4. **Grouped by Voting District**: Members are organized by their registered voting districts
5. **Header and Footer**: Includes page numbers and ward information in footer

## Architecture

### Backend Components

#### 1. HtmlPdfService (`backend/src/services/htmlPdfService.ts`)
- **Purpose**: Generate PDF documents from HTML templates
- **Key Method**: `generateWardAttendanceRegisterPDF(wardInfo, members)`
- **Technology**: Uses `html-pdf-node` package with Puppeteer backend
- **Output**: Returns PDF as Buffer

#### 2. AttendanceRegisterEmailService (Updated)
- **New Method**: `processAttendanceRegisterEmailFromHtml(options)`
- **Purpose**: Generate PDF from HTML and email to user
- **Process**:
  1. Generate PDF using HtmlPdfService
  2. Save PDF temporarily (24-hour retention)
  3. Send email with PDF attachment
  4. Schedule cleanup after 24 hours

#### 3. Members Route (Updated)
- **Endpoint**: `GET /api/v1/members/ward/:wardCode/audit-export?format=pdf`
- **Changes**:
  - Added HTML-based PDF generation for `format=pdf`
  - Triggers background email process
  - Sets response headers for email status

### Frontend Components

No frontend changes required - existing download buttons work with the new PDF generation.

## PDF Document Structure

```
FORM A: ATTENDANCE REGISTER
═══════════════════════════════════════════════════════════════
[Bold horizontal line]

[Logo - if available]

[Ward Information Table]
PROVINCE: [Province Name]                    SUB REGION: [Municipality Code - Municipality Name]
TOTAL MEMBERSHIP IN GOOD STANDING: [Count]   WARD: [Ward Number]
QUORUM: [Count]                              BPA: |_|   BGA: |_|
DATE OF BPA/BGA:                             TOTAL NUMBER OF VOTING STATIONS: [Count]

[Members Table - Grouped by Voting District]
┌─────┬──────────┬─────────────┬────────────┬─────────────┬──────────────┬───────────┬──────────────┐
│ NUM │   NAME   │ WARD NUMBER │ ID NUMBER  │ CELL NUMBER │ REGISTERED VD│ SIGNATURE │ NEW CELL NUM │
├─────┴──────────┴─────────────┴────────────┴─────────────┴──────────────┴───────────┴──────────────┤
│ Voting Station: [VD Name] (VDNumber: [VD Code])                                                    │
├─────┬──────────┬─────────────┬────────────┬─────────────┬──────────────┬───────────┬──────────────┤
│  1  │ JOHN DOE │  79800001   │ 8001015800 │ 0821234567  │ VD Name      │           │              │
│  2  │ JANE DOE │  79800001   │ 9002025800 │ 0831234567  │ VD Name      │           │              │
├─────┴──────────┴─────────────┴────────────┴─────────────┴──────────────┴───────────┴──────────────┤
│ Total Voters in [VD Name]: 2                                                                       │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘

[Footer on each page]
[Municipality Code - Municipality Name]    Page X of Y    WARD: [Ward Number]
```

## Package Dependencies

### New Package Installed
```json
{
  "html-pdf-node": "^1.0.8"
}
```

This package uses Puppeteer (headless Chrome) to render HTML and generate PDFs.

## Usage

### From Frontend

#### Geographic Search Page
**URL**: `http://localhost:3000/admin/search/geographic`

1. Search for a ward
2. Click "Download Attendance Register"
3. Select "Download Word Attendance Register" (will generate PDF)
4. PDF downloads immediately
5. PDF is also emailed to your account

#### Members Page
**URL**: `http://localhost:3000/admin/members`

1. Filter by ward
2. Click "Download Ward [X] Attendance Register"
3. Confirm ward code
4. PDF downloads immediately
5. PDF is also emailed to your account

### From API

```bash
# Get PDF for a specific ward
curl -X GET "http://localhost:5000/api/v1/members/ward/79800001/audit-export?format=pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output ward_attendance.pdf

# Check email status in response headers
# X-Email-Status: sending | failed | no-email
# X-Email-Sent-To: user@example.com
# X-Email-Error: error message (if failed)
```

## Email Template

The email sent to users includes:

- **Subject**: `Ward [X] Attendance Register - [Municipality Name]`
- **Body**: Professional HTML email with ward details
- **Attachment**: PDF file named `ATTENDANCE_REGISTER_WARD_[X]_[Municipality]_[Timestamp].pdf`

## Testing

### Test Script
Run the test script to verify PDF generation:

```bash
cd test
node test-html-pdf-generation.js
```

This will:
1. Login as super admin
2. Generate PDF for test ward
3. Save PDF to `test/output/` directory
4. Display email status
5. Verify PDF file integrity

### Manual Testing

1. **Login** to the system
2. **Navigate** to Members page or Geographic Search
3. **Select** a ward with members
4. **Click** "Download Attendance Register"
5. **Verify** PDF downloads
6. **Check** email inbox for PDF attachment

## Comparison with Previous Implementation

| Feature | Previous (Word → PDF) | New (HTML → PDF) |
|---------|----------------------|------------------|
| Technology | docx + LibreOffice | html-pdf-node + Puppeteer |
| Conversion | Two-step (Word → PDF) | Direct (HTML → PDF) |
| Dependencies | LibreOffice installation | Node package only |
| Performance | Slower (external process) | Faster (in-process) |
| Reliability | Platform-dependent | Cross-platform |
| Customization | Limited by Word format | Full HTML/CSS control |

## Benefits

1. **No External Dependencies**: No need for LibreOffice installation
2. **Cross-Platform**: Works on Windows, Linux, and macOS
3. **Better Performance**: Faster generation without external process calls
4. **More Control**: Full HTML/CSS styling capabilities
5. **Easier Maintenance**: Pure JavaScript/TypeScript implementation
6. **Consistent Output**: Same rendering across all platforms

## Future Enhancements

1. Add logo support (currently checks for `assets/logo.png`)
2. Add custom styling options
3. Support for multiple languages
4. Add QR codes for digital verification
5. Include member photos if available
6. Add digital signatures support

## Troubleshooting

### PDF Generation Fails
- Check if `html-pdf-node` is installed: `npm list html-pdf-node`
- Verify Puppeteer can launch Chrome: Check system resources
- Check logs for specific error messages

### Email Not Received
- Verify SMTP configuration in `.env`
- Check email service logs
- Verify user email address is set
- Check spam/junk folder

### PDF Content Issues
- Verify ward has members with voting district data
- Check database query results
- Review HTML template in `htmlPdfService.ts`

## Related Files

- `backend/src/services/htmlPdfService.ts` - PDF generation service
- `backend/src/services/attendanceRegisterEmailService.ts` - Email service
- `backend/src/routes/members.ts` - API endpoint
- `test/test-html-pdf-generation.js` - Test script

