@echo off
REM Bulk Upload Processor Startup Script for Windows
REM This script installs dependencies and starts the processor

echo.
echo Starting Bulk Upload Processor...
echo.

REM Change to script directory
cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://www.python.org/
    pause
    exit /b 1
)

echo Python version:
python --version
echo.

REM Check if pip is installed
pip --version >nul 2>&1
if errorlevel 1 (
    echo pip is not installed or not in PATH
    pause
    exit /b 1
)

echo pip version:
pip --version
echo.

REM Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Dependencies installed successfully
echo.

REM Check if .env file exists
if not exist "..\..\\.env" (
    echo Warning: .env file not found
    echo Using default configuration values
    echo.
)

REM Create upload directory if it doesn't exist
if not exist "..\..\\_upload_file_directory" (
    echo Creating upload directory...
    mkdir "..\..\\_upload_file_directory"
)

echo.
echo Starting processor...
echo Press Ctrl+C to stop
echo.

REM Run the processor
python bulk_upload_processor.py

pause

