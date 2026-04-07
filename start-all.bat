@echo off
REM Quick Start Script for AI Attendance System (Windows)

echo.
echo ========================================
echo  AI-Powered Attendance System - Startup
echo ========================================
echo.

REM Check Node.js
echo Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found. Please install Node.js.
    exit /b 1
) else (
    node --version
    echo [OK] Node.js found
)

REM Check Python
echo.
echo Checking Python...
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Python not found. AI service may not work.
) else (
    python --version
    echo [OK] Python found
)

REM Create logs directory
if not exist logs mkdir logs

echo.
echo ========================================
echo  Installing Dependencies...
echo ========================================
echo.

echo Installing Backend dependencies...
cd backend
call npm install
cd ..
echo [OK] Backend dependencies installed

echo.
echo Installing Frontend dependencies...
cd frontend
call npm install
cd ..
echo [OK] Frontend dependencies installed

echo.
echo Installing AI Service dependencies...
cd ai-service
pip install -r requirements.txt
cd ..
echo [OK] AI Service dependencies installed

echo.
echo ========================================
echo  Services Configuration
echo ========================================
echo.
echo Please open 4 separate terminals and run:
echo.
echo Terminal 1 - MongoDB:
echo     mongod
echo.
echo Terminal 2 - AI Service:
echo     cd ai-service
echo     python app.py
echo.
echo Terminal 3 - Backend:
echo     cd backend
echo     npm start
echo.
echo Terminal 4 - Frontend:
echo     cd frontend
echo     npm run dev
echo.
echo ========================================
echo.
echo Service URLs:
echo   Frontend:   http://localhost:5173
echo   Backend:    http://localhost:5000
echo   AI Service: http://localhost:8000
echo.
pause
