import asyncio
import os
from pathlib import Path
from typing import Dict, Optional, Set, Tuple

from core.database import SongDatabase, Metadata


class SongIndex:
    """
    Songs/ 以下を走査して BeatmapSetID セットと簡易メタデータを保持する。
    """

    def __init__(self, songs_dir: str, scan_extensions: Optional[Set[str]] = None,
                 db_path: Optional[Path] = None) -> None:
        self.songs_dir = Path(songs_dir)
        self.scan_extensions: Set[str] = scan_extensions or {".osu", ".osz"}
        self._owned: Set[int] = set()
        self._metadata: Dict[int, Metadata] = {}
        # 保持時間の長い処理をイベントループから切り離しつつ、
        # メモリ上の状態更新だけを短時間ロックで守る。
        self._state_lock = asyncio.Lock()
        self.db = SongDatabase(db_path or Path(songs_dir).parent / ".osu-sync" / "songs.db")
        self._scan_task: Optional[asyncio.Task] = None
        self._scanning = False

    @property
    def owned_set_ids(self) -> Set[int]:
        return self._owned

    @property
    def metadata(self) -> Dict[int, Metadata]:
        return self._metadata

    async def refresh(self) -> None:
        """
        Songs ディレクトリをフルスキャンしてインデックスを差し替える。
        """
        # まずDBから既存データを読み込み
        await self._load_from_db()

        # バックグラウンドスキャンを開始
        await self._start_background_scan()

    async def _load_from_db(self) -> None:
        """DBからインデックスデータを読み込む"""
        metadata = self.db.get_all_songs()
        owned = set(metadata.keys())
        async with self._state_lock:
            self._metadata = metadata
            self._owned = owned

    async def _start_background_scan(self) -> None:
        """バックグラウンドでスキャンを開始"""
        # 既に進行中なら新しいスキャンは開始しない
        if self._scan_task and not self._scan_task.done():
            return

        self._scan_task = asyncio.create_task(self._background_scan())

    async def _background_scan(self) -> None:
        """バックグラウンドスキャン処理"""
        try:
            # フラグ更新のみ短時間ロックで守る
            async with self._state_lock:
                if self._scanning:
                    return
                self._scanning = True

            owned, metadata = await asyncio.to_thread(self._run_scan_sync)

            # スキャン結果をメモリへ反映（ここだけロックする）
            async with self._state_lock:
                self._owned = owned
                self._metadata = metadata
        except Exception as e:
            self.db.set_scan_error(str(e))
            print(f"Scan error: {e}")
        finally:
            async with self._state_lock:
                self._scanning = False

    def _run_scan_sync(self) -> Tuple[Set[int], Dict[int, Metadata]]:
        """
        同期IOで実施するスキャン本体。
        asyncio.to_thread() で別スレッド実行する前提。
        """
        if not self.songs_dir.exists():
            self.songs_dir.mkdir(parents=True, exist_ok=True)

        # まず全ファイルを収集
        all_files = []
        for root, _, files in os.walk(self.songs_dir):
            for name in files:
                suffix = Path(name).suffix.lower()
                if suffix not in self.scan_extensions:
                    continue
                full_path = Path(root) / name
                all_files.append(full_path)

        self.db.start_scan(len(all_files))

        owned: Set[int] = set()
        metadata: Dict[int, Metadata] = {}
        valid_paths: list[str] = []

        # ファイルを処理（ブロッキングIOなので別スレッドで実行する）
        for i, full_path in enumerate(all_files):
            try:
                suffix = full_path.suffix.lower()
                valid_paths.append(str(full_path))

                # 進捗更新
                if i % 10 == 0:  # 10ファイルごとに進捗更新
                    self.db.update_scan_progress(i, str(full_path))

                if suffix == ".osz":
                    # .osz はセットIDをファイル名から推測するだけに留める
                    set_id = self._extract_set_id_from_name(full_path.name)
                    if set_id:
                        owned.add(set_id)
                        # .oszの場合はファイル情報のみDBに保存
                        stat = full_path.stat()
                        self.db.upsert_song(set_id, "", "", "",
                                          str(full_path), stat.st_size, stat.st_mtime)
                    continue

                if suffix == ".osu":
                    parsed = self._parse_osu_file(full_path)
                    if parsed:
                        set_id, artist, title, creator = parsed
                        owned.add(set_id)
                        metadata[set_id] = (set_id, artist, title, creator)

                        # DBに保存
                        stat = full_path.stat()
                        self.db.upsert_song(set_id, artist, title, creator,
                                          str(full_path), stat.st_size, stat.st_mtime)

            except Exception as e:
                print(f"Error processing file {full_path}: {e}")
                continue

        if valid_paths:
            deleted_count = self.db.delete_songs_not_in_paths(valid_paths)
        else:
            deleted_count = self.db.delete_all_songs()
        print(f"Deleted {deleted_count} stale entries from database")

        # 進捗完了
        self.db.update_scan_progress(len(all_files))
        self.db.complete_scan()

        return owned, metadata

    async def force_refresh_sync(self) -> None:
        """同期で強制リフレッシュ（テスト用）"""
        await self._load_from_db()
        # バックグラウンドスキャンが完了するまで待つ
        if self._scanning and self._scan_task:
            await self._scan_task

    def _extract_set_id_from_name(self, filename: str) -> Optional[int]:
        """
        例: \"123456 Artist - Title.osz\" から 123456 を拾う簡易実装。
        """
        head = filename.split(" ")[0]
        if head.isdigit():
            return int(head)
        return None

    def _parse_osu_file(self, path: Path) -> Optional[Metadata]:
        """
        .osu の [Metadata] セクションを行パースして最小限の情報を取り出す。
        失敗しても例外を投げず None を返す。
        """
        try:
            with path.open("r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except OSError:
            return None

        in_meta = False
        artist = title = creator = ""
        set_id: Optional[int] = None
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            if stripped.startswith("[") and stripped.endswith("]"):
                in_meta = stripped.lower() == "[metadata]"
                continue
            if not in_meta:
                continue
            if ":" not in stripped:
                continue
            key, value = stripped.split(":", 1)
            key = key.strip().lower()
            value = value.strip()
            if key == "beatmapsetid" and value.isdigit():
                set_id = int(value)
            elif key in ("artistunicode", "artist") and not artist:
                artist = value
            elif key in ("titleunicode", "title") and not title:
                title = value
            elif key == "creator":
                creator = value

            # 最低限揃ったら早期終了
            if set_id and artist and title and creator:
                break

        if set_id:
            return set_id, artist, title, creator
        return None

    def owned(self, set_id: int) -> bool:
        return set_id in self._owned

    def summary(self) -> Dict[str, int]:
        return {
            "owned_sets": len(self._owned),
            "with_metadata": len(self._metadata),
            "songs_dir_exists": int(self.songs_dir.exists()),
        }

    def get_scan_status(self) -> Dict[str, any]:
        """現在のスキャン状態を取得"""
        return self.db.get_scan_status()

    def mark_owned(self, set_id: int, metadata: Optional[Metadata] = None) -> None:
        """
        ダウンロード完了直後に所有セットを即時反映。
        """
        self._owned.add(set_id)
        if metadata:
            self._metadata[set_id] = metadata
            # DBにも保存
            if len(metadata) >= 4:
                _, artist, title, creator = metadata
                self.db.upsert_song(set_id, artist, title, creator, "", 0, 0)
