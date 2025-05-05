# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import concurrent.futures
import contextlib
import json
import multiprocessing
import random
import secrets
import shutil
import tempfile
import threading
from collections.abc import Generator, Iterator, Sequence
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Optional, Union

import attrs
import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.datasets as cvatds
import urllib3.exceptions
from cvat_sdk import Client, models
from cvat_sdk.auto_annotation.driver import (
    _AnnotationMapper,
    _DetectionFunctionContextImpl,
    _SpecNameMapping,
)
from cvat_sdk.datasets.caching import make_cache_manager
from cvat_sdk.exceptions import ApiException

from .common import CriticalError, FunctionLoader

if TYPE_CHECKING:
    from _typeshed import SupportsReadline

FUNCTION_PROVIDER_NATIVE = "native"
FUNCTION_KIND_DETECTOR = "detector"
REQUEST_CATEGORY_BATCH = "batch"
REQUEST_CATEGORY_INTERACTIVE = "interactive"

REQUEST_CATEGORIES_WITH_DECREASING_PRIORITY = (REQUEST_CATEGORY_INTERACTIVE, REQUEST_CATEGORY_BATCH)

_POLLING_INTERVAL_MEAN_FREQUENT = timedelta(seconds=60)
_POLLING_INTERVAL_MEAN_RARE = timedelta(minutes=10)
_JITTER_AMOUNT = 0.15

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


@attrs.frozen
class _Event:
    type: str
    data: str


@attrs.frozen
class _NewReconnectionDelay:
    delay: timedelta


class _TaskCacheLimiter:
    """
    This class deletes least-recently used tasks from the dataset cache,
    so that at any time the cache contains at most _MAX_TASKS_WITH_CHUNKS
    tasks with downloaded chunks, and at most _MAX_TASKS_WITHOUT_CHUNKS without.

    This helps manage disk usage, since agents may run indefinitely, and
    we don't want the dataset cache to keep growing.
    """

    _MAX_TASKS_WITH_CHUNKS = 1
    _MAX_TASKS_WITHOUT_CHUNKS = 10

    def __init__(self, client: Client) -> None:
        self._client = client
        self._cache_manager = make_cache_manager(client, cvatds.UpdatePolicy.IF_MISSING_OR_STALE)

        self._cached_with_chunks_task_ids = []
        self._cached_without_chunks_task_ids = []

        self._task_ids_in_use = set()

    @contextlib.contextmanager
    def using_cache_for_task(
        self, task_id: int, *, with_chunks: bool
    ) -> Generator[None, None, None]:
        if task_id in self._task_ids_in_use:
            # If with_chunks is True, we would have to ensure that task_id is returned to the
            # "with chunks" list after it leaves _task_ids_in_use, regardless of the value of
            # with_chunks in the call that initially put it in. That would be tricky to implement,
            # and we don't have a use case for it, so just ban it.
            assert not with_chunks
            yield
            return

        if task_id in self._cached_with_chunks_task_ids:
            # If the task already had cached chunks, we have to return it back to
            # _cached_with_chunks_task_ids in the end.
            with_chunks = True

            self._cached_with_chunks_task_ids.remove(task_id)
        elif task_id in self._cached_without_chunks_task_ids:
            self._cached_without_chunks_task_ids.remove(task_id)

        self._task_ids_in_use.add(task_id)

        if with_chunks:
            cached_task_ids = self._cached_with_chunks_task_ids
            max_cached_tasks = self._MAX_TASKS_WITH_CHUNKS
        else:
            cached_task_ids = self._cached_without_chunks_task_ids
            max_cached_tasks = self._MAX_TASKS_WITHOUT_CHUNKS

        if len(cached_task_ids) + len(self._task_ids_in_use) > max_cached_tasks:
            self._delete_task_cache(cached_task_ids.pop(0))

        try:
            yield
        finally:
            self._task_ids_in_use.remove(task_id)
            cached_task_ids.append(task_id)

    def _delete_task_cache(self, task_id: int) -> None:
        self._client.logger.info("Deleting task %d from the cache to make room...", task_id)
        shutil.rmtree(self._cache_manager.task_dir(task_id), ignore_errors=True)


