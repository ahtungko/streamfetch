#!/bin/bash

# StreamFetch Web Application Starter
# This script starts both the FastAPI backend and React frontend

set -e

echo "🚀 Starting StreamFetch Web Application..."

# Check if poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "❌ Poetry not found. Please install Poetry first:"
    echo "   curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
poetry install

# Install frontend dependencies if needed
if [ ! -d "web/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd web && npm install && cd ..
fi

# Start backend in background
echo "🐍 Starting FastAPI backend on http://localhost:8000..."
poetry run python -m uvicorn streamfetch.api.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 3

# Start frontend
echo "⚛️  Starting React frontend on http://localhost:5173..."
cd web && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ StreamFetch Web Application is running!"
echo ""
echo "   🌐 Frontend: http://localhost:5173"
echo "   🔧 Backend API: http://localhost:8000"
echo "   📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers..."
echo ""

# Handle Ctrl+C
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Wait for both processes
wait
