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
import time
from collections.abc import Generator, Iterator
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from pathlib import Path
from typing import TYPE_CHECKING

import attrs
import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.datasets as cvatds
import urllib3.exceptions
from cvat_sdk import Client
from cvat_sdk.datasets.caching import make_cache_manager
from cvat_sdk.exceptions import ApiException

from .agent_driver import (
    AgentFunctionDriver,
    BadArError,
    IncompatibleFunctionError,
    set_worker_current_function,
    worker_current_function,
)
from .agent_driver_detection import AgentDetectionFunctionDriver
from .agent_driver_tracking import AgentTrackingFunctionDriver, TrackingStateIdGenerator
from .common import CriticalError, FunctionLoader

if TYPE_CHECKING:
    from _typeshed import SupportsReadline

FUNCTION_PROVIDER_NATIVE = "native"
REQUEST_CATEGORY_BATCH = "batch"
REQUEST_CATEGORY_INTERACTIVE = "interactive"

REQUEST_CATEGORIES_WITH_DECREASING_PRIORITY = (REQUEST_CATEGORY_INTERACTIVE, REQUEST_CATEGORY_BATCH)

_POLLING_INTERVAL_MEAN_FREQUENT = timedelta(seconds=60)
_POLLING_INTERVAL_MEAN_RARE = timedelta(minutes=10)
_JITTER_AMOUNT = 0.15
_DEFAULT_RETRY_DELAY = timedelta(seconds=5)

_UPDATE_INTERVAL = timedelta(seconds=30)


class _ExponentialBackoff:
    def __init__(self, max_delay: timedelta, current_delay: timedelta) -> None:
        self._max_delay = max_delay
        self._current_delay = current_delay

    def reset(self, current_delay: timedelta) -> None:
        self._current_delay = current_delay

    def next(self) -> timedelta:
        delay = self._current_delay
        self._current_delay = min(self._current_delay * 2, self._max_delay)
        return delay


class RecoverableExecutor:
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


def _default_tracking_state_id_generator() -> str:
    # This is defined as a separate function so that tests can monkeypatch it
    # in order to get deterministic state IDs.
    return secrets.token_urlsafe(32)


def _worker_init(
    function_loader: FunctionLoader, state_id_generator: TrackingStateIdGenerator
) -> None:
    current_function = function_loader.load()
    set_worker_current_function(current_function)

    get_function_driver_class(current_function.spec).init_worker(state_id_generator)


