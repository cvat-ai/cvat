# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from pathlib import Path, PurePosixPath

import pytest
from cvat_sdk import exceptions, models
from cvat_sdk.core.exceptions import BackgroundRequestException
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from pytest_cases import fixture, fixture_ref, parametrize

import shared.utils.s3 as s3
from shared.utils.config import make_sdk_client


@pytest.mark.usefixtures("restore_redis_ondisk_after_class")
@pytest.mark.usefixtures("restore_redis_ondisk_per_class")
@pytest.mark.usefixtures("restore_db_per_class")
@pytest.mark.usefixtures("restore_cvat_data_per_class")
class TestAudioTasks:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        restore_redis_inmem_per_function,
        tmp_path: Path,
        admin_user: str,
    ):
        self.tmp_dir = tmp_path

        self.user = admin_user

        with make_sdk_client(self.user) as client:
            self.client = client
            yield

    @fixture(scope="class")
    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")], scope="session")
    def fxt_audio_task_from_uploaded_data(
        cls, request: pytest.FixtureRequest, admin_user, source_filename: Path
    ):
        with make_sdk_client(admin_user) as client:
            yield client.tasks.create_from_data(
                spec={
                    "name": f"{request.node.name}[{request.fixturename}]",
                },
                resources=[source_filename],
            )

    @parametrize("task", [fixture_ref(fxt_audio_task_from_uploaded_data)])
    def test_can_create_audio_task_from_local_data(self, task: Task):
        assert task.media_type == "audio"
        assert task.dimension == "1d"
        assert task.mode == "interpolation"
        assert task.size > 0

    @pytest.mark.with_external_services
    @parametrize("use_cache", [True, False])
    @parametrize(
        "cloud_storage_id",
        [
            1,  # public bucket
            2,  # private bucket
        ],
    )
    def test_can_create_audio_task_from_cloud_data(
        self,
        fxt_test_name: str,
        fxt_uploaded_s3_file,
        fxt_local_audio_file_path: Path,
        use_cache: bool,
        cloud_storage_id: int,
        cloud_storages,
        organizations,
    ):
        cloud_storage = cloud_storages[cloud_storage_id]
        org_id = cloud_storages[cloud_storage_id]["organization"]
        org_slug = organizations[org_id]["slug"] if org_id else None

        storage_media_path = PurePosixPath(fxt_local_audio_file_path.name)
        s3_client = s3.make_client(bucket=cloud_storage["resource"])
        fxt_uploaded_s3_file(
            s3_client, path=storage_media_path, data=fxt_local_audio_file_path.read_bytes()
        )

        with self.client.organization_context(org_slug):
            task = self.client.tasks.create_from_data(
                spec={
                    "name": fxt_test_name,
                },
                resources=[storage_media_path],
                resource_type=ResourceType.SHARE,
                data_params={
                    "cloud_storage_id": cloud_storage_id,
                    "use_cache": use_cache,
                },
            )

        assert task.media_type == "audio"
        assert task.dimension == "1d"
        assert task.mode == "interpolation"
        assert task.size > 0
        assert task.data_cloud_storage_id == cloud_storage_id

    @parametrize("source_path", [fixture_ref("fxt_local_audio_file_path")])
    def test_cant_get_preview(self, fxt_test_name, source_path):
        task = self.client.tasks.create_from_data(
            spec={"name": fxt_test_name},
            resources=[source_path],
        )

        jobs = task.get_jobs()

        for instance in (task, *jobs):
            with pytest.raises(exceptions.ApiException) as capture:
                instance.get_preview()

            assert "not available" in str(capture.value)

    @parametrize("task", [fixture_ref(fxt_audio_task_from_uploaded_data)])
    def test_can_split_into_jobs(self, task: Task):
        # Only 1 job is allowed for audio data
        assert task.jobs.count == 1

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_cant_use_segment_size(self, source_filename: Path, fxt_test_name: str):
        with pytest.raises(BackgroundRequestException) as capture:
            self.client.tasks.create_from_data(
                spec={
                    "name": fxt_test_name,
                    "segment_size": 10000,
                },
                resources=[source_filename],
            )

        assert "'segment_size' parameter cannot be used in audio tasks" in str(capture.value)

    @parametrize("task", [fixture_ref(fxt_audio_task_from_uploaded_data)])
    def test_cant_get_task_chunks(self, task: Task):
        for quality in ["original", "compressed"]:
            with pytest.raises(exceptions.ApiException) as capture:
                task.api.retrieve_data(task.id, type="chunk", quality=quality, number=0)

            assert "not available" in str(capture.value)

    @pytest.mark.timeout(
        # This test has to check all the job chunks availability, it can make many requests
        timeout=300
    )
    @parametrize("task", [fixture_ref(fxt_audio_task_from_uploaded_data)])
    @parametrize("indexing", ["absolute", "relative"])
    def test_cant_get_job_chunks(self, task: Task, indexing: str):
        jobs = sorted(task.get_jobs(), key=lambda j: j.start_frame)
        job = jobs[0]

        for quality in ["original", "compressed"]:
            with pytest.raises(exceptions.ApiException) as capture:
                job.api.retrieve_data(
                    job.id,
                    type="chunk",
                    quality=quality,
                    **({"number": 0} if indexing == "absolute" else {"index": 0}),
                )

            assert "not available" in str(capture.value)

    @parametrize("task", [fixture_ref(fxt_audio_task_from_uploaded_data)])
    def test_cant_create_gt_job(self, task: Task):
        with pytest.raises(exceptions.ApiException) as capture:
            self.client.jobs.api.create(
                job_write_request=models.JobWriteRequest(type="ground_truth", task_id=task.id)
            )

        assert "can only be added in 2d tasks" in str(capture.value)

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_cant_create_task_with_gt_job(self, fxt_test_name: str, source_filename: Path):
        with pytest.raises(BackgroundRequestException) as capture:
            self.client.tasks.create_from_data(
                spec={
                    "name": fxt_test_name,
                },
                resources=[source_filename],
                data_params={
                    "validation_params": {
                        "mode": "gt",
                        "frame_selection_method": "manual",
                        "frames": [0],
                    }
                },
            )

        assert "not available" in str(capture.value)
