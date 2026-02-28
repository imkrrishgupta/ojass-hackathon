#!/usr/bin/env bash
set -e

# ── Navigate to project root ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "================================================"
echo "  NearHelp — Setup"
echo "================================================"

# ── 0. Pre-flight checks ──
echo ""
echo "[0/5] Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "  ✗ Node.js not found. Install Node.js >= 18: https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -v | sed 's/^v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "  ✗ Node.js v18+ required (found v$(node -v))"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo "  ✗ npm not found."
  exit 1
fi

echo "  ✓ Node $(node -v)  npm $(npm -v)"

# ── 1. Environment files ──
echo ""
echo "[1/5] Setting up environment..."

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "  Created .env from .env.example — fill in your secrets before starting."
  else
    echo "  ✗ No .env or .env.example found. Create a .env file manually."
    exit 1
  fi
else
  echo "  .env already exists — skipping."
fi

# Distribute env files to sub-projects
cp -f .env backend/.env 2>/dev/null || true
grep '^VITE_' .env > frontend/.env 2>/dev/null || true
echo "  ✓ .env distributed to backend/ and frontend/"

# ── 2. Install backend dependencies ──
echo ""
echo "[2/5] Installing backend dependencies..."
cd backend
npm install --loglevel=warn
cd ..
echo "  ✓ Backend dependencies installed"

# ── 3. Install frontend dependencies ──
echo ""
echo "[3/5] Installing frontend dependencies..."
cd frontend
npm install --loglevel=warn
cd ..
echo "  ✓ Frontend dependencies installed"

# ── 4. Create required directories ──
echo ""
echo "[4/5] Ensuring required directories..."
mkdir -p backend/public/avatars
echo "  ✓ backend/public/avatars ready"

# ── 5. Seed admin user ──
echo ""
echo "[5/5] Seeding admin user..."
cd backend
if node src/seedAdmin.js 2>/dev/null; then
  echo "  ✓ Admin user seeded"
else
  echo "  ⚠ Admin seeding skipped (check MONGO_URI in .env)"
fi
cd ..

echo ""
echo "================================================"
echo "  ✓ Setup complete!"
echo ""
echo "  Next steps:"
echo "    1. Edit .env with your real credentials"
echo "    2. Run: ./web.sh"
echo "================================================"