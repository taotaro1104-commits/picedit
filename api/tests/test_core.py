import io

import numpy as np
import pytest
from PIL import Image

from app.core.image_io import decode_image, decode_mask, encode_image
from app.core.validation import ImageValidationError, validate_upload
from tests.conftest import encode, gradient_image


class TestValidateUpload:
    def test_accepts_supported_types(self) -> None:
        for mime in ("image/jpeg", "image/png", "image/webp", "image/heic"):
            validate_upload(content_type=mime, size=100, max_bytes=1000)

    def test_rejects_unsupported_type(self) -> None:
        with pytest.raises(ImageValidationError, match="対応していない"):
            validate_upload(content_type="application/pdf", size=100, max_bytes=1000)

    def test_rejects_too_large(self) -> None:
        with pytest.raises(ImageValidationError, match="大きすぎ"):
            validate_upload(content_type="image/png", size=1001, max_bytes=1000)

    def test_rejects_empty(self) -> None:
        with pytest.raises(ImageValidationError, match="空"):
            validate_upload(content_type="image/png", size=0, max_bytes=1000)


class TestDecodeEncode:
    def test_roundtrip_png(self) -> None:
        img = gradient_image()
        decoded = decode_image(encode(img), max_pixels=10**7)
        assert decoded.shape == img.shape
        assert np.array_equal(decoded, img)

    def test_rejects_garbage(self) -> None:
        with pytest.raises(ImageValidationError, match="読み込めません"):
            decode_image(b"not an image", max_pixels=10**7)

    def test_rejects_too_many_pixels(self) -> None:
        img = gradient_image(100, 100)
        with pytest.raises(ImageValidationError, match="解像度"):
            decode_image(encode(img), max_pixels=5000)

    def test_applies_exif_orientation(self) -> None:
        pil = Image.new("RGB", (40, 20), (255, 0, 0))
        exif = pil.getexif()
        exif[0x0112] = 6  # 90度回転
        buf = io.BytesIO()
        pil.save(buf, format="JPEG", exif=exif)
        decoded = decode_image(buf.getvalue(), max_pixels=10**7)
        assert decoded.shape[:2] == (40, 20)

    def test_rgba_is_flattened_to_bgr(self) -> None:
        pil = Image.new("RGBA", (10, 10), (0, 0, 255, 128))
        buf = io.BytesIO()
        pil.save(buf, format="PNG")
        decoded = decode_image(buf.getvalue(), max_pixels=10**7)
        assert decoded.shape == (10, 10, 3)

    def test_encode_jpeg_and_png(self) -> None:
        img = gradient_image()
        assert encode_image(img, "png")[:4] == b"\x89PNG"
        assert encode_image(img, "jpeg")[:2] == b"\xff\xd8"

    def test_encode_rejects_unknown_format(self) -> None:
        with pytest.raises(ValueError):
            encode_image(gradient_image(), "gif")

    def test_decode_mask_binarizes(self) -> None:
        mask = np.zeros((10, 10), np.uint8)
        mask[2:5, 2:5] = 200
        mask[6, 6] = 50
        out = decode_mask(encode(mask), max_pixels=10**7)
        assert set(np.unique(out)) == {0, 255}
        assert out[3, 3] == 255 and out[6, 6] == 0
