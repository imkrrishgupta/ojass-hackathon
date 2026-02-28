#!/usr/bin/env bash
set -e    # exit immediately on error

# ── Navigate to project root ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Copy root .env into backend so dotenv picks it up
cp -f .env backend/.env 2>/dev/null || true

# Also make a frontend .env with VITE_ vars (Vite needs its own file)
grep '^VITE_' .env > frontend/.env 2>/dev/null || true

# Cleanup background processes on exit
cleanup() {
  kill 0 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM

# 1. Start backend
cd backend
npm start &
cd ..

sleep 2

# 2. Start frontend dev server
cd frontend
npm run dev -- --host &
cd ..

echo ""
echo "Server running at http://localhost:5173"
echo "Backend API at  http://localhost:5050"
echo ""

# Wait for background processes
wait