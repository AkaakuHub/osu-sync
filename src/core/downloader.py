import asyncio
import logging
import time
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

import httpx
from aiolimiter import AsyncLimiter

from core.scanner import SongIndex

logger = logging.getLogger("osu_sync.downloader")


@dataclass
class DownloadTask:
    set_id: int
    url: str
    status: str = "queued"  # queued -> running -> completed/failed/skipped
    message: str = ""
    path: Path | None = None
    archive_path: Path | None = None
    bytes_downloaded: int = 0
    total_bytes: int | None = None
    progress: float | None = 0.0
    speed_bps: float | None = None
    started_at: float | None = None
    updated_at: float | None = None
    display_name: str | None = None
    artist: str | None = None
    title: str | None = None
    artist_unicode: str | None = None
    title_unicode: str | None = None
    created_at: float = field(default_factory=time.time)


class DownloadManager:
    """
    DLキュー: 進捗計測を行いながら .osz を保存する簡易ダウンローダ。
    """

    def __init__(
        self,
        songs_dir: str,
        url_template: str,
        max_concurrency: int = 3,
        requests_per_minute: int = 60,
        index: SongIndex | None = None,
        event_bus=None,
    ) -> None:
        self.songs_dir = Path(songs_dir)
        self.url_template = url_template
        self.max_concurrency = max_concurrency
        self.index = index
        self._queue: asyncio.Queue[DownloadTask] = asyncio.Queue()
        self._tasks: dict[int, DownloadTask] = {}
        self._worker_handles: list[asyncio.Task] = []
        self._workers_started = False
        self._limiter = AsyncLimiter(requests_per_minute, time_period=60)
        self._client = httpx.AsyncClient(follow_redirects=True, timeout=60)
        self._event_bus = event_bus
        logger.info(
            "Downloader initialized songs_dir=%s template=%s max_concurrency=%s rpm=%s",
            self.songs_dir,
            self.url_template,
            self.max_concurrency,
            requests_per_minute,
        )

    def enqueue(
        self, set_ids: list[int], metadata: dict[int, dict[str, str]] | None = None
    ) -> list[DownloadTask]:
        new_tasks: list[DownloadTask] = []
        for set_id in set_ids:
            if set_id in self._tasks and self._tasks[set_id].status in {
                "queued",
                "running",
            }:
                continue
            url = self.url_template.format(set_id=set_id)
            task = DownloadTask(set_id=set_id, url=url)
            # Use provided metadata first, then fall back to index
            if metadata and set_id in metadata:
                task.artist = metadata[set_id].get("artist")
                task.title = metadata[set_id].get("title")
                task.artist_unicode = metadata[set_id].get("artist_unicode")
                task.title_unicode = metadata[set_id].get("title_unicode")
            elif self.index and set_id in self.index.metadata:
                index_metadata = self.index.metadata[set_id]
                if len(index_metadata) >= 4:
                    _, artist, title, creator = index_metadata
                    task.artist = artist
                    task.title = title
            self._tasks[set_id] = task
            self._queue.put_nowait(task)
            new_tasks.append(task)
        if new_tasks:
            logger.info("Enqueued downloads: %s", [t.set_id for t in new_tasks])
            self._publish_status()
        return new_tasks

    async def start_workers(self) -> None:
        if self._workers_started:
            return
        self._workers_started = True
        for _ in range(self.max_concurrency):
            handle = asyncio.create_task(self._worker())
            self._worker_handles.append(handle)

    async def _worker(self) -> None:
        while True:
            task: DownloadTask = await self._queue.get()
            if task.status != "queued":
                self._queue.task_done()
                continue
            task.status = "running"
            task.progress = 0.0
            task.bytes_downloaded = 0
            self._publish_status()
            try:
                logger.info("Start download set_id=%s url=%s", task.set_id, task.url)
                await self._download(task)
                if task.status not in {"failed", "skipped"}:
                    task.status = "completed"
                    task.progress = 1.0
                    task.updated_at = time.time()
            except Exception as exc:
                task.status = "failed"
                task.message = str(exc)
                logger.exception(
                    "Download failed set_id=%s url=%s error=%s",
                    task.set_id,
                    task.url,
                    exc,
                )
            finally:
                self._queue.task_done()
                self._publish_status()

    async def _download(self, task: DownloadTask) -> None:
        self.songs_dir.mkdir(parents=True, exist_ok=True)
        existing_archive = self._find_existing_archive(task.set_id)
        if existing_archive:
            task.status = "skipped"
            task.message = "already exists"
            task.archive_path = existing_archive
            task.path = existing_archive
            task.display_name = existing_archive.stem
            task.progress = 1.0
            task.total_bytes = existing_archive.stat().st_size
            task.bytes_downloaded = task.total_bytes
            task.updated_at = time.time()
            if self.index:
                self.index.mark_owned(task.set_id)
            self._publish_status()
            logger.info(
                "Skip download (exists) set_id=%s path=%s",
                task.set_id,
                existing_archive,
            )
            return

        async with self._limiter:
            async with self._client.stream("GET", task.url) as resp:
                resp.raise_for_status()
                content_type = (resp.headers.get("content-type") or "").lower()
                logger.info(
                    "HTTP start set_id=%s status=%s content_length=%s content_type=%s final_url=%s",
                    task.set_id,
                    resp.status_code,
                    resp.headers.get("content-length"),
                    content_type,
                    resp.url,
                )

                # HTMLなど明らかに .osz でない場合は即失敗させる
                if not any(x in content_type for x in ("zip", "octet-stream", "osu")):
                    snippet = await resp.aread()
                    task.status = "failed"
                    task.message = f"unexpected content-type: {content_type}"
                    logger.error(
                        "Abort download set_id=%s due to content-type=%s size=%s first256=%r",
                        task.set_id,
                        content_type,
                        len(snippet),
                        snippet[:256],
                    )
                    return

                tmp_path = (
                    self.songs_dir / f"{task.set_id}-{int(time.time() * 1000)}.part"
                )
                task.started_at = time.time()
                task.updated_at = task.started_at
                content_length = resp.headers.get("content-length")
                if content_length and content_length.isdigit():
                    task.total_bytes = int(content_length)
                else:
                    task.total_bytes = None

                downloaded = 0
                last_emit = time.time()
                with tmp_path.open("wb") as f:
                    async for chunk in resp.aiter_bytes(4096):
                        f.write(chunk)
                        downloaded += len(chunk)
                        task.bytes_downloaded = downloaded
                        now = time.time()
                        elapsed = max(1e-3, now - (task.updated_at or now))
                        instant_speed = len(chunk) / elapsed
                        if task.speed_bps is None:
                            task.speed_bps = instant_speed
                        else:
                            task.speed_bps = (task.speed_bps * 0.6) + (
                                instant_speed * 0.4
                            )
                        task.updated_at = now
                        if task.total_bytes:
                            task.progress = min(downloaded / task.total_bytes, 0.999)
                        if now - last_emit >= 0.5:
                            last_emit = now
                            self._publish_status()
                metadata = self._derive_metadata_from_archive(tmp_path)
                if metadata:
                    task.artist, task.title = metadata
                base_name = self._build_display_name(task)
                archive_path = self.songs_dir / f"{base_name}.osz"
                archive_path.parent.mkdir(parents=True, exist_ok=True)
                if archive_path.exists():
                    archive_path.unlink()
                tmp_path.rename(archive_path)
                task.archive_path = archive_path
                task.path = archive_path
                duration = time.time() - (task.started_at or time.time())
                size = archive_path.stat().st_size
                logger.info(
                    "HTTP done set_id=%s bytes=%s elapsed=%.2fs content_length=%s path=%s",
                    task.set_id,
                    size,
                    duration,
                    task.total_bytes,
                    archive_path,
                )
                if task.total_bytes and size != task.total_bytes:
                    logger.warning(
                        "Size mismatch set_id=%s expected=%s actual=%s url=%s",
                        task.set_id,
                        task.total_bytes,
                        size,
                        task.url,
                    )
                if not zipfile.is_zipfile(archive_path):
                    task.status = "failed"
                    task.message = "downloaded file is not a valid zip/osz"
                    logger.error(
                        "Invalid archive set_id=%s size=%sB content_type=%s url=%s",
                        task.set_id,
                        size,
                        content_type,
                        task.url,
                    )
                    try:
                        archive_path.unlink()
                    except FileNotFoundError:
                        pass
                    return
                if size < 20_000:  # だいたい 11KB 近辺の壊れを拾う
                    logger.warning(
                        "Downloaded file is unusually small set_id=%s size=%sB url=%s",
                        task.set_id,
                        size,
                        task.url,
                    )

        if self.index:
            meta = None
            if task.artist or task.title:
                meta = (task.set_id, task.artist or "", task.title or "", "")
            self.index.mark_owned(task.set_id, meta)

    def status(self) -> dict[str, object]:
        queued = [t for t in self._tasks.values() if t.status == "queued"]
        running = [t for t in self._tasks.values() if t.status == "running"]
        finished = [
            t
            for t in self._tasks.values()
            if t.status in {"completed", "failed", "skipped"}
        ]

        # Backfill metadata for existing tasks
        all_tasks = queued + running + finished
        for task in all_tasks:
            if (
                (not task.artist or not task.title)
                and self.index
                and task.set_id in self.index.metadata
            ):
                metadata = self.index.metadata[task.set_id]
                if len(metadata) >= 4:
                    _, artist, title, creator = metadata
                    if not task.artist:
                        task.artist = artist
                    if not task.title:
                        task.title = title

        return {
            "queued": [self._serialize_task(t) for t in queued],
            "running": [self._serialize_task(t) for t in running],
            "done": [self._serialize_task(t) for t in finished],
        }

    def _publish_status(self) -> None:
        """Push current queue snapshot to SSE subscribers."""
        if not self._event_bus:
            return
        try:
            self._last_publish_task = asyncio.create_task(
                self._event_bus.publish({"topic": "queue", "data": self.status()})
            )
        except RuntimeError:
            # event loop not running (during tests); ignore
            pass

    def _serialize_task(self, task: DownloadTask) -> dict[str, object]:
        return {
            "set_id": task.set_id,
            "status": task.status,
            "message": task.message,
            "path": str(task.path) if task.path else None,
            "archive_path": str(task.archive_path) if task.archive_path else None,
            "progress": task.progress,
            "bytes_downloaded": task.bytes_downloaded,
            "total_bytes": task.total_bytes,
            "speed_bps": task.speed_bps,
            "updated_at": task.updated_at,
            "display_name": task.display_name,
            "artist": task.artist,
            "title": task.title,
            "artist_unicode": task.artist_unicode,
            "title_unicode": task.title_unicode,
        }

    def _find_existing_archive(self, set_id: int) -> Path | None:
        patterns = [
            f"{set_id} *.osz",
            f"{set_id}-*.osz",
            f"{set_id}*.osz",
            f"({set_id}) *.osz",
            f"({set_id})*.osz",
        ]
        for pattern in patterns:
            matches = list(self.songs_dir.glob(pattern))
            if matches:
                return matches[0]
        return None

    def _derive_metadata_from_archive(
        self, archive_path: Path
    ) -> tuple[str, str] | None:
        try:
            with zipfile.ZipFile(archive_path, "r") as zf:
                for member in zf.namelist():
                    if not member.lower().endswith(".osu"):
                        continue
                    with zf.open(member) as fh:
                        try:
                            content = fh.read().decode("utf-8", errors="ignore")
                        except UnicodeDecodeError:
                            continue
                    parsed = self._parse_osu_text(content)
                    if parsed:
                        return parsed
        except zipfile.BadZipFile:
            logger.warning("BadZipFile while parsing %s", archive_path)
            return None
        return None

    def _parse_osu_text(self, content: str) -> tuple[str, str] | None:
        artist = title = ""
        in_meta = False
        for raw_line in content.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if line.startswith("[") and line.endswith("]"):
                in_meta = line.lower() == "[metadata]"
                continue
            if not in_meta or ":" not in line:
                continue
            key, value = line.split(":", 1)
            key = key.strip().lower()
            value = value.strip()
            if key in ("artistunicode", "artist") and not artist:
                artist = value
            elif key in ("titleunicode", "title") and not title:
                title = value
            if artist and title:
                break
        if artist or title:
            return artist or "", title or ""
        return None

    def _build_display_name(self, task: DownloadTask) -> str:
        artist = self._sanitize(task.artist or "")
        title = self._sanitize(task.title or "")
        if artist and title:
            name = f"{task.set_id} {artist} - {title}"
        elif artist or title:
            name = f"{task.set_id} {artist or title}"
        else:
            name = f"{task.set_id}"
        task.display_name = name
        return name

    def _sanitize(self, value: str) -> str:
        invalid = '<>:"/\\|?*'
        sanitized = "".join("_" if ch in invalid else ch for ch in value)
        return sanitized.strip()
