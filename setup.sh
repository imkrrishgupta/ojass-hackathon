#!/usr/bin/env bash
set -e   # stop if any error

echo "🚀 Starting Near Help project setup..."
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Install backend dependencies
if [ -d "backend" ]; then
  echo "📦 Installing backend dependencies..."
  cd backend
  npm install
  cd ..
  echo "✅ Backend dependencies installed"
  echo ""
else
  echo "⚠️  Backend directory not found"
fi

# 2. Install frontend dependencies
if [ -d "frontend" ]; then
  echo "📦 Installing frontend dependencies..."
  cd frontend
  npm install
  cd ..
  echo "✅ Frontend dependencies installed"
  echo ""
else
  echo "⚠️  Frontend directory not found"
fi

# 3. Create environment file if not exists
echo "⚙️  Setting up environment variables..."
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "⚠️  Please update .env file with your actual configuration values"
  else
    echo "⚠️  No .env.example found"
  fi
else
  echo "✅ .env file already exists"
fi
echo ""

# 4. Check for MongoDB (optional)
echo "🔍 Checking for MongoDB..."
if command -v mongod &> /dev/null; then
  echo "✅ MongoDB is installed"
else
  echo "⚠️  MongoDB not found. Install it from: https://www.mongodb.com/try/download/community"
  echo "   Or use MongoDB Atlas (cloud): https://www.mongodb.com/atlas"
fi
echo ""

# 5. Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Update your .env file with actual configuration values"
echo "2. Make sure MongoDB is running (or configure MongoDB Atlas URI)"
echo "3. Run './web.sh' to start the development servers"
echo ""