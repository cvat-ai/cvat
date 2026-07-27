# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from typing import Any, cast

import attrs
import cvat_sdk.auto_annotation as cvataa
import PIL.Image

from .agent_driver import (
    AgentFunctionDriver,
    BadArError,
    IncompatibleFunctionError,
    worker_current_function,
)

_MAX_AGE_OF_PP_IMAGE = timedelta(minutes=10)


class _InteractionFunctionContextImpl(cvataa.InteractionFunctionContext):
    pass


@attrs.frozen(kw_only=True)
class _InteractionPromptsImpl(cvataa.InteractionPrompts):
    pos_points: tuple[tuple[float, float], ...]
    neg_points: tuple[tuple[float, float], ...]
    bounding_box: tuple[tuple[float, float], tuple[float, float]] | None


@attrs.define(kw_only=True)
class _PpImageCacheEntry:
    pp_image: object
    last_accessed_at: datetime = attrs.field(factory=lambda: datetime.now(tz=timezone.utc))


class _PpImageCache:
    _MISSING = object()

    def __init__(self):
        self._contents = OrderedDict[object, _PpImageCacheEntry]()

    def get(self, key: object) -> object:
        if cache_entry := self._contents.get(key):
            cache_entry.last_accessed_at = datetime.now(tz=timezone.utc)
            self._contents.move_to_end(key)
            return cache_entry.pp_image

        return self._MISSING

    def set(self, key: object, pp_image: object) -> None:
        if key in self._contents:
            self._contents.move_to_end(key)
        else:
            self.prune()

        self._contents[key] = _PpImageCacheEntry(pp_image=pp_image)

    def prune(self) -> None:
        cutoff = datetime.now(tz=timezone.utc) - _MAX_AGE_OF_PP_IMAGE

        while self._contents and next(iter(self._contents.values())).last_accessed_at < cutoff:
            self._contents.popitem(last=False)


_pp_image_cache: _PpImageCache


def _worker_job_interact(
    cache_key: object, image: PIL.Image.Image, prompts: cvataa.InteractionPrompts
) -> list[cvataa.InteractionResultShape]:
    current_function = cast(cvataa.InteractionFunction, worker_current_function())
    context = _InteractionFunctionContextImpl()

    if hasattr(current_function, "preprocess_image"):
        pp_image = current_function.preprocess_image(context, image)
    else:
        pp_image = image

    _pp_image_cache.set(cache_key, pp_image)

    return current_function.detect(context, pp_image, prompts)


def _worker_job_interact_from_cache(
    cache_key: object, prompts: cvataa.InteractionPrompts
) -> list[cvataa.InteractionResultShape] | None:
    current_function = cast(cvataa.InteractionFunction, worker_current_function())

    pp_image = _pp_image_cache.get(cache_key)
    if pp_image is _PpImageCache._MISSING:
        return None

    context = _InteractionFunctionContextImpl()
    return current_function.detect(context, pp_image, prompts)


class AgentInteractionFunctionDriver(AgentFunctionDriver[cvataa.InteractionFunctionSpec]):
    FUNCTION_KIND = "interactor"

    @classmethod
    def init_worker(cls, state_id_generator: object) -> None:
        global _pp_image_cache
        _pp_image_cache = _PpImageCache()

    @classmethod
    def get_remote_function_fields(cls, spec: cvataa.InteractionFunctionSpec) -> dict[str, Any]:
        fields = {"min_pos_points": spec.min_pos_points}

        if spec.min_neg_points is not None:
            fields["min_neg_points"] = spec.min_neg_points

        match spec.min_bounding_boxes:
            case 0:
                fields["startswith_box_optional"] = True
            case 1:
                fields["startswith_box"] = True
            case None:
                pass
            case _:
                assert False, f"Unexpected min_bounding_boxes value: {spec.min_bounding_boxes}"

        return fields

    def validate_function_compatibility(self, remote_function: dict) -> None:
        remote_min_pos_points = remote_function["min_pos_points"]
        if remote_min_pos_points < self._function_spec.min_pos_points:
            raise IncompatibleFunctionError(
                "the remote function allows prompts with "
                f"{remote_min_pos_points} positive point(s), but the function object "
                f"requires at least {self._function_spec.min_pos_points}"
            )

        remote_min_neg_points = remote_function["min_neg_points"]
        if remote_min_neg_points >= 0:
            if self._function_spec.min_neg_points is None:
                raise IncompatibleFunctionError(
                    "the remote function allows prompts with negative points, but the "
                    "function object does not"
                )

            if remote_min_neg_points < self._function_spec.min_neg_points:
                raise IncompatibleFunctionError(
                    "the remote function allows prompts with "
                    f"{remote_min_neg_points} negative point(s), but the function object "
                    f"requires at least {self._function_spec.min_neg_points}"
                )
        else:
            if self._function_spec.min_neg_points not in {None, 0}:
                raise IncompatibleFunctionError(
                    "the remote function does not allow prompts with negative points, "
                    "but the function object requires at least "
                    f"{self._function_spec.min_neg_points}"
                )

        if self._function_spec.min_bounding_boxes is None:
            if remote_function["startswith_box"] or remote_function["startswith_box_optional"]:
                raise IncompatibleFunctionError(
                    "the remote function allows prompts with bounding boxes, but the "
                    "function object does not"
                )
        elif self._function_spec.min_bounding_boxes == 1:
            if not remote_function["startswith_box"]:
                raise IncompatibleFunctionError(
                    "the remote function does not require bounding boxes in prompts, "
                    "but the function object does"
                )

    def _calculate_result_for_interact_ar(
        self, ar_params: dict[str, Any], check_in: object
    ) -> dict[str, Any]:
        pos_points = tuple(map(tuple, ar_params["pos_points"]))
        neg_points = tuple(map(tuple, ar_params["neg_points"]))
        bounding_box = tuple(map(tuple, ar_params["obj_bbox"])) or None

        if len(pos_points) < self._function_spec.min_pos_points:
            raise BadArError("not enough positive points")

        if self._function_spec.min_neg_points is None:
            if len(neg_points) > 0:
                raise BadArError("negative points are not supported")
        else:
            if len(neg_points) < self._function_spec.min_neg_points:
                raise BadArError("not enough negative points")

        if self._function_spec.min_bounding_boxes is None and bounding_box is not None:
            raise BadArError("bounding boxes are not supported")
        elif self._function_spec.min_bounding_boxes == 1 and bounding_box is None:
            raise BadArError("a bounding box is required")

        prompts = _InteractionPromptsImpl(
            pos_points=pos_points, neg_points=neg_points, bounding_box=bounding_box
        )

        cache_key = (ar_params["task"], ar_params["frame"], tuple(ar_params.get("roi") or ()))

        shapes = self._executor.result(
            self._executor.submit(_worker_job_interact_from_cache, cache_key, prompts)
        )

        if shapes is None:
            sample, _ = self._get_sample_from_ar_params(ar_params)

            shapes = self._executor.result(
                self._executor.submit(
                    _worker_job_interact,
                    cache_key,
                    self._load_image_for_ar(sample, ar_params),
                    prompts,
                )
            )

        return {"shapes": [attrs.asdict(shape) for shape in shapes]}

    _CALCULATE_RESULT_PER_AR_TYPE = {"interact": _calculate_result_for_interact_ar}
