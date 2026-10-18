# osu-sync

Something to manage your local osu! data.

## Download
Go to the [Releases](https://github.com/AkaakuHub/osu-sync/releases) page to download the latest version.

## Features
- Sync local osu! data with online search results for free
- Very fast download by selecting any mirror server

## Download mirrors
Choose a mirror in Settings, or enter a custom `download_url_template`.

- `{set_id}` will be replaced with the beatmapset ID.
- Presets, ordered by a download of beatmapset 2559785 on October 18, 2026 (speed depends on your connection):
  1. [osu.direct](https://osu.direct/api/d/2559785) — 1.98 s
  2. [hinai](https://mirror.hinamizawa.ai/docs/beatmap-download) — 2.89 s

## development

First, install dependencies for python:
```bash
uv sync
```

and for frontend:
```bash
cd ui
pnpm install
```

Then, start the development environment:
```bash
uv run python src/main.py --dev
```
