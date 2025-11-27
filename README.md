# osu-sync

ローカルの `Songs/` と osu! 検索結果を突き合わせ、未所持だけを一括DLするデスクトップアプリケーションです。

## ディレクトリ

- `src/` — 統合されたソースコード
  - `api/` — FastAPIルートとクライアント
  - `core/` — ダウンロード管理、スキャン等のコア機能
  - `ui/` — React + Vite + Tailwind v4 フロントエンド
  - `main.py` — 統合エントリーポイント（FastAPI + webview）

## 前提

- Python 3.11+
- Node.js 18+ (フロントエンド開発用)
- uv (推奨) または pip
- osu! API v2 クライアントID/シークレット（環境変数）
- osu! Songs ディレクトリ（デフォルト `~/AppData/Local/osu!/Songs`）

## 環境変数

```bash
OSU_CLIENT_ID=xxxx
OSU_CLIENT_SECRET=xxxx
OSU_SONGS_DIR=C:\path\to\osu!\Songs   # 任意
OSU_DOWNLOAD_URL_TEMPLATE=https://beatconnect.io/b/{set_id}  # 任意ミラー
OSU_DL_CONCURRENCY=3
OSU_DL_RPM=60
```

## セットアップ & 起動

### uvを使用する場合（推奨）

```bash
# 依存関係インストール
uv sync
```

### venvを使用する場合

```bash
# Python仮想環境作成と有効化
python -m venv .venv
.venv\Scripts\activate  # Windows
# .venv/bin/activate  # Linux/Mac

# 依存関係インストール
pip install -e .
```

### 開発モード（3つのターミナルで実行）

```bash
# ターミナル1: APIサーバー
export PYTHONPATH=src  # Linux/Mac
# set PYTHONPATH=src    # Windows
uvicorn src.api.main:app --reload

# ターミナル2: フロントエンド開発サーバー
cd src/ui
npm install
npm run dev

# ターミナル3: デスクトップwebview
uv run python src/main.py --dev
```

### 本番モード（2つのターミナルで実行）

```bash
# ターミナル1: フロントエンドビルド
cd src/ui
npm run build

# ターミナル2: APIサーバー + webview
export PYTHONPATH=src  # Linux/Mac
# set PYTHONPATH=src    # Windows
uv run python src/main.py
```

### APIサーバーのみ（テスト用）

```bash
# APIサーバー単体起動
export PYTHONPATH=src  # Linux/Mac
# set PYTHONPATH=src    # Windows
uvicorn src.api.main:app --reload

# APIは http://127.0.0.1:8000 で実行
```

## 主なAPI

- `GET /health` — 生存確認
- `GET /local/index` — 所持セット概要
- `POST /local/rescan` — Songs 再スキャン
- `GET /search?q=...&page=1&limit=20` — osu!検索（ownedフラグ付き）
- `POST /search/filter` — 先人の FilterRequest 互換で検索
- `POST /download` `{ "set_ids": [123, 456] }` — 未所持のみキューへ
- `GET /queue` — DLキュー状態

## 実装メモ

- `.osu` を行パースして BeatmapSetID/Artist/Title/Creator を抽出。`.osz` はファイル名先頭の数値でセットID推定。
- DLは `OSU_DOWNLOAD_URL_TEMPLATE` をテンプレ化（既定: Beatconnect）。`.part` → rename で保存。既存はスキップ。
- osu! client_credentials を素の HTTP で取得し /api/v2/beatmapsets/search を叩く（外部ラッパ未使用）。

## 次にやると良いこと

- 公式DL or Nerinyan/Chimu など複数ミラー切替と健全性チェック
- DL完了後の自動リスキャンや SQLite キャッシュ
- UI: ソート/フィルタ強化、進捗バー、設定画面
