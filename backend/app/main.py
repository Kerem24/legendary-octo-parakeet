from __future__ import annotations

import asyncio
import json
import os
from typing import AsyncIterator

import httpx
from asyncache import cached
from cachetools import TTLCache
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets"
CACHE = TTLCache(maxsize=1, ttl=5)

app = FastAPI(title="Crypto Pulse", version="1.0.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in frontend_origin.split(",") if origin.strip()]
if "*" in allowed_origins:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@cached(CACHE)
async def fetch_top_cryptos() -> list[dict]:
    params = {
        "vs_currency": "usd",
        "order": "market_cap_desc",
        "per_page": 10,
        "page": 1,
        "sparkline": "false",
        "price_change_percentage": "24h",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(COINGECKO_URL, params=params)
        response.raise_for_status()
        data = response.json()
    return [
        {
            "id": item["id"],
            "name": item["name"],
            "symbol": item["symbol"].upper(),
            "image": item["image"],
            "price": item["current_price"],
            "change_24h": item.get("price_change_percentage_24h"),
            "market_cap": item.get("market_cap"),
        }
        for item in data
    ]


@app.get("/api/crypto")
async def get_crypto_prices() -> list[dict]:
    return await fetch_top_cryptos()


async def event_generator() -> AsyncIterator[str]:
    while True:
        try:
            payload = await fetch_top_cryptos()
            yield json.dumps({"status": "ok", "data": payload})
        except httpx.HTTPError as exc:
            yield json.dumps({"status": "error", "message": str(exc)})
        await asyncio.sleep(10)


@app.get("/api/crypto/stream")
async def stream_crypto_prices() -> EventSourceResponse:
    return EventSourceResponse(event_generator())
