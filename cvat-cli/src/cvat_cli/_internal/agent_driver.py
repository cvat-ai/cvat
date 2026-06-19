# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING, Any, ClassVar, Protocol

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.datasets as cvatds
from cvat_sdk import Client
from typing_extensions import Self

if TYPE_CHECKING:
    from .agent import RecoverableExecutor
    from .agent_driver_tracking import TrackingStateIdGenerator


class BadArError(Exception):
    pass


class IncompatibleFunctionError(Exception):
    # This should only be thrown from inside validate_function_compatibility methods.
    pass


_current_function: cvataa.AutoAnnotationFunction


def worker_current_function() -> cvataa.AutoAnnotationFunction:
    return _current_function


def set_worker_current_function(func: cvataa.AutoAnnotationFunction) -> None:
    global _current_function
    _current_function = func


class CheckInCallback(Protocol):
    def __call__(self, *, current_progress: float) -> None:
        """
        Temporarily suspends the processing of the current AR to report progress back to the server
        and optionally process any pending interactive ARs. Should only be called during batch AR
        processing (interactive ARs should be processed quickly enough to not require this).
        """


class AgentFunctionDriver:
    FUNCTION_KIND: ClassVar[str]

    def __init__(self, client: Client, executor: RecoverableExecutor, function_spec: object):
        self._client = client
        self._executor = executor
        self._function_spec = function_spec

    @classmethod
    def init_worker(cls, state_id_generator: TrackingStateIdGenerator) -> None:
        pass

    def validate_function_compatibility(self, remote_function: dict) -> None:
        raise NotImplementedError

    _CALCULATE_RESULT_PER_AR_TYPE: ClassVar[
        dict[str, Callable[[Self, dict[str, Any], CheckInCallback], dict[str, Any]]]
    ]

    def calculate_result_for_ar(
        self, ar_params: dict[str, Any], check_in: CheckInCallback
    ) -> dict[str, Any]:
        if calc := self._CALCULATE_RESULT_PER_AR_TYPE.get(ar_params["type"]):
            return calc(self, ar_params, check_in)

        raise BadArError(f"unsupported type: {ar_params['type']!r}")

    def _get_sample_from_ar_params(self, ar_params):
        ds = cvatds.TaskDataset(
            self._client,
            ar_params["task"],
            load_annotations=False,
            media_download_policy=cvatds.MediaDownloadPolicy.FETCH_FRAMES_ON_DEMAND,
        )

        frame_index = ar_params["frame"]

        # Since ds.samples excludes deleted frames, we can't just do sample = ds.samples[frame_index].
        # Once we drop Python 3.9, we can change this to use bisect instead of the linear search.
        for sample in ds.samples:
            if sample.frame_index == frame_index:
                break
        else:
            raise BadArError(f"Frame with index {frame_index} does not exist in the task")

        return sample, ds.labels

    def _load_image_for_ar(self, sample, ar_params):
        image = sample.media.load_image()

        if roi := ar_params.get("roi"):
            xtl, ytl, xbr, ybr = roi
            width, height = image.size

            if xbr > width or ybr > height:
                raise BadArError("Invalid ROI")

            return image.crop((xtl, ytl, xbr, ybr))

        return image
