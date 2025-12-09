"""
Lightweight GitHub Releases update checker for osu-sync.

Features:
- Fetch latest release metadata from GitHub.
- Compare with current package version.
- For Windows: download installer asset (*.exe) and launch it silently.
"""

from __future__ import annotations

import os
import platform
import subprocess
import tempfile
from dataclasses import dataclass
from importlib import metadata

import httpx
from packaging.version import Version

OWNER = "AkaakuHub"
REPO = "osu-sync"
RELEASES_API = f"https://api.github.com/repos/{OWNER}/{REPO}/releases/latest"


@dataclass
class UpdateInfo:
    current_version: str
    latest_version: str
    update_available: bool
    installer_url: str | None = None
    release_name: str | None = None


def get_current_version() -> str:
    try:
        return metadata.version("osu-sync")
    except metadata.PackageNotFoundError:
        return "0.0.0"


async def fetch_latest(timeout: float = 10.0) -> UpdateInfo:
    current = get_current_version()
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(RELEASES_API)
        resp.raise_for_status()
        data = resp.json()

    tag = data.get("tag_name") or data.get("name") or "0.0.0"
    latest = tag.lstrip("v")
    installer = None
    for asset in data.get("assets", []):
        name = asset.get("name") or ""
        if name.lower().endswith(".exe"):
            installer = asset.get("browser_download_url")
            break

    update_available = Version(latest) > Version(current)
    return UpdateInfo(
        current_version=current,
        latest_version=latest,
        update_available=update_available,
        installer_url=installer,
        release_name=data.get("name"),
    )


async def download_and_run_installer(url: str) -> str:
    """Download installer to temp file and run it. Returns path."""
    if platform.system() != "Windows":
        raise RuntimeError("Auto-update is only supported on Windows.")

    if not url:
        raise RuntimeError("Installer URL is empty.")

    fd, path = tempfile.mkstemp(suffix=".exe")
    os.close(fd)

    async with httpx.AsyncClient(timeout=None, follow_redirects=True) as client:
        async with client.stream("GET", url) as resp:
            resp.raise_for_status()
            with open(path, "wb") as f:
                async for chunk in resp.aiter_bytes():
                    f.write(chunk)

    # Launch installer silently; do not wait.
    log_path = path + ".log"
    creationflags = 0
    if platform.system() == "Windows":
        # Detach so it keeps running after parent exits
        creationflags = (
            subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
        )
    subprocess.Popen(
        [
            path,
            "/VERYSILENT",
            "/SUPPRESSMSGBOXES",
            "/NORESTART",
            "/CLOSEAPPLICATIONS",
            "/RESTARTAPPLICATIONS",
            "/FORCECLOSEAPPLICATIONS",
            "/NOCANCEL",
            f"/LOG={log_path}",
        ],
        close_fds=True,
        creationflags=creationflags,
    )
    return path
