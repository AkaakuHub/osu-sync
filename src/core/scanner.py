import asyncio
import os
import re
from pathlib import Path
from types import SimpleNamespace

from kaitaistruct import KaitaiStream

from core.index_cache import OsuDbIndexCache, OszIndexCache
from osu_db_construct.osu_db import OsuDb


class SongIndex:
    """
    osu!.dbから直接楽曲情報を読み取るインデックス。
    """

    def __init__(
        self,
        osu_db_path: str | None = None,
        songs_dir: str | None = None,
        cache_path: Path | None = None,
        event_bus=None,
    ) -> None:
        self.osu_db_path = osu_db_path
        self.songs_dir = Path(songs_dir) if songs_dir else None
        self._cache = OsuDbIndexCache(cache_path) if cache_path else None
        self._osz_cache = (
            OszIndexCache(cache_path.with_name("osz-index.json"))
            if cache_path
            else None
        )
        self._owned: set[int] = set()
        self._metadata: dict[
            int, tuple[int, str, str, str]
        ] = {}  # (set_id, artist, title, creator)
        self._state_lock = asyncio.Lock()
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

    @property
    def owned_set_ids(self) -> set[int]:
        return self._owned

    @property
    def metadata(self) -> dict[int, tuple[int, str, str, str]]:
        return self._metadata

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
        osu_owned, osu_metadata = set(), {}
        osz_owned, osz_metadata = set(), {}

        try:
            # 1. osu!.dbから読み込み
            if self.osu_db_path and Path(self.osu_db_path).exists():
                try:
                    osu_owned, osu_metadata = await asyncio.to_thread(
                        self._read_osu_db_sync
                    )
                except Exception as e:
                    print(f"Error parsing osu!.db: {e}")
            else:
                print(f"osu!.db not found at {self.osu_db_path}, using .osz files only")

            # 2. .oszファイルから読み込み
            try:
                osz_owned, osz_metadata = await self._scan_osz_fast()
            except Exception as e:
                print(f"Error scanning .osz files: {e}")

            # 3. マージ (osu!.dbのメタデータを優先)
            async with self._state_lock:
                self._owned = osu_owned.union(osz_owned, self._marked_during_scan)
                # osu!.dbのメタデータを優先し、.oszで補完
                self._metadata = {**osz_metadata, **osu_metadata}
                self._metadata.update(
                    (set_id, details)
                    for set_id, details in self._marked_during_scan.items()
                    if details is not None
                )
                self._marked_during_scan.clear()

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
                }
            )
        except Exception as exc:
            await self._emit_scan_event({"status": "error", "error_message": str(exc)})
            raise

    def _read_osu_db_sync(
        self,
    ) -> tuple[set[int], dict[int, tuple[int, str, str, str]]]:
        source = Path(self.osu_db_path)
        if self._cache:
            cached = self._cache.load(source)
            if cached is not None:
                return cached
        owned, metadata = self._parse_osu_db_sync()
        if self._cache:
            self._cache.save(source, metadata)
        return owned, metadata

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

    async def _scan_osz_fast(
        self,
    ) -> tuple[set[int], dict[int, tuple[int, str, str, str]]]:
        if not self.songs_dir or not self.songs_dir.exists():
            print(f"Songs directory not found at {self.songs_dir}")
            return set(), {}

        return await asyncio.to_thread(self._scan_osz_sync)

    def _scan_osz_sync(
        self,
    ) -> tuple[set[int], dict[int, tuple[int, str, str, str]]]:
        """同期版.oszスキャン"""
        songs_dir = self.songs_dir
        if self._osz_cache:
            cached = self._osz_cache.load(songs_dir)
            if cached is not None:
                return cached

        owned: set[int] = set()
        metadata: dict[int, tuple[int, str, str, str]] = {}
        directories: dict[str, int] = {}
        for directory, _, filenames in os.walk(songs_dir):
            path = Path(directory)
            directories[str(path.relative_to(songs_dir))] = path.stat().st_mtime_ns
            for filename in filenames:
                if not filename.lower().endswith(".osz"):
                    continue
                match = re.match(r"^(\d+)", filename)
                if not match:
                    continue
                set_id = int(match.group(1))
                if set_id <= 0:
                    continue

                owned.add(set_id)
                if set_id not in metadata:
                    artist, title = self._extract_metadata_from_filename(filename)
                    metadata[set_id] = (set_id, artist, title, "")

        if self._osz_cache:
            self._osz_cache.save(songs_dir, directories, metadata)

        print(f"Found {len(owned)} unique sets from .osz files")
        return owned, metadata

    def _extract_metadata_from_filename(self, filename: str) -> tuple[str, str]:
        """ファイル名からアーティストとタイトルを抽出"""
        # "123456 Artist - Title.osz" → ("Artist", "Title")
        if filename.endswith(".osz"):
            filename = filename[:-4]  # .oszを削除

        # 最初の数字部分を削除
        filename = re.sub(r"^\d+\s*", "", filename, count=1)

        # " - " で分割
        if " - " in filename:
            parts = filename.split(" - ", 1)
            if len(parts) == 2:
                artist = parts[0].strip()
                title = parts[1].strip()
                return artist, title

        # 分割できない場合は全体をタイトルとして扱う
        return "", filename.strip()

    async def force_refresh_sync(self) -> None:
        """同期で強制リフレッシュ"""
        await self.refresh()

    def owned(self, set_id: int) -> bool:
        return set_id in self._owned

    def summary(self) -> dict[str, int]:
        return {
            "owned_sets": len(self._owned),
            "with_metadata": len(self._metadata),
            "songs_dir_exists": int(self.songs_dir and self.songs_dir.exists()),
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
        if metadata:
            self._metadata[set_id] = metadata
        if self._scanning:
            self._marked_during_scan[set_id] = metadata

    async def _emit_scan_event(self, payload: dict[str, object]) -> None:
        """Push scan status to SSE subscribers."""
        self._scan_status.update(payload)
        if not self._event_bus:
            return
        try:
            await self._event_bus.publish({"topic": "scan", "data": payload})
        except Exception as exc:
            print(f"Scan event publish failed: {exc}")
