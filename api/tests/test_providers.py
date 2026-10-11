import asyncio
import json

import httpx
import pytest

from app.providers.base import AITask, ProviderError, ProviderUnavailableError
from app.providers.null_provider import NullProvider
from app.providers.replicate_provider import ReplicateProvider

MODELS = {
    AITask.UPSCALE: "owner/esrgan",
    AITask.COLORIZE: "owner/ddcolor",
    AITask.FACE_RESTORE: "owner/gfpgan",
}


def run(coro):
    return asyncio.run(coro)


def make_handler(final_status: str = "succeeded", polls: int = 1):
    state = {"polls": 0, "requests": []}

    def handler(request: httpx.Request) -> httpx.Response:
        state["requests"].append(request)
        url = str(request.url)
        if url == "https://out/result.png":
            assert "Authorization" not in request.headers
            return httpx.Response(200, content=b"PNGDATA")
        assert request.headers["Authorization"] == "Bearer tok"
        if url.endswith("/v1/files"):
            return httpx.Response(201, json={"urls": {"get": "https://api/files/abc"}})
        if "/v1/models/" in url:
            return httpx.Response(200, json={"latest_version": {"id": "ver123"}})
        if url.endswith("/v1/predictions"):
            body = json.loads(request.content)
            state["input"] = body["input"]
            assert body["version"] == "ver123"
            return httpx.Response(
                201, json={"status": "starting", "urls": {"get": "https://api/pred/1"}}
            )
        if url == "https://api/pred/1":
            state["polls"] += 1
            if state["polls"] < polls:
                return httpx.Response(200, json={"status": "processing"})
            if final_status == "succeeded":
                return httpx.Response(
                    200, json={"status": "succeeded", "output": ["https://out/result.png"]}
                )
            return httpx.Response(200, json={"status": "failed", "error": "boom"})
        return httpx.Response(404)

    return handler, state


def make_provider(handler, token: str | None = "tok") -> ReplicateProvider:
    return ReplicateProvider(
        token=token,
        models=MODELS,
        timeout_seconds=5,
        poll_interval=0,
        transport=httpx.MockTransport(handler),
        output_hosts=("out",),
    )


def test_null_provider_unavailable() -> None:
    provider = NullProvider()
    assert provider.available() is False
    with pytest.raises(ProviderUnavailableError):
        run(provider.run(AITask.UPSCALE, b"x"))


def test_replicate_unavailable_without_token() -> None:
    handler, _ = make_handler()
    provider = make_provider(handler, token=None)
    assert provider.available() is False
    with pytest.raises(ProviderUnavailableError):
        run(provider.run(AITask.UPSCALE, b"x"))


def test_replicate_success_flow_with_polling() -> None:
    handler, state = make_handler(polls=3)
    provider = make_provider(handler)
    assert provider.available() is True
    result = run(provider.run(AITask.UPSCALE, b"img"))
    assert result == b"PNGDATA"
    assert state["polls"] == 3
    assert state["input"]["image"] == "https://api/files/abc"


def test_replicate_face_restore_uses_img_key() -> None:
    handler, state = make_handler()
    run(make_provider(handler).run(AITask.FACE_RESTORE, b"img"))
    assert state["input"]["img"] == "https://api/files/abc"


def test_replicate_failure_raises_provider_error() -> None:
    handler, _ = make_handler(final_status="failed")
    with pytest.raises(ProviderError, match="失敗"):
        run(make_provider(handler).run(AITask.COLORIZE, b"img"))


def test_replicate_http_error_raises_provider_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"detail": "server"})

    with pytest.raises(ProviderError):
        run(make_provider(handler).run(AITask.COLORIZE, b"img"))


def test_replicate_timeout() -> None:
    handler, _ = make_handler(polls=10**6)
    provider = ReplicateProvider(
        token="tok",
        models=MODELS,
        timeout_seconds=0.05,
        poll_interval=0.01,
        transport=httpx.MockTransport(handler),
    )
    with pytest.raises(ProviderError, match="時間") as info:
        run(provider.run(AITask.UPSCALE, b"img"))
    assert info.value.code == "ai_timeout"


def test_replicate_rejects_untrusted_output_host() -> None:
    base_handler, _ = make_handler()

    def handler(request: httpx.Request) -> httpx.Response:
        if str(request.url) == "https://api/pred/1":
            return httpx.Response(
                200, json={"status": "succeeded", "output": "https://169.254.169.254/latest"}
            )
        return base_handler(request)

    with pytest.raises(ProviderError, match="取得できません"):
        run(make_provider(handler).run(AITask.UPSCALE, b"img"))


def test_is_trusted_output_url() -> None:
    from app.providers.replicate_provider import is_trusted_output_url

    assert is_trusted_output_url("https://replicate.delivery/pbxt/abc/out.png")
    assert is_trusted_output_url("https://xezq.replicate.delivery/a.png")
    assert not is_trusted_output_url("http://replicate.delivery/a.png")
    assert not is_trusted_output_url("https://replicate.delivery.evil.com/a.png")
    assert not is_trusted_output_url("https://example.com/a.png")
