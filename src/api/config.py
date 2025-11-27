import json
import os
from pathlib import Path
from typing import Dict, Optional


class SettingsStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def load(self) -> Dict:
        try:
            if self.path.exists():
                with open(self.path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except (OSError, json.JSONDecodeError):
            pass
        return {}

    def save(self, data: Dict) -> Dict:
        try:
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return data
        except OSError:
            return {}


class Settings:
    """
    まとめて使う環境設定。環境変数が優先され、無ければ設定ファイルの値を使う。
    """

    def __init__(self) -> None:
        settings_dir = Path(os.getenv("OSUSYNC_CONFIG_DIR", Path.home() / ".osu-sync"))
        self.store = SettingsStore(settings_dir / "settings.json")
        data = self.store.load()

        self.osu_client_id: Optional[int] = self._read_int("OSU_CLIENT_ID") or self._coerce_int(
            data.get("osu_client_id")
        )
        self.osu_client_secret: Optional[str] = os.getenv("OSU_CLIENT_SECRET") or data.get("osu_client_secret")

        # osu! の標準 Songs ディレクトリ（Windows を想定）。
        default_songs = os.path.expanduser("~/AppData/Local/osu!/Songs")
        self.songs_dir: str = os.getenv("OSU_SONGS_DIR", data.get("songs_dir", default_songs))

        # osu!.db のパス
        default_osu_db = os.path.expanduser("~/AppData/Local/osu!/osu!.db")
        self.osu_db_path: str = os.getenv("OSU_DB_PATH", data.get("osu_db_path", default_osu_db))

        # DLに使うミラー。公式DLにはクッキーが要るため、まずはBeatconnectを既定。
        self.download_url_template: str = os.getenv(
            "OSU_DOWNLOAD_URL_TEMPLATE", data.get("download_url_template", "https://beatconnect.io/b/{set_id}")
        )

        # 並列DL数／レート制限
        self.max_concurrency: int = int(os.getenv("OSU_DL_CONCURRENCY", data.get("max_concurrency", 3)))
        self.requests_per_minute: int = int(os.getenv("OSU_DL_RPM", data.get("requests_per_minute", 60)))

        # リスキャン対象拡張子
        self.scan_extensions = [".osu", ".osz"]

    def persist(self, payload: Dict[str, object]) -> None:
        """UI から更新された設定を保存し、インメモリ値も差し替える。"""
        self.__init__()  # reload values from file/env

    @staticmethod
    def _read_int(key: str) -> Optional[int]:
        value = os.getenv(key)
        return int(value) if value is not None and value.isdigit() else None

    @staticmethod
    def _coerce_int(value: object) -> Optional[int]:
        try:
            return int(value) if value is not None else None
        except (TypeError, ValueError):
            return None


settings = Settings()
