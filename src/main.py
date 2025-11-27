import os
import sys
from pathlib import Path

import webview

from api.main import create_app


def main():
    """webviewデスクトップアプリのエントリーポイント"""
    dev_mode = "--dev" in sys.argv or os.getenv("OSUSYNC_DEV") == "1"

    # FastAPIアプリケーションを作成
    app = create_app()

    if dev_mode:
        # 開発モード: フロントエンド開発サーバーを表示
        print("Starting development mode...")
        print("Frontend dev server should be running at http://127.0.0.1:5173")
        print("API server should be running at http://127.0.0.1:8000")
        url = "http://127.0.0.1:5173"
    else:
        # 本番モード: 静的ファイルを配信するFastAPIを表示
        print("Starting production mode...")
        url = "http://127.0.0.1:8000"

    # webviewでアプリケーションを表示
    webview.create_window(
        "osu-sync",
        url,
        width=1280,
        height=780
    )
    webview.start(gui="edgechromium", debug=dev_mode)


if __name__ == "__main__":
    main()