# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

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


class _InteractionFunctionContextImpl(cvataa.InteractionFunctionContext):
    pass


@attrs.frozen(kw_only=True)
class _InteractionPromptsImpl(cvataa.InteractionPrompts):
    pos_points: tuple[tuple[float, float], ...]
    neg_points: tuple[tuple[float, float], ...]
    bounding_box: tuple[tuple[float, float], tuple[float, float]] | None


def _worker_job_interact(
    image: PIL.Image.Image, prompts: cvataa.InteractionPrompts
) -> list[cvataa.InteractionResultShape]:
    current_function = cast(cvataa.InteractionFunction, worker_current_function())
    context = _InteractionFunctionContextImpl()

    if hasattr(current_function, "preprocess_image"):
        pp_image = current_function.preprocess_image(context, image)
    else:
        pp_image = image

    return current_function.detect(context, pp_image, prompts)


class AgentInteractionFunctionDriver(AgentFunctionDriver[cvataa.InteractionFunctionSpec]):
    FUNCTION_KIND = "interactor"

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
        sample, _ = self._get_sample_from_ar_params(ar_params)

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

        shapes = self._executor.result(
            self._executor.submit(
                _worker_job_interact, self._load_image_for_ar(sample, ar_params), prompts
            )
        )

        return {"shapes": [attrs.asdict(shape) for shape in shapes]}

    _CALCULATE_RESULT_PER_AR_TYPE = {"interact": _calculate_result_for_interact_ar}
