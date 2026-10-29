#!/bin/bash
# Start all CryptoShield AI services

echo "Starting CryptoShield AI services..."

# Check MongoDB
echo "1. Checking MongoDB..."
if ! mongosh --eval "db.runCommand({ping:1})" --quiet 2>/dev/null; then
    echo "MongoDB not running. Please start MongoDB on localhost:27017"
    exit 1
fi

echo "2. Starting ML Service (port 8000)..."
cd services/ml
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
ML_PID=$!
cd ../..

echo "3. Starting API Server (port 4000)..."
cd apps/api
npm run dev &
API_PID=$!
cd ../..

echo "4. Starting Web Frontend (port 3000)..."
cd apps/web
npm run dev &
WEB_PID=$!
cd ../..

echo ""
echo "All services started!"
echo "  Web:  http://localhost:3000"
echo "  API:  http://localhost:4000/api/v1"
echo "  ML:   http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap SIGINT to kill all child processes
trap "kill $ML_PID $API_PID $WEB_PID 2>/dev/null; exit" INT
wait