# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os
import xml.etree.ElementTree as ET
import zipfile
from copy import deepcopy
from http import HTTPStatus
from io import BytesIO
from typing import Any, Dict, List, Optional

import numpy as np
import pytest
from cvat_sdk import models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.helpers import get_paginated_collection
from deepdiff import DeepDiff
from PIL import Image

from shared.utils.config import make_api_client
from shared.utils.helpers import generate_image_files

from .utils import CollectionSimpleFilterTestBase, compare_annotations, create_task, export_dataset


def get_job_staff(job, tasks, projects):
    job_staff = []
    job_staff.append(job["assignee"])
    tid = job["task_id"]
    job_staff.append(tasks[tid]["owner"])
    job_staff.append(tasks[tid]["assignee"])

    pid = job["project_id"]
    if pid:
        job_staff.append(projects[pid]["owner"])
        job_staff.append(projects[pid]["assignee"])
    job_staff = set(u["id"] for u in job_staff if u is not None)

    return job_staff


def filter_jobs(jobs, tasks, org):
    if isinstance(org, int):
        kwargs = {"org_id": org}
        jobs = [job for job in jobs if tasks[job["task_id"]]["organization"] == org]
    elif org == "":
        kwargs = {"org": ""}
        jobs = [job for job in jobs if tasks[job["task_id"]]["organization"] is None]
    else:
        kwargs = {}
        jobs = jobs.raw

    return jobs, kwargs


@pytest.mark.usefixtures("restore_db_per_function")
class TestPostJobs:
    def _test_create_job_ok(self, user: str, data: Dict[str, Any], **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.jobs_api.create(
                models.JobWriteRequest(**deepcopy(data)), **kwargs
            )
            assert response.status == HTTPStatus.CREATED
        return response

    def _test_create_job_fails(
        self, user: str, data: Dict[str, Any], *, expected_status: int, **kwargs
    ):
        with make_api_client(user) as api_client:
            (_, response) = api_client.jobs_api.create(
                models.JobWriteRequest(**deepcopy(data)),
                **kwargs,
                _check_status=False,
                _parse_response=False,
            )
            assert response.status == expected_status
        return response

    @pytest.mark.parametrize("task_mode", ["annotation", "interpolation"])
    def test_can_create_gt_job_with_manual_frames(self, admin_user, tasks, jobs, task_mode):
        user = admin_user
        job_frame_count = 4
        task = next(
            t
            for t in tasks
            if not t["project_id"]
            and not t["organization"]
            and t["mode"] == task_mode
            and t["size"] > job_frame_count
            and not any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth")
        )
        task_id = task["id"]
        with make_api_client(user) as api_client:
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            frame_step = int(task_meta.frame_filter.split("=")[-1]) if task_meta.frame_filter else 1

        job_frame_ids = list(range(task_meta.start_frame, task_meta.stop_frame, frame_step))[
            :job_frame_count
        ]
        job_spec = {
            "task_id": task_id,
            "type": "ground_truth",
            "frame_selection_method": "manual",
            "frames": job_frame_ids,
        }

        response = self._test_create_job_ok(user, job_spec)
        job_id = json.loads(response.data)["id"]

        with make_api_client(user) as api_client:
            (gt_job_meta, _) = api_client.jobs_api.retrieve_data_meta(job_id)

        assert job_frame_count == gt_job_meta.size
        assert job_frame_ids == gt_job_meta.included_frames

    @pytest.mark.parametrize("task_mode", ["annotation", "interpolation"])
    def test_can_create_gt_job_with_random_frames(self, admin_user, tasks, jobs, task_mode):
        user = admin_user
        job_frame_count = 3
        required_task_frame_count = job_frame_count + 1
        task = next(
            t
            for t in tasks
            if not t["project_id"]
            and not t["organization"]
            and t["mode"] == task_mode
            and t["size"] > required_task_frame_count
            and not any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth")
        )
        task_id = task["id"]

        job_spec = {
            "task_id": task_id,
            "type": "ground_truth",
            "frame_selection_method": "random_uniform",
            "frame_count": job_frame_count,
        }

        response = self._test_create_job_ok(user, job_spec)
        job_id = json.loads(response.data)["id"]

        with make_api_client(user) as api_client:
            (gt_job_meta, _) = api_client.jobs_api.retrieve_data_meta(job_id)

        assert job_frame_count == gt_job_meta.size
        assert job_frame_count == len(gt_job_meta.included_frames)

    @pytest.mark.parametrize(
        "task_id, frame_ids",
        [
            # The results have to be the same in different CVAT revisions,
            # so the task ids are fixed
            (21, [3, 5, 7]),  # annotation task
            (5, [11, 14, 20]),  # interpolation task
        ],
    )
    def test_can_create_gt_job_with_random_frames_and_seed(self, admin_user, task_id, frame_ids):
        user = admin_user
        job_spec = {
            "task_id": task_id,
            "type": "ground_truth",
            "frame_selection_method": "random_uniform",
            "frame_count": 3,
            "seed": 42,
        }

        response = self._test_create_job_ok(user, job_spec)
        job_id = json.loads(response.data)["id"]

        with make_api_client(user) as api_client:
            (gt_job_meta, _) = api_client.jobs_api.retrieve_data_meta(job_id)

        assert frame_ids == gt_job_meta.included_frames

    @pytest.mark.parametrize("task_mode", ["annotation", "interpolation"])
    def test_can_create_gt_job_with_all_frames(self, admin_user, tasks, jobs, task_mode):
        user = admin_user
        task = next(
            t
            for t in tasks
            if t["mode"] == task_mode
            and t["size"]
            and not any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth")
        )
        task_id = task["id"]

        job_spec = {
            "task_id": task_id,
            "type": "ground_truth",
            "frame_selection_method": "random_uniform",
            "frame_count": task["size"],
        }

        response = self._test_create_job_ok(user, job_spec)
        job_id = json.loads(response.data)["id"]

        with make_api_client(user) as api_client:
            (gt_job_meta, _) = api_client.jobs_api.retrieve_data_meta(job_id)

        assert task["size"] == gt_job_meta.size

    def test_can_create_no_more_than_1_gt_job(self, admin_user, jobs):
        user = admin_user
        task_id = next(j for j in jobs if j["type"] == "ground_truth")["task_id"]

        job_spec = {
            "task_id": task_id,
            "type": "ground_truth",
            "frame_selection_method": "random_uniform",
            "frame_count": 1,
        }

        response = self._test_create_job_fails(
            user, job_spec, expected_status=HTTPStatus.BAD_REQUEST
        )
        assert b"A task can have only 1 ground truth job" in response.data

    def test_can_create_gt_job_in_sandbox_task(self, tasks, jobs, users):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and all(j["type"] != "ground_truth" for j in jobs if j["task_id"] == t["id"])
            and not users[t["owner"]["id"]]["is_superuser"]
        )
        user = task["owner"]["username"]

        job_spec = {
            "task_id": task["id"],
            "type": "ground_truth",
            "frame_selection_method": "random_uniform",
            "frame_count": 1,
        }

        self._test_create_job_ok(user, job_spec)

    @pytest.mark.parametrize(
        "org_role, is_staff, allow",
        [
            ("owner", True, True),
            ("owner", False, True),
            ("maintainer", True, True),
            ("maintainer", False, True),
            ("supervisor", True, True),
            ("supervisor", False, False),
            ("worker", True, False),
            ("worker", False, False),
        ],
    )
    def test_create_gt_job_in_org_task(
        self, tasks, jobs, users, is_org_member, is_task_staff, org_role, is_staff, allow
    ):
        for user in users:
            if user["is_superuser"]:
                continue

            task = next(
                (
                    t
                    for t in tasks
                    if t["organization"] is not None
                    and all(j["type"] != "ground_truth" for j in jobs if j["task_id"] == t["id"])
                    and is_task_staff(user["id"], t["id"]) == is_staff
                    and is_org_member(user["id"], t["organization"], role=org_role)
                ),
                None,
            )
            if task is not None:
                break

        assert task

        job_spec = {
            "task_id": task["id"],
            "type": "ground_truth",
            "frame_selection_method": "random_uniform",
            "frame_count": 1,
        }

        if allow:
            self._test_create_job_ok(user["username"], job_spec)
        else:
            self._test_create_job_fails(
                user["username"], job_spec, expected_status=HTTPStatus.FORBIDDEN
            )

    def test_create_response_matches_get(self, tasks, jobs, users):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and all(j["type"] != "ground_truth" for j in jobs if j["task_id"] == t["id"])
            and not users[t["owner"]["id"]]["is_superuser"]
        )
        user = task["owner"]["username"]

        spec = {
            "task_id": task["id"],
            "type": "ground_truth",
            "frame_selection_method": "random_uniform",
            "frame_count": 1,
        }

        response = self._test_create_job_ok(user, spec)
        job = json.loads(response.data)

        with make_api_client(user) as api_client:
            (_, response) = api_client.jobs_api.retrieve(job["id"])
            assert DeepDiff(job, json.loads(response.data), ignore_order=True) == {}


