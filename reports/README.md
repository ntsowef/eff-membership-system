# EFF Membership System Reports

This directory contains generated Excel reports for the EFF Membership System.

## Available Reports

### 1. Audit.xlsx
**Ward Membership Audit Report**

Contains comprehensive ward-level membership audit data including:
- Ward code and name
- Municipality, district, and province information
- Active, expired, and inactive member counts
- Ward standing and performance metrics
- Target achievement percentages
- Members needed to reach next standing level

**API Endpoint:** `GET /api/v1/audit/ward-membership/export?format=excel`

**Query Parameters:**
- `standing`: Filter by ward standing (Good Standing, Acceptable Standing, Needs Improvement)
- `municipality_code`: Filter by municipality
- `district_code`: Filter by district
- `province_code`: Filter by province
- `search`: Search by ward name or code
- `limit`: Maximum number of records (default: 1000)

### 2. DAILY REPORT.xlsx
**Daily Membership and Financial Report**

Contains daily statistics across two sheets:

**Sheet 1: Daily Summary**
- Report date
- Membership statistics (new members, active, expired, inactive)
- Application statistics (pending, approved, rejected)
- Payment statistics (transactions, revenue, status breakdown)

**Sheet 2: New Members Today**
- List of all members who joined today
- Full contact and geographic information

**API Endpoint:** `GET /api/v1/reports/daily?format=excel`

**Query Parameters:**
- `date`: Report date in YYYY-MM-DD format (default: today)

### 3. ECONOMIC FREEDOM FIGHTERS SRPA DELEGATES (4).xlsx
**SRPA Delegates Report**

Contains SRPA (Sub-Regional People's Assembly) delegate information across two sheets:

**Sheet 1: SRPA Delegates**
- Membership number and full name
- ID number and contact information
- Geographic location (province, municipality, ward, voting district)
- Delegate position and selection date
- Current status

**Sheet 2: Summary by Province**
- Provincial breakdown of delegates
- Number of wards with delegates per province
- Total delegate count per province

**API Endpoint:** `GET /api/v1/reports/srpa-delegates?format=excel`

**Query Parameters:**
- `province_code`: Filter by province
- `municipality_code`: Filter by municipality
- `ward_code`: Filter by ward

## Generating Reports

### Method 1: Using the Script
Run the report generation script to create all three reports at once:

```bash
cd backend
npm run generate-reports
```

Or using ts-node directly:

```bash
ts-node backend/scripts/generate-reports.ts
```

### Method 2: Using the API

#### Generate Individual Reports
```bash
# Ward Audit Report
curl -X GET "http://localhost:5000/api/v1/audit/ward-membership/export?format=excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o Audit.xlsx

# Daily Report
curl -X GET "http://localhost:5000/api/v1/reports/daily?format=excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "DAILY REPORT.xlsx"

# SRPA Delegates Report
curl -X GET "http://localhost:5000/api/v1/reports/srpa-delegates?format=excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "ECONOMIC FREEDOM FIGHTERS SRPA DELEGATES (4).xlsx"
```

#### Generate All Reports at Once
```bash
curl -X POST "http://localhost:5000/api/v1/reports/generate-all" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Method 3: Using Frontend
The reports can be accessed through the frontend application:

1. **Ward Audit Report**: Navigate to Audit → Ward Membership → Export (select Excel format)
2. **Daily Report**: Navigate to Reports → Daily Report → Download
3. **SRPA Delegates Report**: Navigate to Ward Audit → Delegates → Export SRPA Delegates

## Report Scheduling

To automatically generate reports on a schedule, you can set up a cron job:

```bash
# Generate reports daily at 6 AM
0 6 * * * cd /path/to/project && npm run generate-reports
```

## Permissions Required

- **Ward Audit Report**: `audit.read` permission
- **Daily Report**: `reports.read` permission
- **SRPA Delegates Report**: `reports.read` permission
- **Generate All Reports**: `reports.admin` permission

## File Locations

Generated reports are saved to:
```
/reports/
  ├── Audit.xlsx
  ├── DAILY REPORT.xlsx
  └── ECONOMIC FREEDOM FIGHTERS SRPA DELEGATES (4).xlsx
```

## Troubleshooting

### Report Generation Fails
1. Check database connection
2. Verify required permissions
3. Check logs for specific error messages
4. Ensure the `reports` directory exists and is writable

### Empty Reports
1. Verify data exists in the database
2. Check filter parameters (may be too restrictive)
3. Ensure date format is correct (YYYY-MM-DD)

### API Returns 501 Error
- Excel export is now implemented for all three reports
- If you see this error, ensure you're using the latest version of the code
- PDF export may still return 501 for some reports (use Excel format)

## Technical Details

### Dependencies
- `xlsx`: Excel file generation
- PostgreSQL database with required views and tables

### Database Views Used
- `vw_ward_membership_audit`: Ward audit data
- `members`: Member information
- `membership_applications`: Application data
- `payment_transactions`: Payment data
- `ward_delegates`: Delegate information
- `voting_districts`: Geographic data

### Service Files
- `backend/src/services/excelReportService.ts`: Core report generation logic
- `backend/src/routes/reports.ts`: API endpoints for reports
- `backend/src/routes/wardMembershipAudit.ts`: Ward audit export endpoint

## Support

For issues or questions about reports, contact the system administrator or refer to the main project documentation.

