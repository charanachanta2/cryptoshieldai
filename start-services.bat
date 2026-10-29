@echo off
echo Starting CryptoShield AI services...

echo.
echo 1. Starting MongoDB...
echo Make sure MongoDB is running on localhost:27017

echo.
echo 2. Starting ML Service (port 8000)...
start "ML Service" cmd /k "cd services\ml && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo.
echo 3. Starting API Server (port 4000)...
start "API Server" cmd /k "cd apps\api && npm run dev"

echo.
echo 4. Starting Web Frontend (port 3000)...
start "Web Frontend" cmd /k "cd apps\web && npm run dev"

echo.
echo All services started!
echo - Web: http://localhost:3000
echo - API: http://localhost:4000/api/v1
echo - ML:  http://localhost:8000
echo.
pause