@pytest.mark.usefixtures("restore_db_per_function")
class TestDeleteJobs:
    def _test_destroy_job_ok(self, user, job_id, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.jobs_api.destroy(job_id, **kwargs)
            assert response.status == HTTPStatus.NO_CONTENT

    def _test_destroy_job_fails(self, user, job_id, *, expected_status: int, **kwargs):
        with make_api_client(user) as api_client:
            (_, response) = api_client.jobs_api.destroy(
                job_id, **kwargs, _check_status=False, _parse_response=False
            )
            assert response.status == expected_status
        return response

    @pytest.mark.usefixtures("restore_cvat_data")
    @pytest.mark.parametrize("job_type, allow", (("ground_truth", True), ("annotation", False)))
    def test_destroy_job(self, admin_user, jobs, job_type, allow):
        job = next(j for j in jobs if j["type"] == job_type)

        if allow:
            self._test_destroy_job_ok(admin_user, job["id"])
        else:
            self._test_destroy_job_fails(
                admin_user, job["id"], expected_status=HTTPStatus.BAD_REQUEST
            )

    def test_can_destroy_gt_job_in_sandbox_task(self, tasks, jobs, users, admin_user):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and all(j["type"] != "ground_truth" for j in jobs if j["task_id"] == t["id"])
            and not users[t["owner"]["id"]]["is_superuser"]
        )
        user = task["owner"]["username"]

        job_spec = {
            "task_id": task["id"],
            "type": "ground_truth",
            "frame_selection_method": "random_uniform",
            "frame_count": 1,
        }

        with make_api_client(admin_user) as api_client:
            (job, _) = api_client.jobs_api.create(job_spec)

        self._test_destroy_job_ok(user, job.id)

    @pytest.mark.parametrize(
        "org_role, is_staff, allow",
        [
            ("owner", True, True),
            ("owner", False, True),
            ("maintainer", True, True),
            ("maintainer", False, True),
            ("supervisor", True, True),
            ("supervisor", False, False),
            ("worker", True, False),
            ("worker", False, False),
        ],
    )
    def test_destroy_gt_job_in_org_task(
        self,
        tasks,
        jobs,
        users,
        is_org_member,
        is_task_staff,
        org_role,
        is_staff,
        allow,
        admin_user,
    ):
        for user in users:
            task = next(
                (
                    t
                    for t in tasks
                    if t["organization"] is not None
                    and all(j["type"] != "ground_truth" for j in jobs if j["task_id"] == t["id"])
                    and is_task_staff(user["id"], t["id"]) == is_staff
                    and is_org_member(user["id"], t["organization"], role=org_role)
                ),
                None,
            )
            if task is not None:
                break

        assert task

        job_spec = {
            "task_id": task["id"],
            "type": "ground_truth",
            "frame_selection_method": "random_uniform",
            "frame_count": 1,
        }

        with make_api_client(admin_user) as api_client:
            (job, _) = api_client.jobs_api.create(job_spec)

        if allow:
            self._test_destroy_job_ok(user["username"], job.id)
        else:
            self._test_destroy_job_fails(
                user["username"], job.id, expected_status=HTTPStatus.FORBIDDEN
            )


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetJobs:
    def _test_get_job_200(
        self, user, jid, *, expected_data: Optional[Dict[str, Any]] = None, **kwargs
    ):
        with make_api_client(user) as client:
            (_, response) = client.jobs_api.retrieve(jid, **kwargs)
            assert response.status == HTTPStatus.OK

            if expected_data is not None:
                assert compare_annotations(expected_data, json.loads(response.data)) == {}

    def _test_get_job_403(self, user, jid, **kwargs):
        with make_api_client(user) as client:
            (_, response) = client.jobs_api.retrieve(
                jid, **kwargs, _check_status=False, _parse_response=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

    def test_admin_can_get_sandbox_job(self, admin_user, jobs, tasks):
        job = next(job for job in jobs if tasks[job["task_id"]]["organization"] is None)
        self._test_get_job_200(admin_user, job["id"], expected_data=job)

    def test_admin_can_get_org_job(self, admin_user, jobs, tasks):
        job = next(job for job in jobs if tasks[job["task_id"]]["organization"] is not None)
        self._test_get_job_200(admin_user, job["id"], expected_data=job)

    @pytest.mark.parametrize("groups", [["business"], ["user"]])
    def test_non_admin_org_staff_can_get_job(
        self, groups, users, organizations, org_staff, jobs_by_org
    ):
        user, org_id = next(
            (user, org["id"])
            for user in users
            for org in organizations
            if user["groups"] == groups and user["id"] in org_staff(org["id"])
        )
        job = jobs_by_org[org_id][0]
        self._test_get_job_200(user["username"], job["id"], expected_data=job)

    @pytest.mark.parametrize("groups", [["business"], ["user"], ["worker"]])
    def test_non_admin_job_staff_can_get_job(self, groups, users, jobs, is_job_staff):
        user, job = next(
            (user, job)
            for user in users
            for job in jobs
            if user["groups"] == groups and is_job_staff(user["id"], job["id"])
        )
        self._test_get_job_200(user["username"], job["id"], expected_data=job)

    @pytest.mark.parametrize("groups", [["business"], ["user"], ["worker"]])
    def test_non_admin_non_job_staff_non_org_staff_cannot_get_job(
        self, groups, users, organizations, org_staff, jobs, is_job_staff
    ):
        user, job_id = next(
            (user, job["id"])
            for user in users
            for org in organizations
            for job in jobs
            if user["groups"] == groups
            and user["id"] not in org_staff(org["id"])
            and not is_job_staff(user["id"], job["id"])
        )
        self._test_get_job_403(user["username"], job_id)

    @pytest.mark.usefixtures("restore_db_per_function")
    def test_can_get_gt_job_in_sandbox_task(self, tasks, jobs, users, admin_user):
        task = next(
            t
            for t in tasks
            if t["organization"] is None
            and all(j["type"] != "ground_truth" for j in jobs if j["task_id"] == t["id"])
            and not users[t["owner"]["id"]]["is_superuser"]
        )
        user = task["owner"]["username"]

        job_spec = {
            "task_id": task["id"],
            "type": "ground_truth",
            "frame_selection_method": "random_uniform",
            "frame_count": 1,
        }

        with make_api_client(admin_user) as api_client:
            (job, _) = api_client.jobs_api.create(job_spec)

        self._test_get_job_200(user, job.id)

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize(
        "org_role, is_staff, allow",
        [
            ("owner", True, True),
            ("owner", False, True),
            ("maintainer", True, True),
            ("maintainer", False, True),
            ("supervisor", True, True),
            ("supervisor", False, False),
            ("worker", True, True),
            ("worker", False, False),
        ],
    )
    def test_get_gt_job_in_org_task(
        self,
        tasks,
        jobs,
        users,
        is_org_member,
        is_task_staff,
        org_role,
        is_staff,
        allow,
        admin_user,
    ):
        for user in users:
            task = next(
                (
                    t
                    for t in tasks
                    if t["organization"] is not None
                    and all(j["type"] != "ground_truth" for j in jobs if j["task_id"] == t["id"])
                    and is_task_staff(user["id"], t["id"]) == is_staff
                    and is_org_member(user["id"], t["organization"], role=org_role)
                ),
                None,
            )
            if task is not None:
                break

        assert task

        job_spec = {
            "task_id": task["id"],
            "type": "ground_truth",
            "frame_selection_method": "random_uniform",
            "frame_count": 1,
        }

        with make_api_client(admin_user) as api_client:
            (_, response) = api_client.jobs_api.create(job_spec)
            job = json.loads(response.data)

        if allow:
            self._test_get_job_200(user["username"], job["id"], expected_data=job)
        else:
            self._test_get_job_403(user["username"], job["id"])


@pytest.mark.usefixtures(
    # if the db is restored per test, there are conflicts with the server data cache
    # if we don't clean the db, the gt jobs created will be reused, and their
    # ids won't conflict
    "restore_db_per_class"
)
class TestGetGtJobData:
    def _delete_gt_job(self, user, gt_job_id):
        with make_api_client(user) as api_client:
            api_client.jobs_api.destroy(gt_job_id)

    @pytest.mark.parametrize("task_mode", ["annotation", "interpolation"])
    def test_can_get_gt_job_meta(self, admin_user, tasks, jobs, task_mode, request):
        user = admin_user
        job_frame_count = 4
        task = next(
            t
            for t in tasks
            if not t["project_id"]
            and not t["organization"]
            and t["mode"] == task_mode
            and t["size"] > job_frame_count
            and not any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth")
        )
        task_id = task["id"]
        with make_api_client(user) as api_client:
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            frame_step = int(task_meta.frame_filter.split("=")[-1]) if task_meta.frame_filter else 1

        job_frame_ids = list(range(task_meta.start_frame, task_meta.stop_frame, frame_step))[
            :job_frame_count
        ]
        gt_job = self._create_gt_job(admin_user, task_id, job_frame_ids)

        with make_api_client(user) as api_client:
            (gt_job_meta, _) = api_client.jobs_api.retrieve_data_meta(gt_job.id)

        request.addfinalizer(lambda: self._delete_gt_job(user, gt_job.id))

        # These values are relative to the resulting task frames, unlike meta values
        assert 0 == gt_job.start_frame
        assert task_meta.size - 1 == gt_job.stop_frame

        # The size is adjusted by the frame step and included frames
        assert job_frame_count == gt_job_meta.size
        assert job_frame_ids == gt_job_meta.included_frames

        # The frames themselves are the same as in the whole range
        # this is required by the UI implementation
        assert task_meta.start_frame == gt_job_meta.start_frame
        assert task_meta.stop_frame == gt_job_meta.stop_frame
        if task_mode == "annotation":
            assert (
                len(gt_job_meta.frames)
                == (gt_job_meta.stop_frame + 1 - gt_job_meta.start_frame) / frame_step
            )
        elif task_mode == "interpolation":
            assert len(gt_job_meta.frames) == 1
        else:
            assert False

    def test_can_get_gt_job_meta_with_complex_frame_setup(self, admin_user, request):
        image_count = 50
        start_frame = 3
        stop_frame = image_count - 4
        frame_step = 5

        images = generate_image_files(image_count)

        task_id, _ = create_task(
            admin_user,
            spec={
                "name": "test complex frame setup",
                "labels": [{"name": "cat"}],
            },
            data={
                "image_quality": 75,
                "start_frame": start_frame,
                "stop_frame": stop_frame,
                "frame_filter": f"step={frame_step}",
                "client_files": images,
                "sorting_method": "predefined",
            },
        )

        task_frame_ids = range(start_frame, stop_frame, frame_step)
        job_frame_ids = list(task_frame_ids[::3])
        gt_job = self._create_gt_job(admin_user, task_id, job_frame_ids)

        with make_api_client(admin_user) as api_client:
            (gt_job_meta, _) = api_client.jobs_api.retrieve_data_meta(gt_job.id)

        request.addfinalizer(lambda: self._delete_gt_job(admin_user, gt_job.id))

        # These values are relative to the resulting task frames, unlike meta values
        assert 0 == gt_job.start_frame
        assert len(task_frame_ids) - 1 == gt_job.stop_frame

        # The size is adjusted by the frame step and included frames
        assert len(job_frame_ids) == gt_job_meta.size
        assert job_frame_ids == gt_job_meta.included_frames

        # The frames themselves are the same as in the whole range
        # with placeholders in the frames outside the job.
        # This is required by the UI implementation
        assert start_frame == gt_job_meta.start_frame
        assert max(task_frame_ids) == gt_job_meta.stop_frame
        assert [frame_info["name"] for frame_info in gt_job_meta.frames] == [
            images[frame].name if frame in job_frame_ids else "placeholder.jpg"
            for frame in task_frame_ids
        ]

    @pytest.mark.parametrize("task_mode", ["annotation", "interpolation"])
    @pytest.mark.parametrize("quality", ["compressed", "original"])
    def test_can_get_gt_job_chunk(self, admin_user, tasks, jobs, task_mode, quality, request):
        user = admin_user
        job_frame_count = 4
        task = next(
            t
            for t in tasks
            if not t["project_id"]
            and not t["organization"]
            and t["mode"] == task_mode
            and t["size"] > job_frame_count
            and not any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth")
        )
        task_id = task["id"]
        with make_api_client(user) as api_client:
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            frame_step = int(task_meta.frame_filter.split("=")[-1]) if task_meta.frame_filter else 1

        job_frame_ids = list(range(task_meta.start_frame, task_meta.stop_frame, frame_step))[
            :job_frame_count
        ]
        gt_job = self._create_gt_job(admin_user, task_id, job_frame_ids)

        with make_api_client(admin_user) as api_client:
            (chunk_file, response) = api_client.jobs_api.retrieve_data(
                gt_job.id, number=0, quality=quality, type="chunk"
            )
            assert response.status == HTTPStatus.OK

        request.addfinalizer(lambda: self._delete_gt_job(admin_user, gt_job.id))

        frame_range = range(
            task_meta.start_frame, min(task_meta.stop_frame + 1, task_meta.chunk_size), frame_step
        )
        included_frames = job_frame_ids

        # The frame count is the same as in the whole range
        # with placeholders in the frames outside the job.
        # This is required by the UI implementation
        with zipfile.ZipFile(chunk_file) as chunk:
            assert set(chunk.namelist()) == set("{:06d}.jpeg".format(i) for i in frame_range)

            for file_info in chunk.filelist:
                with chunk.open(file_info) as image_file:
                    image = Image.open(image_file)
                    image_data = np.array(image)

                if int(os.path.splitext(file_info.filename)[0]) not in included_frames:
                    assert image.size == (1, 1)
                    assert np.all(image_data == 0), image_data
                else:
                    assert image.size > (1, 1)
                    assert np.any(image_data != 0)

    def _create_gt_job(self, user, task_id, frames):
        with make_api_client(user) as api_client:
            job_spec = {
                "task_id": task_id,
                "type": "ground_truth",
                "frame_selection_method": "manual",
                "frames": frames,
            }

            (gt_job, _) = api_client.jobs_api.create(job_spec)

        return gt_job

    def _get_gt_job(self, user, task_id):
        with make_api_client(user) as api_client:
            (task_jobs, _) = api_client.jobs_api.list(task_id=task_id, type="ground_truth")
            gt_job = task_jobs.results[0]

        return gt_job

    @pytest.mark.parametrize("task_mode", ["annotation", "interpolation"])
    @pytest.mark.parametrize("quality", ["compressed", "original"])
    def test_can_get_gt_job_frame(self, admin_user, tasks, jobs, task_mode, quality, request):
        user = admin_user
        job_frame_count = 4
        task = next(
            t
            for t in tasks
            if not t["project_id"]
            and not t["organization"]
            and t["mode"] == task_mode
            and t["size"] > job_frame_count
            and not any(j for j in jobs if j["task_id"] == t["id"] and j["type"] == "ground_truth")
        )
        task_id = task["id"]
        with make_api_client(user) as api_client:
            (task_meta, _) = api_client.tasks_api.retrieve_data_meta(task_id)
            frame_step = int(task_meta.frame_filter.split("=")[-1]) if task_meta.frame_filter else 1

        job_frame_ids = list(range(task_meta.start_frame, task_meta.stop_frame, frame_step))[
            :job_frame_count
        ]
        gt_job = self._create_gt_job(admin_user, task_id, job_frame_ids)

        frame_range = range(
            task_meta.start_frame, min(task_meta.stop_frame + 1, task_meta.chunk_size), frame_step
        )
        included_frames = job_frame_ids
        excluded_frames = list(set(frame_range).difference(included_frames))

        with make_api_client(admin_user) as api_client:
            (_, response) = api_client.jobs_api.retrieve_data(
                gt_job.id,
                number=excluded_frames[0],
                quality=quality,
                type="frame",
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.BAD_REQUEST
            assert b"The frame number doesn't belong to the job" in response.data

            (_, response) = api_client.jobs_api.retrieve_data(
                gt_job.id, number=included_frames[0], quality=quality, type="frame"
            )
            assert response.status == HTTPStatus.OK

        request.addfinalizer(lambda: self._delete_gt_job(admin_user, gt_job.id))


@pytest.mark.usefixtures("restore_db_per_class")
class TestListJobs:
    def _test_list_jobs_200(self, user, data, **kwargs):
        with make_api_client(user) as client:
            results = get_paginated_collection(
                client.jobs_api.list_endpoint, return_json=True, **kwargs
            )
            assert compare_annotations(data, results) == {}

    def _test_list_jobs_403(self, user, **kwargs):
        with make_api_client(user) as client:
            (_, response) = client.jobs_api.list(
                **kwargs, _check_status=False, _parse_response=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("org", [None, "", 1, 2])
    def test_admin_list_jobs(self, jobs, tasks, org):
        jobs, kwargs = filter_jobs(jobs, tasks, org)
        self._test_list_jobs_200("admin1", jobs, **kwargs)

    @pytest.mark.parametrize("org_id", ["", None, 1, 2])
    @pytest.mark.parametrize("groups", [["business"], ["user"], ["worker"], []])
    def test_non_admin_list_jobs(
        self, org_id, groups, users, jobs, tasks, projects, org_staff, is_org_member
    ):
        users = [u for u in users if u["groups"] == groups][:2]
        jobs, kwargs = filter_jobs(jobs, tasks, org_id)
        org_staff = org_staff(org_id)

        for user in users:
            user_jobs = []
            for job in jobs:
                job_staff = get_job_staff(job, tasks, projects)
                if user["id"] in job_staff | org_staff:
                    user_jobs.append(job)
            if is_org_member(user["id"], org_id):
                self._test_list_jobs_200(user["username"], user_jobs, **kwargs)
            else:
                self._test_list_jobs_403(user["username"], **kwargs)


class TestJobsListFilters(CollectionSimpleFilterTestBase):
    field_lookups = {
        "assignee": ["assignee", "username"],
    }

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, jobs):
        self.user = admin_user
        self.samples = jobs

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.jobs_api.list_endpoint

    @pytest.mark.parametrize(
        "field",
        (
            "assignee",
            "state",
            "stage",
            "task_id",
            "project_id",
            "type",
        ),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super().test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetAnnotations:
    def _test_get_job_annotations_200(self, user, jid, data):
        with make_api_client(user) as client:
            (_, response) = client.jobs_api.retrieve_annotations(jid)
            assert response.status == HTTPStatus.OK
            assert compare_annotations(data, json.loads(response.data)) == {}

    def _test_get_job_annotations_403(self, user, jid):
        with make_api_client(user) as client:
            (_, response) = client.jobs_api.retrieve_annotations(
                jid, _check_status=False, _parse_response=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("org", [""])
    @pytest.mark.parametrize(
        "groups, job_staff, expect_success",
        [
            (["admin"], True, True),
            (["admin"], False, True),
            (["business"], True, True),
            (["business"], False, False),
            (["worker"], True, True),
            (["worker"], False, False),
            (["user"], True, True),
            (["user"], False, False),
        ],
    )
    def test_user_get_job_annotations(
        self,
        org,
        groups,
        job_staff,
        expect_success,
        users,
        jobs,
        tasks,
        annotations,
        find_job_staff_user,
    ):
        users = [u for u in users if u["groups"] == groups]
        jobs, _ = filter_jobs(jobs, tasks, org)
        username, job_id = find_job_staff_user(jobs, users, job_staff)

        if expect_success:
            self._test_get_job_annotations_200(username, job_id, annotations["job"][str(job_id)])
        else:
            self._test_get_job_annotations_403(username, job_id)

    @pytest.mark.parametrize("org", [2])
    @pytest.mark.parametrize(
        "role, job_staff, expect_success",
        [
            ("owner", True, True),
            ("owner", False, True),
            ("maintainer", True, True),
            ("maintainer", False, True),
            ("supervisor", True, True),
            ("supervisor", False, False),
            ("worker", True, True),
            ("worker", False, False),
        ],
    )
    def test_member_get_job_annotations(
        self,
        org,
        role,
        job_staff,
        expect_success,
        jobs,
        tasks,
        find_job_staff_user,
        annotations,
        find_users,
    ):
        users = find_users(org=org, role=role)
        jobs, _ = filter_jobs(jobs, tasks, org)
        username, jid = find_job_staff_user(jobs, users, job_staff)

        if expect_success:
            data = annotations["job"][str(jid)]
            data["shapes"] = sorted(data["shapes"], key=lambda a: a["id"])
            self._test_get_job_annotations_200(username, jid, data)
        else:
            self._test_get_job_annotations_403(username, jid)

    @pytest.mark.parametrize("org", [1])
    @pytest.mark.parametrize(
        "privilege, expect_success",
        [("admin", True), ("business", False), ("worker", False), ("user", False)],
    )
    def test_non_member_get_job_annotations(
        self,
        org,
        privilege,
        expect_success,
        jobs,
        tasks,
        find_job_staff_user,
        annotations,
        find_users,
    ):
        users = find_users(privilege=privilege, exclude_org=org)
        jobs, _ = filter_jobs(jobs, tasks, org)
        username, job_id = find_job_staff_user(jobs, users, False)

        if expect_success:
            self._test_get_job_annotations_200(username, job_id, annotations["job"][str(job_id)])
        else:
            self._test_get_job_annotations_403(username, job_id)

    @pytest.mark.parametrize("job_type", ("ground_truth", "annotation"))
    def test_can_get_annotations(self, admin_user, jobs, annotations, job_type):
        job = next(j for j in jobs if j["type"] == job_type)
        self._test_get_job_annotations_200(
            admin_user, job["id"], annotations["job"][str(job["id"])]
        )


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchJobAnnotations:
    def _check_response(self, username, jid, expect_success, data=None):
        with make_api_client(username) as client:
            (_, response) = client.jobs_api.partial_update_annotations(
                id=jid,
                patched_labeled_data_request=deepcopy(data),
                action="update",
                _parse_response=expect_success,
                _check_status=expect_success,
            )

            if expect_success:
                assert response.status == HTTPStatus.OK
                assert compare_annotations(data, json.loads(response.data)) == {}
            else:
                assert response.status == HTTPStatus.FORBIDDEN

    @pytest.fixture(scope="class")
    def request_data(self, annotations):
        def get_data(jid):
            data = deepcopy(annotations["job"][str(jid)])
            if data["shapes"][0]["type"] == "skeleton":
                data["shapes"][0]["elements"][0].update({"points": [2.0, 3.0, 4.0, 5.0]})
            else:
                data["shapes"][0].update({"points": [2.0, 3.0, 4.0, 5.0, 6.0, 7.0]})
            data["version"] += 1
            return data

        return get_data

    @pytest.mark.parametrize("org", [2])
    @pytest.mark.parametrize(
        "role, job_staff, expect_success",
        [
            ("maintainer", False, True),
            ("owner", False, True),
            ("supervisor", False, False),
            ("worker", False, False),
            ("maintainer", True, True),
            ("owner", True, True),
            ("supervisor", True, True),
            ("worker", True, True),
        ],
    )
    def test_member_update_job_annotations(
        self,
        org,
        role,
        job_staff,
        expect_success,
        find_job_staff_user,
        find_users,
        request_data,
        jobs_by_org,
        filter_jobs_with_shapes,
    ):
        users = find_users(role=role, org=org)
        jobs = jobs_by_org[org]
        filtered_jobs = filter_jobs_with_shapes(jobs)
        username, jid = find_job_staff_user(filtered_jobs, users, job_staff)

        data = request_data(jid)
        self._check_response(username, jid, expect_success, data)

    @pytest.mark.parametrize("org", [2])
    @pytest.mark.parametrize(
        "privilege, expect_success",
        [("admin", True), ("business", False), ("worker", False), ("user", False)],
    )
    def test_non_member_update_job_annotations(
        self,
        org,
        privilege,
        expect_success,
        find_job_staff_user,
        find_users,
        request_data,
        jobs_by_org,
        filter_jobs_with_shapes,
    ):
        users = find_users(privilege=privilege, exclude_org=org)
        jobs = jobs_by_org[org]
        filtered_jobs = filter_jobs_with_shapes(jobs)
        username, jid = find_job_staff_user(filtered_jobs, users, False)

        data = request_data(jid)
        self._check_response(username, jid, expect_success, data)

    @pytest.mark.parametrize("org", [""])
    @pytest.mark.parametrize(
        "privilege, job_staff, expect_success",
        [
            ("admin", True, True),
            ("admin", False, True),
            ("business", True, True),
            ("business", False, False),
            ("worker", True, True),
            ("worker", False, False),
            ("user", True, True),
            ("user", False, False),
        ],
    )
    def test_user_update_job_annotations(
        self,
        org,
        privilege,
        job_staff,
        expect_success,
        find_job_staff_user,
        find_users,
        request_data,
        jobs_by_org,
        filter_jobs_with_shapes,
    ):
        users = find_users(privilege=privilege)
        jobs = jobs_by_org[org]
        filtered_jobs = filter_jobs_with_shapes(jobs)
        username, jid = find_job_staff_user(filtered_jobs, users, job_staff)

        data = request_data(jid)
        self._check_response(username, jid, expect_success, data)

    @pytest.mark.parametrize("job_type", ("ground_truth", "annotation"))
    def test_can_update_annotations(self, admin_user, jobs, request_data, job_type):
        job = next(j for j in jobs if j["type"] == job_type)
        data = request_data(job["id"])
        self._check_response(admin_user, job["id"], True, data)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchJob:
    @pytest.fixture(scope="class")
    def find_task_staff_user(self, is_task_staff):
        def find(jobs, users, is_staff):
            for job in jobs:
                for user in users:
                    if is_staff == is_task_staff(user["id"], job["task_id"]):
                        return user, job["id"]
            return None, None

        return find

    @pytest.fixture(scope="class")
    def expected_data(self, jobs, users):
        keys = ["url", "id", "username", "first_name", "last_name"]

        def find(job_id, assignee_id):
            data = deepcopy(jobs[job_id])
            data["assignee"] = dict(filter(lambda a: a[0] in keys, users[assignee_id].items()))
            return data

        return find

    @pytest.fixture(scope="class")
    def new_assignee(self, jobs, tasks, assignee_id, org_staff):
        def find_new_assignee(jid, user_id):
            members = org_staff(tasks[jobs[jid]["task_id"]]["organization"])
            members -= {assignee_id(jobs[jid]), user_id}
            return members.pop()

        return find_new_assignee

    @pytest.mark.parametrize("org", [2])
    @pytest.mark.parametrize(
        "role, task_staff, expect_success",
        [
            ("maintainer", False, True),
            ("owner", False, True),
            ("supervisor", False, False),
            ("worker", False, False),
            ("maintainer", True, True),
            ("owner", True, True),
            ("supervisor", True, True),
            ("worker", True, True),
        ],
    )
    def test_member_update_job_assignee(
        self,
        org,
        role,
        task_staff,
        expect_success,
        find_task_staff_user,
        find_users,
        jobs_by_org,
        new_assignee,
        expected_data,
    ):
        users, jobs = find_users(role=role, org=org), jobs_by_org[org]
        user, jid = find_task_staff_user(jobs, users, task_staff)

        assignee = new_assignee(jid, user["id"])
        with make_api_client(user["username"]) as client:
            (_, response) = client.jobs_api.partial_update(
                id=jid,
                patched_job_write_request={"assignee": assignee},
                _parse_response=expect_success,
                _check_status=expect_success,
            )

            if expect_success:
                assert response.status == HTTPStatus.OK
                assert (
                    DeepDiff(
                        expected_data(jid, assignee),
                        json.loads(response.data),
                        exclude_paths="root['updated_date']",
                        ignore_order=True,
                    )
                    == {}
                )
            else:
                assert response.status == HTTPStatus.FORBIDDEN


def _check_coco_job_annotations(content, values_to_be_checked):
    exported_annotations = json.loads(content)
    if "shapes_length" in values_to_be_checked:
        assert values_to_be_checked["shapes_length"] == len(exported_annotations["annotations"])
    assert values_to_be_checked["job_size"] == len(exported_annotations["images"])
    assert values_to_be_checked["task_size"] > len(exported_annotations["images"])


def _check_cvat_for_images_job_annotations(content, values_to_be_checked):
    document = ET.fromstring(content)
    # check meta information
    meta = document.find("meta")
    instance = list(meta)[0]
    assert instance.tag == "job"
    assert instance.find("id").text == values_to_be_checked["job_id"]
    assert instance.find("size").text == str(values_to_be_checked["job_size"])
    assert instance.find("start_frame").text == str(values_to_be_checked["start_frame"])
    assert instance.find("stop_frame").text == str(values_to_be_checked["stop_frame"])
    assert instance.find("mode").text == values_to_be_checked["mode"]
    assert len(instance.find("segments")) == 1

    # check number of images, their sorting, number of annotations
    images = document.findall("image")
    assert len(images) == values_to_be_checked["job_size"]
    if "shapes_length" in values_to_be_checked:
        assert len(list(document.iter("box"))) == values_to_be_checked["shapes_length"]
    current_id = values_to_be_checked["start_frame"]
    for image_elem in images:
        assert image_elem.attrib["id"] == str(current_id)
        current_id += 1


def _check_cvat_for_video_job_annotations(content, values_to_be_checked):
    document = ET.fromstring(content)
    # check meta information
    meta = document.find("meta")
    instance = list(meta)[0]
    assert instance.tag == "job"
    assert instance.find("id").text == values_to_be_checked["job_id"]
    assert instance.find("size").text == str(values_to_be_checked["job_size"])
    assert instance.find("start_frame").text == str(values_to_be_checked["start_frame"])
    assert instance.find("stop_frame").text == str(values_to_be_checked["stop_frame"])
    assert instance.find("mode").text == values_to_be_checked["mode"]
    assert len(instance.find("segments")) == 1

    # check number of annotations
    if values_to_be_checked.get("shapes_length") is not None:
        assert len(list(document.iter("track"))) == values_to_be_checked["tracks_length"]


@pytest.mark.usefixtures("restore_db_per_class")
class TestJobDataset:
    def _export_dataset(self, username, jid, **kwargs):
        with make_api_client(username) as api_client:
            return export_dataset(api_client.jobs_api.retrieve_dataset_endpoint, id=jid, **kwargs)

    def _export_annotations(self, username, jid, **kwargs):
        with make_api_client(username) as api_client:
            return export_dataset(
                api_client.jobs_api.retrieve_annotations_endpoint, id=jid, **kwargs
            )

    def test_can_export_dataset(self, admin_user: str, jobs_with_shapes: List):
        job = jobs_with_shapes[0]
        response = self._export_dataset(admin_user, job["id"])
        assert response.data

    def test_non_admin_can_export_dataset(self, users, tasks, jobs_with_shapes):
        job_id, username = next(
            (
                (job["id"], tasks[job["task_id"]]["owner"]["username"])
                for job in jobs_with_shapes
                if "admin" not in users[tasks[job["task_id"]]["owner"]["id"]]["groups"]
                and tasks[job["task_id"]]["target_storage"] is None
                and tasks[job["task_id"]]["organization"] is None
            )
        )
        response = self._export_dataset(username, job_id)
        assert response.data

    def test_non_admin_can_export_annotations(self, users, tasks, jobs_with_shapes):
        job_id, username = next(
            (
                (job["id"], tasks[job["task_id"]]["owner"]["username"])
                for job in jobs_with_shapes
                if "admin" not in users[tasks[job["task_id"]]["owner"]["id"]]["groups"]
                and tasks[job["task_id"]]["target_storage"] is None
                and tasks[job["task_id"]]["organization"] is None
            )
        )
        response = self._export_annotations(username, job_id)
        assert response.data

    @pytest.mark.parametrize("username, jid", [("admin1", 14)])
    @pytest.mark.parametrize(
        "anno_format, anno_file_name, check_func",
        [
            ("COCO 1.0", "annotations/instances_default.json", _check_coco_job_annotations),
            ("CVAT for images 1.1", "annotations.xml", _check_cvat_for_images_job_annotations),
        ],
    )
    def test_exported_job_dataset_structure(
        self,
        username,
        jid,
        anno_format,
        anno_file_name,
        check_func,
        tasks,
        jobs,
        annotations,
    ):
        job_data = jobs[jid]
        annotations_before = annotations["job"][str(jid)]

        values_to_be_checked = {
            "task_size": tasks[job_data["task_id"]]["size"],
            # NOTE: data step is not stored in assets, default = 1
            "job_size": job_data["stop_frame"] - job_data["start_frame"] + 1,
            "start_frame": job_data["start_frame"],
            "stop_frame": job_data["stop_frame"],
            "shapes_length": len(annotations_before["shapes"]),
            "job_id": str(jid),
            "mode": job_data["mode"],
        }

        response = self._export_dataset(username, jid, format=anno_format)
        assert response.data
        with zipfile.ZipFile(BytesIO(response.data)) as zip_file:
            assert (
                len(zip_file.namelist()) == values_to_be_checked["job_size"] + 1
            )  # images + annotation file
            content = zip_file.read(anno_file_name)
        check_func(content, values_to_be_checked)

    @pytest.mark.parametrize("username", ["admin1"])
    @pytest.mark.parametrize("jid", [25, 26])
    @pytest.mark.parametrize(
        "anno_format, anno_file_name, check_func",
        [
            ("CVAT for images 1.1", "annotations.xml", _check_cvat_for_images_job_annotations),
            ("CVAT for video 1.1", "annotations.xml", _check_cvat_for_video_job_annotations),
            (
                "COCO Keypoints 1.0",
                "annotations/person_keypoints_default.json",
                _check_coco_job_annotations,
            ),
        ],
    )
    def test_export_job_among_several_jobs_in_task(
        self, username, jid, anno_format, anno_file_name, check_func, tasks, jobs, annotations
    ):
        job_data = jobs[jid]
        annotations_before = annotations["job"][str(jid)]

        values_to_be_checked = {
            "task_size": tasks[job_data["task_id"]]["size"],
            # NOTE: data step is not stored in assets, default = 1
            "job_size": job_data["stop_frame"] - job_data["start_frame"] + 1,
            "start_frame": job_data["start_frame"],
            "stop_frame": job_data["stop_frame"],
            "job_id": str(jid),
            "tracks_length": len(annotations_before["tracks"]),
            "mode": job_data["mode"],
        }

        response = self._export_dataset(username, jid, format=anno_format)
        assert response.data
        with zipfile.ZipFile(BytesIO(response.data)) as zip_file:
            assert (
                len(zip_file.namelist()) == values_to_be_checked["job_size"] + 1
            )  # images + annotation file
            content = zip_file.read(anno_file_name)
        check_func(content, values_to_be_checked)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetJobPreview:
    def _test_get_job_preview_200(self, username, jid, **kwargs):
        with make_api_client(username) as client:
            (_, response) = client.jobs_api.retrieve_preview(jid, **kwargs)

            assert response.status == HTTPStatus.OK
            (width, height) = Image.open(BytesIO(response.data)).size
            assert width > 0 and height > 0

    def _test_get_job_preview_403(self, username, jid, **kwargs):
        with make_api_client(username) as client:
            (_, response) = client.jobs_api.retrieve_preview(
                jid, **kwargs, _check_status=False, _parse_response=False
            )
            assert response.status == HTTPStatus.FORBIDDEN

    def test_admin_get_sandbox_job_preview(self, jobs, tasks):
        job_id = next(job["id"] for job in jobs if not tasks[job["task_id"]]["organization"])
        self._test_get_job_preview_200("admin2", job_id)

    def test_admin_get_org_job_preview(self, jobs, tasks):
        job_id = next(job["id"] for job in jobs if tasks[job["task_id"]]["organization"])
        self._test_get_job_preview_200("admin2", job_id)

    def test_business_can_get_job_preview_in_sandbox(self, find_users, jobs, is_job_staff):
        username, job_id = next(
            (user["username"], job["id"])
            for user in find_users(privilege="business")
            for job in jobs
            if is_job_staff(user["id"], job["id"])
        )
        self._test_get_job_preview_200(username, job_id)

    def test_user_can_get_job_preview_in_sandbox(self, find_users, jobs, is_job_staff):
        username, job_id = next(
            (user["username"], job["id"])
            for user in find_users(privilege="user")
            for job in jobs
            if is_job_staff(user["id"], job["id"])
        )
        self._test_get_job_preview_200(username, job_id)

    def test_business_cannot_get_job_preview_in_sandbox(self, find_users, jobs, is_job_staff):
        username, job_id = next(
            (user["username"], job["id"])
            for user in find_users(privilege="business")
            for job in jobs
            if not is_job_staff(user["id"], job["id"])
        )
        self._test_get_job_preview_403(username, job_id)

    def test_user_cannot_get_job_preview_in_sandbox(self, find_users, jobs, is_job_staff):
        username, job_id = next(
            (user["username"], job["id"])
            for user in find_users(privilege="user")
            for job in jobs
            if not is_job_staff(user["id"], job["id"])
        )
        self._test_get_job_preview_403(username, job_id)

    def test_org_staff_can_get_job_preview_in_org(
        self, organizations, users, org_staff, jobs_by_org
    ):
        username, job_id = next(
            (user["username"], jobs_by_org[org["id"]][0]["id"])
            for user in users
            for org in organizations
            if user["id"] in org_staff(org["id"])
        )
        self._test_get_job_preview_200(username, job_id)

    def test_job_staff_can_get_job_preview_in_org(
        self, organizations, users, jobs_by_org, is_job_staff
    ):
        username, job_id = next(
            (user["username"], job["id"])
            for user in users
            for org in organizations
            for job in jobs_by_org[org["id"]]
            if is_job_staff(user["id"], job["id"])
        )
        self._test_get_job_preview_200(username, job_id)

    def test_job_staff_can_get_job_preview_in_sandbox(self, users, jobs, tasks, is_job_staff):
        username, job_id = next(
            (user["username"], job["id"])
            for user in users
            for job in jobs
            if is_job_staff(user["id"], job["id"]) and tasks[job["task_id"]]["organization"] is None
        )
        self._test_get_job_preview_200(username, job_id)

    def test_non_org_staff_non_job_staff_cannot_get_job_preview_in_org(
        self, users, organizations, jobs_by_org, is_job_staff, org_staff
    ):
        username, job_id = next(
            (user["username"], job["id"])
            for user in users
            for org in organizations
            for job in jobs_by_org[org["id"]]
            if user["id"] not in org_staff(org["id"]) and not is_job_staff(user["id"], job["id"])
        )
        self._test_get_job_preview_403(username, job_id)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetJobDataMeta:
    @pytest.mark.parametrize("org_slug", [None, "", "org"])
    def test_can_get_job_meta_with_org_slug(self, admin_user, tasks, jobs, organizations, org_slug):
        # Checks for backward compatibility with org_slug parameter
        task = next(t for t in tasks if t["organization"])
        job = next(j for j in jobs if j["task_id"] == task["id"])

        if org_slug == "org":
            org_slug = organizations[task["organization"]]["slug"]

        with make_api_client(admin_user) as client:
            client.organization_slug = org_slug
            client.jobs_api.retrieve_data_meta(job["id"])
