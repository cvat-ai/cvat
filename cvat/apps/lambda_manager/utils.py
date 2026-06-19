# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import numpy as np
from django.core.exceptions import ValidationError
from PIL import Image
from rest_framework import status


class ROIHelper:
    """
    Utilities for running automatic annotations functions on a cropped region of an image.

    Public API requests pass ROI as image coordinates: [xtl, ytl, xbr, ybr].
    Lambda functions still receive only an image, so the server crops the image
    before invocation and then maps prompts/results between these coordinate
    spaces:
    """

    MIN_ROI_SIZE = 128

    @classmethod
    def parse_roi(cls, image_width: int, image_height: int, roi: list | None) -> dict | None:
        """
        Validate request ROI and normalize it to a named internal structure.

        The returned dict intentionally carries named keys even though the
        request payload is a four-item list. That keeps the crop and translation
        code explicit at call sites and avoids relying on positional indexes
        after validation.
        """
        if roi is None:
            return None

        try:
            assert isinstance(roi, list) and len(roi) == 4
            xtl, ytl, xbr, ybr = (int(coordinate) for coordinate in roi)
        except (TypeError, ValueError, AssertionError) as ex:
            raise ValidationError(
                "ROI must contain four integer coordinates: [xtl, ytl, xbr, ybr]",
                code=status.HTTP_400_BAD_REQUEST,
            ) from ex

        if xtl < 0 or ytl < 0 or xbr > image_width or ybr > image_height:
            raise ValidationError("ROI is outside the image", code=status.HTTP_400_BAD_REQUEST)

        if xbr - xtl < cls.MIN_ROI_SIZE or ybr - ytl < cls.MIN_ROI_SIZE:
            raise ValidationError(
                f"ROI size must be at least {cls.MIN_ROI_SIZE}x{cls.MIN_ROI_SIZE}px",
                code=status.HTTP_400_BAD_REQUEST,
            )

        return {"xtl": xtl, "ytl": ytl, "xbr": xbr, "ybr": ybr}

    @staticmethod
    def crop_image(image: Image.Image, roi: dict | None) -> Image.Image:
        """
        Return an ROI crop when ROI is specified, otherwise return the source image.

        The caller is responsible for parsing and validating ROI against the
        image dimensions before calling this method.
        """
        if roi is None:
            return image

        cropped_image = image.crop((roi["xtl"], roi["ytl"], roi["xbr"], roi["ybr"]))
        cropped_image.format = image.format
        return cropped_image

    @staticmethod
    def _translate_anno_points(points, *, dx: int, dy: int):
        """
        Translate a flat annotation point list: [x0, y0, x1, y1, ...].

        This format is used by ordinary CVAT annotation shapes and mask bounds,
        not by interactor prompts.
        """
        return [coordinate + (dx if idx % 2 == 0 else dy) for idx, coordinate in enumerate(points)]

    @staticmethod
    def translate_prompt_points(points, *, dx: int, dy: int):
        """
        Translate interactor prompt points between full-image and ROI-local space.

        Interactor prompts use nested point pairs: [[x, y], ...]. This is
        different from annotation shape points, which are flat coordinate lists.
        """
        if points is None:
            return None

        try:
            return [[x + dx, y + dy] for x, y in points]
        except (TypeError, ValueError) as ex:
            raise ValidationError("Interactor prompt points must contain point pairs") from ex

    @classmethod
    def translate_detector_shapes(cls, shapes, *, dx: int, dy: int):
        """
        Translate detector result shapes in-place and return them.

        Detector outputs and SAM plugin outputs can contain nested elements and
        masks. All coordinate-bearing fields must move from ROI-local space back
        to full-image space before CVAT stores or renders them.
        """

        def translate_shape(annotation):
            anno_type = annotation.get("type")
            if anno_type == "tag":
                return annotation

            if anno_type != "mask" and "points" in annotation:
                annotation["points"] = cls._translate_anno_points(
                    annotation["points"], dx=dx, dy=dy
                )

            if anno_type == "mask" and "points" in annotation:
                annotation["points"] = [
                    *annotation["points"][:-4],
                    *cls._translate_anno_points(annotation["points"][-4:], dx=dx, dy=dy),
                ]

            for element in annotation.get("elements", []):
                translate_shape(element)

            return annotation

        for shape in shapes:
            translate_shape(shape)

        return shapes

    @classmethod
    def translate_interactor_response(
        cls, response, *, roi: dict, image_width: int, image_height: int
    ):
        """
        Move interactor results from ROI-local coordinates back to full image.

        Interactors can return a dense mask or CVAT-like shapes. This method
        keeps the response shape intact while translating the coordinate content
        that was produced against the cropped ROI image.
        """
        if "mask" in response:
            crop_mask = np.array(response["mask"])
            full_mask = np.zeros((image_height, image_width), dtype=crop_mask.dtype)
            full_mask[roi["ytl"] : roi["ybr"], roi["xtl"] : roi["xbr"]] = crop_mask
            response["mask"] = full_mask.tolist()

        if "shapes" in response and isinstance(response["shapes"], list):
            cls.translate_detector_shapes(response["shapes"], dx=roi["xtl"], dy=roi["ytl"])

        return response
