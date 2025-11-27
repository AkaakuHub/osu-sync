@echo off
echo Starting osu-sync development environment...
echo.

echo [1/3] Starting API server...
start "API Server" cmd /c "set PYTHONPATH=src && uvicorn src.api.main:app --reload"

echo [2/3] Starting frontend dev server...
cd ui
if not exist node_modules (
    echo Installing frontend dependencies...
    pnpm install
)
start "Frontend Dev Server" cmd /c "pnpm run dev"
cd ..

echo [3/3] Waiting for servers to start...
timeout /t 3 /nobreak >nul

echo Starting desktop webview...
uv run python src\main.py --dev

echo.
echo All servers stopped.