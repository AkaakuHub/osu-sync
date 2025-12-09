import asyncio
import json
import time
from typing import Any

import httpx
from fastapi import HTTPException


class OsuApiClient:
    """
    osu! v2 を素の HTTP で叩く軽量クライアント。
    先人リポジトリがやっている「client_credentials でトークン取得→ /api/v2/beatmapsets/search」を踏襲。
    """

    TOKEN_URL = "https://osu.ppy.sh/oauth/token"
    SEARCH_URL = "https://osu.ppy.sh/api/v2/beatmapsets/search"

    def __init__(self, client_id: int | None, client_secret: str | None) -> None:
        if not client_id or not client_secret:
            raise ValueError("OSU_CLIENT_ID/OSU_CLIENT_SECRET が未設定です。")
        self.client_id = client_id
        self.client_secret = client_secret
        self._token: str | None = None
        self._token_exp: float = 0.0
        self._client = httpx.AsyncClient(timeout=20, follow_redirects=True)
        self._cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self._cache_ttl = 3600  # seconds
        self._cache_lock = asyncio.Lock()

    async def _ensure_token(self) -> str:
        now = time.time()
        # 5分以上残っている場合は現在のトークンを使用
        if self._token and now < (self._token_exp - 300):
            return self._token

        print("DEBUG: Token expired or missing, getting new token...")
        return await self._get_new_token()

    async def _get_new_token(self) -> str:
        now = time.time()
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "client_credentials",
            "scope": "public",
        }
        resp = await self._client.post(self.TOKEN_URL, data=data)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"osu! token error: {resp.status_code} {resp.text}",
            )
        payload = resp.json()
        self._token = payload["access_token"]
        self._token_exp = now + payload.get("expires_in", 3600)
        return self._token

    async def search_beatmapsets(
        self,
        q: str = "",
        page: int = 1,
        limit: int = 20,
        s: str | None = None,
        m: str | None = None,
        e: str | None = None,
        c: str | None = None,
        g: str | None = None,
        l: str | None = None,  # noqa: E741
        nsfw: bool | None = None,
        sort: str | None = None,
        played: str | None = None,
        r: str | None = None,
    ) -> dict[str, Any]:
        token = await self._ensure_token()
        params = {"q": q, "page": page, "limit": limit}

        # osu! API v2は個別パラメータ形式をサポート
        # URL短縮形パラメータを追加
        if s is not None:
            params["s"] = s
        if m is not None:
            params["m"] = m
        if e is not None:
            params["e"] = e
        if c is not None:
            params["c"] = c
        if g is not None:
            params["g"] = g
        if l is not None:
            params["l"] = l
        if nsfw is not None:
            params["nsfw"] = str(nsfw).lower()
        if sort is not None:
            params["sort"] = sort
        if played is not None:
            params["played"] = played
        if r is not None:
            params["r"] = r

        # build cache key
        key = json.dumps(params, sort_keys=True, ensure_ascii=False)

        # serve from cache if fresh
        async with self._cache_lock:
            cached = self._cache.get(key)
            if cached:
                exp, data = cached
                if time.time() < exp:
                    print("DEBUG: Serving from cache")
                    return data
                else:
                    self._cache.pop(key, None)

        headers = {"Authorization": f"Bearer {token}"}

        # デバッグ: 実際に送信しているURLをログ出力
        import urllib.parse

        query_string = urllib.parse.urlencode(params)
        full_url = f"{self.SEARCH_URL}?{query_string}"
        print(f"DEBUG: Sending request to: {full_url}")

        resp = await self._client.get(self.SEARCH_URL, params=params, headers=headers)
        print(f"DEBUG: Response status: {resp.status_code}")

        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"osu! API error: {resp.status_code} {resp.text}",
            )

        result = resp.json()
        print(f"DEBUG: Response total: {result.get('total', 'unknown')}")
        # store to cache
        async with self._cache_lock:
            self._cache[key] = (time.time() + self._cache_ttl, result)
        return result
