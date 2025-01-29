# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import concurrent.futures
import json
import multiprocessing
import random
import secrets
import shutil
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.datasets as cvatds
import urllib3.exceptions
from cvat_sdk import Client, models
from cvat_sdk.auto_annotation.driver import (
    _AnnotationMapper,
    _DetectionFunctionContextImpl,
    _LabelNameMapping,
    _SpecNameMapping,
)
from cvat_sdk.exceptions import ApiException

from .common import CriticalError, FunctionLoader

FUNCTION_PROVIDER_NATIVE = "native"
FUNCTION_KIND_DETECTOR = "detector"

_POLLING_INTERVAL_MEAN = timedelta(seconds=60)
_POLLING_INTERVAL_MAX_OFFSET = timedelta(seconds=10)

_UPDATE_INTERVAL = timedelta(seconds=30)


class _RecoverableExecutor:
    # A wrapper around ProcessPoolExecutor that recreates the underlying
    # executor when a worker crashes.
    def __init__(self, initializer, initargs):
        self._mp_context = multiprocessing.get_context("spawn")
        self._initializer = initializer
        self._initargs = initargs
        self._executor = self._new_executor()

    def _new_executor(self):
        return concurrent.futures.ProcessPoolExecutor(
            max_workers=1,
            mp_context=self._mp_context,
            initializer=self._initializer,
            initargs=self._initargs,
        )

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self._executor.shutdown()

    def submit(self, func, /, *args, **kwargs):
        return self._executor.submit(func, *args, **kwargs)

    def result(self, future: concurrent.futures.Future):
        try:
            return future.result()
        except concurrent.futures.BrokenExecutor:
            self._executor.shutdown()
            self._executor = self._new_executor()
            raise


_current_function: cvataa.DetectionFunction


def _worker_init(function_loader: FunctionLoader):
    global _current_function
    _current_function = function_loader.load()


def _worker_job_get_function_spec():
    return _current_function.spec


def _worker_job_detect(context, image):
    return _current_function.detect(context, image)


