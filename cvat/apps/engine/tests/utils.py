# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import itertools
import logging
import os
import shutil
import unittest
import unittest.mock
from collections.abc import Callable, Collection, Generator, Iterator, Sequence
from contextlib import contextmanager
from copy import deepcopy
from io import BytesIO
from pathlib import Path
from pprint import pformat
from typing import Any, NoReturn, Protocol, TypeVar
from unittest import TestCase
from urllib.parse import urlencode

import av
import django.test
import django_rq
import numpy as np
from django.conf import settings
from django.core.cache import caches
from django.http.response import HttpResponse
from django.utils.module_loading import import_string
from PIL import Image
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APITestCase
from scipy.optimize import linear_sum_assignment

from cvat.apps.engine.models import User

T = TypeVar("T")

ASSETS_DIR = Path(__file__).parent / "assets"


class OrderStrategy(Protocol):
    def __call__(self, key_path: list[str]) -> bool: ...


@contextmanager
def logging_disabled():
    old_level = logging.getLogger().manager.disable

    try:
        logging.disable(logging.CRITICAL)
        yield
    finally:
        logging.disable(old_level)


class ForceLogin:
    def __init__(self, user: User, client: django.test.Client):
        self.user = user
        self.client = client

    def __enter__(self):
        if self.user:
            self.client.force_login(self.user, backend="django.contrib.auth.backends.ModelBackend")

        return self

    def __exit__(self, exception_type, exception_value, traceback):
        if self.user:
            self.client.logout()


def clear_rq_jobs():
    for queue_name in settings.RQ_QUEUES:
        queue = django_rq.get_queue(queue_name)

        # Remove actual jobs
        queue.empty()

        # Clean up the registries
        for registry in [
            queue.failed_job_registry,
            queue.finished_job_registry,
            queue.started_job_registry,
            queue.scheduled_job_registry,
        ]:
            for job_id in registry.get_job_ids():
                registry.remove(job_id)

        # Remove orphaned jobs that can't be normally reported by DjangoRQ
        # https://github.com/rq/django-rq/issues/73
        for key in queue.connection.keys("rq:job:*"):
            job_id = key.decode().split("rq:job:", maxsplit=1)[1]
            job = queue.fetch_job(job_id)
            if not job:
                # The job can belong to a different queue, using the same connection
                continue

            job.delete()

        # Clean up the scheduler, if any
        try:
            scheduler = django_rq.get_scheduler(queue_name, queue)
        except ImportError:
            # If the scheduler is not enabled, an exception is thrown
            continue

        try:
            scheduler.acquire_lock()
            for job in scheduler.get_jobs():
                scheduler.cancel(job)
        finally:
            scheduler.remove_lock()


class ApiTestBase(APITestCase):
    def _clear_temp_data(self):
        # Clear server frame/chunk cache.
        # The parent class clears DB changes, and it can lead to under-cleaned task data,
        # which can affect other tests.
        # This situation is not expected to happen on a real server, because
        # cache keys include Data object ids, which cannot be reused or freed
        # in real scenarios
        for cache in caches.all(initialized_only=True):
            cache.clear()

        # Clear any remaining RQ jobs produced by the tests executed
        self._clear_rq_jobs()

        # clear cache files created after previous exports
        export_cache_dir = Path(settings.EXPORT_CACHE_ROOT)
        for child in export_cache_dir.iterdir():
            if child.is_dir():
                shutil.rmtree(child)
            else:
                os.remove(child)

    def _clear_rq_jobs(self):
        clear_rq_jobs()

    def setUp(self):
        self._clear_temp_data()

        super().setUp()
        self.client = self.client_class()

    def _get_request(
        self, path: str, user: User, *, query_params: dict[str, Any] | None = None
    ) -> Response:
        with ForceLogin(user, self.client):
            response = self.client.get(path, data=query_params)
        return response

    def _delete_request(self, path: str, user: User):
        with ForceLogin(user, self.client):
            response = self.client.delete(path)
        return response

    def _post_request(
        self,
        path: str,
        user: User,
        *,
        format: str = "json",  # pylint: disable=redefined-builtin
        query_params: dict[str, Any] = None,
        data: dict[str, Any] | None = None,
    ):
        if query_params:
            # Note: once we upgrade to Django 5.1+, this should be changed to pass query_params
            # directly to self.client.
            assert "?" not in path
            path += "?" + urlencode(query_params)
        with ForceLogin(user, self.client):
            response = self.client.post(path, data=data, format=format)
        return response

    def _patch_request(self, path: str, user: str, *, data: dict[str, Any] | None = None):
        with ForceLogin(user, self.client):
            response = self.client.patch(path, data=data, format="json")
        return response

    def _put_request(
        self,
        url: str,
        user: User,
        *,
        format: str = "json",  # pylint: disable=redefined-builtin
        data: dict[str, Any] | None = None,
    ):
        with ForceLogin(user, self.client):
            response = self.client.put(url, data=data, format=format)
        return response

    def _check_request_status(
        self,
        user: User,
        rq_id: str,
        *,
        expected_4xx_status_code: int | None = None,
    ):
        response = self._get_request(f"/api/requests/{rq_id}", user)
        self.assertEqual(response.status_code, expected_4xx_status_code or status.HTTP_200_OK)
        if expected_4xx_status_code is not None:
            return

        response_json = response.json()
        request_status = response_json["status"]
        self.assertEqual(request_status, "finished", "Message:\n" + response_json["message"])
        return response


