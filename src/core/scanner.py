import asyncio
import os
import re
from pathlib import Path
from types import SimpleNamespace
from typing import Protocol

from kaitaistruct import KaitaiStream

from core.index_cache import SongIndexStore
from osu_db_construct.osu_db import OsuDb


class ScanEventPublisher(Protocol):
    async def publish(self, event: dict[str, object]) -> None: ...


class SongIndex:
    """
    osu!.dbから直接楽曲情報を読み取るインデックス。
    """

    def __init__(
        self,
        osu_db_path: str,
        songs_dir: str,
        cache_path: Path,
        event_bus: ScanEventPublisher,
    ) -> None:
        self.osu_db_path = osu_db_path
        self.songs_dir = Path(songs_dir)
        self._cache = SongIndexStore(cache_path)
        self._owned: set[int] = set()
        self._db_owned: set[int] = set()
        self._archive_owned: set[int] = set()
        self._metadata: dict[
            int, tuple[int, str, str, str]
        ] = {}  # (set_id, artist, title, creator)
        self._scan_lock = asyncio.Lock()
        self._scanning = False
        self._scan_status: dict[str, object] = {
            "status": "idle",
            "total_files": 0,
            "processed_files": 0,
            "current_file": None,
            "started_at": None,
            "completed_at": None,
            "error_message": None,
            "updated_at": None,
        }
        self._marked_during_scan: dict[int, tuple[int, str, str, str] | None] = {}
        self._event_bus = event_bus

    def metadata_for(self, set_id: int) -> tuple[int, str, str, str] | None:
        cached = self._metadata.get(set_id)
        if cached is not None:
            return cached
        if set_id in self._db_owned:
            metadata = self._cache.song_metadata(set_id)
            if metadata is not None:
                self._metadata[set_id] = metadata
                return metadata
        if set_id in self._archive_owned:
            metadata = self._cache.archive_metadata(self.songs_dir, set_id)
            if metadata is not None:
                self._metadata[set_id] = metadata
                return metadata
        return None

    async def refresh(self) -> None:
        async with self._scan_lock:
            self._scanning = True
            await self._emit_scan_event(
                {
                    "status": "scanning",
                    "total_files": 0,
                    "processed_files": 0,
                    "current_file": "osu!.db",
                    "started_at": None,
                    "completed_at": None,
                    "error_message": None,
                    "updated_at": None,
                }
            )
            try:
                await self._load_hybrid()
            finally:
                self._scanning = False

    async def _load_hybrid(self) -> None:
        osu_owned: set[int] = set()
        osz_owned: set[int] = set()

        try:
            # 1. osu!.dbから読み込み
            if Path(self.osu_db_path).exists():
                try:
                    osu_owned = await asyncio.to_thread(self._read_osu_db_sync)
                except Exception as e:
                    print(f"Error parsing osu!.db: {e}")
            else:
                print(f"osu!.db not found at {self.osu_db_path}, using .osz files only")

            # 2. .oszファイルから読み込み
            try:
                osz_owned = await self._load_archives()
            except Exception as e:
                print(f"Error scanning .osz files: {e}")

            previous_owned = self._owned
            self._db_owned = osu_owned
            self._archive_owned = osz_owned.union(self._marked_during_scan)
            self._owned = osu_owned.union(osz_owned, self._marked_during_scan)
            self._metadata = {}
            self._metadata.update(
                (set_id, details)
                for set_id, details in self._marked_during_scan.items()
                if details is not None
            )
            marked = self._marked_during_scan.copy()
            self._marked_during_scan.clear()

            for set_id, details in marked.items():
                self._cache.add_archive(self.songs_dir, set_id, details)

            print(
                f"Hybrid scan complete: {len(self._owned)} sets total "
                f"(osu!.db: {len(osu_owned)}, .osz: {len(osz_owned)})"
            )
            await self._emit_scan_event(
                {
                    "status": "completed",
                    "owned_sets": len(self._owned),
                    "osu_db_sets": len(osu_owned),
                    "osz_sets": len(osz_owned),
                    "total_files": len(self._owned),
                    "processed_files": len(self._owned),
                    "current_file": None,
                    "started_at": None,
                    "completed_at": None,
                    "error_message": None,
                    "updated_at": None,
                },
                publish=self._owned != previous_owned,
            )
        except Exception as exc:
            await self._emit_scan_event({"status": "error", "error_message": str(exc)})
            raise

    def _read_osu_db_sync(
        self,
    ) -> set[int]:
        source = Path(self.osu_db_path)
        cached = self._cache.load_songs(source)
        if cached is not None:
            return cached
        signature = self._cache.source_signature(source)
        owned, metadata = self._parse_osu_db_sync()
        self._cache.save_songs(source, signature, metadata)
        return owned

    def _parse_osu_db_sync(
        self,
    ) -> tuple[set[int], dict[int, tuple[int, str, str, str]]]:
        """同期でosu!.dbを解析"""
        owned: set[int] = set()
        metadata: dict[int, tuple[int, str, str, str]] = {}

        try:
            with open(self.osu_db_path, "rb") as f:
                stream = KaitaiStream(f)
                version = stream.read_u4le()
                stream.read_u4le()
                stream.read_u1()
                stream.read_u8le()
                OsuDb.String(stream)
                beatmap_count = stream.read_u4le()
                root = SimpleNamespace(osu_version=version)

                for _ in range(beatmap_count):
                    beatmap = OsuDb.Beatmap(stream, _root=root)
                    # folder_nameからbeatmapset_idを抽出
                    # 例: "539007 $44,000 - PISSCORD" → 539007
                    folder_name = getattr(beatmap.folder_name, "value", "")

                    if not folder_name:
                        continue

                    # フォルダ名の先頭の数字をbeatmapset_idとして使用
                    match = re.match(r"^(\d+)", folder_name)
                    if not match:
                        continue

                    set_id = int(match.group(1))
                    if set_id <= 0:
                        continue

                    owned.add(set_id)

                    # メタデータを整形 (Unicode版を優先)
                    def get_string_value(s):
                        return getattr(s, "value", "")

                    artist = get_string_value(
                        beatmap.artist_name_unicode
                    ) or get_string_value(beatmap.artist_name)
                    title = get_string_value(
                        beatmap.song_title_unicode
                    ) or get_string_value(beatmap.song_title)
                    creator = get_string_value(beatmap.creator_name)

                    if set_id not in metadata:
                        metadata[set_id] = (set_id, artist, title, creator)

        except Exception as e:
            print(f"Error reading osu!.db: {e}")
            raise

        return owned, metadata

    async def _load_archives(self) -> set[int]:
        if not self.songs_dir.is_dir():
            print(f"Songs directory not found at {self.songs_dir}")
            return set()

        return await asyncio.to_thread(self._scan_osz_sync)

    def _scan_osz_sync(
        self,
    ) -> set[int]:
        songs_dir = self.songs_dir
        mtime_ns = songs_dir.stat().st_mtime_ns
        cached = self._cache.load_archives(songs_dir)
        if cached is not None:
            return cached

        owned: set[int] = set()
        metadata: dict[int, tuple[int, str, str, str]] = {}
        mtime_ns = songs_dir.stat().st_mtime_ns
        with os.scandir(songs_dir) as entries:
            for entry in entries:
                filename = entry.name
                if not filename.lower().endswith(".osz"):
                    continue
                if not entry.is_file(follow_symlinks=False):
                    continue
                match = re.match(r"^\(?(\d+)\)?", filename)
                if not match:
                    continue
                set_id = int(match.group(1))
                if set_id <= 0:
                    continue

                owned.add(set_id)
                if set_id not in metadata:
                    artist, title = self._extract_metadata_from_filename(filename)
                    metadata[set_id] = (set_id, artist, title, "")

        self._cache.save_archives(songs_dir, mtime_ns, metadata)

        print(f"Found {len(owned)} unique sets from .osz files")
        current = self._cache.load_archives(songs_dir)
        return current if current is not None else owned

    def _extract_metadata_from_filename(self, filename: str) -> tuple[str, str]:
        """ファイル名からアーティストとタイトルを抽出"""
        # "123456 Artist - Title.osz" → ("Artist", "Title")
        if filename.lower().endswith(".osz"):
            filename = filename[:-4]  # .oszを削除

        # 最初の数字部分を削除
        filename = re.sub(r"^\(?(\d+)\)?\s*", "", filename, count=1)

        # " - " で分割
        if " - " in filename:
            artist, title = filename.split(" - ", 1)
            return artist.strip(), title.strip()

        # 分割できない場合は全体をタイトルとして扱う
        return "", filename.strip()

    def owned(self, set_id: int) -> bool:
        return set_id in self._owned

    def summary(self) -> dict[str, int]:
        return {
            "owned_sets": len(self._owned),
            "songs_dir_exists": int(self.songs_dir.exists()),
        }

    def get_scan_status(self) -> dict[str, object]:
        return self._scan_status.copy()

    def mark_owned(
        self, set_id: int, metadata: tuple[int, str, str, str] | None = None
    ) -> None:
        """
        ダウンロード完了直後に所有セットを即時反映。
        """
        self._owned.add(set_id)
        self._archive_owned.add(set_id)
        if metadata:
            self._metadata[set_id] = metadata
        self._cache.add_archive(self.songs_dir, set_id, metadata)
        if self._scanning:
            self._marked_during_scan[set_id] = metadata

    async def _emit_scan_event(
        self, payload: dict[str, object], publish: bool = True
    ) -> None:
        """Push scan status to SSE subscribers."""
        self._scan_status.update(payload)
        if not publish:
            return
        try:
            await self._event_bus.publish({"topic": "scan", "data": payload})
        except Exception as exc:
            print(f"Scan event publish failed: {exc}")
