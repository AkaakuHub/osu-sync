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

    def __init__(self, osu_db_path: Optional[str] = None, songs_dir: Optional[str] = None) -> None:
        self.osu_db_path = osu_db_path
        self.songs_dir = Path(songs_dir) if songs_dir else None
        self._owned: Set[int] = set()
        self._metadata: Dict[int, Tuple[int, str, str, str]] = {}  # (set_id, artist, title, creator)
        self._state_lock = asyncio.Lock()
        self._scan_task: Optional[asyncio.Task] = None
        self._scanning = False

    @property
    def owned_set_ids(self) -> Set[int]:
        return self._owned

    @property
    def metadata(self) -> Dict[int, Tuple[int, str, str, str]]:
        return self._metadata

    async def refresh(self) -> None:
        """
        osu!.dbから楽曲情報を読み込む。
        """
        await self._load_from_osu_db()

    async def _load_from_osu_db(self) -> None:
        """osu!.dbから楽曲情報を読み込む"""
        if not self.osu_db_path or not Path(self.osu_db_path).exists():
            print(f"osu!.db not found at {self.osu_db_path}")
            async with self._state_lock:
                self._owned = set()
                self._metadata = {}
            return

        try:
            # バックグラウンドでosu!.dbを解析
            self._scan_task = asyncio.create_task(self._parse_osu_db())
            await self._scan_task
        except Exception as e:
            print(f"Error parsing osu!.db: {e}")
            async with self._state_lock:
                self._owned = set()
                self._metadata = {}

    async def _start_background_scan(self) -> None:
        """バックグラウンドでスキャンを開始"""
        # 既に進行中なら新しいスキャンは開始しない
        if self._scan_task and not self._scan_task.done():
            return

        self._scan_task = asyncio.create_task(self._parse_osu_db())

    async def _parse_osu_db(self) -> None:
        """osu!.dbを解析してメタデータを抽出"""
        async with self._state_lock:
            if self._scanning:
                return
            self._scanning = True

        try:
            # 同期処理なのでスレッドで実行
            owned, metadata = await asyncio.to_thread(self._parse_osu_db_sync)

            # 結果を反映
            async with self._state_lock:
                self._owned = owned
                self._metadata = metadata
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
