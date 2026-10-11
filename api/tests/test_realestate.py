import cv2
import numpy as np
import pytest

from app.core.validation import ImageValidationError
from app.pipelines.realestate.hdr import merge_exposures
from app.pipelines.realestate.perspective import (
    auto_vertical_correction,
    manual_perspective,
    measure_vertical_deviation,
)
from app.pipelines.realestate.tone import (
    clahe_enhance,
    compress_highlights,
    finish_interior,
    gray_world_white_balance,
)
from tests.conftest import gradient_image


def room_with_verticals(w: int = 600, h: int = 450) -> np.ndarray:
    img = np.full((h, w, 3), 230, np.uint8)
    for x in range(60, w, 80):
        cv2.line(img, (x, 20), (x, h - 20), (40, 40, 40), 3)
    return img


def keystone(img: np.ndarray, shrink: float) -> np.ndarray:
    """上辺を内側に縮めて、カメラを上に傾けた時の歪みを再現する。"""
    h, w = img.shape[:2]
    d = w * shrink
    src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    dst = np.float32([[d, 0], [w - d, 0], [w, h], [0, h]])
    m = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(img, m, (w, h), borderValue=(230, 230, 230))


class TestPerspective:
    def test_measure_detects_keystone(self) -> None:
        dev = measure_vertical_deviation(keystone(room_with_verticals(), 0.08))
        assert dev is not None and dev > 2.0

    def test_auto_correction_straightens_lines(self) -> None:
        distorted = keystone(room_with_verticals(), 0.08)
        result = auto_vertical_correction(distorted)
        assert result.applied
        after = measure_vertical_deviation(result.image)
        assert after is not None and after < 1.0

    def test_auto_correction_skips_without_lines(self) -> None:
        img = gradient_image()
        result = auto_vertical_correction(img)
        assert not result.applied
        assert np.array_equal(result.image, img)

    def test_auto_correction_skips_already_straight(self) -> None:
        img = room_with_verticals()
        result = auto_vertical_correction(img)
        assert not result.applied

    def test_manual_perspective_output_size(self) -> None:
        img = room_with_verticals()
        pts = [(10, 10), (500, 20), (510, 400), (5, 420)]
        out = manual_perspective(img, pts)
        assert out.shape[0] > 350 and out.shape[1] > 450

    def test_manual_perspective_rejects_bad_points(self) -> None:
        with pytest.raises(ImageValidationError):
            manual_perspective(room_with_verticals(), [(0, 0), (1, 1), (2, 2)])
        with pytest.raises(ImageValidationError):
            manual_perspective(room_with_verticals(), [(0, 0), (0, 0), (0, 0), (0, 0)])


def exposures() -> list[np.ndarray]:
    base = gradient_image(160, 120).astype(np.float32)
    # 室内（暗部）と窓（明部）を模した強いコントラスト
    base[:, 100:] = np.clip(base[:, 100:] * 1.6, 0, 255)
    return [np.clip(base * f, 0, 255).astype(np.uint8) for f in (0.35, 1.0, 2.2)]


class TestHdr:
    def test_merge_reduces_clipping(self) -> None:
        dark, normal, bright = exposures()
        merged = merge_exposures([dark, normal, bright])
        assert merged.shape == normal.shape and merged.dtype == np.uint8
        assert (merged >= 250).mean() < (bright >= 250).mean()
        assert (merged <= 20).mean() <= (dark <= 20).mean()

    def test_merge_resizes_mismatched_inputs(self) -> None:
        dark, normal, bright = exposures()
        bright_big = cv2.resize(bright, (320, 240))
        merged = merge_exposures([normal, dark, bright_big])
        assert merged.shape == normal.shape

    @pytest.mark.parametrize("count", [1, 6])
    def test_merge_rejects_bad_count(self, count: int) -> None:
        with pytest.raises(ImageValidationError):
            merge_exposures([gradient_image()] * count)


class TestTone:
    def test_gray_world_removes_cast(self) -> None:
        img = gradient_image().astype(np.float32)
        img[..., 2] = np.clip(img[..., 2] * 1.4, 0, 255)  # 赤かぶり
        out = gray_world_white_balance(img.astype(np.uint8))
        means = out.reshape(-1, 3).mean(axis=0)
        assert means.max() - means.min() < 6

    def test_compress_highlights_only_affects_bright(self) -> None:
        img = np.zeros((50, 100, 3), np.uint8)
        img[:, :50] = 60
        img[:, 50:] = 252
        out = compress_highlights(img, strength=0.6)
        assert out[:, 50:].mean() < 245
        assert abs(int(out[0, 0, 0]) - 60) <= 2

    def test_compress_highlights_zero_is_identity(self) -> None:
        img = gradient_image()
        assert np.array_equal(compress_highlights(img, strength=0.0), img)

    def test_clahe_increases_contrast(self) -> None:
        img = gradient_image()
        low = (img.astype(np.float32) * 0.2 + 100).astype(np.uint8)
        assert clahe_enhance(low).std() > low.std()

    def test_finish_interior_combines(self) -> None:
        img = gradient_image()
        out = finish_interior(img, white_balance=True, highlight=0.5, clahe=True)
        assert out.shape == img.shape
        same = finish_interior(img, white_balance=False, highlight=0.0, clahe=False)
        assert np.array_equal(same, img)
