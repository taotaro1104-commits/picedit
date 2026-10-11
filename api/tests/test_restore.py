import cv2
import numpy as np
import pytest

from app.core.validation import ImageValidationError
from app.pipelines.restore.blend import blend_in_regions, blend_strength, match_size
from app.pipelines.restore.faces import detect_faces
from app.pipelines.restore.fade import auto_levels, restore_faded
from app.pipelines.restore.scratch import combine_masks, detect_scratches, inpaint_scratches
from tests.conftest import gradient_image


def faded(img: np.ndarray) -> np.ndarray:
    f = img.astype(np.float32) * 0.45 + 110
    f[..., 0] -= 25  # 黄ばみ（青が減る）
    return np.clip(f, 0, 255).astype(np.uint8)


class TestFade:
    def test_auto_levels_stretches_each_channel(self) -> None:
        out = auto_levels(faded(gradient_image()), clip_percent=0.5)
        for c in range(3):
            assert out[..., c].min() <= 10 and out[..., c].max() >= 245

    def test_auto_levels_flat_channel_is_safe(self) -> None:
        flat = np.full((20, 20, 3), 128, np.uint8)
        assert np.array_equal(auto_levels(flat), flat)

    def test_auto_levels_rejects_bad_clip(self) -> None:
        with pytest.raises(ImageValidationError):
            auto_levels(gradient_image(), clip_percent=30)

    def test_restore_faded_increases_contrast(self) -> None:
        src = faded(gradient_image())
        assert restore_faded(src).std() > src.std() * 1.5
        assert restore_faded(src, clahe=False).shape == src.shape


def scratched() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    clean = cv2.GaussianBlur(gradient_image(300, 200), (0, 0), 3)
    img = clean.copy()
    truth = np.zeros(clean.shape[:2], np.uint8)
    cv2.line(img, (20, 30), (280, 170), (250, 250, 250), 2)
    cv2.line(truth, (20, 30), (280, 170), 255, 2)
    cv2.line(img, (40, 180), (260, 20), (15, 15, 15), 2)
    cv2.line(truth, (40, 180), (260, 20), 255, 2)
    return clean, img, truth


class TestScratch:
    def test_detects_bright_and_dark_scratches(self) -> None:
        _, img, truth = scratched()
        mask = detect_scratches(img, sensitivity=0.5)
        hit = (mask > 0) & (truth > 0)
        recall = hit.sum() / (truth > 0).sum()
        false_pos = ((mask > 0) & (cv2.dilate(truth, np.ones((9, 9))) == 0)).mean()
        assert recall > 0.8
        assert false_pos < 0.01

    def test_clean_image_has_almost_empty_mask(self) -> None:
        clean, _, _ = scratched()
        assert (detect_scratches(clean, sensitivity=0.5) > 0).mean() < 0.005

    def test_combine_masks(self) -> None:
        auto = np.zeros((4, 4), np.uint8)
        auto[0, :] = 255
        add = np.zeros_like(auto)
        add[3, 3] = 255
        remove = np.zeros_like(auto)
        remove[0, 0] = 255
        out = combine_masks(auto, add=add, remove=remove)
        assert out[0, 0] == 0 and out[0, 1] == 255 and out[3, 3] == 255
        assert np.array_equal(combine_masks(auto), auto)

    def test_combine_masks_rejects_shape_mismatch(self) -> None:
        with pytest.raises(ImageValidationError):
            combine_masks(np.zeros((4, 4), np.uint8), add=np.zeros((5, 5), np.uint8))

    def test_inpaint_restores_region(self) -> None:
        clean, img, truth = scratched()
        mask = cv2.dilate(truth, np.ones((3, 3), np.uint8))
        out = inpaint_scratches(img, mask)
        region = mask > 0
        err_before = np.abs(img.astype(int) - clean.astype(int))[region].mean()
        err_after = np.abs(out.astype(int) - clean.astype(int))[region].mean()
        assert err_after < err_before * 0.2

    def test_inpaint_rejects_mask_mismatch(self) -> None:
        with pytest.raises(ImageValidationError):
            inpaint_scratches(gradient_image(), np.zeros((3, 3), np.uint8))


class TestBlend:
    def test_blend_strength_endpoints(self) -> None:
        a = np.zeros((10, 10, 3), np.uint8)
        b = np.full((10, 10, 3), 200, np.uint8)
        assert np.array_equal(blend_strength(a, b, 0.0), a)
        assert np.array_equal(blend_strength(a, b, 1.0), b)
        assert blend_strength(a, b, 0.5)[0, 0, 0] == 100

    def test_blend_strength_resizes_original(self) -> None:
        a = np.zeros((10, 10, 3), np.uint8)
        b = np.full((20, 20, 3), 200, np.uint8)
        assert blend_strength(a, b, 0.5).shape == (20, 20, 3)

    def test_match_size(self) -> None:
        img = np.zeros((10, 20, 3), np.uint8)
        assert match_size(img, (40, 30)).shape == (30, 40, 3)
        assert match_size(img, (20, 10)) is img

    def test_blend_in_regions_keeps_outside(self) -> None:
        a = np.zeros((100, 100, 3), np.uint8)
        b = np.full((100, 100, 3), 200, np.uint8)
        out = blend_in_regions(a, b, [(30, 30, 40, 40)], strength=1.0)
        assert out[0, 0, 0] == 0
        assert out[50, 50, 0] >= 190

    def test_blend_in_regions_without_boxes_returns_original(self) -> None:
        a = np.zeros((10, 10, 3), np.uint8)
        b = np.full((10, 10, 3), 200, np.uint8)
        assert np.array_equal(blend_in_regions(a, b, [], strength=1.0), a)

    def test_blend_rejects_bad_strength(self) -> None:
        a = np.zeros((10, 10, 3), np.uint8)
        with pytest.raises(ImageValidationError):
            blend_strength(a, a, 1.5)


def test_detect_faces_on_blank_returns_empty() -> None:
    assert detect_faces(gradient_image()) == []
