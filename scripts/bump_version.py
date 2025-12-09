#!/usr/bin/env python
"""
バージョン一括更新 & タグ付けツール

使い方:
  python scripts/bump_version.py 1.2.3           # 各所のバージョンを書き換え
  python scripts/bump_version.py 1.2.3 --tag     # 書き換え + git tag v1.2.3 を作成

更新対象:
- pyproject.toml          ([project].version)
- package.json            ("version")
- ui/package.json         ("version")
- installer/osu-sync.iss  (AppVersion)
"""

from __future__ import annotations

import argparse
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def update_file(path: Path, pattern: str, repl: str, *, flags=0) -> bool:
    text = path.read_text(encoding="utf-8")
    new_text, n = re.subn(pattern, repl, text, flags=flags | re.MULTILINE)
    if n == 0:
        raise ValueError(f"pattern not found in {path}")
    path.write_text(new_text, encoding="utf-8")
    return True


def update_versions(version: str) -> None:
    # pyproject.toml
    update_file(
        ROOT / "pyproject.toml",
        r'^(version\s*=\s*")([^"]+)(")$',
        r'\g<1>' + version + r'\g<3>',
    )

    # root package.json
    update_file(
        ROOT / "package.json",
        r'("version"\s*:\s*")[^"]+(")',
        r'\g<1>' + version + r'\g<2>',
    )

    # ui/package.json
    update_file(
        ROOT / "ui" / "package.json",
        r'("version"\s*:\s*")[^"]+(")',
        r'\g<1>' + version + r'\g<2>',
    )

    # installer/osu-sync.iss
    update_file(
        ROOT / "installer" / "osu-sync.iss",
        r"^(AppVersion=).*$",
        rf"\1{version}",
    )


def git_tag(version: str) -> None:
    tag = f"v{version}" if not version.startswith("v") else version
    subprocess.run(["git", "tag", tag], cwd=ROOT, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("version", help="セットする新しいバージョン (例: 0.1.3)")
    parser.add_argument(
        "--tag",
        action="store_true",
        help="バージョン更新後に git tag (v<version>) を作成する",
    )
    args = parser.parse_args()

    version = args.version.lstrip("v")
    if not re.match(r"^\d+\.\d+\.\d+$", version):
        raise SystemExit("バージョンは SemVer 形式 (x.y.z) で指定してください")

    update_versions(version)
    if args.tag:
        git_tag(version)

    print(f"Updated version to {version}")
    if args.tag:
        print(f"Created git tag v{version}")


if __name__ == "__main__":
    main()
