"""Unified entrypoint for dev/prod.

Production (default):
  - Starts uvicorn (FastAPI) in-process
  - Serves bundled ui/dist
  - Opens pywebview pointing at the local server

Development (--dev):
  - Spawns uvicorn --reload (factory) as a subprocess
  - Spawns Vite dev server (pnpm dev) as a subprocess
  - Opens pywebview pointing at http://127.0.0.1:5173
  - Cleans up child processes on exit
"""

import argparse
import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import List

import uvicorn
import webview

from api.main import create_app


def resolve_dist_dir() -> Path:
    """Locate bundled ui/dist for both dev and Nuitka onefile."""
    # When extracted by Nuitka onefile, __file__ points to the temp dir.
    base = Path(__file__).resolve().parent
    candidate = base / "ui" / "dist"
    if candidate.exists():
        return candidate

    # Fallback to repo layout when running from source.
    repo_root = base.parent
    alt = repo_root / "ui" / "dist"
    return alt


def start_uvicorn(app, host: str = "127.0.0.1", port: int = 8000) -> tuple[threading.Thread, uvicorn.Server]:
    config = uvicorn.Config(app, host=host, port=port, reload=False, log_level="info")
    server = uvicorn.Server(config)

    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    return thread, server


def wait_for_server(host: str, port: int, timeout: float = 10.0) -> None:
    """Simple TCP wait loop to ensure server is ready before opening webview."""
    import socket

    start = time.time()
    while time.time() - start < timeout:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1.0)
            if sock.connect_ex((host, port)) == 0:
                return
        time.sleep(0.2)
    # Time out silently; webview will show if server not ready, but this avoids long hang.


def start_proc(cmd: List[str], cwd: Path | None = None) -> subprocess.Popen:
    creationflags = 0
    if os.name == "nt":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP
    return subprocess.Popen(cmd, cwd=cwd, creationflags=creationflags)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dev", action="store_true", help="start with uvicorn --reload and Vite dev server")
    args = parser.parse_args()

    host = "127.0.0.1"
    port = 8000

    if args.dev:
        procs: list[subprocess.Popen] = []
        try:
            # 1) uvicorn --reload (factory)
            procs.append(
                start_proc(
                    [
                        sys.executable,
                        "-m",
                        "uvicorn",
                        "api.main:create_app",
                        "--factory",
                        "--reload",
                        "--host",
                        host,
                        "--port",
                        str(port),
                    ],
                    cwd=Path(__file__).resolve().parent,
                )
            )

            # 2) Vite dev server
            procs.append(start_proc(["pnpm", "dev"], cwd=resolve_dist_dir().parent))

            # 3) wait for servers
            wait_for_server(host, port, timeout=10.0)
            time.sleep(1.5)  # give Vite time to bind 5173

            # 4) launch webview pointing to Vite dev server
            webview.create_window("osu-sync (dev)", "http://127.0.0.1:5173", width=1280, height=780)
            webview.start(gui="edgechromium", debug=True)
        finally:
            for p in procs:
                if p.poll() is None:
                    p.terminate()
            for p in procs:
                try:
                    p.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    p.kill()
        return

    # Production path
    dist_dir = resolve_dist_dir()
    app = create_app(dist_dir=dist_dir)

    thread, server = start_uvicorn(app, host=host, port=port)
    wait_for_server(host, port, timeout=8.0)

    url = f"http://{host}:{port}"
    webview.create_window("osu-sync", url, width=1280, height=780)
    webview.start(gui="edgechromium", debug=False)

    # Request graceful shutdown
    server.should_exit = True
    thread.join(timeout=5)


if __name__ == "__main__":
    main()
