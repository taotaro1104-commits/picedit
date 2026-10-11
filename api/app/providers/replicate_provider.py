"""Replicate HTTP API を使う推論プロバイダー。

流れ: 画像を /v1/files にアップロード → モデルの最新バージョンを解決 →
/v1/predictions を作成（Prefer: wait）→ 完了までポーリング → 出力URLをダウンロード。
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Collection, Mapping
from typing import Any
from urllib.parse import urlsplit

import httpx

from app.providers.base import AITask, ProviderError, ProviderUnavailableError

logger = logging.getLogger(__name__)

API_BASE = "https://api.replicate.com/v1"
_TERMINAL_FAIL = {"failed", "canceled"}
# 推論結果のダウンロード先として許可するホスト（サブドメインを含む）
TRUSTED_OUTPUT_HOSTS: tuple[str, ...] = ("replicate.delivery", "replicate.com")


def is_trusted_output_url(url: str, hosts: Collection[str] = TRUSTED_OUTPUT_HOSTS) -> bool:
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    return parts.scheme == "https" and any(host == h or host.endswith("." + h) for h in hosts)


def build_input(task: AITask, image_url: str) -> dict[str, Any]:
    """タスクごとのモデル入力。モデルを差し替える場合はここを合わせる。"""
    if task is AITask.UPSCALE:
        return {"image": image_url, "scale": 2, "face_enhance": False}
    if task is AITask.COLORIZE:
        return {"image": image_url, "model_size": "large"}
    return {"img": image_url, "version": "v1.4", "scale": 2}


class ReplicateProvider:
    name = "replicate"

    def __init__(
        self,
        *,
        token: str | None,
        models: Mapping[AITask, str],
        timeout_seconds: float = 180.0,
        poll_interval: float = 1.5,
        transport: httpx.AsyncBaseTransport | None = None,
        output_hosts: Collection[str] = TRUSTED_OUTPUT_HOSTS,
    ) -> None:
        self._token = token
        self._models = dict(models)
        self._timeout = timeout_seconds
        self._poll_interval = poll_interval
        self._transport = transport
        self._versions: dict[str, str] = {}
        self._output_hosts = tuple(output_hosts)

    def available(self) -> bool:
        return bool(self._token)

    async def run(self, task: AITask, image_png: bytes) -> bytes:
        if not self.available():
            raise ProviderUnavailableError("AI機能は現在利用できません（APIトークン未設定）。")
        headers = {"Authorization": f"Bearer {self._token}"}
        async with httpx.AsyncClient(
            headers=headers, timeout=60.0, transport=self._transport
        ) as client:
            try:
                return await self._run(client, task, image_png)
            except httpx.HTTPError as exc:
                logger.exception("replicate request failed: task=%s", task)
                raise ProviderError("AI処理サービスとの通信に失敗しました。", "ai_network") from exc

    async def _run(self, client: httpx.AsyncClient, task: AITask, image_png: bytes) -> bytes:
        image_url = await self._upload(client, image_png)
        version = await self._resolve_version(client, self._models[task])
        resp = await client.post(
            f"{API_BASE}/predictions",
            json={"version": version, "input": build_input(task, image_url)},
            headers={"Prefer": "wait=30"},
        )
        resp.raise_for_status()
        prediction = await self._wait(client, resp.json())
        return await self._download(client, prediction.get("output"))

    async def _upload(self, client: httpx.AsyncClient, image_png: bytes) -> str:
        files = {"content": ("image.png", image_png, "image/png")}
        resp = await client.post(f"{API_BASE}/files", files=files)
        resp.raise_for_status()
        return str(resp.json()["urls"]["get"])

    async def _resolve_version(self, client: httpx.AsyncClient, model: str) -> str:
        if model not in self._versions:
            resp = await client.get(f"{API_BASE}/models/{model}")
            resp.raise_for_status()
            self._versions[model] = str(resp.json()["latest_version"]["id"])
        return self._versions[model]

    async def _wait(self, client: httpx.AsyncClient, prediction: dict[str, Any]) -> dict[str, Any]:
        deadline = time.monotonic() + self._timeout
        get_url = prediction.get("urls", {}).get("get")
        while prediction.get("status") != "succeeded":
            status = prediction.get("status")
            if status in _TERMINAL_FAIL:
                logger.error("replicate prediction %s: %s", status, prediction.get("error"))
                raise ProviderError("AI処理に失敗しました。別の画像でお試しください。")
            if time.monotonic() > deadline:
                raise ProviderError(
                    "AI処理に時間がかかりすぎています。時間をおいて再度お試しください。",
                    "ai_timeout",
                )
            await asyncio.sleep(self._poll_interval)
            resp = await client.get(get_url)
            resp.raise_for_status()
            prediction = resp.json()
        return prediction

    async def _download(self, client: httpx.AsyncClient, output: Any) -> bytes:
        url = output[0] if isinstance(output, list) and output else output
        if not isinstance(url, str) or not is_trusted_output_url(url, self._output_hosts):
            logger.error("untrusted replicate output url: %r", url)
            raise ProviderError("AI処理の結果を取得できませんでした。", "ai_no_result")
        # 出力は配信用CDNにあるため、APIトークンは送らない
        async with httpx.AsyncClient(timeout=60.0, transport=self._transport) as plain:
            resp = await plain.get(url)
        resp.raise_for_status()
        return resp.content
