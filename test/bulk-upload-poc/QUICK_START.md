# Quick Start Guide - Bulk Upload POC

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
# From the repository root
cd test/bulk-upload-poc
npm install
```

Or use the root package.json (recommended):

```bash
# From repository root
npm install
```

### Step 2: Generate Sample Data

```bash
# Generate 50 sample records (default)
npx ts-node generate-sample-data.ts

# Or specify number of records
npx ts-node generate-sample-data.ts 100
```

This creates `sample-data/test-members.xlsx` with:
- ~90% valid, unique ID numbers
- ~5% invalid ID numbers (wrong checksum)
- ~5% duplicate records

### Step 3: Run the Processor

```bash
# Process the generated sample file
npx ts-node test-bulk-upload-processor.ts sample-data/test-members.xlsx
```

**Expected output:**
- Console logs showing progress through each step
- Generated Excel report in `reports/` directory

---

## 📊 NPM Scripts (Convenience)

```bash
# Generate sample data (50 records)
npm run generate-sample

# Generate and process 20 records
npm run test:small

# Generate and process 100 records
npm run test:medium

# Generate and process 500 records
npm run test:large
```

---

## 🧪 Testing with Your Own Data

```bash
# Process your own Excel file
npx ts-node test-bulk-upload-processor.ts "/path/to/your/file.xlsx"

# Example with Windows path
npx ts-node test-bulk-upload-processor.ts "C:/uploads/members.xlsx"

# Example with relative path
npx ts-node test-bulk-upload-processor.ts "../../uploads/test-upload.xlsx"
```

**Required Excel columns:**
- `ID Number` (required)
- `Name` (optional)
- `Surname` (optional)
- `Cell Number` (optional)
- `Email` (optional)

---

## 📋 What to Check

After running the processor, verify:

1. **Console Output**
   - ✅ All steps complete without errors
   - ✅ Validation statistics are correct
   - ✅ Database operations succeed
   - ✅ Report is generated

2. **Excel Report** (in `reports/` directory)
   - ✅ Sheet 1: Summary with correct statistics
   - ✅ Sheet 2: All uploaded rows displayed
   - ✅ Sheet 3: Invalid IDs with error messages
   - ✅ Sheet 4: Duplicates identified correctly
   - ✅ Sheet 5: Not registered voters (if IEC enabled)
   - ✅ Sheet 6: New members inserted
   - ✅ Sheet 7: Existing members updated

3. **Database** (check PostgreSQL)
   ```sql
   -- Check inserted/updated records
   SELECT * FROM members_consolidated 
   WHERE updated_at > NOW() - INTERVAL '5 minutes'
   ORDER BY updated_at DESC;
   ```

---

## ⚙️ Configuration

### Database Connection

Edit `test-bulk-upload-processor.ts` (lines 30-37):

```typescript
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'eff_membership_database',
  user: 'eff_admin',
  password: 'Frames!123',
};
```

### IEC API (Optional)

By default, IEC verification uses **mock data** for testing.

To enable real IEC API calls:

```bash
# Set environment variables
export IEC_VERIFICATION_ENABLED=true
export IEC_API_BASE_URL=https://iec-api.example.com
export IEC_CLIENT_ID=your_client_id
export IEC_CLIENT_SECRET=your_client_secret

# Then run the processor
npx ts-node test-bulk-upload-processor.ts sample-data/test-members.xlsx
```

---

## 🐛 Troubleshooting

### Error: Cannot find module 'xlsx'

```bash
npm install xlsx exceljs pg axios @types/node @types/pg
```

### Error: connect ECONNREFUSED 127.0.0.1:5432

PostgreSQL is not running or credentials are incorrect.

```bash
# Check PostgreSQL status
# Windows:
net start postgresql-x64-14

# Linux/Mac:
sudo systemctl status postgresql
```

### Error: File not found

Check the file path is correct:

```bash
# Use absolute path
npx ts-node test-bulk-upload-processor.ts "C:/full/path/to/file.xlsx"

# Or relative path from test/bulk-upload-poc directory
npx ts-node test-bulk-upload-processor.ts "../../uploads/file.xlsx"
```

---

## 📝 Next Steps

After validating the POC:

1. ✅ Test with real production data (100-500 records)
2. ✅ Compare results with Python processor
3. ✅ Measure performance (processing time)
4. ✅ Verify Excel report quality matches Python version
5. ✅ Test IEC API integration (if enabled)
6. ✅ Document any issues or discrepancies

Once satisfied, proceed with the full migration plan!

---

## 📞 Support

If you encounter issues:
1. Check the console output for error messages
2. Review the generated Excel report
3. Check database logs
4. Document the issue for discussion

**Happy Testing! 🎉**

