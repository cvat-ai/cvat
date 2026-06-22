# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import numpy as np
from PIL import Image
from rest_framework import status
from rest_framework.exceptions import ValidationError


class ROIHelper:
    """
    Utilities for running automatic annotations functions on a cropped region of an image.

    Public API requests pass ROI as image coordinates: [xtl, ytl, xbr, ybr].
    Lambda functions still receive only an image, so the server crops the image
    before invocation and then maps prompts/results between these coordinate
    spaces.
    """

    @classmethod
    def parse_roi(cls, roi: list | None) -> dict | None:
        """
        Validate request ROI and normalize it to a dict with explicit coordinate keys.
        """
        if roi is None:
            return None

        if not isinstance(roi, list) or len(roi) != 4:
            raise ValidationError(
                "ROI must contain four integer coordinates: [xtl, ytl, xbr, ybr]",
                code=status.HTTP_400_BAD_REQUEST,
            )

        if not all(
            isinstance(coordinate, int) and not isinstance(coordinate, bool) for coordinate in roi
        ):
            raise ValidationError(
                "ROI must contain four integer coordinates: [xtl, ytl, xbr, ybr]",
                code=status.HTTP_400_BAD_REQUEST,
            )

        xtl, ytl, xbr, ybr = roi

        if xtl < 0 or ytl < 0 or xbr < 0 or ybr < 0:
            raise ValidationError(
                "ROI coordinates must be non-negative", code=status.HTTP_400_BAD_REQUEST
            )

        if xbr <= xtl or ybr <= ytl:
            raise ValidationError("ROI size must be positive", code=status.HTTP_400_BAD_REQUEST)

        return {"xtl": xtl, "ytl": ytl, "xbr": xbr, "ybr": ybr}

    @staticmethod
    def crop_image(image: Image.Image, roi: dict | None) -> Image.Image:
        """
        Return an ROI crop when ROI is specified, otherwise return the source image.
        """
        if roi is None:
            return image

        if roi["xbr"] > image.width or roi["ybr"] > image.height:
            raise ValidationError("ROI is outside the image", code=status.HTTP_400_BAD_REQUEST)

        cropped_image = image.crop((roi["xtl"], roi["ytl"], roi["xbr"], roi["ybr"]))
        cropped_image.format = image.format
        return cropped_image

    @classmethod
    def validate_task_roi(cls, task_id: int, roi: list | None) -> dict | None:
        """
        Validate task-level ROI using stored frame dimensions, without decoding frame images.
        """
        parsed_roi = cls.parse_roi(roi)
        if parsed_roi is None:
            return None

        from cvat.apps.engine.models import MediaType, Task

        db_task = Task.objects.select_related("data", "data__video").get(pk=task_id)

        db_data = db_task.data
        frames = [frame for frame in range(db_data.size) if frame not in db_data.deleted_frames]
        if not frames:
            return parsed_roi

        if db_task.media_type == MediaType.IMAGE:
            if db_video := getattr(db_data, "video", None):
                sizes = {(db_video.width, db_video.height)}
            else:
                sizes = set(
                    db_data.images.filter(is_placeholder=False)
                    .exclude(frame__in=db_data.deleted_frames)
                    .values_list("width", "height")
                    .distinct()
                )
        else:
            raise ValidationError(
                "ROI is supported only for image and video tasks",
                code=status.HTTP_400_BAD_REQUEST,
            )

        if len(sizes) != 1:
            raise ValidationError(
                "ROI can be used for task annotation only when all processed frames have the same resolution",
                code=status.HTTP_400_BAD_REQUEST,
            )

        image_width, image_height = next(iter(sizes))
        if parsed_roi["xbr"] > image_width or parsed_roi["ybr"] > image_height:
            raise ValidationError("ROI is outside the image", code=status.HTTP_400_BAD_REQUEST)

        return parsed_roi

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
