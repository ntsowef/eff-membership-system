# Quick Start Guide - Excel Reports

## Generate All Reports (Easiest Method)

### Option 1: Using npm script
```bash
cd backend
npm run generate-reports
```

This will create all three reports in the `reports` directory:
- `Audit.xlsx`
- `DAILY REPORT.xlsx`
- `ECONOMIC FREEDOM FIGHTERS SRPA DELEGATES (4).xlsx`

### Option 2: Using API
```bash
curl -X POST "http://localhost:5000/api/v1/reports/generate-all" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Generate Individual Reports

### Ward Audit Report
```bash
# Via API
curl -X GET "http://localhost:5000/api/v1/audit/ward-membership/export?format=excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o Audit.xlsx

# With filters
curl -X GET "http://localhost:5000/api/v1/audit/ward-membership/export?format=excel&province_code=GP&limit=500" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o Audit.xlsx
```

### Daily Report
```bash
# Today's report
curl -X GET "http://localhost:5000/api/v1/reports/daily?format=excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "DAILY REPORT.xlsx"

# Specific date
curl -X GET "http://localhost:5000/api/v1/reports/daily?format=excel&date=2025-01-15" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "DAILY REPORT.xlsx"
```

### SRPA Delegates Report
```bash
# All delegates
curl -X GET "http://localhost:5000/api/v1/reports/srpa-delegates?format=excel" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "ECONOMIC FREEDOM FIGHTERS SRPA DELEGATES (4).xlsx"

# Filtered by province
curl -X GET "http://localhost:5000/api/v1/reports/srpa-delegates?format=excel&province_code=GP" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "ECONOMIC FREEDOM FIGHTERS SRPA DELEGATES (4).xlsx"
```

## Common Filters

### Ward Audit Report
- `standing`: Good Standing, Acceptable Standing, Needs Improvement
- `province_code`: GP, WC, KZN, etc.
- `municipality_code`: Municipality code
- `district_code`: District code
- `search`: Search term for ward name/code
- `limit`: Maximum records (default: 1000)

### Daily Report
- `date`: YYYY-MM-DD format (default: today)

### SRPA Delegates Report
- `province_code`: Filter by province
- `municipality_code`: Filter by municipality
- `ward_code`: Filter by ward

## Troubleshooting

### "Command not found: npm"
Install Node.js from https://nodejs.org/

### "Permission denied"
Make sure you have the required permissions:
- `audit.read` for Ward Audit Report
- `reports.read` for Daily and SRPA reports
- `reports.admin` for generating all reports

### "Database connection error"
1. Check if PostgreSQL is running
2. Verify database credentials in `.env` file
3. Ensure database migrations are up to date

### "Empty report"
1. Check if data exists in the database
2. Verify filter parameters aren't too restrictive
3. Check date format (must be YYYY-MM-DD)

### "File not found"
The `reports` directory will be created automatically. If you get this error:
```bash
mkdir -p reports
```

## Scheduled Generation

To generate reports automatically every day at 6 AM:

### Linux/Mac (crontab)
```bash
crontab -e
# Add this line:
0 6 * * * cd /path/to/project/backend && npm run generate-reports
```

### Windows (Task Scheduler)
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 6:00 AM
4. Action: Start a program
5. Program: `npm`
6. Arguments: `run generate-reports`
7. Start in: `C:\path\to\project\backend`

## Getting Your Auth Token

### Via Login API
```bash
curl -X POST "http://localhost:5000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your.email@example.com",
    "password": "your_password"
  }'
```

The response will include a `token` field. Use this token in the `Authorization: Bearer YOUR_TOKEN` header.

## Report Locations

Generated reports are saved to:
```
project-root/
  └── reports/
      ├── Audit.xlsx
      ├── DAILY REPORT.xlsx
      └── ECONOMIC FREEDOM FIGHTERS SRPA DELEGATES (4).xlsx
```

## Need Help?

- Check the full documentation: `reports/README.md`
- Review implementation details: `REPORTS_IMPLEMENTATION.md`
- Contact system administrator