def _parse_event_stream(
    stream: SupportsReadline[bytes],
) -> Iterator[Union[_Event, _NewReconnectionDelay]]:
    # https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation

    event_type = event_data = ""

    while True:
        line_bytes = stream.readline()
        if not line_bytes:
            return

        line = line_bytes.decode("UTF-8").removesuffix("\n").removesuffix("\r")

        # Technically, a standalone \r is supposed to be treated as a line terminator,
        # but it's annoying to implement, and there's no reason for CVAT to use that.
        if "\r" in line:
            raise ValueError("CR found in event stream")

        if not line:
            yield _Event(event_type, event_data.removesuffix("\n"))
            event_type = event_data = ""
            continue

        if line.startswith(":"):
            # it's a comment/keepalive
            continue

        if ":" in line:
            field_name, field_value = line.split(":", maxsplit=1)
            field_value = field_value.removeprefix(" ")
        else:
            field_name = line
            field_value = ""

        if field_name == "event":
            event_type = field_value
        elif field_name == "data":
            event_data += field_value + "\n"
        elif field_name == "retry":
            if field_value.isascii() and field_value.isdecimal():
                yield _NewReconnectionDelay(timedelta(milliseconds=int(field_value)))


class _BadArError(Exception):
    pass


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

        self._task_cache_limiter = _TaskCacheLimiter(client)

        self._queue_watch_response = None
        self._queue_watch_response_lock = threading.Lock()
        self._queue_watcher_should_stop = threading.Event()

        self._potential_work_condition = threading.Condition(threading.Lock())
        self._potential_work_per_category = {
            category: True for category in REQUEST_CATEGORIES_WITH_DECREASING_PRIORITY
        }

        self._polling_interval = _POLLING_INTERVAL_MEAN_FREQUENT

        # If we fail to connect to the queue event stream, it might be because
        # the server is too old and doesn't support the watch endpoint.
        # In this case, it doesn't make sense to continue trying to connect frequently,
        # although we should still be trying occasionally in case the error is transient.
        # Once we're successful, we'll rely on the server to set a new reconnection delay.
        self._queue_reconnection_delay = _POLLING_INTERVAL_MEAN_RARE

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
            label_desc = f"label {remote_label['name']!r}"
            label = labels_by_name.get(remote_label["name"])

            self._validate_sublabel_compatibility(remote_label, label, incompatible_msg, label_desc)

            sublabels_by_name = {sl.name: sl for sl in getattr(label, "sublabels", [])}

            for remote_sl in remote_label.get("sublabels", []):
                sl_desc = f"sublabel {remote_sl['name']!r} of {label_desc}"
                sl = sublabels_by_name.get(remote_sl["name"])

                self._validate_sublabel_compatibility(remote_sl, sl, incompatible_msg, sl_desc)

    def _validate_sublabel_compatibility(
        self, remote_sl: dict, sl: Optional[models.Sublabel], incompatible_msg: str, sl_desc: str
    ):
        if not sl:
            raise CriticalError(incompatible_msg + f"{sl_desc} is not supported.")

        if remote_sl["type"] not in {"any", "unknown"} and remote_sl["type"] != sl.type:
            raise CriticalError(
                incompatible_msg + f"{sl_desc} has type {remote_sl['type']!r}, "
                f"but the function object declares type {sl.type!r}."
            )

        attrs_by_name = {attr.name: attr for attr in getattr(sl, "attributes", [])}

        for remote_attr in remote_sl["attributes"]:
            attr_desc = f"attribute {remote_attr['name']!r} of {sl_desc}"
            attr = attrs_by_name.get(remote_attr["name"])

            if not attr:
                raise CriticalError(incompatible_msg + f"{attr_desc} is not supported.")

            if remote_attr["input_type"] != attr.input_type.value:
                raise CriticalError(
                    incompatible_msg + f"{attr_desc} has input type {remote_attr['input_type']!r},"
                    f" but the function object declares input type {attr.input_type.value!r}."
                )

            if remote_attr["values"] != attr.values:
                raise CriticalError(
                    incompatible_msg + f"{attr_desc} has values {remote_attr['values']!r},"
                    f" but the function object declares values {attr.values!r}."
                )

    def _wait_between_polls(self):
        # offset the interval randomly to avoid synchronization between workers
        timeout_multiplier = self._rng.uniform(1 - _JITTER_AMOUNT, 1 + _JITTER_AMOUNT)

        with self._potential_work_condition:
            wait_succeeded = self._potential_work_condition.wait_for(
                lambda: any(self._potential_work_per_category.values()),
                timeout=self._polling_interval.total_seconds() * timeout_multiplier,
            )

            if not wait_succeeded:
                # If we timed out, there is a possibility that the queue watcher is broken or
                # that it somehow missed an event. Either way, we'll force a poll to make sure
                # we don't miss anything.
                for category in self._potential_work_per_category:
                    self._potential_work_per_category[category] = True

    def _dispatch_queue_event(self, event: _Event) -> None:
        if event.type == "newrequest":
            event_data_object = json.loads(event.data)
            request_category = event_data_object["request_category"]

            with self._potential_work_condition:
                if request_category in self._potential_work_per_category:
                    self._client.logger.info(
                        "Received notification about a new request of category %r",
                        request_category,
                    )
                    self._potential_work_per_category[request_category] = True
                    self._potential_work_condition.notify()
                else:
                    self._client.logger.warning(
                        "Received notification about a new request of unknown category: %r",
                        request_category,
                    )
        else:
            self._client.logger.warning("Received event of unknown type: %r", event.type)

    def _wait_before_reconnecting_to_queue(self):
        delay_multiplier = self._rng.uniform(1, 1 + _JITTER_AMOUNT)
        self._queue_watcher_should_stop.wait(
            timeout=self._queue_reconnection_delay.total_seconds() * delay_multiplier
        )

        # Apply exponential backoff.
        self._queue_reconnection_delay = min(
            self._queue_reconnection_delay * 2, _POLLING_INTERVAL_MEAN_RARE
        )

    def _watch_queue(self) -> None:
        while not self._queue_watcher_should_stop.is_set():
            # Until we can (re)connect to the event stream, poll more frequently.
            self._polling_interval = _POLLING_INTERVAL_MEAN_FREQUENT

            with self._queue_watch_response_lock:
                self._client.logger.info("Attempting to watch the function's queue...")

                try:
                    _, self._queue_watch_response = self._client.api_client.call_api(
                        "/api/functions/queues/{queue_id}/watch",
                        "GET",
                        path_params={"queue_id": f"function:{self._function_id}"},
                        _parse_response=False,
                    )
                except Exception:
                    self._client.logger.error(
                        "Failed to connect to the queue event stream; will retry",
                        exc_info=True,
                    )
                    self._wait_before_reconnecting_to_queue()
                    continue
                else:
                    self._client.logger.info("Connected to the queue event stream")

                    # Now we can rely on notifications, so slow down polling.
                    self._polling_interval = _POLLING_INTERVAL_MEAN_RARE

            try:
                for message in _parse_event_stream(self._queue_watch_response):
                    if isinstance(message, _Event):
                        self._dispatch_queue_event(message)
                    elif isinstance(message, _NewReconnectionDelay):
                        self._queue_reconnection_delay = message.delay
                        self._client.logger.info(
                            "New queue event stream reconnection delay is %fs",
                            self._queue_reconnection_delay.total_seconds(),
                        )
                    else:
                        assert False, f"unexpected message type {type(message)}"

                self._queue_watch_response.release_conn()

                # We should normally not get here unless the function is deleted on the server.
                # However, we don't know that for sure, so instead of quitting immediately,
                # we'll ask the main thread to poll for an AR.
                # If the function did get deleted, the main thread will get a 404 and quit.
                # Otherwise, we'll just reconnect again.
                with self._potential_work_condition:
                    for category in self._potential_work_per_category:
                        self._potential_work_per_category[category] = True
                    self._potential_work_condition.notify()

                self._client.logger.warning("Event stream ended; will reconnect")
            except Exception:
                # This is an extra check to prevent useless messages.
                # If we crashed, but the main thread wants us to stop anyway,
                # we should just stop and not spam the log.
                if self._queue_watcher_should_stop.is_set():
                    break

                self._client.logger.error(
                    "Event stream interrupted or other error; will reconnect", exc_info=True
                )
            finally:
                self._queue_watch_response.close()

            self._wait_before_reconnecting_to_queue()

    def run(self, *, burst: bool) -> None:
        if burst:
            self._process_all_available_ars()
            self._client.logger.info("No annotation requests left in queue; exiting.")
        else:
            watcher = threading.Thread(name="Queue Watcher", target=self._watch_queue)
            watcher.start()

            try:
                while True:
                    self._process_all_available_ars()
                    self._wait_between_polls()
            finally:
                self._queue_watcher_should_stop.set()

                with self._queue_watch_response_lock:
                    if self._queue_watch_response:
                        with contextlib.suppress(Exception):
                            # shutdown() requires urllib3 2.3.0, whereas we only require 1.25
                            # (via the SDK). The reason we can't bump the requirement is that
                            # the testsuite depends on botocore, which is incompatible with urllib3
                            # 2.x on Python 3.9 and earlier.
                            # Since pip will, by default, install the latest dependency versions,
                            # most users should not be affected. For the ones that are, shutdown
                            # will be broken, but everything else should still work fine.
                            # This should be revisited once we drop Python 3.9 support.
                            self._queue_watch_response.shutdown()

                watcher.join()

    def _process_all_available_ars(self):
        for category in REQUEST_CATEGORIES_WITH_DECREASING_PRIORITY:
            self._process_available_ars(category)

    def _process_available_ars(self, category) -> None:
        with self._potential_work_condition:
            if not self._potential_work_per_category[category]:
                return

            self._potential_work_per_category[category] = False

        while ar_assignment := self._poll_for_ar(category):
            self._process_ar(ar_assignment)

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
            elif isinstance(ex, _BadArError):
                error_message = "Invalid annotation request: " + str(ex)
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

    def _poll_for_ar(self, category: str) -> Optional[dict]:
        while True:
            self._client.logger.info(
                "Trying to acquire an annotation request of category %r...", category
            )
            try:
                _, response = self._client.api_client.call_api(
                    "/api/functions/queues/{queue_id}/requests/acquire",
                    "POST",
                    path_params={"queue_id": f"function:{self._function_id}"},
                    body={"agent_id": self._agent_id, "request_category": category},
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
        if ar_params["type"] == "annotate_task":
            with self._task_cache_limiter.using_cache_for_task(ar_params["task"], with_chunks=True):
                return self._calculate_result_for_annotate_task_ar(ar_id, ar_params)
        elif ar_params["type"] == "annotate_frame":
            with self._task_cache_limiter.using_cache_for_task(
                ar_params["task"], with_chunks=False
            ):
                return self._calculate_result_for_annotate_frame_ar(ar_id, ar_params)
        else:
            raise _BadArError(f"unsupported type: {ar_params['type']!r}")

    def _create_annotation_mapper_for_detection_ar(
        self, ar_params: dict, ds_labels: Sequence[models.ILabel]
    ) -> _AnnotationMapper:
        spec_nm = _SpecNameMapping.from_api(
            {
                k: models.LabelMappingEntryRequest._from_openapi_data(**v)
                for k, v in ar_params["mapping"].items()
            }
        )

        return _AnnotationMapper(
            self._client.logger,
            self._function_spec.labels,
            ds_labels,
            allow_unmatched_labels=False,
            spec_nm=spec_nm,
            conv_mask_to_poly=ar_params["conv_mask_to_poly"],
        )

    def _create_detection_function_context(
        self, ar_params: dict, frame_name: str
    ) -> cvataa.DetectionFunctionContext:
        return _DetectionFunctionContextImpl(
            frame_name=frame_name,
            conf_threshold=ar_params["threshold"],
            conv_mask_to_poly=ar_params["conv_mask_to_poly"],
        )

    def _calculate_result_for_annotate_task_ar(
        self, ar_id: str, ar_params
    ) -> models.PatchedLabeledDataRequest:
        ds = cvatds.TaskDataset(self._client, ar_params["task"], load_annotations=False)

        # Fetching the dataset might take a while, so do a progress update to let the server
        # know we're still alive.
        self._update_ar(ar_id, 0)
        last_update_timestamp = datetime.now(tz=timezone.utc)

        mapper = self._create_annotation_mapper_for_detection_ar(ar_params, ds.labels)

        all_annotations = models.PatchedLabeledDataRequest(shapes=[])

        for sample_index, sample in enumerate(ds.samples):
            context = self._create_detection_function_context(ar_params, sample.frame_name)
            shapes = self._executor.result(
                self._executor.submit(_worker_job_detect, context, sample.media.load_image())
            )

            mapper.validate_and_remap(shapes, sample.frame_index)
            all_annotations.shapes.extend(shapes)

            current_timestamp = datetime.now(tz=timezone.utc)

            if current_timestamp >= last_update_timestamp + _UPDATE_INTERVAL:
                self._update_ar(ar_id, (sample_index + 1) / len(ds.samples))
                last_update_timestamp = current_timestamp

            # Interactive requests are time sensitive, so if there are any,
            # we have to put the current AR on hold and process them ASAP.
            self._process_available_ars(REQUEST_CATEGORY_INTERACTIVE)

        return all_annotations

    def _calculate_result_for_annotate_frame_ar(
        self, ar_id: str, ar_params
    ) -> models.PatchedLabeledDataRequest:
        frame_index = ar_params["frame"]

        ds = cvatds.TaskDataset(
            self._client,
            ar_params["task"],
            load_annotations=False,
            media_download_policy=cvatds.MediaDownloadPolicy.FETCH_FRAMES_ON_DEMAND,
        )

        # Since ds.samples excludes deleted frames, we can't just do sample = ds.samples[frame_index].
        # Once we drop Python 3.9, we can change this to use bisect instead of the linear search.
        for sample in ds.samples:
            if sample.frame_index == frame_index:
                break
        else:
            raise _BadArError(f"Frame with index {frame_index} does not exist in the task")

        mapper = self._create_annotation_mapper_for_detection_ar(ar_params, ds.labels)

        context = self._create_detection_function_context(ar_params, sample.frame_name)

        shapes = self._executor.result(
            self._executor.submit(_worker_job_detect, context, sample.media.load_image())
        )

        mapper.validate_and_remap(shapes, frame_index)
        return models.PatchedLabeledDataRequest(shapes=shapes)

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
