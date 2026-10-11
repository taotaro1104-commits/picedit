import json

import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.main import create_app
from app.providers.base import AITask, ProviderError
from tests.conftest import encode, gradient_image
from tests.test_realestate import exposures, keystone, room_with_verticals


def png_file(img: np.ndarray, name: str = "a.png") -> tuple[str, bytes, str]:
    return (name, encode(img), "image/png")


def decode_response(content: bytes) -> np.ndarray:
    return cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_UNCHANGED)


class FakeProvider:
    name = "fake"

    def __init__(self, fail: bool = False) -> None:
        self.fail = fail
        self.tasks: list[AITask] = []

    def available(self) -> bool:
        return True

    async def run(self, task: AITask, image_png: bytes) -> bytes:
        self.tasks.append(task)
        if self.fail:
            raise ProviderError("AI処理に失敗しました。")
        img = decode_response(image_png)
        return encode(cv2.resize(255 - img, None, fx=2, fy=2))


def test_health_reports_ai_unavailable(client: TestClient) -> None:
    body = client.get("/api/health").json()
    assert body["success"] is True
    assert body["data"]["ai"]["available"] is False


class TestValidationErrors:
    def test_rejects_wrong_mime(self, client: TestClient) -> None:
        res = client.post(
            "/api/restore/fade", files={"file": ("a.pdf", b"%PDF", "application/pdf")}
        )
        assert res.status_code == 400
        body = res.json()
        assert body["success"] is False and body["data"] is None
        assert body["code"] == "unsupported_type"
        assert "対応していない" in body["error"]

    def test_rejects_corrupt_image(self, client: TestClient) -> None:
        res = client.post("/api/restore/fade", files={"file": ("a.png", b"xxx", "image/png")})
        assert res.status_code == 400

    def test_rejects_oversize(self) -> None:
        app = create_app()
        app.state.settings.max_upload_bytes = 10
        res = TestClient(app).post("/api/restore/fade", files={"file": png_file(gradient_image())})
        assert res.status_code == 400 and "大きすぎ" in res.json()["error"]
        assert res.json()["code"] == "file_too_large"
        assert res.json()["params"] == {"limit_mb": 0}

    def test_rejects_out_of_range_param(self, client: TestClient) -> None:
        res = client.post(
            "/api/realestate/finish",
            files={"file": png_file(gradient_image())},
            data={"highlight": "3"},
        )
        assert res.status_code == 400
        assert res.json()["code"] == "param_range"
        assert res.json()["params"] == {"name": "highlight"}


class TestRealEstateApi:
    def test_auto_vertical(self, client: TestClient) -> None:
        img = keystone(room_with_verticals(), 0.08)
        res = client.post("/api/realestate/auto-vertical", files={"file": png_file(img)})
        assert res.status_code == 200
        assert res.headers["content-type"] == "image/png"
        assert res.headers["x-picedit-applied"] == "true"
        assert res.headers["cache-control"] == "no-store"

    def test_perspective(self, client: TestClient) -> None:
        pts = json.dumps([[10, 10], [500, 20], [510, 400], [5, 420]])
        res = client.post(
            "/api/realestate/perspective",
            files={"file": png_file(room_with_verticals())},
            data={"points": pts},
        )
        assert res.status_code == 200

    def test_perspective_bad_json(self, client: TestClient) -> None:
        res = client.post(
            "/api/realestate/perspective",
            files={"file": png_file(room_with_verticals())},
            data={"points": "nope"},
        )
        assert res.status_code == 400

    def test_hdr(self, client: TestClient) -> None:
        files = [("files", png_file(img, f"{i}.png")) for i, img in enumerate(exposures())]
        res = client.post("/api/realestate/hdr?format=jpeg", files=files)
        assert res.status_code == 200 and res.headers["content-type"] == "image/jpeg"

    def test_hdr_too_many(self, client: TestClient) -> None:
        files = [("files", png_file(gradient_image(), f"{i}.png")) for i in range(6)]
        assert client.post("/api/realestate/hdr", files=files).status_code == 400

    def test_finish(self, client: TestClient) -> None:
        res = client.post(
            "/api/realestate/finish",
            files={"file": png_file(gradient_image())},
            data={"white_balance": "true", "highlight": "0.4", "clahe": "false"},
        )
        assert res.status_code == 200
        assert decode_response(res.content).shape == (150, 200, 3)


