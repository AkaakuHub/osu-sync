from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class BeatmapStatus(str, Enum):
    """osu! beatmap status following official definitions"""
    GRAVEYARD = "graveyard"  # -2
    WIP = "wip"              # -1
    PENDING = "pending"      # 0
    RANKED = "ranked"        # 1
    APPROVED = "approved"    # 2
    QUALIFIED = "qualified"  # 3
    LOVED = "loved"          # 4


class DifficultyInfo(BaseModel):
    label: str
    rating: float
    mode: str


class SearchResult(BaseModel):
    set_id: int
    artist: str
    artist_unicode: Optional[str] = None
    title: str
    title_unicode: Optional[str] = None
    creator: str
    favourite_count: int
    play_count: int
    status: BeatmapStatus
    owned: bool
    cover_url: Optional[str] = None
    preview_url: Optional[str] = None
    ranked_date: Optional[str] = None
    bpm: Optional[float] = None
    total_length: Optional[int] = None
    difficulty_count: Optional[int] = None
    difficulties: Optional[List[DifficultyInfo]] = None


class SearchResponse(BaseModel):
    total: int
    page: int
    limit: int
    results: List[SearchResult]


class DownloadRequest(BaseModel):
    set_ids: List[int]


class QueueEntry(BaseModel):
    set_id: int
    status: str
    message: Optional[str] = None
    path: Optional[str] = None
    archive_path: Optional[str] = None
    display_name: Optional[str] = None
    artist: Optional[str] = None
    title: Optional[str] = None
    progress: Optional[float] = None
    bytes_downloaded: int = 0
    total_bytes: Optional[int] = None
    speed_bps: Optional[float] = None
    updated_at: Optional[float] = None


class QueueStatus(BaseModel):
    queued: List[int]
    running: List[QueueEntry]
    done: List[QueueEntry]


class IndexSummary(BaseModel):
    owned_sets: int
    with_metadata: int
    songs_dir_exists: int
    songs_dir: str


class OpenPathRequest(BaseModel):
    path: str
