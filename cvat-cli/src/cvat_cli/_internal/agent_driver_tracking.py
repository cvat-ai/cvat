# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, TypeAlias, cast

import attrs
import cvat_sdk.auto_annotation as cvataa
import PIL.Image

from .agent_driver import (
    AgentFunctionDriver,
    BadArError,
    IncompatibleFunctionError,
    worker_current_function,
)

_MAX_AGE_OF_TRACKING_STATE = timedelta(hours=8)


@attrs.define
class _ExtendedTrackingState:
    inner_state: Any  # the state produced by the AA function
    original_shape_type: str
    original_task_id: int
    original_image_dims: tuple[int, int]
    last_accessed_at: datetime = attrs.field(factory=lambda: datetime.now(tz=timezone.utc))


class _TrackingStateContainer:
    def __init__(self):
        self._id_to_ext_state: OrderedDict[str, _ExtendedTrackingState] = OrderedDict()

    def store(self, state: Any, shape_type: str, task_id: int, image_dims: tuple[int, int]) -> str:
        state_id = _tracking_state_id_generator()
        self._id_to_ext_state[state_id] = _ExtendedTrackingState(
            inner_state=state,
            original_shape_type=shape_type,
            original_task_id=task_id,
            original_image_dims=image_dims,
        )
        return state_id

    def retrieve(self, state_id: str, task_id: int, image_dims: tuple[int, int]) -> Any:
        ext_state = self._id_to_ext_state.get(state_id)

        if not ext_state:
            raise BadArError(f"Tracking state {state_id!r} not found - possibly expired")

        if ext_state.original_task_id != task_id:
            # This is a defense-in-depth measure. State IDs are supposed to be unguessable,
            # but even if an attacker manages to obtain one, they will not be able to use it
            # to get any information about a task they don't have access to.
            raise BadArError(f"Tracking state {state_id!r} is not for task #{task_id}")

        if image_dims != ext_state.original_image_dims:
            raise BadArError("Image sizes of the start frame and the current frame are different")

        ext_state.last_accessed_at = datetime.now(tz=timezone.utc)
        self._id_to_ext_state.move_to_end(state_id)

        return ext_state.inner_state, ext_state.original_shape_type

    def prune(self) -> None:
        cutoff = datetime.now(tz=timezone.utc) - _MAX_AGE_OF_TRACKING_STATE

        while (
            self._id_to_ext_state
            and next(iter(self._id_to_ext_state.values())).last_accessed_at < cutoff
        ):
            self._id_to_ext_state.popitem(last=False)


TrackingStateIdGenerator: TypeAlias = Callable[[], str]


_tracking_states: _TrackingStateContainer
_tracking_state_id_generator: TrackingStateIdGenerator


def _worker_job_init_tracking(
    task_id: int,
    image: PIL.Image.Image,
    shapes: list[cvataa.TrackableShape],
) -> list[str]:
    _tracking_states.prune()

    current_function = cast(cvataa.TrackingFunction, worker_current_function())

    if hasattr(current_function, "preprocess_image"):
        pp_image = current_function.preprocess_image(_TrackingFunctionContextImpl(), image)
    else:
        pp_image = image

    return [
        _tracking_states.store(
            state=current_function.init_tracking_state(
                _TrackingFunctionShapeContextImpl(original_shape_type=shape.type), pp_image, shape
            ),
            shape_type=shape.type,
            task_id=task_id,
            image_dims=image.size,
        )
        for shape in shapes
    ]


def _worker_job_track(
    task_id: int, image: PIL.Image.Image, states: list[str]
) -> list[cvataa.TrackableShape | None]:
    _tracking_states.prune()

    current_function = cast(cvataa.TrackingFunction, worker_current_function())

    pp_image = current_function.preprocess_image(_TrackingFunctionContextImpl(), image)

    def track(state_id):
        inner_state, original_shape_type = _tracking_states.retrieve(
            state_id=state_id, task_id=task_id, image_dims=image.size
        )

        output_shape = current_function.track(
            _TrackingFunctionShapeContextImpl(original_shape_type=original_shape_type),
            pp_image,
            inner_state,
        )

        if output_shape and output_shape.type != original_shape_type:
            raise cvataa.BadFunctionError(
                f"function output shape of type {output_shape.type!r}, "
                f"but original shape was of type {original_shape_type!r}"
            )
        return output_shape

    return list(map(track, states))


class _TrackingFunctionContextImpl(cvataa.TrackingFunctionContext):
    pass


@attrs.frozen(kw_only=True)
class _TrackingFunctionShapeContextImpl(cvataa.TrackingFunctionShapeContext):
    original_shape_type: str


class AgentTrackingFunctionDriver(AgentFunctionDriver):
    FUNCTION_KIND = "tracker"
    _function_spec: cvataa.TrackingFunctionSpec

    @classmethod
    def init_worker(cls, state_id_generator: TrackingStateIdGenerator) -> None:
        global _tracking_states
        _tracking_states = _TrackingStateContainer()

        global _tracking_state_id_generator
        _tracking_state_id_generator = state_id_generator

    def validate_function_compatibility(self, remote_function: dict) -> None:
        remote_supported_shape_types = frozenset(remote_function["supported_shape_types"])
        unsupported = remote_supported_shape_types - self._function_spec.supported_shape_types

        if unsupported:
            raise IncompatibleFunctionError(
                "the function object does not support the following shape types: "
                + ", ".join(map(repr, unsupported))
            )

    def _calculate_result_for_init_tracking_ar(
        self, ar_params: dict[str, Any], check_in: object
    ) -> dict[str, Any]:
        sample, _ = self._get_sample_from_ar_params(ar_params)

        def convert_shape(shape: dict) -> cvataa.TrackableShape:
            if shape["type"] not in self._function_spec.supported_shape_types:
                raise BadArError(f"Unsupported shape type {shape['type']!r}")
            return cvataa.TrackableShape(type=shape["type"], points=shape["points"])

        shapes = list(map(convert_shape, ar_params["shapes"]))

        states = self._executor.result(
            self._executor.submit(
                _worker_job_init_tracking,
                ar_params["task"],
                sample.media.load_image(),
                shapes,
            )
        )

        return {"states": states}

    def _calculate_result_for_track_ar(
        self, ar_params: dict[str, Any], check_in: object
    ) -> dict[str, Any]:
        sample, _ = self._get_sample_from_ar_params(ar_params)

        states = ar_params["states"]
        shapes = self._executor.result(
            self._executor.submit(
                _worker_job_track, ar_params["task"], sample.media.load_image(), states
            )
        )

        return {
            "states": states,
            "shapes": [attrs.asdict(shape) if shape else None for shape in shapes],
        }

    _CALCULATE_RESULT_PER_AR_TYPE = {
        "init_tracking": _calculate_result_for_init_tracking_ar,
        "track": _calculate_result_for_track_ar,
    }
