#!/usr/bin/env bash
set -e

# ── Navigate to project root ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Preflight ──
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Run ./setup.sh first."
  exit 1
fi

# ── Distribute env files ──
cp -f .env backend/.env 2>/dev/null || true
grep '^VITE_' .env > frontend/.env 2>/dev/null || true

# ── Read PORT from .env (default 5050) ──
BACKEND_PORT=$(grep -E '^PORT=' .env | head -1 | cut -d= -f2 | tr -d '[:space:]')
BACKEND_PORT=${BACKEND_PORT:-5050}
FRONTEND_PORT=5173

# ── Kill stale processes on the ports ──
kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Killing stale process on port $port..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"

# ── Cleanup on exit ──
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Shutting down NearHelp..."
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  # Kill any remaining child processes
  kill 0 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# ── Start Backend ──
echo "Starting backend on port $BACKEND_PORT..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "Waiting for backend..."
for i in $(seq 1 30); do
  if curl -s "http://localhost:$BACKEND_PORT" >/dev/null 2>&1; then
    echo "  ✓ Backend ready"
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "  ✗ Backend failed to start. Check logs above."
    exit 1
  fi
  sleep 1
done

# ── Start Frontend ──
echo "Starting frontend on port $FRONTEND_PORT..."
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

# Wait for Vite to be ready
sleep 3

echo ""
echo "================================================"
echo "  ✓ NearHelp is running!"
echo ""
echo "  Frontend:  http://localhost:$FRONTEND_PORT"
echo "  Backend:   http://localhost:$BACKEND_PORT"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "================================================"
echo ""

# Keep script alive until Ctrl+C
wait