class TestRestoreApi:
    def test_fade(self, client: TestClient) -> None:
        res = client.post("/api/restore/fade", files={"file": png_file(gradient_image())})
        assert res.status_code == 200

    def test_scratch_mask_and_inpaint(self, client: TestClient) -> None:
        img = gradient_image(300, 200)
        cv2.line(img, (20, 30), (280, 170), (255, 255, 255), 2)
        res = client.post(
            "/api/restore/scratch-mask",
            files={"file": png_file(img)},
            data={"sensitivity": "0.6"},
        )
        assert res.status_code == 200
        mask = decode_response(res.content)
        assert mask.ndim == 2 and mask.max() == 255

        res2 = client.post(
            "/api/restore/inpaint",
            files={"file": png_file(img), "mask": ("m.png", res.content, "image/png")},
        )
        assert res2.status_code == 200

    def test_inpaint_mask_size_mismatch(self, client: TestClient) -> None:
        res = client.post(
            "/api/restore/inpaint",
            files={
                "file": png_file(gradient_image()),
                "mask": png_file(np.zeros((5, 5), np.uint8), "m.png"),
            },
        )
        assert res.status_code == 400

    def test_ai_unavailable_returns_503(self, client: TestClient) -> None:
        res = client.post("/api/restore/ai/upscale", files={"file": png_file(gradient_image())})
        assert res.status_code == 503 and res.json()["success"] is False
        assert res.json()["code"] == "ai_unavailable"

    def test_ai_unknown_task(self, client: TestClient) -> None:
        res = client.post("/api/restore/ai/magic", files={"file": png_file(gradient_image())})
        assert res.status_code == 422
        assert res.json()["code"] == "invalid_request"

    def test_ai_upscale_with_strength(self) -> None:
        provider = FakeProvider()
        c = TestClient(create_app(provider=provider))
        res = c.post(
            "/api/restore/ai/upscale",
            files={"file": png_file(gradient_image())},
            data={"strength": "1"},
        )
        assert res.status_code == 200
        assert decode_response(res.content).shape == (300, 400, 3)
        assert provider.tasks == [AITask.UPSCALE]

    def test_ai_face_restore_keeps_original_size(self) -> None:
        c = TestClient(create_app(provider=FakeProvider()))
        res = c.post(
            "/api/restore/ai/face_restore",
            files={"file": png_file(gradient_image())},
            data={"strength": "0.7"},
        )
        assert res.status_code == 200
        assert decode_response(res.content).shape == (150, 200, 3)
        assert res.headers["x-picedit-faces"] == "0"

    def test_ai_provider_error_returns_502(self) -> None:
        c = TestClient(create_app(provider=FakeProvider(fail=True)))
        res = c.post("/api/restore/ai/colorize", files={"file": png_file(gradient_image())})
        assert res.status_code == 502
        assert res.json()["code"] == "ai_failed"


class TestConvertApi:
    def test_convert_returns_jpeg(self, client: TestClient) -> None:
        res = client.post("/api/convert", files={"file": png_file(gradient_image())})
        assert res.status_code == 200
        assert res.headers["content-type"] == "image/jpeg"
        assert decode_response(res.content).shape == (150, 200, 3)

    def test_convert_rejects_garbage(self, client: TestClient) -> None:
        res = client.post("/api/convert", files={"file": ("a.heic", b"zz", "image/heic")})
        assert res.status_code == 400


def test_internal_error_returns_code() -> None:
    app = create_app()

    @app.get("/api/boom")
    def boom() -> None:
        raise RuntimeError("secret detail")

    res = TestClient(app, raise_server_exceptions=False).get("/api/boom")
    assert res.status_code == 500
    assert res.json()["code"] == "internal_error"
    assert "secret" not in res.text
