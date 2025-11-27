import time
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException


class OsuApiClient:
    """
    osu! v2 を素の HTTP で叩く軽量クライアント。
    先人リポジトリがやっている「client_credentials でトークン取得→ /api/v2/beatmapsets/search」を踏襲。
    """

    TOKEN_URL = "https://osu.ppy.sh/oauth/token"
    SEARCH_URL = "https://osu.ppy.sh/api/v2/beatmapsets/search"

    def __init__(self, client_id: Optional[int], client_secret: Optional[str]) -> None:
        if not client_id or not client_secret:
            raise ValueError("OSU_CLIENT_ID/OSU_CLIENT_SECRET が未設定です。")
        self.client_id = client_id
        self.client_secret = client_secret
        self._token: Optional[str] = None
        self._token_exp: float = 0.0
        self._client = httpx.AsyncClient(timeout=20, follow_redirects=True)

    async def _ensure_token(self) -> str:
        now = time.time()
        if self._token and now < self._token_exp - 30:
            return self._token

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "client_credentials",
            "scope": "public",
        }
        resp = await self._client.post(self.TOKEN_URL, data=data)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"osu! token error: {resp.status_code} {resp.text}")
        payload = resp.json()
        self._token = payload["access_token"]
        self._token_exp = now + payload.get("expires_in", 3600)
        return self._token

    async def search_beatmapsets(self, q: str, page: int = 1, limit: int = 20) -> Dict[str, Any]:
        token = await self._ensure_token()
        params = {"q": q, "page": page, "limit": limit}
        headers = {"Authorization": f"Bearer {token}"}
        resp = await self._client.get(self.SEARCH_URL, params=params, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"osu! API error: {resp.status_code} {resp.text}")
        return resp.json()
