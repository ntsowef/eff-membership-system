# Quick Start: HTML-based PDF Ward Attendance Register

## What Changed?

The "Download Ward Attendance Register" feature now generates PDFs directly from HTML using `html-pdf-node`, instead of converting Word documents to PDF using LibreOffice.

## Benefits

✅ **Faster**: Direct HTML-to-PDF conversion  
✅ **No External Dependencies**: No LibreOffice installation needed  
✅ **Cross-Platform**: Works on Windows, Linux, macOS  
✅ **Email Delivery**: PDF automatically sent to your email  
✅ **Professional Format**: Matches FORM A: ATTENDANCE REGISTER layout  

## How to Use

### Option 1: From Members Page

1. Go to `http://localhost:3000/admin/members`
2. Filter by ward (select province → district → municipality → ward)
3. Click **"Download Ward [X] Attendance Register"** button
4. PDF downloads immediately
5. Check your email for the PDF attachment

### Option 2: From Geographic Search Page

1. Go to `http://localhost:3000/admin/search/geographic`
2. Search for a ward
3. Click **"Download Attendance Register"**
4. Select **"Download Word Attendance Register"** (generates PDF)
5. PDF downloads immediately
6. Check your email for the PDF attachment

## Testing the Implementation

### Quick Test

```bash
# Navigate to test directory
cd test

# Run the test script
node test-html-pdf-generation.js
```

This will:
- Login as super admin
- Generate a PDF for a test ward
- Save the PDF to `test/output/` directory
- Display email status
- Verify PDF integrity

### Manual Test

1. **Login** to the system (any admin account)
2. **Navigate** to Members page: `http://localhost:3000/admin/members`
3. **Filter** by a ward that has members
4. **Click** "Download Ward [X] Attendance Register"
5. **Verify**:
   - PDF downloads to your browser
   - PDF opens correctly
   - PDF contains member data grouped by voting districts
   - Email arrives in your inbox with PDF attachment

## PDF Content

The generated PDF includes:

### Header Section
- **Title**: FORM A: ATTENDANCE REGISTER
- **Logo**: Organization logo (if `backend/assets/logo.png` exists)

### Ward Information Table
- Province name
- Sub-region (municipality)
- Total membership in good standing
- Ward number
- Quorum calculation
- BPA/BGA checkboxes
- Total number of voting stations

### Members Table
- Members grouped by voting district
- Columns: NUM, NAME, WARD NUMBER, ID NUMBER, CELL NUMBER, REGISTERED VD, SIGNATURE, NEW CELL NUM
- Total count per voting district
- Separate section for members not registered in the ward

### Footer (on each page)
- Municipality information
- Page numbers (Page X of Y)
- Ward number

## Adding Your Logo

To include your organization logo in PDFs:

1. Place your logo file in: `backend/assets/logo.png`
2. Recommended size: 300x300 pixels (square)
3. Format: PNG (recommended) or JPG
4. The logo will appear at 90px width in PDFs

## Email Configuration

Ensure your `.env` file has SMTP settings:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@eff.org.za
```

## Troubleshooting

### PDF Not Generating

**Check backend logs:**
```bash
# Look for errors in the console
# Should see: "🔄 Starting HTML-based PDF Ward Attendance Register generation..."
```

**Verify package installation:**
```bash
cd backend
npm list html-pdf-node
# Should show: html-pdf-node@1.0.8
```

### Email Not Received

**Check email status in browser console:**
- Open browser DevTools → Network tab
- Look for the download request
- Check response headers:
  - `X-Email-Status: sending` (success)
  - `X-Email-Status: failed` (error)
  - `X-Email-Sent-To: your-email@example.com`

**Check backend logs:**
```bash
# Look for:
# "📧 Background HTML-based PDF email process initiated for user@example.com"
# "✅ Email sent successfully to user@example.com"
```

**Common issues:**
- SMTP credentials incorrect → Update `.env`
- User email not set → Update user profile
- Email in spam folder → Check spam/junk

### PDF Content Issues

**No members showing:**
- Verify ward has members with `membership_status_id = 1` (Active)
- Verify members have `voter_status_id = 1` (Registered)
- Check database: `SELECT * FROM vw_member_details WHERE ward_code = 'YOUR_WARD_CODE'`

**Voting districts not showing:**
- Verify members have `voting_district_name` and `voting_district_code`
- Check database: `SELECT DISTINCT voting_district_name FROM vw_member_details WHERE ward_code = 'YOUR_WARD_CODE'`

## API Endpoint

For programmatic access:

```bash
GET /api/v1/members/ward/:wardCode/audit-export?format=pdf
Authorization: Bearer YOUR_TOKEN
```

**Response:**
- Content-Type: `application/pdf`
- Headers:
  - `X-Email-Status`: Email delivery status
  - `X-Email-Sent-To`: Recipient email address
  - `X-Email-Error`: Error message (if failed)

## Next Steps

1. **Test the implementation** using the test script
2. **Add your logo** to `backend/assets/logo.png`
3. **Verify email delivery** with your SMTP settings
4. **Test with real ward data** from the Members page

## Support

For issues or questions:
1. Check backend console logs for detailed error messages
2. Review the full documentation: `docs/HTML_PDF_ATTENDANCE_REGISTER.md`
3. Run the test script to isolate issues
4. Verify all dependencies are installed: `npm install`

