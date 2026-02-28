#!/usr/bin/env bash
set -e    # exit immediately on error

# ── Navigate to project root ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================"
echo "  NearHelp - Setup"
echo "================================================"

# 1. Environment setup (do this first so .env is available during install)
echo ""
echo "[1/3] Setting up environment..."
cp -n .env.example .env 2>/dev/null || true

# Copy env files into sub-projects
cp -f .env backend/.env 2>/dev/null || true
grep '^VITE_' .env > frontend/.env 2>/dev/null || true

echo "  .env files ready."

# 2. Install backend dependencies
echo ""
echo "[2/3] Installing backend dependencies..."
cd backend
npm install
cd ..

# 3. Install frontend dependencies
echo ""
echo "[3/3] Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "================================================"
echo "  Setup complete. Run ./web.sh to start the app."
echo "================================================"