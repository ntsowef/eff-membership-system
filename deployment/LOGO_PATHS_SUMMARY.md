# Logo Paths Summary - All Services

## Overview
Different services in the application use different logo paths. This document summarizes all logo locations and what needs to be deployed to production.

## Logo Files Required in Production

### 1. **Primary Logo for HTML-based PDF Generation**
**Service**: `htmlPdfService.ts` (Ward Attendance Register PDF)
- **Path**: `backend/assets/logo.png`
- **Resolution**: `process.cwd() + '/assets/logo.png'`
- **Production Path**: `/var/www/eff-membership-system/backend/assets/logo.png`
- **Used By**: Ward register PDF downloads (HTML to PDF conversion)
- **Status**: ⚠️ **MISSING IN PRODUCTION** - This is the main issue

### 2. **Logo for Word Document Generation**
**Service**: `wordDocumentService.ts` (Word Attendance Register)
- **Path**: `backend/dist/assets/images/EFF_Reglogo.png`
- **Resolution**: `__dirname + '/../assets/images/EFF_Reglogo.png'`
- **Production Path**: `/var/www/eff-membership-system/backend/dist/assets/images/EFF_Reglogo.png`
- **Used By**: Word document attendance registers
- **Status**: ✅ Should be copied during build process

### 3. **Logo for Legacy PDF Service**
**Service**: `pdfExportService.ts` (Legacy PDF generation)
- **Path**: `backend/../frontend/src/assets/images/EFF_Reglogo.png`
- **Resolution**: `process.cwd() + '/../frontend/src/assets/images/EFF_Reglogo.png'`
- **Production Path**: `/var/www/eff-membership-system/frontend/src/assets/images/EFF_Reglogo.png`
- **Used By**: Legacy PDF generation (if used)
- **Status**: ⚠️ Incorrect path - should be fixed

## Quick Fix for Production

### Step 1: Ensure Logo Exists at Primary Location
```bash
# SSH into production server
cd /var/www/eff-membership-system/backend

# Create assets directory
mkdir -p assets

# Copy logo from src/assets/images (if it exists there)
cp src/assets/images/EFF_Reglogo.png assets/logo.png

# OR upload from local machine:
# scp backend/assets/logo.png user@server:/var/www/eff-membership-system/backend/assets/logo.png

# Set permissions
chmod 644 assets/logo.png
```

### Step 2: Ensure Logo Exists for Word Documents
```bash
# This should be handled by the build process, but verify:
cd /var/www/eff-membership-system/backend

# Check if logo exists in dist
ls -la dist/assets/images/EFF_Reglogo.png

# If missing, copy from src
mkdir -p dist/assets/images
cp src/assets/images/EFF_Reglogo.png dist/assets/images/
```

### Step 3: Restart Application
```bash
pm2 restart eff-api
```

## Automated Fix Script

Run the provided script on your production server:
```bash
cd /var/www/eff-membership-system/backend
chmod +x deployment/fix-logo-production.sh
sudo bash deployment/fix-logo-production.sh
```

## Build Process

The `package.json` includes a `copy-assets` script that should copy assets during build:
```json
"build": "tsc && npm run copy-assets",
"copy-assets": "node -e \"const fs = require('fs'); const path = require('path'); const src = path.join(__dirname, 'src', 'assets'); const dest = path.join(__dirname, 'dist', 'assets'); if (fs.existsSync(src)) { fs.cpSync(src, dest, { recursive: true }); console.log('✅ Assets copied to dist/assets'); } else { console.log('⚠️  No assets directory found'); }\""
```

This copies `src/assets` → `dist/assets`, which handles the Word document logo.

## Logo Requirements

- **Format**: PNG (recommended)
- **Size**: 300x300 pixels (square aspect ratio recommended)
- **File size**: < 1MB
- **Color mode**: RGB

## Testing After Deployment

1. **Test HTML PDF Generation**:
   - Download a ward register as PDF
   - Check if logo appears at the top

2. **Test Word Document Generation**:
   - Download a ward register as Word
   - Open the document and check if logo appears

3. **Check Logs**:
   ```bash
   pm2 logs eff-api | grep -i logo
   ```
   Look for:
   - `✅ EFF logo found at: /path/to/logo.png`
   - `⚠️ EFF logo not found at: /path/to/logo.png`

## Recommended Long-term Solution

**Consolidate all logo paths to use a single location:**

1. Store logo at: `backend/assets/logo.png`
2. Update all services to use: `path.join(process.cwd(), 'assets', 'logo.png')`
3. Ensure build process copies this file to production
4. Add logo file to version control (if not already)

## Files to Update (Future Improvement)

1. `backend/src/services/pdfExportService.ts` (line 2995)
   - Change from: `process.cwd() + '/../frontend/src/assets/images/EFF_Reglogo.png'`
   - Change to: `path.join(process.cwd(), 'assets', 'logo.png')`

2. `backend/src/services/wordDocumentService.ts` (line 123)
   - Already uses correct relative path for compiled code
   - No change needed

3. `backend/src/services/htmlPdfService.ts` (line 100)
   - Already uses correct path: `path.join(process.cwd(), 'assets', 'logo.png')`
   - No change needed

## Current Status

✅ **htmlPdfService.ts** - Correct path, just needs file in production
⚠️ **wordDocumentService.ts** - Uses dist/assets/images path (handled by build)
❌ **pdfExportService.ts** - Uses incorrect path to frontend directory

## Priority Action

**Immediate**: Upload `logo.png` to `/var/www/eff-membership-system/backend/assets/logo.png` on production server.

This will fix the ward register PDF generation issue immediately.

