import asyncio
import json
import logging
import os
import platform
import subprocess
from pathlib import Path
from typing import Optional
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from api.config import settings
from core.downloader import DownloadManager
from core.filter_schema import FilterRequest
from api.osu_client import OsuApiClient
from core.scanner import SongIndex
from api.schemas import (
    BeatmapStatus,
    DownloadRequest,
    IndexSummary,
    OpenPathRequest,
    QueueStatus,
    SearchResponse,
    SearchResult,
)


API_PREFIX = "/api"
logger = logging.getLogger("osu_sync.api")


class EventBus:
    """Very small async pub/sub used for SSE push."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            self._subscribers.add(q)
        return q

    async def unsubscribe(self, q: asyncio.Queue) -> None:
        async with self._lock:
            self._subscribers.discard(q)

    async def publish(self, event: dict) -> None:
        async with self._lock:
            subs = list(self._subscribers)
        for q in subs:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                # drop if subscriber is slow
                continue


def reveal_in_file_manager(path: Path, *, select: bool = False) -> None:
    system = platform.system()
    if system == "Windows":
        if select:
            subprocess.run(["explorer", "/select,", str(path)], check=False)
        else:
            os.startfile(str(path))  # type: ignore[attr-defined]
        return

    if system == "Darwin":
        args = ["open"]
        if select:
            args.append("-R")
        args.append(str(path))
        subprocess.run(args, check=False)
        return

    target = path if path.is_dir() else path.parent
    subprocess.run(["xdg-open", str(target)], check=False)


def create_app() -> FastAPI:
    # ルートロガーのデフォルト設定が無ければ最低限 INFO で出す
    if not logging.getLogger().handlers:
        logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

    app = FastAPI(title="osu-sync", version="0.1.0")
    api = APIRouter(prefix=API_PREFIX)
    app.state.event_bus = EventBus()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # フロントエンド配信（build 済み dist があれば）
    root_dir = Path(__file__).resolve().parents[2]
    dist_dir = root_dir / "ui" / "dist"
    if dist_dir.exists():
        app.mount("/web", StaticFiles(directory=dist_dir, html=True), name="frontend")

        @app.get("/")
        async def serve_index():
            return FileResponse(dist_dir / "index.html")
    else:
        # dist が無い場合でも / を生かす
        @app.get("/")
        async def fallback_index() -> dict:
            return {"message": "ui/dist がまだありません。`npm install && npm run build` を実行してください。"}

    # 共有状態
    app.state.index = SongIndex(
        osu_db_path=settings.osu_db_path,
        songs_dir=settings.songs_dir,
        event_bus=app.state.event_bus,
    )
    app.state.downloader = DownloadManager(
        songs_dir=settings.songs_dir,
        url_template=settings.download_url_template,
        max_concurrency=settings.max_concurrency,
        requests_per_minute=settings.requests_per_minute,
        index=app.state.index,
        event_bus=app.state.event_bus,
    )
    logger.info(
        "App init songs_dir=%s template=%s max_concurrency=%s rpm=%s",
        settings.songs_dir,
        settings.download_url_template,
        settings.max_concurrency,
        settings.requests_per_minute,
    )

    def build_osu_client() -> None:
        try:
            app.state.osu = OsuApiClient(settings.osu_client_id, settings.osu_client_secret)
            app.state.osu_enabled = True
        except Exception as exc:  # noqa: BLE001
            app.state.osu = exc
            app.state.osu_enabled = False

    build_osu_client()

    def map_search_result(item: dict) -> SearchResult:
        set_id = item.get("id")
        covers = item.get("covers") or {}
        cover_url = (
            covers.get("card@2x") or covers.get("cover@2x") or covers.get("card") or covers.get("cover")
        )
        beatmaps = item.get("beatmaps") or []
        total_length = None
        difficulties: List[Dict[str, Any]] = []
        if beatmaps:
            lengths = [bm.get("total_length") or 0 for bm in beatmaps]
            if any(lengths):
                total_length = max(lengths)
            for bm in beatmaps:
                difficulty_rating = bm.get("difficulty_rating")
                version = bm.get("version", "NM")
                mode = bm.get("mode", "")
                if difficulty_rating is None:
                    difficulty_rating = 0
                difficulties.append(
                    {
                        "label": version,
                        "rating": difficulty_rating,
                        "mode": mode,
                    }
                )

        # Map osu! API status to our BeatmapStatus enum
        osu_status = item.get("status", "")
        if osu_status == "graveyard":
            status = BeatmapStatus.GRAVEYARD
        elif osu_status == "wip":
            status = BeatmapStatus.WIP
        elif osu_status == "pending":
            status = BeatmapStatus.PENDING
        elif osu_status == "ranked":
            status = BeatmapStatus.RANKED
        elif osu_status == "approved":
            status = BeatmapStatus.APPROVED
        elif osu_status == "qualified":
            status = BeatmapStatus.QUALIFIED
        elif osu_status == "loved":
            status = BeatmapStatus.LOVED
        else:
            status = BeatmapStatus.PENDING  # fallback

        return SearchResult(
            set_id=set_id,
            artist=item.get("artist", ""),
            artist_unicode=item.get("artist_unicode"),
            title=item.get("title", ""),
            title_unicode=item.get("title_unicode"),
            creator=item.get("creator", ""),
            favourite_count=item.get("favourite_count", 0),
            play_count=item.get("play_count", 0),
            status=status,
            owned=app.state.index.owned(set_id),
            cover_url=cover_url,
            preview_url=item.get("preview_url"),
            ranked_date=item.get("ranked_date"),
            bpm=item.get("bpm"),
            total_length=total_length,
            difficulty_count=len(beatmaps) if beatmaps else None,
            difficulties=difficulties,
        )

    @app.on_event("startup")
    async def startup() -> None:
        # DBから既存データを読み込み（即時完了）
        await app.state.index._load_hybrid()
        # バックグラウンドスキャンを完全非同期で実行（サーバー起動をブロックしない）
        asyncio.create_task(app.state.index._start_background_scan())
        await app.state.downloader.start_workers()

    # 依存関数
    def require_osu_client() -> OsuApiClient:
        if not app.state.osu_enabled:
            raise HTTPException(
                status_code=400,
                detail="osu! API 資格情報が未設定です。/api/settings で client_id / client_secret を入力してください。",
            )
        return app.state.osu

    # ルータ
    @api.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    @api.get("/events")
    async def sse_events(request: Request) -> StreamingResponse:
        """
        Server-Sent Events endpoint.
        Emits dict payloads: {"topic": "...", "data": {...}}.
        """
        queue = await app.state.event_bus.subscribe()

        async def event_generator():
            try:
                while True:
                    if await request.is_disconnected():
                        break
                    event = await queue.get()
                    yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            finally:
                await app.state.event_bus.unsubscribe(queue)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )

    @api.get("/local/index", response_model=IndexSummary)
    async def local_index() -> IndexSummary:
        summary = app.state.index.summary()
        return IndexSummary(**summary, songs_dir=str(app.state.index.songs_dir))

    @api.get("/local/scan-status")
    async def scan_status() -> dict:
        """スキャン状態を取得"""
        return app.state.index.get_scan_status()

    @api.post("/local/rescan", response_model=IndexSummary)
    async def rescan() -> IndexSummary:
        await app.state.index.refresh()
        summary = app.state.index.summary()
        return IndexSummary(**summary, songs_dir=str(app.state.index.songs_dir))

    @api.post("/local/open")
    async def open_local_path(body: OpenPathRequest) -> dict:
        target = Path(body.path).expanduser().resolve()
        songs_root = Path(settings.songs_dir).expanduser().resolve()
        try:
            target.relative_to(songs_root)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Path is outside songs directory") from exc

        select = target.is_file() and target.exists()
        resolved_target = target if select else (target if target.exists() else target.parent)

        if not resolved_target.exists():
            raise HTTPException(status_code=404, detail="Path does not exist")

        try:
            reveal_in_file_manager(resolved_target if not select else target, select=select)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"Failed to open path: {exc}") from exc

        return {"status": "ok"}

    @api.get("/search", response_model=SearchResponse)
    async def search(
        q: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
        s: Optional[str] = None,  # status
        m: Optional[str] = None,  # mode
        e: Optional[str] = None,  # extra
        c: Optional[str] = None,  # general
        g: Optional[str] = None,  # genre
        l: Optional[str] = None,  # language (公式APIの短縮形)
        nsfw: Optional[bool] = None,
        sort: Optional[str] = None,
        played: Optional[str] = None,
        rank: Optional[str] = None,
        osu: OsuApiClient = Depends(require_osu_client),
    ) -> SearchResponse:
        # 公式APIのURL短縮形パラメータに完全に対応
        # 高度な検索クエリと通常の検索フィルターの両方をサポート

        # Basic search query (空文字でもOK)
        search_query = q if q is not None else ""

        # 公式APIのパラメータ形式に合わせて直接渡す
        raw = await osu.search_beatmapsets(
            q=search_query,
            page=page,
            limit=limit,
            s=s,
            m=m,
            e=e,
            c=c,
            g=g,
            l=l,  # language パラメータ
            nsfw=nsfw,
            sort=sort,
            played=played,
            r=rank  # rank パラメータ
        )

        # API v2はbeatmapsetsを配列で返す
        beatmapsets = raw.get("beatmapsets", [])
        results = [map_search_result(item) for item in beatmapsets]
        return SearchResponse(
            total=raw.get("total", len(results)),
            page=page,
            limit=limit,
            results=results,
        )

    @api.post("/download", response_model=QueueStatus)
    async def download(req: DownloadRequest) -> QueueStatus:
        missing = [s for s in req.set_ids if not app.state.index.owned(s)]
        logger.info(
            "POST /download requested=%s missing=%s metadata_keys=%s",
            req.set_ids,
            missing,
            list(req.metadata.keys()) if req.metadata else [],
        )
        if not missing:
            return QueueStatus(**app.state.downloader.status())
        app.state.downloader.enqueue(missing, req.metadata)
        return QueueStatus(**app.state.downloader.status())

    @api.post("/search/filter", response_model=SearchResponse)
    async def search_by_filter(
        body: FilterRequest,
        osu: OsuApiClient = Depends(require_osu_client),
    ) -> SearchResponse:
        """
        先人プロジェクト（batch-beatmap-downloader）の FilterRequest 互換の簡易実装。
        Rule を osu!web 検索クエリ文字列に変換して /search を叩く。
        例: field=Cs, operator='>', value='5' => 'cs>5'
        """

        def rule_to_token(field: str, op: str, value: str) -> str:
            mapping = {
                "Cs": "cs",
                "Ar": "ar",
                "Od": "od",
                "Hp": "hp",
                "Bpm": "bpm",
                "Length": "length",
                "Stars": "stars",
                "Creator": "creator",
                "Artist": "artist",
                "Title": "title",
            }
            f = mapping.get(field, field.lower())
            return f"{f}{op}{value}"

        tokens = [rule_to_token(r.field, r.operator, r.value) for r in body.rules]
        query = " ".join(tokens)
        raw = await osu.search_beatmapsets(query, 1, 20)

        beatmapsets = raw.get("beatmapsets", [])
        results = [map_search_result(item) for item in beatmapsets]
        return SearchResponse(
            total=raw.get("total", len(results)),
            page=1,
            limit=20,
            results=results,
        )

    @api.get("/queue", response_model=QueueStatus)
    async def queue_status() -> QueueStatus:
        return QueueStatus(**app.state.downloader.status())

    # 設定の取得/更新
    @api.get("/settings")
    async def get_settings() -> dict:
        return {
            "osu_client_id": settings.osu_client_id,
            "osu_client_secret_set": bool(settings.osu_client_secret),
            "songs_dir": settings.songs_dir,
            "download_url_template": settings.download_url_template,
            "max_concurrency": settings.max_concurrency,
            "requests_per_minute": settings.requests_per_minute,
            "player_volume": settings.player_volume,
        }

    @api.post("/settings")
    async def update_settings(payload: dict) -> dict:
        allowed = {
            "osu_client_id",
            "osu_client_secret",
            "songs_dir",
            "download_url_template",
            "max_concurrency",
            "requests_per_minute",
            "player_volume",
        }
        filtered = {k: v for k, v in payload.items() if k in allowed}
        settings.persist(filtered)

        # songs_dir, download_url_template, max_concurrency, requests_per_minute が変更された場合のみ再構築
        needs_rebuild = any(key in filtered for key in [
            "songs_dir", "download_url_template", "max_concurrency", "requests_per_minute"
        ])

        # osu_client_id, osu_client_secret が変更された場合のみ再構築
        needs_client_rebuild = any(key in filtered for key in [
            "osu_client_id", "osu_client_secret"
        ])

        if needs_rebuild:
            app.state.index = SongIndex(
                osu_db_path=settings.osu_db_path,
                songs_dir=settings.songs_dir,
                event_bus=app.state.event_bus,
            )
            await app.state.index.refresh()
            app.state.downloader = DownloadManager(
                songs_dir=settings.songs_dir,
                url_template=settings.download_url_template,
                max_concurrency=settings.max_concurrency,
                requests_per_minute=settings.requests_per_minute,
                index=app.state.index,
                event_bus=app.state.event_bus,
            )
            await app.state.downloader.start_workers()

        if needs_client_rebuild:
            build_osu_client()

        return {"status": "ok"}

    app.include_router(api)
    return app


app = create_app()
