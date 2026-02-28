#!/usr/bin/env bash
set -e    # exit immediately on error

# ── Navigate to project root ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Run ./setup.sh first."
  exit 1
fi

# Copy root .env into backend so dotenv picks it up
cp -f .env backend/.env 2>/dev/null || true

# Also make a frontend .env with VITE_ vars (Vite needs its own file)
grep '^VITE_' .env > frontend/.env 2>/dev/null || true

# Cleanup background processes on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  kill 0 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start backend
echo "Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Give backend a moment to boot
sleep 3

# 2. Start frontend dev server
echo "Starting frontend dev server..."
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

# Wait a moment for Vite to start
sleep 3

echo ""
echo "================================================"
echo "  NearHelp is running!"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:5050"
echo "================================================"
echo ""

# Wait for background processes
wait