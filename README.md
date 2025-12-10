# osu-sync

Something to manage your local osu! data.

## Download
Go to the [Releases](https://github.com/AkaakuHub/osu-sync/releases) page to download the latest version.

## Features
- Sync local osu! data with online search results for free
- Very fast download by selecting any mirror server

## Download mirrors
In the settings tab, set `download_url_template` like `https://api.nerinyan.moe/d/{set_id}`

- `{set_id}` will be replaced with the beatmap ID.
- Main mirror sites:
  - https://nerinyan.moe/main
  - https://beatconnect.io
  - https://catboy.best

## development

First, install dependencies:
```bash
uv sync
```

Then, start the development environment:
```bash
uv run python src/main.py --dev
```
