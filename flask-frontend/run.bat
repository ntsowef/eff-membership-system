@echo off
REM Quick start script for Flask frontend on Windows

echo ========================================
echo EFF Membership Flask Frontend
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate
echo.

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please edit .env file with your configuration
    echo.
)

REM Install/update dependencies
echo Installing dependencies...
pip install -r requirements.txt
echo.

REM Create uploads directory if it doesn't exist
if not exist "uploads\" (
    mkdir uploads
)

REM Start the application
echo ========================================
echo Starting Flask application on port 3001
echo Backend API should be running on port 5000
echo ========================================
echo.
python app.py

pause

