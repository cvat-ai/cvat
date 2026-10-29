# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import attrs
import PIL.Image

# Constant-time BT.601 limited-to-full-range lookup tables.
_LIMITED_RANGE_LUMA_LUT = tuple(
    max(0, min(255, round((value - 16) * 255 / 219))) for value in range(256)
)
_LIMITED_RANGE_CHROMA_LUT = tuple(
    max(0, min(255, round((value - 128) * 255 / 224 + 128))) for value in range(256)
)


@attrs.frozen
class VideoFrame:
    width: int
    height: int
    planes: tuple[PIL.Image.Image, PIL.Image.Image, PIL.Image.Image] = attrs.field(repr=False)
    format: str = "yuv420p"

    def to_image(self) -> PIL.Image.Image:
        y_plane, u_plane, v_plane = self.planes

        # H.264 defaults to limited-range yuv420p, but Pillow's YCbCr conversion expects
        # full-range components, so expand the planes before converting to RGB.
        return PIL.Image.merge(
            "YCbCr",
            (
                y_plane.point(_LIMITED_RANGE_LUMA_LUT),
                u_plane.point(_LIMITED_RANGE_CHROMA_LUT).resize(
                    (self.width, self.height), PIL.Image.Resampling.BILINEAR
                ),
                v_plane.point(_LIMITED_RANGE_CHROMA_LUT).resize(
                    (self.width, self.height), PIL.Image.Resampling.BILINEAR
                ),
            ),
        ).convert("RGB")
