#!/bin/bash

echo "Starting osu-sync development environment..."
echo

echo "[1/3] Starting API server..."
osascript -e 'tell app "Terminal" to do script "set PYTHONPATH=src && uvicorn src.api.main:app --reload; exec bash"' &

echo "[2/3] Starting frontend dev server..."
cd ui
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    pnpm install
fi
osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"' && pnpm run dev; exec bash"' &
cd ..

echo "[3/3] Waiting for servers to start..."
sleep 3

echo "Starting desktop webview..."
uv run python src/main.py --dev

echo
echo "All servers stopped."