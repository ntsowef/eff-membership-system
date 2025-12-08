# How to Restart the Bulk Upload Processor

## 🚨 IMPORTANT: You Must Restart the Processor!

The processor is currently running the **OLD CODE** (before our fixes). You can see this because:

1. File ID 2 failed with: `No module named 'flexible_membership_ingestionV2'`
   - This error should NOT happen with the new code (import is at module level)

2. File ID 1 failed with: `File not found: C:\...\backend\_upload_file_directory\...`
   - This is the OLD path (should be root `_upload_file_directory`)

**The processor needs to be restarted to load the new code!**

---

## 📋 Step-by-Step Instructions

### Step 1: Stop the Old Processor

**Find the terminal where you ran:**
```powershell
cd backend/python
python bulk_upload_processor.py
```

**Press `Ctrl+C` to stop it.**

You should see:
```
👋 Shutting down processor...
```

---

### Step 2: Start the New Processor

**In the same terminal, run:**
```powershell
python bulk_upload_processor.py
```

**You should now see these NEW messages at startup:**
```
📂 Repository root: C:\Development\NewProj\Membership-newV2
✓ Found ingestion script: C:\Development\NewProj\Membership-newV2\flexible_membership_ingestionV2.py
✓ Successfully imported FlexibleMembershipIngestion    ← THIS IS NEW!
✅ Loaded environment from: C:\Development\NewProj\Membership-newV2\.env
 Configuration loaded:
   Database: eff_admin@localhost:5432/eff_membership_database
   WebSocket: http://localhost:5000
   Upload Dir: C:\Development\NewProj\Membership-newV2\_upload_file_directory    ← ABSOLUTE PATH!
   Interval: 10s
2025-11-10 XX:XX:XX,XXX - __main__ - INFO -  Bulk Upload Processor started
2025-11-10 XX:XX:XX,XXX - __main__ - INFO -  Watching directory: C:\..._upload_file_directory
2025-11-10 XX:XX:XX,XXX - __main__ - INFO - 🔌 WebSocket URL: http://localhost:5000
2025-11-10 XX:XX:XX,XXX - __main__ - INFO - 
2025-11-10 XX:XX:XX,XXX - __main__ - INFO - 🔄 Starting main loop (checking every 10 seconds)...
```

**If you see these messages, the new code is loaded!** ✅

---

### Step 3: Reset a File to Pending

**Open a NEW terminal and run:**
```powershell
cd C:\Development\NewProj\Membership-newV2
python test/reset_file_to_pending.py
```

**You should see:**
```
✅ File 2 has been reset to 'pending' status
```

---

### Step 4: Watch the Processor Work

**Go back to the processor terminal.**

**Within 10 seconds, you should see:**
```
2025-11-10 XX:XX:XX,XXX - __main__ - DEBUG - [Loop X] Checking for pending files...
2025-11-10 XX:XX:XX,XXX - __main__ - DEBUG - Total files in database: 2
2025-11-10 XX:XX:XX,XXX - __main__ - DEBUG - Pending files query returned: 1 files
2025-11-10 XX:XX:XX,XXX - __main__ - INFO - 📋 Found 1 pending files
2025-11-10 XX:XX:XX,XXX - __main__ - INFO - 📄 Processing file 2: FransTest.xlsx
2025-11-10 XX:XX:XX,XXX - __main__ - INFO - 🔄 Starting processing with FlexibleMembershipIngestion...

[Database schema verification...]
[Pre-loading lookup data...]
[Processing Excel file...]
[Inserting data...]

2025-11-10 XX:XX:XX,XXX - __main__ - INFO - ✅ File 2 processed successfully: 28/28 rows
```

---

## 🔍 How to Verify It's Working

### Check 1: Startup Messages

**OLD CODE (WRONG):**
```
✅ Loaded environment from: ...
 Configuration loaded:
   Upload Dir: _upload_file_directory    ← RELATIVE PATH (WRONG!)
```

**NEW CODE (CORRECT):**
```
📂 Repository root: C:\Development\NewProj\Membership-newV2    ← NEW!
✓ Found ingestion script: ...    ← NEW!
✓ Successfully imported FlexibleMembershipIngestion    ← NEW!
✅ Loaded environment from: ...
 Configuration loaded:
   Upload Dir: C:\Development\NewProj\Membership-newV2\_upload_file_directory    ← ABSOLUTE PATH (CORRECT!)
```

### Check 2: File Processing

**If the file processes successfully:**
```
✅ File 2 processed successfully: 28/28 rows
```

**Check the database:**
```powershell
python test/check_db_now.py
```

**You should see:**
```
=== ALL FILES ===
ID: 2, File: test-upload-1762727974296.xlsx, Status: completed    ← SUCCESS!
```

---

## ❌ If It Still Fails

### Check the Error Message

```powershell
python test/check_failed_files.py
```

**If you see:**
- `No module named 'flexible_membership_ingestionV2'` → Processor not restarted (still running old code)
- `File not found: ...backend\_upload_file_directory...` → Processor not restarted (still using old path)
- Any other error → New issue, check the error message

---

## 📝 Summary

**The processor MUST be restarted to load the new code!**

1. ❌ Stop the old processor (`Ctrl+C`)
2. ✅ Start the new processor (`python bulk_upload_processor.py`)
3. ✅ Verify you see the new startup messages
4. ✅ Reset a file to pending (`python test/reset_file_to_pending.py`)
5. ✅ Watch it process successfully!

---

**Once you restart the processor, everything will work!** 🚀

