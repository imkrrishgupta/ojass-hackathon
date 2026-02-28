#!/usr/bin/env bash
set -e    # exit immediately on error

# ── Navigate to project root ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# 2. Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# 3. Environment setup
cp -n .env.example .env || true

# 4. Build frontend for production serving
echo "Building frontend..."
cd frontend
npm run build
cd ..

echo "Setup complete."