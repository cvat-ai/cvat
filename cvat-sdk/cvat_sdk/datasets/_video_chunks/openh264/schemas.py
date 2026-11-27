# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import attrs
import PIL.Image

# Lookup tables that expand limited-range components (Y 16-235, CbCr 16-240) to full range.
_LIMITED_RANGE_LUMA_LUT = tuple(
    max(0, min(255, round((value - 16) * 255 / 219))) for value in range(256)
)
_LIMITED_RANGE_CHROMA_LUT = tuple(
    max(0, min(255, round((value - 128) * 255 / 224 + 128))) for value in range(256)
)


@attrs.frozen
class VideoFrame:
    planes: tuple[PIL.Image.Image, PIL.Image.Image, PIL.Image.Image]

    def to_image(self) -> PIL.Image.Image:
        y_plane, u_plane, v_plane = self.planes

        # CVAT video chunks don't signal a color range, and an H.264 stream without
        # that flag is limited range. Pillow's YCbCr conversion expects full-range
        # components, so expand the planes before converting to RGB.
        return PIL.Image.merge(
            "YCbCr",
            (
                y_plane.point(_LIMITED_RANGE_LUMA_LUT),
                u_plane.point(_LIMITED_RANGE_CHROMA_LUT).resize(
                    y_plane.size, PIL.Image.Resampling.BILINEAR
                ),
                v_plane.point(_LIMITED_RANGE_CHROMA_LUT).resize(
                    y_plane.size, PIL.Image.Resampling.BILINEAR
                ),
            ),
        ).convert("RGB")
