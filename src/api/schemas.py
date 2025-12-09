from enum import Enum

from pydantic import BaseModel


class BeatmapStatus(str, Enum):
    """osu! beatmap status following official definitions"""

    GRAVEYARD = "graveyard"  # -2
    WIP = "wip"  # -1
    PENDING = "pending"  # 0
    RANKED = "ranked"  # 1
    APPROVED = "approved"  # 2
    QUALIFIED = "qualified"  # 3
    LOVED = "loved"  # 4


class DifficultyInfo(BaseModel):
    label: str
    rating: float
    mode: str


class SearchResult(BaseModel):
    set_id: int
    artist: str
    artist_unicode: str | None = None
    title: str
    title_unicode: str | None = None
    creator: str
    favourite_count: int
    play_count: int
    status: BeatmapStatus
    owned: bool
    cover_url: str | None = None
    preview_url: str | None = None
    ranked_date: str | None = None
    bpm: float | None = None
    total_length: int | None = None
    difficulty_count: int | None = None
    difficulties: list[DifficultyInfo] | None = None


class SearchResponse(BaseModel):
    total: int
    page: int
    limit: int
    results: list[SearchResult]


class DownloadRequest(BaseModel):
    set_ids: list[int]
    metadata: dict[int, dict[str, str]] | None = (
        None  # set_id -> {artist, title, artist_unicode, title_unicode}
    )


class QueueEntry(BaseModel):
    set_id: int
    status: str
    message: str | None = None
    path: str | None = None
    archive_path: str | None = None
    display_name: str | None = None
    artist: str | None = None
    title: str | None = None
    artist_unicode: str | None = None
    title_unicode: str | None = None
    progress: float | None = None
    bytes_downloaded: int = 0
    total_bytes: int | None = None
    speed_bps: float | None = None
    updated_at: float | None = None


class QueueStatus(BaseModel):
    queued: list[QueueEntry]
    running: list[QueueEntry]
    done: list[QueueEntry]


class IndexSummary(BaseModel):
    owned_sets: int
    with_metadata: int
    songs_dir_exists: int
    songs_dir: str


class OpenPathRequest(BaseModel):
    path: str