class _Agent:
    def __init__(self, client: Client, executor: _RecoverableExecutor, function_id: int):
        self._rng = random.Random()  # nosec

        self._client = client
        self._executor = executor
        self._function_id = function_id
        self._function_spec = self._executor.result(
            self._executor.submit(_worker_job_get_function_spec)
        )

        _, response = self._client.api_client.call_api(
            "/api/functions/{function_id}",
            "GET",
            path_params={"function_id": self._function_id},
        )

        remote_function = json.loads(response.data)

        self._validate_function_compatibility(remote_function)

        self._agent_id = secrets.token_hex(16)
        self._client.logger.info("Agent starting with ID %r", self._agent_id)

        self._cached_task_id = None

    def _validate_function_compatibility(self, remote_function: dict) -> None:
        function_id = remote_function["id"]

        if remote_function["provider"] != FUNCTION_PROVIDER_NATIVE:
            raise CriticalError(
                f"Function #{function_id} has provider {remote_function['provider']!r}. "
                f"Agents can only be run for functions with provider {FUNCTION_PROVIDER_NATIVE!r}."
            )

        if isinstance(self._function_spec, cvataa.DetectionFunctionSpec):
            self._validate_detection_function_compatibility(remote_function)
            self._calculate_result_for_ar = self._calculate_result_for_detection_ar
        else:
            raise CriticalError(
                f"Unsupported function spec type: {type(self._function_spec).__name__}"
            )

    def _validate_detection_function_compatibility(self, remote_function: dict) -> None:
        incompatible_msg = (
            f"Function #{remote_function['id']} is incompatible with function object: "
        )

        if remote_function["kind"] != FUNCTION_KIND_DETECTOR:
            raise CriticalError(
                incompatible_msg
                + f"kind is {remote_function['kind']!r} (expected {FUNCTION_KIND_DETECTOR!r})."
            )

        labels_by_name = {label.name: label for label in self._function_spec.labels}

        for remote_label in remote_function["labels_v2"]:
            label = labels_by_name.get(remote_label["name"])

            if not label:
                raise CriticalError(
                    incompatible_msg + f"label {remote_label['name']!r} is not supported."
                )

            if (
                remote_label["type"] not in {"any", "unknown"}
                and remote_label["type"] != label.type
            ):
                raise CriticalError(
                    incompatible_msg
                    + f"label {remote_label['name']!r} has type {remote_label['type']!r}, "
                    f"but the function object expects type {label.type!r}."
                )

            if remote_label["attributes"]:
                raise CriticalError(
                    incompatible_msg
                    + f"label {remote_label['name']!r} has attributes, which is not supported."
                )

    def _wait_between_polls(self):
        # offset the interval randomly to avoid synchronization between workers
        max_offset_sec = _POLLING_INTERVAL_MAX_OFFSET.total_seconds()
        offset_sec = self._rng.uniform(-max_offset_sec, max_offset_sec)
        time.sleep(_POLLING_INTERVAL_MEAN.total_seconds() + offset_sec)

    def run(self, *, burst: bool) -> None:
        if burst:
            while ar_assignment := self._poll_for_ar():
                self._process_ar(ar_assignment)
            self._client.logger.info("No annotation requests left in queue; exiting.")
        else:
            while True:
                if ar_assignment := self._poll_for_ar():
                    self._process_ar(ar_assignment)
                else:
                    self._wait_between_polls()

    def _process_ar(self, ar_assignment: dict) -> None:
        self._client.logger.info("Got annotation request assignment: %r", ar_assignment)

        ar_id = ar_assignment["ar_id"]

        try:
            result = self._calculate_result_for_ar(ar_id, ar_assignment["ar_params"])

            self._client.logger.info("Submitting result for AR %r...", ar_id)
            self._client.api_client.call_api(
                "/api/functions/queues/{queue_id}/requests/{request_id}/complete",
                "POST",
                path_params={"queue_id": f"function:{self._function_id}", "request_id": ar_id},
                body={"agent_id": self._agent_id, "annotations": result},
            )
            self._client.logger.info("AR %r completed", ar_id)
        except Exception as ex:
            self._client.logger.error("Failed to process AR %r", ar_id, exc_info=True)

            # Arbitrary exceptions may contain details of the client's system or code, which
            # shouldn't be exposed to the server (and to users of the function).
            # Therefore, we only produce a limited amount of detail, and only in known failure cases.
            error_message = "Unknown error"

            if isinstance(ex, ApiException):
                if ex.status:
                    error_message = f"Received HTTP status {ex.status}"
                else:
                    error_message = "Failed an API call"
            elif isinstance(ex, urllib3.exceptions.RequestError):
                if isinstance(ex, urllib3.exceptions.MaxRetryError):
                    ex_type = type(ex.reason)
                else:
                    ex_type = type(ex)

                error_message = f"Failed to make an HTTP request to {ex.url} ({ex_type.__name__})"
            elif isinstance(ex, urllib3.exceptions.HTTPError):
                error_message = "Failed to make an HTTP request"
            elif isinstance(ex, cvataa.BadFunctionError):
                error_message = "Underlying function returned incorrect result: " + str(ex)
            elif isinstance(ex, concurrent.futures.BrokenExecutor):
                error_message = "Worker process crashed"

            try:
                self._client.api_client.call_api(
                    "/api/functions/queues/{queue_id}/requests/{request_id}/fail",
                    "POST",
                    path_params={
                        "queue_id": f"function:{self._function_id}",
                        "request_id": ar_id,
                    },
                    body={"agent_id": self._agent_id, "exc_info": error_message},
                )
            except Exception:
                self._client.logger.error("Couldn't fail AR %r", ar_id, exc_info=True)
            else:
                self._client.logger.info("AR %r failed", ar_id)

    def _poll_for_ar(self) -> Optional[dict]:
        while True:
            self._client.logger.info("Trying to acquire an annotation request...")
            try:
                _, response = self._client.api_client.call_api(
                    "/api/functions/queues/{queue_id}/requests/acquire",
                    "POST",
                    path_params={"queue_id": f"function:{self._function_id}"},
                    body={"agent_id": self._agent_id, "request_category": "batch"},
                )
                break
            except (urllib3.exceptions.HTTPError, ApiException) as ex:
                if isinstance(ex, ApiException) and ex.status and 400 <= ex.status < 500:
                    # We did something wrong; no point in retrying.
                    raise

                self._client.logger.error("Acquire request failed; will retry", exc_info=True)
                self._wait_between_polls()

        response_data = json.loads(response.data)
        return response_data["ar_assignment"]

    def _calculate_result_for_detection_ar(
        self, ar_id: str, ar_params
    ) -> models.PatchedLabeledDataRequest:
        if ar_params["type"] != "annotate_task":
            raise RuntimeError(f"Unsupported AR type: {ar_params['type']!r}")

        if ar_params["task"] != self._cached_task_id:
            # To avoid uncontrolled disk usage,
            # we'll only keep one task in the cache at a time.
            self._client.logger.info("Switched to a new task; clearing the cache...")
            if self._client.config.cache_dir.exists():
                shutil.rmtree(self._client.config.cache_dir)

        ds = cvatds.TaskDataset(self._client, ar_params["task"], load_annotations=False)

        self._cached_task_id = ar_params["task"]

        # Fetching the dataset might take a while, so do a progress update to let the server
        # know we're still alive.
        self._update_ar(ar_id, 0)
        last_update_timestamp = datetime.now(tz=timezone.utc)

        mapping = ar_params["mapping"]
        conv_mask_to_poly = ar_params["conv_mask_to_poly"]

        spec_nm = _SpecNameMapping(
            labels={k: _LabelNameMapping(v["name"]) for k, v in mapping.items()}
        )

        mapper = _AnnotationMapper(
            self._client.logger,
            self._function_spec.labels,
            ds.labels,
            allow_unmatched_labels=False,
            spec_nm=spec_nm,
            conv_mask_to_poly=conv_mask_to_poly,
        )

        all_annotations = models.PatchedLabeledDataRequest(shapes=[])

        for sample_index, sample in enumerate(ds.samples):
            context = _DetectionFunctionContextImpl(
                frame_name=sample.frame_name,
                conf_threshold=ar_params["threshold"],
                conv_mask_to_poly=conv_mask_to_poly,
            )
            shapes = self._executor.result(
                self._executor.submit(_worker_job_detect, context, sample.media.load_image())
            )

            mapper.validate_and_remap(shapes, sample.frame_index)
            all_annotations.shapes.extend(shapes)

            current_timestamp = datetime.now(tz=timezone.utc)

            if current_timestamp >= last_update_timestamp + _UPDATE_INTERVAL:
                self._update_ar(ar_id, (sample_index + 1) / len(ds.samples))
                last_update_timestamp = current_timestamp

        return all_annotations

    def _update_ar(self, ar_id: str, progress: float) -> None:
        self._client.logger.info("Updating AR %r progress to %.2f%%", ar_id, progress * 100)
        self._client.api_client.call_api(
            "/api/functions/queues/{queue_id}/requests/{request_id}/update",
            "POST",
            path_params={"queue_id": f"function:{self._function_id}", "request_id": ar_id},
            body={"agent_id": self._agent_id, "progress": progress},
        )


def run_agent(
    client: Client, function_loader: FunctionLoader, function_id: int, *, burst: bool
) -> None:
    with (
        _RecoverableExecutor(initializer=_worker_init, initargs=[function_loader]) as executor,
        tempfile.TemporaryDirectory() as cache_dir,
    ):
        client.config.cache_dir = Path(cache_dir, "cache")
        client.logger.info("Will store cache at %s", client.config.cache_dir)

        agent = _Agent(client, executor, function_id)
        agent.run(burst=burst)
