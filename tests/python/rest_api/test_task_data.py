# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import json
import math
import os
import os.path as osp
import zipfile
from collections import Counter
from collections.abc import Iterable, Sequence
from copy import deepcopy
from functools import partial
from http import HTTPStatus
from itertools import chain, groupby, product
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import numpy as np
import pytest
from cvat_sdk import exceptions
from cvat_sdk.api_client import models
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff
from PIL import Image
from pytest_cases import parametrize

import shared.utils.s3 as s3
from rest_api._test_base import TestTasksBase
from rest_api.utils import create_task, get_cloud_storage_content, wait_until_task_is_created
from shared.tasks.enums import SourceDataType
from shared.tasks.interface import ITaskSpec
from shared.tasks.types import ImagesTaskSpec
from shared.tasks.utils import parse_frame_step
from shared.utils.config import get_method, make_api_client, patch_method, post_method
from shared.utils.helpers import (
    generate_image_file,
    generate_image_files,
    generate_manifest,
    generate_video_file,
    read_video_file,
)


@pytest.mark.usefixtures("restore_db_per_function")
@pytest.mark.usefixtures("restore_cvat_data_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_after_class")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestPostTaskData:
    _USERNAME = "admin1"

    def _test_cannot_create_task(self, username, spec, data, **kwargs):
        with make_api_client(username) as api_client:
            (task, response) = api_client.tasks_api.create(spec, **kwargs)
            assert response.status == HTTPStatus.CREATED

            (result, response) = api_client.tasks_api.create_data(
                task.id, data_request=deepcopy(data), _content_type="application/json", **kwargs
            )
            assert response.status == HTTPStatus.ACCEPTED

            request_details = wait_until_task_is_created(api_client.requests_api, result.rq_id)
            assert request_details.status.value == "failed"

        return request_details

    def test_can_create_task_with_defined_start_and_stop_frames(self):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with defined start and stop frames",
            "labels": [
                {
                    "name": "car",
                    "color": "#ff00ff",
                    "attributes": [
                        {
                            "name": "a",
                            "mutable": True,
                            "input_type": "number",
                            "default_value": "5",
                            "values": ["4", "5", "6"],
                        }
                    ],
                }
            ],
        }

        task_data = {
            "image_quality": 75,
            "start_frame": 2,
            "stop_frame": 5,
            "client_files": generate_image_files(7),
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        # check task size
        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            assert task.size == 4

    def test_default_overlap_for_small_segment_size(self):
        task_spec = {
            "name": f"test {self._USERNAME} with default overlap and small segment_size",
            "labels": [{"name": "car"}],
            "segment_size": 5,
        }

        task_data = {
            "image_quality": 75,
            "client_files": [generate_video_file(8)],
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        # check task size
        with make_api_client(self._USERNAME) as api_client:
            paginated_job_list, _ = api_client.jobs_api.list(task_id=task_id)

            jobs = paginated_job_list.results
            jobs.sort(key=lambda job: job.start_frame)

            assert len(jobs) == 2
            # overlap should be 2 frames (frames 3 & 4)
            assert jobs[0].start_frame == 0
            assert jobs[0].stop_frame == 4
            assert jobs[1].start_frame == 3
            assert jobs[1].stop_frame == 7

    @pytest.mark.parametrize(
        "size,expected_segments",
        [
            (2, [(0, 1)]),
            (3, [(0, 2)]),
            (4, [(0, 2), (2, 3)]),
            (5, [(0, 2), (2, 4)]),
            (6, [(0, 2), (2, 4), (4, 5)]),
        ],
    )
    def test_task_segmentation(self, size, expected_segments):
        task_spec = {
            "name": f"test {self._USERNAME} to check segmentation into jobs",
            "labels": [{"name": "car"}],
            "segment_size": 3,
            "overlap": 1,
        }

        task_data = {
            "image_quality": 75,
            "client_files": generate_image_files(size),
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        # check task size
        with make_api_client(self._USERNAME) as api_client:
            paginated_job_list, _ = api_client.jobs_api.list(task_id=task_id)

            jobs = paginated_job_list.results
            jobs.sort(key=lambda job: job.start_frame)

            assert [(j.start_frame, j.stop_frame) for j in jobs] == expected_segments

    def test_can_create_task_with_exif_rotated_images(self):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with exif rotated images",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        image_files = ["images/exif_rotated/left.jpg", "images/exif_rotated/right.jpg"]
        task_data = {
            "server_files": image_files,
            "image_quality": 70,
            "segment_size": 500,
            "use_cache": True,
            "sorting_method": "natural",
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        # check that the frames have correct width and height
        for chunk_quality in ["original", "compressed"]:
            with make_api_client(self._USERNAME) as api_client:
                _, response = api_client.tasks_api.retrieve_data(
                    task_id, number=0, type="chunk", quality=chunk_quality
                )
                data_meta, _ = api_client.tasks_api.retrieve_data_meta(task_id)

                with zipfile.ZipFile(io.BytesIO(response.data)) as zip_file:
                    for name, frame_meta in zip(zip_file.namelist(), data_meta.frames):
                        with zip_file.open(name) as zipped_img:
                            im = Image.open(zipped_img)
                            # original is 480x640 with 90/-90 degrees rotation
                            assert frame_meta.height == 640 and frame_meta.width == 480
                            assert im.height == 640 and im.width == 480
                            assert im.getexif().get(274, 1) == 1

    def test_can_create_task_with_big_images(self):
        # Checks for regressions about the issue
        # https://github.com/cvat-ai/cvat/issues/6878
        # In the case of big files (>2.5 MB by default),
        # uploaded files could be write-appended twice,
        # leading to bigger raw file sizes than expected.

        task_spec = {
            "name": f"test {self._USERNAME} to create a task with big images",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        # We need a big file to reproduce the problem
        image_file = generate_image_file("big_image.bmp", size=(4000, 4000), color=(100, 200, 30))
        image_bytes = image_file.getvalue()
        file_size = len(image_bytes)
        assert 10 * 2**20 < file_size

        task_data = {
            "client_files": [image_file],
            "image_quality": 70,
            "use_cache": False,
            "use_zip_chunks": True,
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        # check that the original chunk image have the original size
        # this is less accurate than checking the uploaded file directly, but faster
        with make_api_client(self._USERNAME) as api_client:
            _, response = api_client.tasks_api.retrieve_data(
                task_id, number=0, quality="original", type="chunk", _parse_response=False
            )
            chunk_file = io.BytesIO(response.data)

        with zipfile.ZipFile(chunk_file) as chunk_zip:
            infos = chunk_zip.infolist()
            assert len(infos) == 1
            assert infos[0].file_size == file_size

            chunk_image = chunk_zip.read(infos[0])
            assert chunk_image == image_bytes

    def test_can_create_task_with_exif_rotated_tif_image(self):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with exif rotated tif image",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        image_files = ["images/exif_rotated/tif_left.tif"]
        task_data = {
            "server_files": image_files,
            "image_quality": 70,
            "segment_size": 500,
            "use_cache": False,
            "sorting_method": "natural",
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        for chunk_quality in ["original", "compressed"]:
            # check that the frame has correct width and height
            with make_api_client(self._USERNAME) as api_client:
                _, response = api_client.tasks_api.retrieve_data(
                    task_id, number=0, type="chunk", quality=chunk_quality
                )

                with zipfile.ZipFile(io.BytesIO(response.data)) as zip_file:
                    assert len(zip_file.namelist()) == 1
                    name = zip_file.namelist()[0]
                    assert name == "000000.tif" if chunk_quality == "original" else "000000.jpeg"
                    with zip_file.open(name) as zipped_img:
                        im = Image.open(zipped_img)
                        # raw image is horizontal 100x150 with -90 degrees rotation
                        assert im.height == 150 and im.width == 100
                        assert im.getexif().get(274, 1) == 1

    def test_can_create_task_with_sorting_method_natural(self):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with a custom sorting method",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        image_files = generate_image_files(15)

        task_data = {
            "client_files": image_files[5:] + image_files[:5],  # perturb the order
            "image_quality": 70,
            "sorting_method": "natural",
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        # check that the frames were sorted again
        with make_api_client(self._USERNAME) as api_client:
            data_meta, _ = api_client.tasks_api.retrieve_data_meta(task_id)

            # generate_image_files produces files that are already naturally sorted
            for image_file, frame in zip(image_files, data_meta.frames):
                assert image_file.name == frame.name

    def test_can_create_task_with_video_without_keyframes(self):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with a video without keyframes",
            "labels": [
                {
                    "name": "label1",
                }
            ],
        }

        task_data = {
            "server_files": [osp.join("videos", "video_without_valid_keyframes.mp4")],
            "image_quality": 70,
        }

        task_id, _ = create_task(self._USERNAME, task_spec, task_data)

        with make_api_client(self._USERNAME) as api_client:
            (_, response) = api_client.tasks_api.retrieve(task_id)
            assert response.status == HTTPStatus.OK

    @pytest.mark.parametrize("data_source", ["client_files", "server_files"])
    def test_can_create_task_with_sorting_method_predefined(self, data_source):
        task_spec = {
            "name": f"test {self._USERNAME} to create a task with a custom sorting method",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        if data_source == "client_files":
            image_files = generate_image_files(15)

            # shuffle to check for occasional sorting, e.g. in the DB
            image_files = image_files[7:] + image_files[5:7] + image_files[:5]
        elif data_source == "server_files":
            # Files from the test file share
            image_files = ["images/image_3.jpg", "images/image_1.jpg", "images/image_2.jpg"]
        else:
            assert False

        task_data = {
            data_source: image_files,
            "image_quality": 70,
            "sorting_method": "predefined",
        }

        (task_id, _) = create_task(self._USERNAME, task_spec, task_data)

        # check that the frames were sorted again
        with make_api_client(self._USERNAME) as api_client:
            (data_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)

            for image_file, frame in zip(image_files, data_meta.frames):
                if isinstance(image_file, str):
                    image_name = image_file
                else:
                    image_name = image_file.name

                assert image_name == frame.name

    def test_can_get_annotations_from_new_task_with_skeletons(self):
        spec = {
            "name": f"test admin1 to create a task with skeleton",
            "labels": [
                {
                    "name": "s1",
                    "color": "#5c5eba",
                    "attributes": [],
                    "type": "skeleton",
                    "sublabels": [
                        {"name": "1", "color": "#d12345", "attributes": [], "type": "points"},
                        {"name": "2", "color": "#350dea", "attributes": [], "type": "points"},
                    ],
                    "svg": '<line x1="19.464284896850586" y1="21.922269821166992" x2="54.08613586425781" y2="43.60293960571289" '
                    'stroke="black" data-type="edge" data-node-from="1" stroke-width="0.5" data-node-to="2"></line>'
                    '<circle r="1.5" stroke="black" fill="#b3b3b3" cx="19.464284896850586" cy="21.922269821166992" '
                    'stroke-width="0.1" data-type="element node" data-element-id="1" data-node-id="1" data-label-id="103"></circle>'
                    '<circle r="1.5" stroke="black" fill="#b3b3b3" cx="54.08613586425781" cy="43.60293960571289" '
                    'stroke-width="0.1" data-type="element node" data-element-id="2" data-node-id="2" data-label-id="104"></circle>',
                }
            ],
        }

        task_data = {
            "image_quality": 75,
            "client_files": generate_image_files(3),
        }

        task_id, _ = create_task(self._USERNAME, spec, task_data)

        response = get_method(self._USERNAME, "labels", task_id=f"{task_id}")
        label_ids = {}
        for root_label in response.json()["results"]:
            for label in [root_label] + root_label["sublabels"]:
                label_ids.setdefault(label["type"], []).append(label["id"])

        response = get_method(self._USERNAME, "jobs", task_id=f"{task_id}")
        job_id = response.json()["results"][0]["id"]
        patch_data = {
            "shapes": [
                {
                    "type": "skeleton",
                    "occluded": False,
                    "outside": False,
                    "z_order": 0,
                    "rotation": 0,
                    "points": [],
                    "frame": 0,
                    "label_id": label_ids["skeleton"][0],
                    "group": 0,
                    "source": "manual",
                    "attributes": [],
                    "elements": [
                        {
                            "type": "points",
                            "occluded": False,
                            "outside": False,
                            "z_order": 0,
                            "rotation": 0,
                            "points": [131.63947368421032, 165.0868421052637],
                            "frame": 0,
                            "label_id": label_ids["points"][0],
                            "group": 0,
                            "source": "manual",
                            "attributes": [],
                        },
                        {
                            "type": "points",
                            "occluded": False,
                            "outside": False,
                            "z_order": 0,
                            "rotation": 0,
                            "points": [354.98157894736823, 304.2710526315795],
                            "frame": 0,
                            "label_id": label_ids["points"][1],
                            "group": 0,
                            "source": "manual",
                            "attributes": [],
                        },
                    ],
                }
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": label_ids["skeleton"][0],
                    "group": 0,
                    "source": "manual",
                    "shapes": [
                        {
                            "type": "skeleton",
                            "occluded": False,
                            "outside": False,
                            "z_order": 0,
                            "rotation": 0,
                            "points": [],
                            "frame": 0,
                            "attributes": [],
                        }
                    ],
                    "attributes": [],
                    "elements": [
                        {
                            "frame": 0,
                            "label_id": label_ids["points"][0],
                            "group": 0,
                            "source": "manual",
                            "shapes": [
                                {
                                    "type": "points",
                                    "occluded": False,
                                    "outside": False,
                                    "z_order": 0,
                                    "rotation": 0,
                                    "points": [295.6394736842103, 472.5868421052637],
                                    "frame": 0,
                                    "attributes": [],
                                }
                            ],
                            "attributes": [],
                        },
                        {
                            "frame": 0,
                            "label_id": label_ids["points"][1],
                            "group": 0,
                            "source": "manual",
                            "shapes": [
                                {
                                    "type": "points",
                                    "occluded": False,
                                    "outside": False,
                                    "z_order": 0,
                                    "rotation": 0,
                                    "points": [619.3236842105262, 846.9815789473689],
                                    "frame": 0,
                                    "attributes": [],
                                }
                            ],
                            "attributes": [],
                        },
                    ],
                }
            ],
            "tags": [],
            "version": 0,
        }

        response = patch_method(
            self._USERNAME, f"jobs/{job_id}/annotations", patch_data, action="create"
        )
        response = get_method(self._USERNAME, f"jobs/{job_id}/annotations")
        assert response.status_code == HTTPStatus.OK

    @pytest.mark.with_external_services
    @pytest.mark.parametrize(
        "use_cache, cloud_storage_id, manifest, use_bucket_content",
        [
            (True, 1, "images_with_manifest/manifest.jsonl", False),  # public bucket
            (True, 2, "sub/images_with_manifest/manifest.jsonl", True),  # private bucket
            (False, 1, "images_with_manifest/manifest.jsonl", False),  # public bucket
            (False, 2, "sub/images_with_manifest/manifest.jsonl", True),  # private bucket
            (True, 1, None, False),
            (True, 2, None, True),
            (False, 1, None, False),
            (False, 2, None, True),
        ],
    )
    def test_create_task_with_cloud_storage_files(
        self,
        use_cache: bool,
        cloud_storage_id: int,
        cloud_storages,
        manifest: str,
        use_bucket_content: bool,
    ):
        org_id = cloud_storages[cloud_storage_id]["organization"]
        bucket_prefix = "sub/" if cloud_storage_id == 2 else ""
        if use_bucket_content:
            cloud_storage_content = get_cloud_storage_content(
                self._USERNAME,
                cloud_storage_id,
                manifest=manifest,
                prefix=bucket_prefix,
            )
            cloud_storage_content = [
                p for p in cloud_storage_content if "images_with_manifest/" in p
            ]
        else:
            cloud_storage_content = [
                f"{bucket_prefix}images_with_manifest/image_case_65_1.png",
                f"{bucket_prefix}images_with_manifest/image_case_65_2.png",
            ]
        if manifest:
            cloud_storage_content.append(manifest)

        task_spec = {
            "name": f"Task with files from cloud storage {cloud_storage_id}",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        data_spec = {
            "image_quality": 75,
            "use_cache": use_cache,
            "cloud_storage_id": cloud_storage_id,
            "server_files": cloud_storage_content,
        }

        kwargs = {"org_id": org_id} if org_id else {}
        create_task(self._USERNAME, task_spec, data_spec, **kwargs)

    def _create_task_with_cloud_data(
        self,
        request,
        cloud_storage: Any,
        use_manifest: bool,
        server_files: list[str],
        use_cache: bool = True,
        sorting_method: str = "lexicographical",
        data_type: str = "image",
        video_frame_count: int = 10,
        server_files_exclude: list[str] | None = None,
        org: str = "",
        filenames: list[str] | None = None,
        task_spec_kwargs: dict[str, Any] | None = None,
        data_spec_kwargs: dict[str, Any] | None = None,
    ) -> tuple[int, Any]:
        s3_client = s3.make_client(bucket=cloud_storage["resource"])
        if data_type == "video":
            video = generate_video_file(video_frame_count)
            s3_client.create_file(
                data=video,
                filename=f"test/video/{video.name}",
            )
            request.addfinalizer(
                partial(
                    s3_client.remove_file,
                    filename=f"test/video/{video.name}",
                )
            )
        else:
            images = generate_image_files(
                3,
                sizes=[(100, 50) if i % 2 else (50, 100) for i in range(3)],
                **({"prefixes": ["img_"] * 3} if not filenames else {"filenames": filenames}),
            )

            for image in images:
                for i in range(2):
                    image.seek(0)
                    s3_client.create_file(
                        data=image,
                        filename=f"test/sub_{i}/{image.name}",
                    )
                    request.addfinalizer(
                        partial(
                            s3_client.remove_file,
                            filename=f"test/sub_{i}/{image.name}",
                        )
                    )

        if use_manifest:
            with TemporaryDirectory() as tmp_dir:
                manifest_root_path = f"{tmp_dir}/test/"
                for i in range(2):
                    path_with_sub_folders = f"{tmp_dir}/test/sub_{i}/"
                    os.makedirs(path_with_sub_folders)
                    for image in images:
                        with open(osp.join(path_with_sub_folders, image.name), "wb") as f:
                            f.write(image.getvalue())

                generate_manifest(manifest_root_path)

                with open(osp.join(manifest_root_path, "manifest.jsonl"), mode="rb") as m_file:
                    s3_client.create_file(
                        data=m_file.read(),
                        filename="test/manifest.jsonl",
                    )
                    request.addfinalizer(
                        partial(
                            s3_client.remove_file,
                            filename="test/manifest.jsonl",
                        )
                    )
        task_spec = {
            "name": f"Task created from directories from cloud storage {cloud_storage['id']}",
            "labels": [
                {
                    "name": "car",
                }
            ],
            **(task_spec_kwargs or {}),
        }

        data_spec = {
            "image_quality": 75,
            "use_cache": use_cache,
            "cloud_storage_id": cloud_storage["id"],
            "server_files": (
                server_files if not use_manifest else server_files + ["test/manifest.jsonl"]
            ),
            "sorting_method": sorting_method,
            **(data_spec_kwargs or {}),
        }

        if server_files_exclude:
            data_spec["server_files_exclude"] = server_files_exclude

        return create_task(self._USERNAME, task_spec, data_spec, org=org)

    @pytest.mark.with_external_services
    @pytest.mark.parametrize("cloud_storage_id", [2])
    @pytest.mark.parametrize(
        "use_cache, use_manifest, server_files, server_files_exclude, task_size",
        [
            (True, False, ["test/"], None, 6),
            (True, False, ["test/sub_0/", "test/sub_1/"], None, 6),
            (True, False, ["test/"], ["test/sub_0/", "test/sub_1/img_1.jpeg"], 2),
            (True, True, ["test/"], None, 6),
            (True, True, ["test/sub_0/", "test/sub_1/"], None, 6),
            (True, True, ["test/"], ["test/sub_0/", "test/sub_1/img_1.jpeg"], 2),
            (False, False, ["test/"], None, 6),
            (False, False, ["test/sub_0/", "test/sub_1/"], None, 6),
            (False, False, ["test/"], ["test/sub_0/", "test/sub_1/img_1.jpeg"], 2),
        ],
    )
    @pytest.mark.parametrize("org", [""])
    def test_create_task_with_cloud_storage_directories_and_excluded_files(
        self,
        cloud_storage_id: int,
        use_cache: bool,
        use_manifest: bool,
        server_files: list[str],
        server_files_exclude: list[str] | None,
        task_size: int,
        org: str,
        cloud_storages,
        request,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]
        task_id, _ = self._create_task_with_cloud_data(
            request,
            cloud_storage,
            use_manifest,
            server_files,
            use_cache=use_cache,
            server_files_exclude=server_files_exclude,
            org=org,
        )

        with make_api_client(self._USERNAME) as api_client:
            (task, response) = api_client.tasks_api.retrieve(task_id)
            assert response.status == HTTPStatus.OK
            assert task.size == task_size

    @pytest.mark.with_external_services
    @pytest.mark.parametrize("cloud_storage_id", [2])
    @pytest.mark.parametrize("use_manifest", [True, False])
    @pytest.mark.parametrize(
        "server_files, expected_result",
        [
            (
                ["test/sub_1/", "test/sub_0/"],
                [
                    "test/sub_1/img_0.jpeg",
                    "test/sub_1/img_1.jpeg",
                    "test/sub_1/img_2.jpeg",
                    "test/sub_0/img_0.jpeg",
                    "test/sub_0/img_1.jpeg",
                    "test/sub_0/img_2.jpeg",
                ],
            )
        ],
    )
    @pytest.mark.parametrize("org", [""])
    def test_create_task_with_cloud_storage_directories_and_predefined_sorting(
        self,
        cloud_storage_id: int,
        use_manifest: bool,
        server_files: list[str],
        expected_result: list[str],
        org: str,
        cloud_storages,
        request,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]
        task_id, _ = self._create_task_with_cloud_data(
            request, cloud_storage, use_manifest, server_files, sorting_method="predefined", org=org
        )

        with make_api_client(self._USERNAME) as api_client:
            (_, response) = api_client.tasks_api.retrieve(task_id)
            assert response.status == HTTPStatus.OK

            # check sequence of frames
            (data_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            assert expected_result == [x.name for x in data_meta.frames]

    @pytest.mark.with_external_services
    @pytest.mark.parametrize(
        "storage_id, manifest",
        [
            (1, "images_with_manifest/manifest.jsonl"),  # public bucket
            (2, "sub/images_with_manifest/manifest.jsonl"),  # private bucket
        ],
    )
    @pytest.mark.parametrize(
        "spec, field",
        [
            ("spec", "source_storage"),
            ("spec", "target_storage"),
            ("data", "cloud_storage_id"),
        ],
    )
    def test_user_cannot_create_task_with_cloud_storage_without_access(
        self, storage_id, spec, field, manifest, regular_lonely_user
    ):
        user = regular_lonely_user

        task_spec = {
            "name": f"Task with files from foreign cloud storage {storage_id}",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        data_spec = {
            "image_quality": 75,
            "use_cache": True,
        }

        if spec == "spec":
            task_spec.update(
                {
                    field: {
                        "location": "cloud_storage",
                        "cloud_storage_id": storage_id,
                    }
                }
            )
            data_spec["server_files"] = ["images/image_1.jpg"]

        elif spec == "data":
            data_spec.update(
                {
                    field: storage_id,
                    "filename_pattern": "*",
                    "server_files": [manifest],
                }
            )
        else:
            assert False

        with pytest.raises(exceptions.ApiException) as capture:
            create_task(user, task_spec, data_spec)

        assert capture.value.status == HTTPStatus.FORBIDDEN

    @pytest.mark.with_external_services
    @pytest.mark.parametrize("cloud_storage_id", [1])
    @pytest.mark.parametrize(
        "manifest, filename_pattern, sub_dir, task_size, expected_error",
        [
            ("manifest.jsonl", "*", True, 3, ""),  # public bucket
            ("manifest.jsonl", "test/*", True, 3, ""),
            ("manifest.jsonl", "test/sub*1.jpeg", True, 1, ""),
            ("manifest.jsonl", "*image*.jpeg", True, 3, ""),
            ("manifest.jsonl", "wrong_pattern", True, 0, "No media data found"),
            ("abc_manifest.jsonl", "[a-c]*.jpeg", False, 2, ""),
            ("abc_manifest.jsonl", "[d]*.jpeg", False, 1, ""),
            ("abc_manifest.jsonl", "[e-z]*.jpeg", False, 0, "No media data found"),
            (None, "*", True, 0, "Only one video, archive, pdf, zip"),
            (None, "test/*", True, 3, ""),
            (None, "test/sub*1.jpeg", True, 1, ""),
            (None, "*image*.jpeg", True, 3, ""),
            (None, "wrong_pattern", True, 0, "No media data found"),
            (None, "[a-c]*.jpeg", False, 2, ""),
            (None, "[d]*.jpeg", False, 1, ""),
            (None, "[e-z]*.jpeg", False, 0, "No media data found"),
        ],
    )
    def test_create_task_with_file_pattern(
        self,
        cloud_storage_id,
        manifest,
        filename_pattern,
        sub_dir,
        task_size,
        expected_error,
        cloud_storages,
        request,
    ):
        # prepare dataset on the bucket
        prefixes = ("test_image_",) * 3 if sub_dir else ("a_", "b_", "d_")
        images = generate_image_files(3, prefixes=prefixes)
        s3_client = s3.make_client()

        cloud_storage = cloud_storages[cloud_storage_id]

        for image in images:
            s3_client.create_file(
                data=image,
                bucket=cloud_storage["resource"],
                filename=f"{'test/sub/' if sub_dir else ''}{image.name}",
            )
            request.addfinalizer(
                partial(
                    s3_client.remove_file,
                    bucket=cloud_storage["resource"],
                    filename=f"{'test/sub/' if sub_dir else ''}{image.name}",
                )
            )

        if manifest:
            with TemporaryDirectory() as tmp_dir:
                for image in images:
                    with open(osp.join(tmp_dir, image.name), "wb") as f:
                        f.write(image.getvalue())

                generate_manifest(tmp_dir)

                with open(osp.join(tmp_dir, "manifest.jsonl"), mode="rb") as m_file:
                    s3_client.create_file(
                        data=m_file.read(),
                        bucket=cloud_storage["resource"],
                        filename=f"test/sub/{manifest}" if sub_dir else manifest,
                    )
                    request.addfinalizer(
                        partial(
                            s3_client.remove_file,
                            bucket=cloud_storage["resource"],
                            filename=f"test/sub/{manifest}" if sub_dir else manifest,
                        )
                    )

        task_spec = {
            "name": f"Task with files from cloud storage {cloud_storage_id}",
            "labels": [
                {
                    "name": "car",
                }
            ],
        }

        data_spec = {
            "image_quality": 75,
            "use_cache": True,
            "cloud_storage_id": cloud_storage_id,
            "filename_pattern": filename_pattern,
        }
        if manifest:
            data_spec["server_files"] = [f"test/sub/{manifest}" if sub_dir else manifest]

        if task_size:
            task_id, _ = create_task(self._USERNAME, task_spec, data_spec)

            with make_api_client(self._USERNAME) as api_client:
                (task, response) = api_client.tasks_api.retrieve(task_id)
                assert response.status == HTTPStatus.OK
                assert task.size == task_size
        else:
            rq_job_details = self._test_cannot_create_task(self._USERNAME, task_spec, data_spec)
            assert expected_error and expected_error in rq_job_details.message

    @pytest.mark.with_external_services
    @pytest.mark.parametrize("use_manifest", [True, False])
    @pytest.mark.parametrize("use_cache", [True, False])
    @pytest.mark.parametrize(
        "sorting_method", ["natural", "predefined", "lexicographical", "random"]
    )
    @pytest.mark.parametrize(
        "cloud_storage_id, org",
        [
            (1, ""),
        ],
    )
    def test_create_task_with_cloud_storage_and_retrieve_data(
        self,
        use_manifest: bool,
        use_cache: bool,
        sorting_method: str,
        cloud_storage_id: int,
        org: str,
        cloud_storages,
        request,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]
        task_id, _ = self._create_task_with_cloud_data(
            request=request,
            cloud_storage=cloud_storage,
            # manifest file should not be uploaded if random sorting is used or if cache is not used
            use_manifest=use_manifest and use_cache and (sorting_method != "random"),
            use_cache=use_cache,
            server_files=[f"test/sub_{i}/img_{j}.jpeg" for i in range(2) for j in range(3)],
            org=org,
            sorting_method=sorting_method,
        )

        with make_api_client(self._USERNAME) as api_client:
            (_, response) = api_client.tasks_api.retrieve_data(
                task_id, type="chunk", quality="compressed", number=0
            )
            assert response.status == HTTPStatus.OK

    @pytest.mark.with_external_services
    @pytest.mark.parametrize(
        "filenames, sorting_method",
        [
            (["img_1.jpeg", "img_2.jpeg", "img_10.jpeg"], "natural"),
            (["img_10.jpeg", "img_1.jpeg", "img_2.jpeg"], "predefined"),
            (["img_1.jpeg", "img_10.jpeg", "img_2.jpeg"], "lexicographical"),
        ],
    )
    @pytest.mark.parametrize(
        "cloud_storage_id, org",
        [
            (1, ""),
        ],
    )
    def test_create_task_with_cloud_storage_and_check_data_sorting(
        self,
        filenames: list[str],
        sorting_method: str,
        cloud_storage_id: int,
        org: str,
        cloud_storages,
        request,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]

        task_id, _ = self._create_task_with_cloud_data(
            request=request,
            cloud_storage=cloud_storage,
            use_manifest=False,
            use_cache=True,
            server_files=["test/sub_0/" + f for f in filenames],
            org=org,
            sorting_method=sorting_method,
            filenames=filenames,
        )

        with make_api_client(self._USERNAME) as api_client:
            data_meta, _ = api_client.tasks_api.retrieve_data_meta(task_id)

            for image_name, frame in zip(filenames, data_meta.frames):
                assert frame.name.rsplit("/", maxsplit=1)[1] == image_name

    @pytest.mark.with_external_services
    @pytest.mark.parametrize(
        "cloud_storage_id, org",
        [
            (1, ""),
        ],
    )
    def test_create_task_with_cloud_storage_and_check_retrieve_data_meta(
        self,
        cloud_storage_id: int,
        org: str,
        cloud_storages,
        request,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]

        data_spec = {
            "start_frame": 2,
            "stop_frame": 6,
            "frame_filter": "step=2",
        }

        task_id, _ = self._create_task_with_cloud_data(
            request=request,
            cloud_storage=cloud_storage,
            use_manifest=False,
            use_cache=False,
            server_files=["test/video/video.mkv"],
            org=org,
            data_spec_kwargs=data_spec,
            data_type="video",
        )

        with make_api_client(self._USERNAME) as api_client:
            data_meta, _ = api_client.tasks_api.retrieve_data_meta(task_id)

        assert data_meta.start_frame == 2
        assert data_meta.stop_frame == 6
        assert data_meta.size == 3

    def test_can_specify_file_job_mapping(self):
        task_spec = {
            "name": f"test file-job mapping",
            "labels": [{"name": "car"}],
        }

        files = generate_image_files(7)
        filenames = [osp.basename(f.name) for f in files]
        expected_segments = [
            filenames[0:1],
            filenames[1:5][::-1],  # a reversed fragment
            filenames[5:7],
        ]

        data_spec = {
            "image_quality": 75,
            "client_files": files,
            "job_file_mapping": expected_segments,
        }

        task_id, _ = create_task(
            self._USERNAME, task_spec, data_spec, content_type="application/json"
        )

        with make_api_client(self._USERNAME) as api_client:
            jobs: list[models.JobRead] = get_paginated_collection(
                api_client.jobs_api.list_endpoint, task_id=task_id, sort="id"
            )
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(id=task_id)

            assert [f.name for f in task_meta.frames] == list(
                chain.from_iterable(expected_segments)
            )

            start_frame = 0
            for i, job in enumerate(jobs):
                expected_size = len(expected_segments[i])
                stop_frame = start_frame + expected_size - 1
                assert job.start_frame == start_frame
                assert job.stop_frame == stop_frame

                start_frame = stop_frame + 1

    def test_cannot_create_task_with_same_labels(self):
        task_spec = {
            "name": "test cannot create task with same labels",
            "labels": [{"name": "l1"}, {"name": "l1"}],
        }
        response = post_method(self._USERNAME, "tasks", task_spec)
        assert response.status_code == HTTPStatus.BAD_REQUEST

        response = get_method(self._USERNAME, "tasks")
        assert response.status_code == HTTPStatus.OK

    def test_cannot_create_task_with_same_skeleton_sublabels(self):
        task_spec = {
            "name": "test cannot create task with same skeleton sublabels",
            "labels": [
                {"name": "s1", "type": "skeleton", "sublabels": [{"name": "1"}, {"name": "1"}]}
            ],
        }
        response = post_method(self._USERNAME, "tasks", task_spec)
        assert response.status_code == HTTPStatus.BAD_REQUEST

        response = get_method(self._USERNAME, "tasks")
        assert response.status_code == HTTPStatus.OK

    @pytest.mark.with_external_services
    @pytest.mark.parametrize("cloud_storage_id", [2])
    @pytest.mark.parametrize("use_manifest", [True, False])
    @pytest.mark.parametrize("server_files", [["test/"]])
    @pytest.mark.parametrize(
        "default_prefix, expected_task_size",
        [
            (
                "test/sub_1/img_0",
                1,
            ),
            (
                "test/sub_1/",
                3,
            ),
        ],
    )
    @pytest.mark.parametrize("org", [""])
    def test_create_task_with_cloud_storage_directories_and_default_bucket_prefix(
        self,
        cloud_storage_id: int,
        use_manifest: bool,
        server_files: list[str],
        default_prefix: str,
        expected_task_size: int,
        org: str,
        cloud_storages,
        request,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]

        with make_api_client(self._USERNAME) as api_client:
            (_, response) = api_client.cloudstorages_api.partial_update(
                cloud_storage_id,
                patched_cloud_storage_write_request={
                    "specific_attributes": f'{cloud_storage["specific_attributes"]}&prefix={default_prefix}'
                },
            )
            assert response.status == HTTPStatus.OK

        task_id, _ = self._create_task_with_cloud_data(
            request, cloud_storage, use_manifest, server_files, org=org
        )

        with make_api_client(self._USERNAME) as api_client:
            (task, response) = api_client.tasks_api.retrieve(task_id)
            assert response.status == HTTPStatus.OK
            assert task.size == expected_task_size

    @parametrize(
        "frame_selection_method, method_params, per_job_count_param",
        (
            (*e[0], e[1])
            for e in product(
                [
                    *tuple(product(["random_uniform"], [{"frame_count"}, {"frame_share"}])),
                    ("manual", {}),
                ],
                ["frames_per_job_count", "frames_per_job_share"],
            )
        ),
    )
    def test_can_create_task_with_honeypots(
        self,
        fxt_test_name,
        frame_selection_method: str,
        method_params: set[str],
        per_job_count_param: str,
    ):
        base_segment_size = 4
        total_frame_count = 15
        validation_frames_count = 5
        validation_per_job_count = 2
        regular_frame_count = total_frame_count - validation_frames_count
        resulting_task_size = (
            regular_frame_count
            + validation_per_job_count * math.ceil(regular_frame_count / base_segment_size)
            + validation_frames_count
        )

        image_files = generate_image_files(total_frame_count)

        validation_params = {"mode": "gt_pool", "frame_selection_method": frame_selection_method}

        if per_job_count_param == "frames_per_job_count":
            validation_params[per_job_count_param] = validation_per_job_count
        elif per_job_count_param == "frames_per_job_share":
            validation_params[per_job_count_param] = validation_per_job_count / base_segment_size
        else:
            assert False

        if frame_selection_method == "random_uniform":
            validation_params["random_seed"] = 42

            for method_param in method_params:
                if method_param == "frame_count":
                    validation_params[method_param] = validation_frames_count
                elif method_param == "frame_share":
                    validation_params[method_param] = validation_frames_count / total_frame_count
                else:
                    assert False
        elif frame_selection_method == "manual":
            rng = np.random.Generator(np.random.MT19937(seed=42))
            validation_params["frames"] = rng.choice(
                [f.name for f in image_files], validation_frames_count, replace=False
            ).tolist()
        else:
            assert False

        task_params = {
            "name": fxt_test_name,
            "labels": [{"name": "a"}],
            "segment_size": base_segment_size,
        }

        data_params = {
            "image_quality": 70,
            "client_files": image_files,
            "sorting_method": "random",
            "validation_params": validation_params,
        }

        task_id, _ = create_task(self._USERNAME, spec=task_params, data=data_params)

        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            annotation_job_metas = [
                api_client.jobs_api.retrieve_data_meta(job.id)[0]
                for job in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="annotation"
                )
            ]
            gt_job_metas = [
                api_client.jobs_api.retrieve_data_meta(job.id)[0]
                for job in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="ground_truth"
                )
            ]

            assert len(gt_job_metas) == 1

        assert task.segment_size == 0  # means "custom segments"
        assert task.size == resulting_task_size
        assert task_meta.size == resulting_task_size

        # validation frames (pool frames) must be appended in the end of the task, in the GT job
        validation_frames = set(f.name for f in task_meta.frames[-validation_frames_count:])
        if frame_selection_method == "manual":
            assert sorted(validation_frames) == sorted(validation_params["frames"])
            assert sorted(f.name for f in gt_job_metas[0].frames) == sorted(
                validation_params["frames"]
            )

        annotation_job_frame_counts = Counter(
            f.name for f in task_meta.frames[:-validation_frames_count]
        )

        regular_frame_counts = {
            k: v for k, v in annotation_job_frame_counts.items() if k not in validation_frames
        }
        # regular frames must not repeat
        assert regular_frame_counts == {
            f.name: 1 for f in image_files if f.name not in validation_frames
        }

        # only validation frames can repeat
        assert set(fn for fn, count in annotation_job_frame_counts.items() if count != 1).issubset(
            validation_frames
        )

        if frame_selection_method == "random_uniform":
            # Test distribution
            validation_frame_counts = {
                f: annotation_job_frame_counts.get(f, 0) + 1 for f in validation_frames
            }
            assert max(validation_frame_counts.values()) <= 1 + min(
                validation_frame_counts.values()
            )

        # each job must have the specified number of validation frames
        for job_meta in annotation_job_metas:
            assert (
                len(set(f.name for f in job_meta.frames if f.name in validation_frames))
                == validation_per_job_count
            )

    @pytest.mark.parametrize("random_seed", [1, 2, 5])
    def test_can_create_task_with_honeypots_random_seed_guarantees_the_same_layout(
        self, fxt_test_name, random_seed: int
    ):
        base_segment_size = 4
        total_frame_count = 15
        validation_frames_count = 5
        validation_per_job_count = 2

        image_files = generate_image_files(total_frame_count)

        validation_params = {
            "mode": "gt_pool",
            "frame_selection_method": "random_uniform",
            "frame_count": validation_frames_count,
            "frames_per_job_count": validation_per_job_count,
            "random_seed": random_seed,
        }

        task_params = {
            "name": fxt_test_name,
            "labels": [{"name": "a"}],
            "segment_size": base_segment_size,
        }

        data_params = {
            "image_quality": 70,
            "client_files": image_files,
            "sorting_method": "random",
            "validation_params": validation_params,
        }

        def _create_task():
            with make_api_client(self._USERNAME) as api_client:
                task_id, _ = create_task(
                    self._USERNAME, spec=deepcopy(task_params), data=deepcopy(data_params)
                )
                task_meta = json.loads(api_client.tasks_api.retrieve_data_meta(task_id)[1].data)
                task_validation_layout = json.loads(
                    api_client.tasks_api.retrieve_validation_layout(task_id)[1].data
                )
                return task_meta, task_validation_layout

        task1_meta, task1_validation_layout = _create_task()
        task2_meta, task2_validation_layout = _create_task()

        assert (
            DeepDiff(
                task1_meta,
                task2_meta,
                ignore_order=False,
                exclude_regex_paths=[r"root\['chunks_updated_date'\]"],  # must be different
            )
            == {}
        )
        assert DeepDiff(task1_validation_layout, task2_validation_layout, ignore_order=False) == {}

    @parametrize(
        "frame_selection_method, method_params",
        [
            *tuple(product(["random_uniform"], [{"frame_count"}, {"frame_share"}])),
            *tuple(
                product(["random_per_job"], [{"frames_per_job_count"}, {"frames_per_job_share"}])
            ),
            ("manual", {}),
        ],
        idgen=lambda **args: "-".join([args["frame_selection_method"], *args["method_params"]]),
    )
    def test_can_create_task_with_gt_job_from_images(
        self,
        request: pytest.FixtureRequest,
        frame_selection_method: str,
        method_params: set[str],
    ):
        segment_size = 4
        total_frame_count = 15
        resulting_task_size = total_frame_count

        image_files = generate_image_files(total_frame_count)

        validation_params = {"mode": "gt", "frame_selection_method": frame_selection_method}

        if "random" in frame_selection_method:
            validation_params["random_seed"] = 42

        if frame_selection_method == "random_uniform":
            validation_frames_count = 5

            for method_param in method_params:
                if method_param == "frame_count":
                    validation_params[method_param] = validation_frames_count
                elif method_param == "frame_share":
                    validation_params[method_param] = validation_frames_count / total_frame_count
                else:
                    assert False
        elif frame_selection_method == "random_per_job":
            validation_per_job_count = 2
            validation_frames_count = validation_per_job_count * math.ceil(
                total_frame_count / segment_size
            )

            for method_param in method_params:
                if method_param == "frames_per_job_count":
                    validation_params[method_param] = validation_per_job_count
                elif method_param == "frames_per_job_share":
                    validation_params[method_param] = validation_per_job_count / segment_size
                else:
                    assert False
        elif frame_selection_method == "manual":
            validation_frames_count = 5

            rng = np.random.Generator(np.random.MT19937(seed=42))
            validation_params["frames"] = rng.choice(
                [f.name for f in image_files], validation_frames_count, replace=False
            ).tolist()
        else:
            assert False

        task_params = {
            "name": request.node.name,
            "labels": [{"name": "a"}],
            "segment_size": segment_size,
        }

        data_params = {
            "image_quality": 70,
            "client_files": image_files,
            "validation_params": validation_params,
        }

        task_id, _ = create_task(self._USERNAME, spec=task_params, data=data_params)

        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            annotation_job_metas = [
                api_client.jobs_api.retrieve_data_meta(job.id)[0]
                for job in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="annotation"
                )
            ]
            gt_job_metas = [
                api_client.jobs_api.retrieve_data_meta(job.id)[0]
                for job in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="ground_truth"
                )
            ]

            assert len(gt_job_metas) == 1

            if frame_selection_method in ("random_uniform", "manual"):
                assert gt_job_metas[0].size == validation_frames_count
            elif frame_selection_method == "random_per_job":
                assert gt_job_metas[0].size == (
                    resulting_task_size // segment_size * validation_per_job_count
                    + min(resulting_task_size % segment_size, validation_per_job_count)
                )
            else:
                assert False

        assert task.segment_size == segment_size
        assert task.size == resulting_task_size
        assert task_meta.size == resulting_task_size

        validation_frames = [
            gt_job_metas[0].frames[rel_frame_id].name
            for rel_frame_id, abs_frame_id in enumerate(
                range(
                    gt_job_metas[0].start_frame,
                    gt_job_metas[0].stop_frame + 1,
                    int((gt_job_metas[0].frame_filter or "step=1").split("=")[1]),
                )
            )
            if abs_frame_id in gt_job_metas[0].included_frames
        ]
        if frame_selection_method == "manual":
            assert sorted(validation_params["frames"]) == sorted(validation_frames)

        assert len(validation_frames) == validation_frames_count

        # frames must not repeat
        assert sorted(f.name for f in image_files) == sorted(f.name for f in task_meta.frames)

        if frame_selection_method == "random_per_job":
            # each job must have the specified number of validation frames
            for job_meta in annotation_job_metas:
                assert (
                    len([f.name for f in job_meta.frames if f.name in validation_frames])
                    == validation_per_job_count
                )

    @parametrize(
        "frame_selection_method, method_params",
        [
            *tuple(product(["random_uniform"], [{"frame_count"}, {"frame_share"}])),
            *tuple(
                product(["random_per_job"], [{"frames_per_job_count"}, {"frames_per_job_share"}])
            ),
        ],
        idgen=lambda **args: "-".join([args["frame_selection_method"], *args["method_params"]]),
    )
    def test_can_create_task_with_gt_job_from_video(
        self,
        request: pytest.FixtureRequest,
        frame_selection_method: str,
        method_params: set[str],
    ):
        segment_size = 4
        total_frame_count = 15
        resulting_task_size = total_frame_count

        video_file = generate_video_file(total_frame_count)

        validation_params = {"mode": "gt", "frame_selection_method": frame_selection_method}

        if "random" in frame_selection_method:
            validation_params["random_seed"] = 42

        if frame_selection_method == "random_uniform":
            validation_frames_count = 5

            for method_param in method_params:
                if method_param == "frame_count":
                    validation_params[method_param] = validation_frames_count
                elif method_param == "frame_share":
                    validation_params[method_param] = validation_frames_count / total_frame_count
                else:
                    assert False
        elif frame_selection_method == "random_per_job":
            validation_per_job_count = 2

            for method_param in method_params:
                if method_param == "frames_per_job_count":
                    validation_params[method_param] = validation_per_job_count
                elif method_param == "frames_per_job_share":
                    validation_params[method_param] = validation_per_job_count / segment_size
                else:
                    assert False

        task_params = {
            "name": request.node.name,
            "labels": [{"name": "a"}],
            "segment_size": segment_size,
        }

        data_params = {
            "image_quality": 70,
            "client_files": [video_file],
            "validation_params": validation_params,
        }

        task_id, _ = create_task(self._USERNAME, spec=task_params, data=data_params)

        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            annotation_job_metas = [
                api_client.jobs_api.retrieve_data_meta(job.id)[0]
                for job in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="annotation"
                )
            ]
            gt_job_metas = [
                api_client.jobs_api.retrieve_data_meta(job.id)[0]
                for job in get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="ground_truth"
                )
            ]

            assert len(gt_job_metas) == 1

            if frame_selection_method == "random_uniform":
                assert gt_job_metas[0].size == validation_frames_count
            elif frame_selection_method == "random_per_job":
                assert gt_job_metas[0].size == (
                    resulting_task_size // segment_size * validation_per_job_count
                    + min(resulting_task_size % segment_size, validation_per_job_count)
                )
            else:
                assert False

        assert task.segment_size == segment_size
        assert task.size == resulting_task_size
        assert task_meta.size == resulting_task_size

        frame_step = parse_frame_step(gt_job_metas[0].frame_filter)
        validation_frames = [
            abs_frame_id
            for abs_frame_id in range(
                gt_job_metas[0].start_frame,
                gt_job_metas[0].stop_frame + 1,
                frame_step,
            )
            if abs_frame_id in gt_job_metas[0].included_frames
        ]

        if frame_selection_method == "random_per_job":
            # each job must have the specified number of validation frames
            for job_meta in annotation_job_metas:
                assert (
                    len(
                        set(
                            range(job_meta.start_frame, job_meta.stop_frame + 1, frame_step)
                        ).intersection(validation_frames)
                    )
                    == validation_per_job_count
                )
        else:
            assert len(validation_frames) == validation_frames_count

    @pytest.mark.with_external_services
    @pytest.mark.parametrize("cloud_storage_id", [2])
    @pytest.mark.parametrize(
        "validation_mode",
        [
            models.ValidationMode("gt"),
            models.ValidationMode("gt_pool"),
        ],
    )
    def test_can_create_task_with_validation_and_cloud_data(
        self,
        cloud_storage_id: int,
        validation_mode: models.ValidationMode,
        request: pytest.FixtureRequest,
        admin_user: str,
        cloud_storages: Iterable,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]
        server_files = [f"test/sub_0/img_{i}.jpeg" for i in range(3)]
        validation_frames = ["test/sub_0/img_1.jpeg"]

        (task_id, _) = self._create_task_with_cloud_data(
            request,
            cloud_storage,
            use_manifest=False,
            server_files=server_files,
            sorting_method=models.SortingMethod(
                "random"
            ),  # only random sorting can be used with gt_pool
            data_spec_kwargs={
                "validation_params": models.DataRequestValidationParams._from_openapi_data(
                    mode=validation_mode,
                    frames=validation_frames,
                    frame_selection_method=models.FrameSelectionMethod("manual"),
                    frames_per_job_count=1,
                )
            },
            task_spec_kwargs={
                # in case of gt_pool: each regular job will contain 1 regular and 1 validation frames,
                # (number of validation frames is not included into segment_size)
                "segment_size": 1,
            },
        )

        with make_api_client(admin_user) as api_client:
            # check that GT job was created
            (paginated_jobs, _) = api_client.jobs_api.list(task_id=task_id, type="ground_truth")
            assert 1 == len(paginated_jobs["results"])

            (paginated_jobs, _) = api_client.jobs_api.list(task_id=task_id, type="annotation")
            jobs_count = (
                len(server_files) - len(validation_frames)
                if validation_mode == models.ValidationMode("gt_pool")
                else len(server_files)
            )
            assert jobs_count == len(paginated_jobs["results"])
            # check that the returned meta of images corresponds to the chunk data
            # Note: meta is based on the order of images from database
            # while chunk with CS data is based on the order of images in a manifest
            for job in paginated_jobs["results"]:
                (job_meta, _) = api_client.jobs_api.retrieve_data_meta(job["id"])
                (_, response) = api_client.jobs_api.retrieve_data(
                    job["id"], type="chunk", quality="compressed", index=0
                )
                chunk_file = io.BytesIO(response.data)
                assert zipfile.is_zipfile(chunk_file)

                with zipfile.ZipFile(chunk_file, "r") as chunk_archive:
                    chunk_images = {
                        int(os.path.splitext(name)[0]): np.array(
                            Image.open(io.BytesIO(chunk_archive.read(name)))
                        )
                        for name in chunk_archive.namelist()
                    }
                    chunk_images = dict(sorted(chunk_images.items(), key=lambda e: e[0]))

                    for img, img_meta in zip(chunk_images.values(), job_meta.frames):
                        assert (img.shape[0], img.shape[1]) == (img_meta.height, img_meta.width)

    def test_can_create_task_with_consensus(self, request: pytest.FixtureRequest):
        segment_size = 2
        regular_job_count = 2
        replication = 2
        images = generate_image_files(segment_size * regular_job_count)
        resulting_task_size = len(images)

        task_params = {
            "name": request.node.name,
            "labels": [{"name": "a"}],
            "segment_size": segment_size,
            "consensus_replicas": replication,
        }

        data_params = {
            "image_quality": 70,
            "client_files": images,
        }

        task_id, _ = create_task(self._USERNAME, spec=task_params, data=data_params)

        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            jobs = get_paginated_collection(api_client.jobs_api.list_endpoint, task_id=task_id)

            annotation_job_metas = {
                job.id: json.loads(api_client.jobs_api.retrieve_data_meta(job.id)[1].data)
                for job in jobs
                if job.type == "annotation"
            }
            consensus_job_metas = {
                job.id: json.loads(api_client.jobs_api.retrieve_data_meta(job.id)[1].data)
                for job in jobs
                if job.type == "consensus_replica"
            }

        assert task.segment_size == segment_size
        assert task.size == resulting_task_size
        assert task_meta.size == resulting_task_size

        assert len(jobs) == regular_job_count * (1 + replication)
        assert len(annotation_job_metas) == regular_job_count
        assert len(consensus_job_metas) == regular_job_count * replication

        for annotation_job in (j for j in jobs if j.type == "annotation"):
            assert annotation_job_metas[annotation_job.id]["size"] == segment_size

            job_replicas = [j for j in jobs if j.parent_job_id == annotation_job.id]
            assert len(job_replicas) == replication

            for replica in job_replicas:
                assert (
                    DeepDiff(
                        consensus_job_metas[replica.id], annotation_job_metas[annotation_job.id]
                    )
                    == {}
                )


@pytest.mark.usefixtures("restore_db_per_class")
@pytest.mark.usefixtures("restore_cvat_data_per_class")
@pytest.mark.usefixtures("restore_redis_ondisk_per_function")
@pytest.mark.usefixtures("restore_redis_ondisk_after_class")
@pytest.mark.usefixtures("restore_redis_inmem_per_function")
class TestTaskData(TestTasksBase):
    @parametrize("task_spec, task_id", TestTasksBase._all_task_cases)
    def test_can_get_task_meta(self, task_spec: ITaskSpec, task_id: int):

        with make_api_client(self._USERNAME) as api_client:
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)

            assert task_meta.size == task_spec.size
            assert task_meta.start_frame == getattr(task_spec, "start_frame", 0)
            assert task_meta.stop_frame == getattr(task_spec, "stop_frame", None) or task_spec.size
            assert task_meta.frame_filter == getattr(task_spec, "frame_filter", "")

            task_frame_set = set(
                range(task_meta.start_frame, task_meta.stop_frame + 1, task_spec.frame_step)
            )
            assert len(task_frame_set) == task_meta.size

            if getattr(task_spec, "chunk_size", None):
                assert task_meta.chunk_size == task_spec.chunk_size

            if task_spec.source_data_type == SourceDataType.video:
                assert len(task_meta.frames) == 1
                assert len(task_meta.chapters) == 1
            else:
                assert len(task_meta.frames) == task_meta.size
                assert task_meta.chapters is None

    @pytest.mark.timeout(
        # This test has to check all the task frames availability, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", TestTasksBase._2d_task_cases)
    def test_can_get_task_frames(self, task_spec: ITaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)

            for quality, abs_frame_id in product(
                ["original", "compressed"],
                range(task_meta.start_frame, task_meta.stop_frame + 1, task_spec.frame_step),
            ):
                rel_frame_id = (
                    abs_frame_id - getattr(task_spec, "start_frame", 0)
                ) // task_spec.frame_step
                (_, response) = api_client.tasks_api.retrieve_data(
                    task_id,
                    type="frame",
                    quality=quality,
                    number=rel_frame_id,
                    _parse_response=False,
                )

                if task_spec.source_data_type == SourceDataType.video:
                    frame_size = (task_meta.frames[0].width, task_meta.frames[0].height)
                else:
                    frame_size = (
                        task_meta.frames[rel_frame_id].width,
                        task_meta.frames[rel_frame_id].height,
                    )

                frame = Image.open(io.BytesIO(response.data))
                assert frame_size == frame.size

                self._compare_images(
                    task_spec.read_frame(abs_frame_id),
                    frame,
                    must_be_identical=(
                        task_spec.source_data_type == SourceDataType.images
                        and quality == "original"
                    ),
                )

    @pytest.mark.timeout(
        # This test has to check all the task chunks availability, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", TestTasksBase._2d_task_cases)
    def test_can_get_task_chunks(self, task_spec: ITaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)

            if task_spec.source_data_type == SourceDataType.images:
                assert task.data_original_chunk_type == "imageset"
                assert task.data_compressed_chunk_type == "imageset"
            elif task_spec.source_data_type == SourceDataType.video:
                assert task.data_original_chunk_type == "video"

                if getattr(task_spec, "use_zip_chunks", False):
                    assert task.data_compressed_chunk_type == "imageset"
                else:
                    assert task.data_compressed_chunk_type == "video"
            else:
                assert False

            task_abs_frames = range(
                task_meta.start_frame, task_meta.stop_frame + 1, task_spec.frame_step
            )
            task_chunk_frames = [
                (chunk_number, list(chunk_frames))
                for chunk_number, chunk_frames in groupby(
                    task_abs_frames,
                    key=lambda abs_frame: (
                        (abs_frame - task_meta.start_frame) // task_spec.frame_step
                    )
                    // task_meta.chunk_size,
                )
            ]
            for quality, (chunk_id, expected_chunk_frame_ids) in product(
                ["original", "compressed"], task_chunk_frames
            ):
                (_, response) = api_client.tasks_api.retrieve_data(
                    task_id, type="chunk", quality=quality, number=chunk_id, _parse_response=False
                )

                chunk_file = io.BytesIO(response.data)
                if zipfile.is_zipfile(chunk_file):
                    with zipfile.ZipFile(chunk_file, "r") as chunk_archive:
                        chunk_images = {
                            int(os.path.splitext(name)[0]): np.array(
                                Image.open(io.BytesIO(chunk_archive.read(name)))
                            )
                            for name in chunk_archive.namelist()
                        }
                        chunk_images = dict(sorted(chunk_images.items(), key=lambda e: e[0]))
                else:
                    chunk_images = dict(enumerate(read_video_file(chunk_file)))

                assert sorted(chunk_images.keys()) == list(range(len(expected_chunk_frame_ids)))

                for chunk_frame, abs_frame_id in zip(chunk_images, expected_chunk_frame_ids):
                    self._compare_images(
                        task_spec.read_frame(abs_frame_id),
                        chunk_images[chunk_frame],
                        must_be_identical=(
                            task_spec.source_data_type == SourceDataType.images
                            and quality == "original"
                        ),
                    )

    @pytest.mark.timeout(
        # This test has to check all the task chunks availability, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", TestTasksBase._tests_with_related_files_cases)
    def test_can_get_task_related_file_chunks(self, task_spec: ImagesTaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            (task, _) = api_client.tasks_api.retrieve(task_id)
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)

            if task_spec.source_data_type == SourceDataType.images:
                assert task.data_original_chunk_type == "imageset"
                assert task.data_compressed_chunk_type == "imageset"
            else:
                assert False

            for task_frame_id in range(task.size):
                expected_related_images = task_spec.get_related_files(task_frame_id)
                assert task_meta.frames[task_frame_id].related_files == len(expected_related_images)

                (_, response) = api_client.tasks_api.retrieve_data(
                    task_id, type="context_image", number=task_frame_id, _parse_response=False
                )

                chunk_file = io.BytesIO(response.data)
                if zipfile.is_zipfile(chunk_file):
                    with zipfile.ZipFile(chunk_file, "r") as chunk_archive:
                        chunk_images = {
                            name: Image.open(io.BytesIO(chunk_archive.read(name)))
                            for name in chunk_archive.namelist()
                        }
                else:
                    assert False

                assert sorted(osp.splitext(p)[0] for p in chunk_images) == sorted(
                    osp.splitext(p)[0] for p in expected_related_images
                )

                for ri_filename in expected_related_images:
                    chunk_ri = chunk_images[str(Path(ri_filename).with_suffix(".jpg"))]
                    assert chunk_ri.mode == "RGB"

                    expected_ri = Image.open(io.BytesIO(expected_related_images[ri_filename]))
                    if expected_ri.mode != "RGB":
                        expected_ri = expected_ri.convert("RGB")

                    self._compare_images(expected_ri, chunk_ri, must_be_identical=False)

    @pytest.mark.timeout(
        # This test has to check all the task meta availability, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", TestTasksBase._all_task_cases)
    def test_can_get_annotation_job_meta(self, task_spec: ITaskSpec, task_id: int):
        segment_params = self._compute_annotation_segment_params(task_spec)

        with make_api_client(self._USERNAME) as api_client:
            jobs = sorted(
                get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="annotation"
                ),
                key=lambda j: j.start_frame,
            )
            assert len(jobs) == len(segment_params)

            for (segment_start, segment_stop), job in zip(segment_params, jobs):
                (job_meta, _) = api_client.jobs_api.retrieve_data_meta(job.id)

                assert (job_meta.start_frame, job_meta.stop_frame) == (segment_start, segment_stop)
                assert job_meta.frame_filter == getattr(task_spec, "frame_filter", "")

                segment_size = math.ceil((segment_stop - segment_start + 1) / task_spec.frame_step)
                assert job_meta.size == segment_size

                job_abs_frame_set = self._get_job_abs_frame_set(job_meta)
                assert len(job_abs_frame_set) == job_meta.size
                assert set(job_abs_frame_set).issubset(
                    range(
                        job_meta.start_frame,
                        job_meta.stop_frame + 1,
                        parse_frame_step(job_meta.frame_filter),
                    )
                )

                if getattr(task_spec, "chunk_size", None):
                    assert job_meta.chunk_size == task_spec.chunk_size

                if task_spec.source_data_type == SourceDataType.video:
                    assert len(job_meta.frames) == 1
                else:
                    assert len(job_meta.frames) == job_meta.size

    @parametrize("task_spec, task_id", TestTasksBase._tasks_with_simple_gt_job_cases)
    def test_can_get_simple_gt_job_meta(self, task_spec: ITaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            jobs = sorted(
                get_paginated_collection(
                    api_client.jobs_api.list_endpoint, task_id=task_id, type="ground_truth"
                ),
                key=lambda j: j.start_frame,
            )
            assert len(jobs) == 1

            gt_job = jobs[0]
            (job_meta, _) = api_client.jobs_api.retrieve_data_meta(gt_job.id)

            task_start_frame = getattr(task_spec, "start_frame", 0)
            assert (job_meta.start_frame, job_meta.stop_frame) == (
                task_start_frame,
                task_start_frame + (task_spec.size - 1) * task_spec.frame_step,
            )
            assert job_meta.frame_filter == getattr(task_spec, "frame_filter", "")

            frame_selection_method = task_spec.validation_params.frame_selection_method.value
            if frame_selection_method == "random_uniform":
                validation_frames_count = task_spec.validation_params.frame_count
            elif frame_selection_method == "random_per_job":
                frames_per_job_count = task_spec.validation_params.frames_per_job_count
                validation_frames_count = (
                    task_spec.size // task_spec.segment_size * frames_per_job_count
                    + min(task_spec.size % task_spec.segment_size, frames_per_job_count)
                )
            elif frame_selection_method == "manual":
                validation_frames_count = len(task_spec.validation_params.frames)
            else:
                raise NotImplementedError(frame_selection_method)

            assert job_meta.size == validation_frames_count

            job_abs_frame_set = self._get_job_abs_frame_set(job_meta)
            assert len(job_abs_frame_set) == job_meta.size
            assert set(job_abs_frame_set).issubset(
                range(
                    job_meta.start_frame,
                    job_meta.stop_frame + 1,
                    parse_frame_step(job_meta.frame_filter),
                )
            )

            if getattr(task_spec, "chunk_size", None):
                assert job_meta.chunk_size == task_spec.chunk_size

            if task_spec.source_data_type == SourceDataType.video:
                assert len(job_meta.frames) == 1
            else:
                # there are placeholders on the non-included places
                assert len(job_meta.frames) == task_spec.size

    @parametrize("task_spec, task_id", TestTasksBase._tasks_with_honeypots_cases)
    def test_can_get_honeypot_gt_job_meta(self, task_spec: ITaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            gt_jobs = get_paginated_collection(
                api_client.jobs_api.list_endpoint, task_id=task_id, type="ground_truth"
            )
            assert len(gt_jobs) == 1

            gt_job = gt_jobs[0]
            segment_start = task_spec.size - task_spec.validation_params.frame_count
            segment_stop = task_spec.size - 1

            (job_meta, _) = api_client.jobs_api.retrieve_data_meta(gt_job.id)

            assert (job_meta.start_frame, job_meta.stop_frame) == (segment_start, segment_stop)
            assert job_meta.frame_filter == getattr(task_spec, "frame_filter", "")

            segment_size = math.ceil((segment_stop - segment_start + 1) / task_spec.frame_step)
            assert job_meta.size == segment_size

            task_frame_set = set(
                range(job_meta.start_frame, job_meta.stop_frame + 1, task_spec.frame_step)
            )
            assert len(task_frame_set) == job_meta.size

            if getattr(task_spec, "chunk_size", None):
                assert job_meta.chunk_size == task_spec.chunk_size

            if task_spec.source_data_type == SourceDataType.video:
                assert len(job_meta.frames) == 1
            else:
                assert len(job_meta.frames) == job_meta.size

    @pytest.mark.timeout(
        # This test has to check the job meta for all jobs, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", TestTasksBase._tasks_with_consensus_cases)
    def test_can_get_consensus_replica_job_meta(self, task_spec: ITaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            jobs = sorted(
                get_paginated_collection(api_client.jobs_api.list_endpoint, task_id=task_id),
                key=lambda j: j.start_frame,
            )

            # Only annotation jobs can have replicas
            annotation_jobs = [j for j in jobs if j.type == "annotation"]
            assert (
                len([j for j in jobs if j.type == "consensus_replica"])
                == len(annotation_jobs) * task_spec.consensus_replicas
            )

            for job in annotation_jobs:
                annotation_job_meta = json.loads(
                    api_client.jobs_api.retrieve_data_meta(job.id)[1].data
                )

                replicas = [
                    j for j in jobs if j.type == "consensus_replica" if j.parent_job_id == job.id
                ]
                assert len(replicas) == task_spec.consensus_replicas

                for replica_job in replicas:
                    replica_job_meta = json.loads(
                        api_client.jobs_api.retrieve_data_meta(replica_job.id)[1].data
                    )
                    assert DeepDiff(annotation_job_meta, replica_job_meta) == {}

    @pytest.mark.timeout(
        # This test has to check all the job frames availability, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", TestTasksBase._2d_task_cases)
    def test_can_get_job_frames(self, task_spec: ITaskSpec, task_id: int):
        with make_api_client(self._USERNAME) as api_client:
            jobs = sorted(
                get_paginated_collection(api_client.jobs_api.list_endpoint, task_id=task_id),
                key=lambda j: j.start_frame,
            )
            for job in jobs:
                (job_meta, _) = api_client.jobs_api.retrieve_data_meta(job.id)
                job_abs_frames = self._get_job_abs_frame_set(job_meta)

                for quality, (frame_pos, abs_frame_id) in product(
                    ["original", "compressed"],
                    enumerate(job_abs_frames),
                ):
                    rel_frame_id = (
                        abs_frame_id - getattr(task_spec, "start_frame", 0)
                    ) // task_spec.frame_step
                    (_, response) = api_client.jobs_api.retrieve_data(
                        job.id,
                        type="frame",
                        quality=quality,
                        number=rel_frame_id,
                        _parse_response=False,
                    )

                    if task_spec.source_data_type == SourceDataType.video:
                        frame_size = (job_meta.frames[0].width, job_meta.frames[0].height)
                    else:
                        frame_size = (
                            job_meta.frames[frame_pos].width,
                            job_meta.frames[frame_pos].height,
                        )

                    frame = Image.open(io.BytesIO(response.data))
                    assert frame_size == frame.size

                    self._compare_images(
                        task_spec.read_frame(abs_frame_id),
                        frame,
                        must_be_identical=(
                            task_spec.source_data_type == SourceDataType.images
                            and quality == "original"
                        ),
                    )

    @pytest.mark.timeout(
        # This test has to check all the job chunks availability, it can make many requests
        timeout=300
    )
    @parametrize("task_spec, task_id", TestTasksBase._2d_task_cases)
    @parametrize("indexing", ["absolute", "relative"])
    def test_can_get_job_chunks(self, task_spec: ITaskSpec, task_id: int, indexing: str):
        _placeholder_image = Image.fromarray(np.zeros((1, 1, 3), dtype=np.uint8))

        with make_api_client(self._USERNAME) as api_client:
            jobs = sorted(
                get_paginated_collection(api_client.jobs_api.list_endpoint, task_id=task_id),
                key=lambda j: j.start_frame,
            )

            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)

            for job in jobs:
                (job_meta, _) = api_client.jobs_api.retrieve_data_meta(job.id)

                if job_meta.included_frames:
                    assert len(job_meta.included_frames) == job_meta.size

                if task_spec.source_data_type == SourceDataType.images:
                    assert job.data_original_chunk_type == "imageset"
                    assert job.data_compressed_chunk_type == "imageset"
                elif task_spec.source_data_type == SourceDataType.video:
                    assert job.data_original_chunk_type == "video"

                    if getattr(task_spec, "use_zip_chunks", False):
                        assert job.data_compressed_chunk_type == "imageset"
                    else:
                        assert job.data_compressed_chunk_type == "video"
                else:
                    assert False

                if indexing == "absolute":
                    chunk_count = math.ceil(task_meta.size / task_meta.chunk_size)

                    def get_task_chunk_abs_frame_ids(chunk_id: int) -> Sequence[int]:
                        return range(
                            task_meta.start_frame
                            + chunk_id * task_meta.chunk_size * task_spec.frame_step,
                            task_meta.start_frame
                            + min((chunk_id + 1) * task_meta.chunk_size, task_meta.size)
                            * task_spec.frame_step,
                            task_spec.frame_step,
                        )

                    def get_job_frame_ids() -> Sequence[int]:
                        return range(
                            job_meta.start_frame, job_meta.stop_frame + 1, task_spec.frame_step
                        )

                    def get_expected_chunk_abs_frame_ids(chunk_id: int):
                        return sorted(
                            set(get_task_chunk_abs_frame_ids(chunk_id)) & set(get_job_frame_ids())
                        )

                    job_chunk_ids = (
                        task_chunk_id
                        for task_chunk_id in range(chunk_count)
                        if get_expected_chunk_abs_frame_ids(task_chunk_id)
                    )
                else:
                    chunk_count = math.ceil(job_meta.size / job_meta.chunk_size)
                    job_chunk_ids = range(chunk_count)

                    def get_expected_chunk_abs_frame_ids(chunk_id: int):
                        job_abs_frames = self._get_job_abs_frame_set(job_meta)
                        return job_abs_frames[
                            chunk_id * job_meta.chunk_size : (chunk_id + 1) * job_meta.chunk_size
                        ]

                for quality, chunk_id in product(["original", "compressed"], job_chunk_ids):
                    expected_chunk_abs_frame_ids = get_expected_chunk_abs_frame_ids(chunk_id)

                    kwargs = {}
                    if indexing == "absolute":
                        kwargs["number"] = chunk_id
                    elif indexing == "relative":
                        kwargs["index"] = chunk_id
                    else:
                        assert False

                    (_, response) = api_client.jobs_api.retrieve_data(
                        job.id,
                        type="chunk",
                        quality=quality,
                        **kwargs,
                        _parse_response=False,
                    )

                    chunk_file = io.BytesIO(response.data)
                    if zipfile.is_zipfile(chunk_file):
                        with zipfile.ZipFile(chunk_file, "r") as chunk_archive:
                            chunk_images = {
                                int(os.path.splitext(name)[0]): np.array(
                                    Image.open(io.BytesIO(chunk_archive.read(name)))
                                )
                                for name in chunk_archive.namelist()
                            }
                            chunk_images = dict(sorted(chunk_images.items(), key=lambda e: e[0]))
                    else:
                        chunk_images = dict(enumerate(read_video_file(chunk_file)))

                    assert sorted(chunk_images.keys()) == list(
                        range(len(expected_chunk_abs_frame_ids))
                    )

                    for chunk_frame, abs_frame_id in zip(
                        chunk_images, expected_chunk_abs_frame_ids
                    ):
                        if (
                            indexing == "absolute"
                            and job_meta.included_frames
                            and abs_frame_id not in job_meta.included_frames
                        ):
                            expected_image = _placeholder_image
                        else:
                            expected_image = task_spec.read_frame(abs_frame_id)

                        self._compare_images(
                            expected_image,
                            chunk_images[chunk_frame],
                            must_be_identical=(
                                task_spec.source_data_type == SourceDataType.images
                                and quality == "original"
                            ),
                        )
