#!/bin/bash

# Get the absolute path of the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting osu-sync development environment..."
echo

echo "[1/3] Starting API server..."
osascript -e "tell app \"Terminal\" to do script \"cd '$SCRIPT_DIR' && PYTHONPATH=src uv run python -m uvicorn src.api.main:app --reload; exec bash\"" &

echo "[2/3] Starting frontend dev server..."
cd "$SCRIPT_DIR/ui"
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    pnpm install
fi
osascript -e "tell app \"Terminal\" to do script \"cd '$(pwd)' && pnpm run dev; exec bash\"" &
cd "$SCRIPT_DIR"

echo "[3/3] Waiting for servers to start..."
sleep 3

echo "Starting desktop webview..."
cd "$SCRIPT_DIR"
uv run python src/main.py --dev

echo
echo "All servers stopped."