def _worker_job_get_function_spec():
    return worker_current_function().spec


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
    so that at any time the cache contains at most _MAX_CACHED_TASKS tasks.

    This helps manage disk usage, since agents may run indefinitely, and
    we don't want the dataset cache to keep growing.
    """

    _MAX_CACHED_TASKS = 10

    def __init__(self, client: Client) -> None:
        self._client = client
        self._cache_manager = make_cache_manager(client, cvatds.UpdatePolicy.IF_MISSING_OR_STALE)

        self._cached_task_ids = []

        self._task_ids_in_use = set()

    @contextlib.contextmanager
    def using_cache_for_task(self, task_id: int) -> Generator[None, None, None]:
        if task_id in self._task_ids_in_use:
            yield
            return

        if task_id in self._cached_task_ids:
            self._cached_task_ids.remove(task_id)

        self._task_ids_in_use.add(task_id)

        if len(self._cached_task_ids) + len(self._task_ids_in_use) > self._MAX_CACHED_TASKS:
            self._delete_task_cache(self._cached_task_ids.pop(0))

        try:
            yield
        finally:
            self._task_ids_in_use.remove(task_id)
            self._cached_task_ids.append(task_id)

    def _delete_task_cache(self, task_id: int) -> None:
        self._client.logger.info("Deleting task %d from the cache to make room...", task_id)
        shutil.rmtree(self._cache_manager.task_dir(task_id), ignore_errors=True)


def _parse_event_stream(
    stream: SupportsReadline[bytes],
) -> Iterator[_Event | _NewReconnectionDelay]:
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


def get_function_driver_class(function_spec: object) -> type[AgentFunctionDriver]:
    if isinstance(function_spec, cvataa.DetectionFunctionSpec):
        return AgentDetectionFunctionDriver

    if isinstance(function_spec, cvataa.TrackingFunctionSpec):
        return AgentTrackingFunctionDriver

    raise CriticalError(f"Unsupported function spec type: {type(function_spec).__name__}")


class _Agent:
    def __init__(self, client: Client, executor: RecoverableExecutor, function_id: int):
        self._rng = random.Random()  # nosec

        self._client = client
        self._function_id = function_id
        function_spec = executor.result(executor.submit(_worker_job_get_function_spec))
        self._function_driver = get_function_driver_class(function_spec)(
            client, executor, function_spec
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
        self._queue_reconnection_delay = _ExponentialBackoff(
            _POLLING_INTERVAL_MEAN_RARE, _POLLING_INTERVAL_MEAN_RARE
        )

    def _validate_function_compatibility(self, remote_function: dict) -> None:
        function_id = remote_function["id"]

        if remote_function["provider"] != FUNCTION_PROVIDER_NATIVE:
            raise CriticalError(
                f"Function #{function_id} has provider {remote_function['provider']!r}. "
                f"Agents can only be run for functions with provider {FUNCTION_PROVIDER_NATIVE!r}."
            )

        try:
            if remote_function["kind"] != self._function_driver.FUNCTION_KIND:
                raise IncompatibleFunctionError(
                    f"kind is {remote_function['kind']!r} "
                    f"(expected {self._function_driver.FUNCTION_KIND!r})."
                )

            self._function_driver.validate_function_compatibility(remote_function)
        except IncompatibleFunctionError as ex:
            raise CriticalError(
                f"Function #{function_id} is incompatible with function object: {ex}"
            ) from ex

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
            timeout=self._queue_reconnection_delay.next().total_seconds() * delay_multiplier
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
                        self._queue_reconnection_delay.reset(message.delay)
                        self._client.logger.info(
                            "New queue event stream reconnection delay is %fs",
                            message.delay.total_seconds(),
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
                            # TODO: check in newer versions
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
        ar_id = ar_assignment["ar_id"]
        ar_params = ar_assignment["ar_params"]

        self._client.logger.info(
            "Got assigned annotation request %r of type %r (%s)",
            ar_id,
            ar_params["type"],
            # Log only a few key parameters to avoid cluttering the info-level log.
            " ".join([f"{k}={ar_params[k]!r}" for k in ("task", "frame") if k in ar_params]),
        )
        self._client.logger.debug("AR %r parameters: %r", ar_id, ar_params)

        last_update_timestamp = datetime.now(tz=timezone.utc)

        def check_in(*, current_progress: float) -> None:
            nonlocal last_update_timestamp
            current_timestamp = datetime.now(tz=timezone.utc)

            if current_timestamp >= last_update_timestamp + _UPDATE_INTERVAL:
                self._update_ar(ar_id, current_progress)
                last_update_timestamp = current_timestamp

            # Interactive requests are time sensitive, so if there are any,
            # we have to put the current AR on hold and process them ASAP.
            self._process_available_ars(REQUEST_CATEGORY_INTERACTIVE)

        try:
            with self._task_cache_limiter.using_cache_for_task(ar_params["task"]):
                result = self._function_driver.calculate_result_for_ar(ar_params, check_in)
            self._complete_ar(ar_id, result)
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
            elif isinstance(ex, BadArError):
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

    def _handle_retryable_post_error(self, ex: Exception, delay: _ExponentialBackoff) -> bool:
        # Normally, urllib3 handles retries for HTTP requests,
        # but it only does it for idempotent ones.
        # So for POST requests that are safe to retry, we have to do it ourselves.
        # This function must be called from an exception handler.
        # It will return True if the operation should be retried,
        # or False if the exception should be re-raised.

        is_rate_limit = False
        delay_sec = None

        if isinstance(ex, ApiException):
            try:
                delay_sec = int(ex.headers["Retry-After"])
            except (KeyError, ValueError):
                pass

            if ex.status == HTTPStatus.TOO_MANY_REQUESTS:
                is_rate_limit = True
            elif ex.status and 400 <= ex.status < 500:
                # We did something wrong; no point in retrying.
                return False

        if delay_sec is None:
            delay_multiplier = self._rng.uniform(1, 1 + _JITTER_AMOUNT)
            delay_sec = delay.next().total_seconds() * delay_multiplier

        if is_rate_limit:
            self._client.logger.warning("Rate limited; will retry in %.2fs", delay_sec)
        else:
            self._client.logger.error(
                "Request failed; will retry in %.2fs", delay_sec, exc_info=True
            )
        time.sleep(delay_sec)
        return True

    def _poll_for_ar(self, category: str) -> dict | None:
        retry_delay = _ExponentialBackoff(_POLLING_INTERVAL_MEAN_RARE, _DEFAULT_RETRY_DELAY)

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
                if not self._handle_retryable_post_error(ex, retry_delay):
                    raise

        response_data = json.loads(response.data)
        return response_data["ar_assignment"]

    def _update_ar(self, ar_id: str, progress: float) -> None:
        self._client.logger.info("Updating AR %r progress to %.2f%%...", ar_id, progress * 100)

        try:
            self._client.api_client.call_api(
                "/api/functions/queues/{queue_id}/requests/{request_id}/update",
                "POST",
                path_params={"queue_id": f"function:{self._function_id}", "request_id": ar_id},
                body={"agent_id": self._agent_id, "progress": progress},
            )
        except (urllib3.exceptions.HTTPError, ApiException):
            # Updating the progress is not critical, so log and continue onwards.
            self._client.logger.error("Failed to update AR %r progress", ar_id, exc_info=True)

    def _complete_ar(self, ar_id: str, result: dict) -> None:
        # It would be frustrating for the user if we calculate the result of an AR and then fail
        # due to a transient error when submitting it, so we should retry at least a couple times.

        delay = _ExponentialBackoff(_POLLING_INTERVAL_MEAN_RARE, _DEFAULT_RETRY_DELAY)
        attempt_num = 0

        while True:
            self._client.logger.info("Submitting result for AR %r...", ar_id)
            try:
                self._client.api_client.call_api(
                    "/api/functions/queues/{queue_id}/requests/{request_id}/complete",
                    "POST",
                    path_params={"queue_id": f"function:{self._function_id}", "request_id": ar_id},
                    body={"agent_id": self._agent_id, **result},
                )
                break
            except (urllib3.exceptions.HTTPError, ApiException) as ex:
                if attempt_num >= 3:
                    self._client.logger.error(
                        "Exceeded maximum retries for submitting AR %r", ar_id
                    )
                    raise

                if not self._handle_retryable_post_error(ex, delay):
                    raise

            attempt_num += 1

        self._client.logger.info("AR %r completed", ar_id)


def run_agent(
    client: Client, function_loader: FunctionLoader, function_id: int, *, burst: bool
) -> None:
    with (
        RecoverableExecutor(
            initializer=_worker_init,
            initargs=[function_loader, _default_tracking_state_id_generator],
        ) as executor,
        tempfile.TemporaryDirectory() as cache_dir,
    ):
        client.config.cache_dir = Path(cache_dir, "cache")
        client.logger.info("Will store cache at %s", client.config.cache_dir)

        agent = _Agent(client, executor, function_id)
        agent.run(burst=burst)
