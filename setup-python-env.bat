@echo off
REM Python Virtual Environment Setup Script
REM EFF Membership System

echo ========================================
echo Python Virtual Environment Setup
echo ========================================
echo.

REM Check if Python is installed
echo 1. Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    X Python not found. Please install Python 3.8 or higher.
    pause
    exit /b 1
)
python --version
echo    √ Python found
echo.

REM Check if venv already exists
if exist "venv" (
    echo Virtual environment 'venv' already exists.
    set /p recreate="Do you want to recreate it? (y/n): "
    if /i "%recreate%"=="y" (
        echo    Removing existing virtual environment...
        rmdir /s /q venv
    ) else (
        echo    Keeping existing virtual environment.
        echo.
        echo To activate the virtual environment, run:
        echo    venv\Scripts\activate.bat
        pause
        exit /b 0
    )
)

REM Create virtual environment
echo.
echo 2. Creating virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo    X Failed to create virtual environment
    pause
    exit /b 1
)
echo    √ Virtual environment created successfully
echo.

REM Activate virtual environment
echo 3. Activating virtual environment...
call venv\Scripts\activate.bat
echo    √ Virtual environment activated
echo.

REM Upgrade pip
echo 4. Upgrading pip...
python -m pip install --upgrade pip --quiet
echo    √ pip upgraded successfully
echo.

REM Install dependencies
echo 5. Installing dependencies...

if exist "requirements.txt" (
    echo    Installing from root requirements.txt...
    pip install -r requirements.txt
    echo    √ Root dependencies installed
)

if exist "backend\python\requirements.txt" (
    echo    Installing from backend\python\requirements.txt...
    pip install -r backend\python\requirements.txt
    echo    √ Backend Python dependencies installed
)

REM List installed packages
echo.
echo 6. Installed packages:
pip list

REM Summary
echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Virtual environment is now active.
echo.
echo To activate in the future, run:
echo    venv\Scripts\activate.bat
echo.
echo To deactivate, run:
echo    deactivate
echo.
echo To test the Python scripts:
echo    python flexible_membership_ingestionV2.py
echo    python backend\python\bulk_upload_processor.py
echo.
pause

