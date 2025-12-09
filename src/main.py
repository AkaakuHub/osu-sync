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
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

import uvicorn
import webview

from api.main import create_app

LOADING_HTML = """
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      height: 100vh;
      display: grid;
      place-items: center;
      background: #0f172a;
      font-family: "Inter", system-ui, -apple-system, sans-serif;
      color: #e2e8f0;
    }
    .spinner {
      margin-top: 120px;
      width: 56px;
      height: 56px;
      border: 6px solid rgba(148, 163, 184, 0.35);
      border-top-color: #34d399;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      box-shadow: 0 0 16px rgba(52, 211, 153, 0.4);
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .label { margin-top: 14px; font-size: 13px; letter-spacing: 0.2px; color: #cbd5e1; }
  </style>
</head>
<body>
  <div class="spinner" aria-label="loading"></div>
  <div class="label">Launching osu-sync…</div>
</body>
</html>
"""


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


def pick_port(base: int = 18080, attempts: int = 40) -> int:
    """Pick an available TCP port, starting at base and incrementing."""
    for i in range(attempts):
        candidate = base + i
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", candidate))
                return candidate
            except OSError:
                continue
    # Fallback to OS-assigned ephemeral port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_uvicorn(
    app, host: str = "127.0.0.1", port: int | None = None
) -> tuple[threading.Thread, uvicorn.Server]:
    port = port or pick_port()
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


def start_proc(
    cmd: list[str], cwd: Path | None = None, env: dict[str, str] | None = None
) -> subprocess.Popen:
    creationflags = 0
    if os.name == "nt":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP
    return subprocess.Popen(cmd, cwd=cwd, creationflags=creationflags, env=env)


def ensure_stdio() -> None:
    if sys.stdout is not None and sys.stderr is not None:
        return
    devnull = open(os.devnull, "w")
    if sys.stdout is None:
        sys.stdout = devnull
    if sys.stderr is None:
        sys.stderr = devnull


def main() -> None:
    ensure_stdio()

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dev",
        action="store_true",
        help="start with uvicorn --reload and Vite dev server",
    )
    args = parser.parse_args()

    host = "127.0.0.1"
    port = pick_port()

    # Show loading screen immediately
    window = webview.create_window(
        "osu-sync", html=LOADING_HTML, width=1280, height=780
    )

    if args.dev:
        procs: list[subprocess.Popen] = []
        try:
            # Start uvicorn (reload) and Vite without blocking UI
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
            procs.append(start_proc(["pnpm", "dev"], cwd=resolve_dist_dir().parent))

            def _wait_and_load_dev() -> None:
                wait_for_server(host, port, timeout=15.0)
                time.sleep(1.0)  # small buffer for Vite bind
                window.load_url(f"http://127.0.0.1:5173/?api_port={port}")

            threading.Thread(target=_wait_and_load_dev, daemon=True).start()
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

    def _wait_and_load_prod() -> None:
        wait_for_server(host, port, timeout=15.0)
        window.load_url(f"http://{host}:{port}")

    threading.Thread(target=_wait_and_load_prod, daemon=True).start()
    webview.start(gui="edgechromium", debug=False)

    server.should_exit = True
    thread.join(timeout=5)


if __name__ == "__main__":
    main()
