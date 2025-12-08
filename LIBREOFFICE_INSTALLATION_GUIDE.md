# LibreOffice Installation Guide

## Overview
The `libreoffice-convert` npm package requires LibreOffice to be installed on the server to perform Word to PDF conversions. This guide provides installation instructions for different operating systems.

## Windows Installation

### Method 1: Direct Download (Recommended)
1. Visit the official LibreOffice download page:
   ```
   https://www.libreoffice.org/download/download/
   ```

2. Download the Windows installer (64-bit recommended)

3. Run the installer and follow the installation wizard

4. Verify installation:
   ```powershell
   # Open PowerShell and run:
   & "C:\Program Files\LibreOffice\program\soffice.exe" --version
   ```

### Method 2: Using Chocolatey
```powershell
# Install Chocolatey if not already installed
# Then run:
choco install libreoffice -y

# Verify installation
libreoffice --version
```

### Method 3: Using Winget
```powershell
winget install --id TheDocumentFoundation.LibreOffice -e

# Verify installation
libreoffice --version
```

## Linux Installation

### Ubuntu/Debian
```bash
# Update package list
sudo apt-get update

# Install LibreOffice
sudo apt-get install -y libreoffice

# Verify installation
libreoffice --version
```

### CentOS/RHEL/Fedora
```bash
# Install LibreOffice
sudo yum install -y libreoffice

# Or for newer versions:
sudo dnf install -y libreoffice

# Verify installation
libreoffice --version
```

### Arch Linux
```bash
# Install LibreOffice
sudo pacman -S libreoffice-fresh

# Verify installation
libreoffice --version
```

## macOS Installation

### Method 1: Direct Download
1. Visit: https://www.libreoffice.org/download/download/
2. Download the macOS installer
3. Open the .dmg file and drag LibreOffice to Applications
4. Verify installation:
   ```bash
   /Applications/LibreOffice.app/Contents/MacOS/soffice --version
   ```

### Method 2: Using Homebrew
```bash
# Install Homebrew if not already installed
# Then run:
brew install --cask libreoffice

# Verify installation
libreoffice --version
```

## Docker Installation

If you're running your application in Docker, add this to your Dockerfile:

### For Ubuntu-based images:
```dockerfile
FROM node:18

# Install LibreOffice
RUN apt-get update && \
    apt-get install -y libreoffice && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Rest of your Dockerfile...
```

### For Alpine-based images:
```dockerfile
FROM node:18-alpine

# Install LibreOffice
RUN apk add --no-cache libreoffice

# Rest of your Dockerfile...
```

## Verification

After installation, verify that LibreOffice is accessible:

```bash
# Check version
libreoffice --version

# Or
soffice --version

# Test conversion (optional)
libreoffice --headless --convert-to pdf test.docx
```

## Troubleshooting

### Issue: "libreoffice: command not found"

**Solution:** Add LibreOffice to your PATH

**Windows:**
```powershell
# Add to PATH (PowerShell as Administrator)
$env:Path += ";C:\Program Files\LibreOffice\program"
```

**Linux/macOS:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="/usr/bin:$PATH"
```

### Issue: Permission denied

**Solution:** Ensure the Node.js process has permission to execute LibreOffice

**Linux:**
```bash
# Give execute permissions
sudo chmod +x /usr/bin/libreoffice
```

### Issue: Conversion fails in headless mode

**Solution:** Install additional fonts and dependencies

**Ubuntu/Debian:**
```bash
sudo apt-get install -y \
    fonts-liberation \
    fonts-dejavu \
    fonts-noto \
    libreoffice-writer \
    libreoffice-calc
```

## Production Deployment

### Recommended Setup
1. Install LibreOffice on your production server
2. Verify it works in headless mode
3. Test conversion with sample documents
4. Monitor memory usage and performance
5. Set up proper error logging

### Performance Tips
- LibreOffice can be memory-intensive for large documents
- Consider implementing a queue system for conversions
- Monitor server resources during peak usage
- Set appropriate timeouts for conversion operations

## System Requirements

### Minimum Requirements
- **RAM:** 2 GB (4 GB recommended)
- **Disk Space:** 1.5 GB for LibreOffice installation
- **CPU:** Any modern processor

### Recommended for Production
- **RAM:** 8 GB or more
- **Disk Space:** 5 GB or more (for temporary files)
- **CPU:** Multi-core processor for concurrent conversions

## Support

If you encounter issues:
1. Check LibreOffice logs
2. Verify Node.js has permission to execute LibreOffice
3. Test conversion manually from command line
4. Check server resources (memory, disk space)
5. Review application logs for error messages

## Additional Resources

- LibreOffice Official Website: https://www.libreoffice.org/
- LibreOffice Documentation: https://documentation.libreoffice.org/
- libreoffice-convert npm package: https://www.npmjs.com/package/libreoffice-convert
- GitHub Issues: https://github.com/elwerene/libreoffice-convert/issues

