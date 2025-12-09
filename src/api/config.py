import json
import os
from pathlib import Path


class SettingsStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def load(self) -> dict:
        try:
            if self.path.exists():
                with open(self.path, encoding="utf-8") as f:
                    return json.load(f)
        except (OSError, json.JSONDecodeError):
            pass
        return {}

    def save(self, data: dict) -> dict:
        try:
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return data
        except OSError:
            return {}


class Settings:
    """
    まとめて使う環境設定。環境変数が優先され、無ければ設定ファイルの値を使う。
    初回起動時は設定ファイルを defaults で初期化する。
    """

    def __init__(self) -> None:
        # デフォルトの設定ディレクトリを XDG 準拠 (~/.config/osu-sync) に変更
        settings_dir = Path(
            os.getenv(
                "OSUSYNC_CONFIG_DIR",
                Path(os.getenv("XDG_CONFIG_HOME", Path.home() / ".config"))
                / "osu-sync",
            )
        )
        self.store = SettingsStore(settings_dir / "settings.json")

        defaults = {
            "osu_client_id": None,
            "osu_client_secret": None,
            "songs_dir": os.path.expanduser("~/AppData/Local/osu!/Songs"),
            "osu_db_path": os.path.expanduser("~/AppData/Local/osu!/osu!.db"),
            # 公式DLはクッキーが必要なため、デフォルトミラーを nerinyan に
            "download_url_template": "https://api.nerinyan.moe/d/{set_id}",
            "max_concurrency": 3,
            "requests_per_minute": 60,
            "player_volume": 0.7,
        }

        file_existed = self.store.path.exists()
        data = self.store.load()

        # 初回起動またはキー不足時に defaults で埋めて保存
        updated = False
        for key, value in defaults.items():
            if key not in data:
                data[key] = value
                updated = True
        if not file_existed or updated:
            data = self.store.save(data)

        self.osu_client_id: int | None = self._read_int(
            "OSU_CLIENT_ID"
        ) or self._coerce_int(data.get("osu_client_id"))
        self.osu_client_secret: str | None = os.getenv("OSU_CLIENT_SECRET") or data.get(
            "osu_client_secret"
        )

        self.songs_dir: str = os.getenv("OSU_SONGS_DIR", data.get("songs_dir"))
        self.osu_db_path: str = os.getenv("OSU_DB_PATH", data.get("osu_db_path"))

        self.download_url_template: str = os.getenv(
            "OSU_DOWNLOAD_URL_TEMPLATE", data.get("download_url_template")
        )

        self.max_concurrency: int = int(
            os.getenv("OSU_DL_CONCURRENCY", data.get("max_concurrency"))
        )
        self.requests_per_minute: int = int(
            os.getenv("OSU_DL_RPM", data.get("requests_per_minute"))
        )

        self.player_volume: float = float(
            os.getenv("OSU_PLAYER_VOLUME", data.get("player_volume"))
        )

        # リスキャン対象拡張子
        self.scan_extensions = [".osu", ".osz"]

    def persist(self, payload: dict[str, object]) -> None:
        """UI から更新された設定を保存し、インメモリ値も差し替える。"""
        # 現在の設定ファイルを読み込む
        current_data = self.store.load()

        # payloadの値で現在の設定を更新
        current_data.update(payload)

        # 更新した設定を保存
        self.store.save(current_data)

        # 設定を再読み込みしてインメモリ値を更新
        self.__init__()  # reload values from file/env

    @staticmethod
    def _read_int(key: str) -> int | None:
        value = os.getenv(key)
        return int(value) if value is not None and value.isdigit() else None

    @staticmethod
    def _coerce_int(value: object) -> int | None:
        try:
            return int(value) if value is not None else None
        except (TypeError, ValueError):
            return None


settings = Settings()
