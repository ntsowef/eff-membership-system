@echo off
REM Quick Email Template Test Script for Windows
REM This script provides an interactive way to test email templates

setlocal enabledelayedexpansion

REM Display header
echo ================================================================
echo           EFF Membership System - Email Template Test
echo ================================================================
echo.

REM Check if email is provided as argument
if "%~1"=="" (
    echo No email address provided.
    echo.
    echo Usage: quick-test.bat your-email@example.com [template-name]
    echo.
    echo Examples:
    echo   quick-test.bat john@example.com
    echo   quick-test.bat john@example.com welcome-email
    echo.
    exit /b 1
)

set EMAIL=%~1
set TEMPLATE=%~2

echo Target Email: %EMAIL%
echo.

REM Navigate to backend directory
cd /d "%~dp0..\..\backend"

REM Run the test
if "%TEMPLATE%"=="" (
    echo Running all email template tests...
    echo.
    call npm run test:email -- --email %EMAIL%
) else (
    echo Testing template: %TEMPLATE%
    echo.
    call npm run test:email -- --email %EMAIL% --template %TEMPLATE%
)

endlocal

