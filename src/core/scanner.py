import asyncio
import re
from pathlib import Path
from typing import Dict, Optional, Set, Tuple

from osu_db_construct.osu_db import OsuDb
from kaitaistruct import KaitaiStream


class SongIndex:
    """
    osu!.dbから直接楽曲情報を読み取るインデックス。
    """

    def __init__(
        self,
        osu_db_path: Optional[str] = None,
        songs_dir: Optional[str] = None,
        event_bus=None,
    ) -> None:
        self.osu_db_path = osu_db_path
        self.songs_dir = Path(songs_dir) if songs_dir else None
        self._owned: Set[int] = set()
        self._metadata: Dict[int, Tuple[int, str, str, str]] = {}  # (set_id, artist, title, creator)
        self._state_lock = asyncio.Lock()
        self._scan_task: Optional[asyncio.Task] = None
        self._scanning = False
        self._event_bus = event_bus

    @property
    def owned_set_ids(self) -> Set[int]:
        return self._owned

    @property
    def metadata(self) -> Dict[int, Tuple[int, str, str, str]]:
        return self._metadata

    async def refresh(self) -> None:
        """
        osu!.db + .oszファイルから楽曲情報をハイブリッドで読み込む。
        """
        await self._load_hybrid()

    async def _load_hybrid(self) -> None:
        """osu!.dbと.oszファイルのハイブリッド読み込み"""
        osu_owned, osu_metadata = set(), {}
        osz_owned, osz_metadata = set(), {}

        try:
            # 1. osu!.dbから読み込み
            if self.osu_db_path and Path(self.osu_db_path).exists():
                try:
                    self._scan_task = asyncio.create_task(self._parse_osu_db())
                    osu_owned, osu_metadata = await self._scan_task
                except Exception as e:
                    print(f"Error parsing osu!.db: {e}")
            else:
                print(f"osu!.db not found at {self.osu_db_path}, using .osz files only")

            # 2. .oszファイルから読み込み
            try:
                self._scan_task = asyncio.create_task(self._scan_osz_fast())
                osz_owned, osz_metadata = await self._scan_task
            except Exception as e:
                print(f"Error scanning .osz files: {e}")

            # 3. マージ（osu!.dbのメタデータを優先）
            async with self._state_lock:
                self._owned = osu_owned.union(osz_owned)
                # osu!.dbのメタデータを優先し、.oszで補完
                self._metadata = {**osz_metadata, **osu_metadata}

            print(f"Hybrid scan complete: {len(self._owned)} sets total "
                  f"(osu!.db: {len(osu_owned)}, .osz: {len(osz_owned)})")
            await self._emit_scan_event({
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
            })
        except Exception as exc:
            await self._emit_scan_event({"status": "error", "error_message": str(exc)})
            raise

    async def _start_background_scan(self) -> None:
        """バックグラウンドでハイブリッドスキャンを開始"""
        # 既に進行中なら新しいスキャンは開始しない
        if self._scan_task and not self._scan_task.done():
            return

        await self._emit_scan_event({
            'status': 'scanning',
            'total_files': 0,
            'processed_files': 0,
            'current_file': 'osu!.db',
            'started_at': None,
            'completed_at': None,
            'error_message': None,
            'updated_at': None
        })
        self._scan_task = asyncio.create_task(self._load_hybrid())

    async def _parse_osu_db(self) -> Tuple[Set[int], Dict[int, Tuple[int, str, str, str]]]:
        """osu!.dbを解析してメタデータを抽出"""
        async with self._state_lock:
            if self._scanning:
                return set(), {}
            self._scanning = True

        try:
            # 同期処理なのでスレッドで実行
            owned, metadata = await asyncio.to_thread(self._parse_osu_db_sync)
            return owned, metadata
        finally:
            async with self._state_lock:
                self._scanning = False

    def _parse_osu_db_sync(self) -> Tuple[Set[int], Dict[int, Tuple[int, str, str, str]]]:
        """同期でosu!.dbを解析"""
        owned: Set[int] = set()
        metadata: Dict[int, Tuple[int, str, str, str]] = {}

        try:
            with open(self.osu_db_path, 'rb') as f:
                osu_data = OsuDb(KaitaiStream(f))

                print(f"Loaded osu!.db version {osu_data.osu_version}")
                print(f"Found {len(osu_data.beatmaps)} beatmaps")

                for beatmap in osu_data.beatmaps:
                    # folder_nameからbeatmapset_idを抽出
                    # 例: "539007 $44,000 - PISSCORD" → 539007
                    folder_name = beatmap.folder_name
                    if hasattr(folder_name, 'value'):
                        folder_name = folder_name.value

                    if not folder_name:
                        continue

                    # フォルダ名の先頭の数字をbeatmapset_idとして使用
                    match = re.match(r'^(\d+)', folder_name)
                    if not match:
                        continue

                    set_id = int(match.group(1))
                    if set_id <= 0:
                        continue

                    owned.add(set_id)

                    # メタデータを整形（Unicode版を優先）
                    def get_string_value(s):
                        return s.value if hasattr(s, 'value') else s or ""

                    artist = get_string_value(beatmap.artist_name_unicode) or get_string_value(beatmap.artist_name)
                    title = get_string_value(beatmap.song_title_unicode) or get_string_value(beatmap.song_title)
                    creator = get_string_value(beatmap.creator_name)

                    if set_id not in metadata:
                        metadata[set_id] = (set_id, artist, title, creator)

        except Exception as e:
            print(f"Error reading osu!.db: {e}")
            raise

        return owned, metadata

    async def _scan_osz_fast(self) -> Tuple[Set[int], Dict[int, Tuple[int, str, str, str]]]:
        """ファイル名からのみ.oszを高速スキャン - O(1) per file"""
        owned: Set[int] = set()
        metadata: Dict[int, Tuple[int, str, str, str]] = {}

        if not self.songs_dir or not self.songs_dir.exists():
            print(f"Songs directory not found at {self.songs_dir}")
            return owned, metadata

        # 別スレッドで実行
        return await asyncio.to_thread(self._scan_osz_sync, owned, metadata)

    def _scan_osz_sync(self, owned: Set[int], metadata: Dict[int, Tuple[int, str, str, str]]) -> Tuple[Set[int], Dict[int, Tuple[int, str, str, str]]]:
        """同期版.oszスキャン"""
        osz_files = list(self.songs_dir.rglob("*.osz"))
        print(f"Scanning {len(osz_files)} .osz files...")

        for osz_path in osz_files:
            filename = osz_path.name
            # "123456 Artist - Title.osz" → 123456
            match = re.match(r'^(\d+)', filename)
            if match:
                set_id = int(match.group(1))
                if set_id <= 0:
                    continue

                owned.add(set_id)

                # osu!.dbにない場合のみファイル名からメタデータ抽出
                if set_id not in metadata:
                    artist, title = self._extract_metadata_from_filename(filename)
                    metadata[set_id] = (set_id, artist, title, "")  # creatorはファイル名から抽出不可

        print(f"Found {len(owned)} unique sets from .osz files")
        return owned, metadata

    def _extract_metadata_from_filename(self, filename: str) -> Tuple[str, str]:
        """ファイル名からアーティストとタイトルを抽出"""
        # "123456 Artist - Title.osz" → ("Artist", "Title")
        if filename.endswith('.osz'):
            filename = filename[:-4]  # .oszを削除

        # 最初の数字部分を削除
        filename = re.sub(r'^\d+\s*', '', filename, count=1)

        # " - " で分割
        if ' - ' in filename:
            parts = filename.split(' - ', 1)
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

    def summary(self) -> Dict[str, int]:
        return {
            "owned_sets": len(self._owned),
            "with_metadata": len(self._metadata),
            "songs_dir_exists": int(self.songs_dir and self.songs_dir.exists()),
        }

    def get_scan_status(self) -> Dict[str, any]:
        """現在のスキャン状態を取得"""
        if self._scanning:
            return {
                'status': 'scanning',
                'total_files': 0,
                'processed_files': 0,
                'current_file': 'osu!.db',
                'started_at': None,
                'completed_at': None,
                'error_message': None,
                'updated_at': None
            }
        else:
            return {
                'status': 'completed',
                'total_files': 1,
                'processed_files': 1,
                'current_file': None,
                'started_at': None,
                'completed_at': None,
                'error_message': None,
                'updated_at': None
            }

    def mark_owned(self, set_id: int, metadata: Optional[Tuple[int, str, str, str]] = None) -> None:
        """
        ダウンロード完了直後に所有セットを即時反映。
        """
        self._owned.add(set_id)
        if metadata:
            self._metadata[set_id] = metadata

    async def _emit_scan_event(self, payload: Dict[str, any]) -> None:
        """Push scan status to SSE subscribers."""
        if not self._event_bus:
            return
        try:
            await self._event_bus.publish({"topic": "scan", "data": payload})
        except Exception as exc:
            print(f"Scan event publish failed: {exc}")