class ImportApiTestBase(ApiTestBase):
    def _import(
        self,
        user: User,
        api_path: str,
        file_content: BytesIO,
        *,
        through_field: str,
        query_params: dict[str, Any] | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        response = self._post_request(
            api_path,
            user,
            data={through_field: file_content},
            format="multipart",
            query_params=query_params,
        )
        self.assertEqual(response.status_code, expected_4xx_status_code or status.HTTP_202_ACCEPTED)

        if not expected_4xx_status_code:
            rq_id = response.json().get("rq_id")
            assert rq_id, "The rq_id param was not found in the server response"
            response = self._check_request_status(user, rq_id)

        return response

    def _import_project_dataset(
        self,
        user: User,
        project_id: int,
        file_content: BytesIO,
        query_params: str = None,
        expected_4xx_status_code: int | None = None,
    ):
        return self._import(
            user,
            f"/api/projects/{project_id}/dataset",
            file_content,
            through_field="dataset_file",
            query_params=query_params,
            expected_4xx_status_code=expected_4xx_status_code,
        )

    def _import_task_annotations(
        self,
        user: User,
        task_id: int,
        file_content: BytesIO,
        query_params: str = None,
        expected_4xx_status_code: int | None = None,
    ):
        return self._import(
            user,
            f"/api/tasks/{task_id}/annotations",
            file_content,
            through_field="annotation_file",
            query_params=query_params,
            expected_4xx_status_code=expected_4xx_status_code,
        )

    def _import_job_annotations(
        self,
        user: User,
        job_id: int,
        file_content: BytesIO,
        query_params: str = None,
        expected_4xx_status_code: int | None = None,
    ):
        return self._import(
            user,
            f"/api/jobs/{job_id}/annotations",
            file_content,
            through_field="annotation_file",
            query_params=query_params,
            expected_4xx_status_code=expected_4xx_status_code,
        )

    def _import_project_backup(
        self,
        user: User,
        file_content: BytesIO,
        query_params: str = None,
        expected_4xx_status_code: int | None = None,
    ) -> int | None:
        response = self._import(
            user,
            "/api/projects/backup",
            file_content,
            through_field="project_file",
            query_params=query_params,
            expected_4xx_status_code=expected_4xx_status_code,
        )
        if expected_4xx_status_code:
            return None

        return response.json()["result_id"]

    def _import_task_backup(
        self,
        user: User,
        file_content: BytesIO,
        query_params: str = None,
        expected_4xx_status_code: int | None = None,
    ) -> int | None:
        response = self._import(
            user,
            "/api/tasks/backup",
            file_content,
            through_field="task_file",
            query_params=query_params,
            expected_4xx_status_code=expected_4xx_status_code,
        )
        if expected_4xx_status_code:
            return None

        return response.json()["result_id"]


class ExportApiTestBase(ApiTestBase):
    def _export(
        self,
        user: User,
        api_path: str,
        *,
        query_params: dict[str, Any] | None = None,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        response = self._post_request(api_path, user, query_params=query_params)
        self.assertEqual(response.status_code, expected_4xx_status_code or status.HTTP_202_ACCEPTED)

        rq_id = response.json().get("rq_id")
        if expected_4xx_status_code:
            # export task by admin to get real rq_id
            response = self._post_request(api_path, self.admin, query_params=query_params)
            self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
            rq_id = response.json().get("rq_id")

        assert rq_id, "The rq_id param was not found in the server response"

        response = self._check_request_status(
            user, rq_id, expected_4xx_status_code=expected_4xx_status_code
        )

        if not download_locally:
            return response

        # get actual result URL to check that server returns 401/403 when a user tries to download prepared file
        if expected_4xx_status_code:
            response = self._check_request_status(self.admin, rq_id)

        result_url = response.json().get("result_url")
        assert result_url, "The result_url param was not found in the server response"

        response = self._get_request(result_url, user)
        self.assertEqual(response.status_code, expected_4xx_status_code or status.HTTP_200_OK)

        if not expected_4xx_status_code and file_path:
            with open(file_path, "wb") as f:
                f.write(response.getvalue())

        return response

    def _export_task_backup(
        self,
        user: User,
        task_id: int,
        *,
        query_params: dict | None = None,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        return self._export(
            user,
            f"/api/tasks/{task_id}/backup/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code,
        )

    def _export_project_backup(
        self,
        user: User,
        project_id: int,
        *,
        query_params: dict | None = None,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        return self._export(
            user,
            f"/api/projects/{project_id}/backup/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code,
        )

    def _export_project_dataset(
        self,
        user: User,
        project_id: int,
        *,
        query_params: dict,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        query_params["save_images"] = True

        return self._export(
            user,
            f"/api/projects/{project_id}/dataset/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code,
        )

    def _export_project_annotations(
        self,
        user: User,
        project_id: int,
        *,
        query_params: dict,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        query_params["save_images"] = False

        return self._export(
            user,
            f"/api/projects/{project_id}/dataset/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code,
        )

    def _export_task_dataset(
        self,
        user: User,
        task_id: int,
        *,
        query_params: dict,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        query_params["save_images"] = True

        return self._export(
            user,
            f"/api/tasks/{task_id}/dataset/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code,
        )

    def _export_task_annotations(
        self,
        user: User,
        task_id: int,
        *,
        query_params: dict,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        query_params["save_images"] = False

        return self._export(
            user,
            f"/api/tasks/{task_id}/dataset/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code,
        )

    def _export_job_dataset(
        self,
        user: User,
        job_id: int,
        *,
        query_params: dict,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        query_params["save_images"] = True

        return self._export(
            user,
            f"/api/jobs/{job_id}/dataset/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code,
        )

    def _export_job_annotations(
        self,
        user: User,
        job_id: int,
        *,
        query_params: dict,
        download_locally: bool = True,
        file_path: str | None = None,
        expected_4xx_status_code: int | None = None,
    ):
        query_params["save_images"] = False

        return self._export(
            user,
            f"/api/jobs/{job_id}/dataset/export",
            query_params=query_params,
            download_locally=download_locally,
            file_path=file_path,
            expected_4xx_status_code=expected_4xx_status_code,
        )


def generate_image_file(filename, size=(100, 100)):
    assert os.path.splitext(filename)[-1].lower() in [
        "",
        ".jpg",
        ".jpeg",
    ], "This function supports only jpeg images. Please add the .jpg extension to the file name"

    f = BytesIO()
    image = Image.new("RGB", size=size)
    image.save(f, "jpeg")
    f.name = filename
    f.seek(0)
    return f


def generate_video_file(filename, width=1920, height=1080, duration=1, fps=25, codec_name="mpeg4"):
    f = BytesIO()
    total_frames = duration * fps
    file_ext = os.path.splitext(filename)[1][1:]
    container = av.open(f, mode="w", format=file_ext)

    stream = container.add_stream(codec_name=codec_name, rate=fps)
    stream.width = width
    stream.height = height
    stream.pix_fmt = "yuv420p"

    for frame_i in range(total_frames):
        img = np.empty((stream.width, stream.height, 3))
        img[:, :, 0] = 0.5 + 0.5 * np.sin(2 * np.pi * (0 / 3 + frame_i / total_frames))
        img[:, :, 1] = 0.5 + 0.5 * np.sin(2 * np.pi * (1 / 3 + frame_i / total_frames))
        img[:, :, 2] = 0.5 + 0.5 * np.sin(2 * np.pi * (2 / 3 + frame_i / total_frames))

        img = np.round(255 * img).astype(np.uint8)
        img = np.clip(img, 0, 255)

        frame = av.VideoFrame.from_ndarray(img, format="rgb24")
        for packet in stream.encode(frame):
            container.mux(packet)

    # Flush stream
    for packet in stream.encode():
        container.mux(packet)

    # Close the file
    container.close()
    f.name = filename
    f.seek(0)

    return [(width, height)] * total_frames, f


def get_paginated_collection(request_chunk_callback: Callable[[int], HttpResponse]) -> Iterator[T]:
    values = []

    for page in itertools.count(start=1):
        response = request_chunk_callback(page)
        data = response.json()
        values.extend(data["results"])
        if not data.get("next"):
            break

    return values


def filter_dict(
    d: dict[str, Any], *, keep: Sequence[str] = None, drop: Sequence[str] = None
) -> dict[str, Any]:
    return {
        k: v
        for k, v in d.items()
        if (keep is None or k in keep) and (drop is None or k not in drop)
    }


def _match_lists(
    a_objs: list[Any],
    b_objs: list[Any],
    *,
    distance: Callable[[Any, Any], bool],
) -> tuple[list[tuple[Any, Any]], list[Any], list[Any]] | NoReturn:
    """
    Matches two lists of objects using a distance function.
    The distance function should return True if the objects are equal, and False otherwise.

    Returns: (matches, a_unmatched, b_unmatched)
    """

    if len(a_objs) != len(b_objs):
        raise ValueError("The number of objects in the lists should be equal")

    distances = np.asarray([1 - int(distance(a, b)) for a in a_objs for b in b_objs])
    distances = distances.reshape((len(a_objs), len(b_objs)))

    # O(n^3) complexity or better
    a_matches, b_matches = linear_sum_assignment(distances)

    matches = []
    a_unmatched = []
    b_unmatched = []

    for a_idx, b_idx in zip(a_matches, b_matches):
        dist = distances[a_idx, b_idx]
        if dist == 1:
            if a_idx < len(a_objs):
                a_unmatched.append(a_objs[a_idx])
            if b_idx < len(b_objs):
                b_unmatched.append(b_objs[b_idx])
        else:
            matches.append((a_objs[a_idx], b_objs[b_idx]))

    return matches, a_unmatched, b_unmatched


def _format_key(key: list[str]) -> str:
    return ".".join([] + key) or ""


def compare_objects(
    self: TestCase,
    obj1: Any,
    obj2: Any,
    ignore_keys: Collection[str],
    *,
    defaults: dict[str, Any] | Callable[[list[str]], dict | None] | None = None,
    fp_tolerance: float = 0.001,
    current_key: list[str] | str | None = None,
    check_order: bool | OrderStrategy = True,
) -> bool | NoReturn:
    if isinstance(current_key, str):
        current_key = [current_key]
    elif not current_key:
        current_key = []

    key_info = f"{_format_key(current_key)}: "
    error_msg = "{}{} != {}"

    if isinstance(obj1, dict):
        self.assertTrue(isinstance(obj2, dict), error_msg.format(key_info, obj1, obj2))

        current_key_defaults = {}
        if defaults and isinstance(defaults, dict):
            current_key_defaults = defaults
        elif defaults and callable(defaults):
            current_key_defaults = defaults(current_key) or {}

        keys_to_check = (obj1.keys() | obj2.keys() | current_key_defaults.keys()) - set(ignore_keys)
        for k in keys_to_check:
            compare_objects(
                self,
                obj1[k] if not k in current_key_defaults else obj1.get(k, current_key_defaults[k]),
                obj2[k] if not k in current_key_defaults else obj2.get(k, current_key_defaults[k]),
                ignore_keys,
                defaults=defaults,
                current_key=current_key + [k],
                fp_tolerance=fp_tolerance,
                check_order=check_order,
            )
    elif isinstance(obj1, list):
        self.assertTrue(isinstance(obj2, list), error_msg.format(key_info, obj1, obj2))
        self.assertEqual(
            len(obj1),
            len(obj2),
            error_msg.format(key_info, pformat(obj1, compact=True), pformat(obj2, compact=True)),
        )

        if check_order is True or check_order(current_key):
            for v1, v2 in zip(obj1, obj2):
                compare_objects(
                    self,
                    v1,
                    v2,
                    ignore_keys,
                    defaults=defaults,
                    current_key=current_key,
                    fp_tolerance=fp_tolerance,
                    check_order=check_order,
                )
        else:

            def _compare(a, b) -> bool:
                try:
                    compare_objects(
                        self,
                        a,
                        b,
                        ignore_keys,
                        defaults=defaults,
                        current_key=current_key,
                        fp_tolerance=fp_tolerance,
                        check_order=check_order,
                    )
                    return True
                except AssertionError:
                    return False

            _, a_unmatched, b_unmatched = _match_lists(obj1, obj2, distance=_compare)

            if a_unmatched or b_unmatched:
                self.fail(
                    "Failed to match lists. "
                    + error_msg.format(
                        key_info, pformat(obj1, compact=True), pformat(obj2, compact=True)
                    )
                )

    elif isinstance(obj1, float) or isinstance(obj2, float):
        self.assertAlmostEqual(obj1, obj2, delta=fp_tolerance, msg=current_key)
    else:
        self.assertEqual(obj1, obj2, msg=current_key)


def check_annotation_response(
    self: TestCase,
    response: dict,
    data: dict,
    *,
    expected_values: dict | None = None,
    ignore_keys: Sequence[str] = frozenset(("id", "version")),
) -> None | NoReturn:
    optional_fields = dict(
        source="manual",
        occluded=False,
        outside=False,
        z_order=0,
        rotation=0,
        attributes=[],
        elements=[],
    )  # if omitted, are set by the server
    # https://docs.cvat.ai/docs/api_sdk/sdk/reference/models/labeled-shape/

    if expected_values is not None:
        optional_fields["source"] = expected_values.get("source") or optional_fields["source"]
        # the only field with a variable default

        def put_expected_values(v: Any) -> Any:
            if isinstance(v, dict):
                v.update(filter_dict(expected_values, keep=v.keys() & expected_values.keys()))

                for k, vv in v.items():
                    v[k] = put_expected_values(vv)
            if isinstance(v, list):
                v = [put_expected_values(item) for item in v]
            if isinstance(v, tuple):
                v = tuple(put_expected_values(item) for item in v)

            return v

        data = put_expected_values(deepcopy(data))

    def _check_order_in_annotations(key_path: list[str]) -> bool:
        return "points" in key_path

    def _key_defaults(key_path: list[str]) -> dict | None:
        if key_path and key_path[-1] == "tags":
            return filter_dict(optional_fields, keep=["source", "attributes"])
        if key_path and key_path[-1] == "shapes":
            return filter_dict(
                optional_fields,
                keep=[
                    "occluded",
                    "outside",
                    "z_order",
                    "rotation",
                    "source",
                    "attributes",
                    "elements",
                ],
            )
        if key_path and key_path[-1] == "tracks":
            return filter_dict(optional_fields, keep=["source", "attributes", "elements"])
        if key_path and _format_key(key_path).endswith("tracks.elements"):
            return filter_dict(optional_fields, keep=["source", "attributes"])
        if key_path and _format_key(key_path).endswith("tracks.elements.shapes"):
            return filter_dict(
                optional_fields, keep=["occluded", "outside", "z_order", "rotation", "attributes"]
            )

        return None

    try:
        compare_objects(
            self,
            response.data,
            data,
            ignore_keys=ignore_keys,
            defaults=_key_defaults,
            check_order=_check_order_in_annotations,
        )
    except AssertionError as e:
        print(
            "Objects are not equal:",
            pformat(response.data, compact=True),
            "!=",
            pformat(data, compact=True),
            sep="\n",
        )
        print(e)
        raise


@contextmanager
def mock_method(
    obj: str | Any, attr: str, *, new: Callable | Any = unittest.mock.DEFAULT
) -> Generator[unittest.mock.Mock, None, None]:
    """
    Allows to mock a class instance method, while still be able to call the original implementation.

    If 'new' is unittest.mock.DEFAULT, the original implementation is called.
    Otherwise, the replacement is called. The mocked function returns the value of the new or
    the original method call.
    """
    # With unittest.mock.Mock, using "wraps" or other callable binding options results in "self"
    # being consumed by the mock. This disallows using it for, e.g., transparent call recording.

    if isinstance(obj, str):
        obj = import_string(obj)

    old_method = getattr(obj, attr)

    if new is unittest.mock.DEFAULT:
        new = old_method

    m = unittest.mock.Mock(spec=old_method)

    def call_wrapper(self, *args, **kwargs):
        m(*args, **kwargs)
        return new(self, *args, **kwargs)

    try:
        setattr(obj, attr, call_wrapper)
        yield m
    finally:
        setattr(obj, attr, old_method)
