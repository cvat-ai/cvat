# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import math
from collections.abc import Generator
from itertools import product
from pathlib import Path, PurePosixPath

import pytest
from cvat_sdk import exceptions, models
from cvat_sdk.core.exceptions import BackgroundRequestException
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from PIL import Image
from pytest_cases import fixture, fixture_ref, parametrize

import shared.utils.s3 as s3
from shared.utils.config import (
    SHARE_DIR,
    make_sdk_client,
)
from shared.utils.helpers import read_audio_pcm

from ._test_base import TestTasksBase


@fixture(scope="session")
def fxt_local_audio_with_cover() -> Generator[tuple[Path, Path], None, None]:
    # Generate with:
    # ffmpeg \
    #     -i "audio.mp3" \
    #     -i "cover.png" \
    #     -map 0:0 \
    #     -map 1:0 \
    #     -c copy \
    #     -id3v2_version 3 \
    #     "audio_with_cover.mp3"

    yield (
        SHARE_DIR / "audio" / "sample2_with_cover.mp3",
        SHARE_DIR / "audio" / "sample2_cover.png",
    )


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

    @parametrize(
        "source_path, cover_image_path",
        [
            (fixture_ref("fxt_local_audio_file_path"), None),
            fixture_ref(fxt_local_audio_with_cover),
        ],
    )
    def test_can_use_cover_image_for_preview(self, fxt_test_name, source_path, cover_image_path):
        task = self.client.tasks.create_from_data(
            spec={"name": fxt_test_name},
            resources=[source_path],
        )

        jobs = task.get_jobs()

        for instance in (task, *jobs):
            actual = Image.open(instance.get_preview())

            assert actual.size > (0, 0)

            if cover_image_path is None:
                assert actual.format == "PNG"  # should return the default image
                continue

            expected = Image.open(cover_image_path)
            expected.thumbnail((256, 256))

            TestTasksBase._compare_images(expected, actual, must_be_identical=False)

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

    @pytest.mark.timeout(
        # This test has to check all the task chunks availability, it can make many requests
        timeout=300
    )
    @parametrize("task", [fixture_ref(fxt_audio_task_from_uploaded_data)])
    def test_can_get_task_chunks(self, task: Task):
        data_meta = task.get_meta()

        assert task.data_chunk_size == task.size
        assert task.data_compressed_chunk_type == "audio_mp3"
        assert task.data_original_chunk_type == "audio_mp3"

        for quality, chunk_id in product(
            ["original", "compressed"],
            range(math.ceil((data_meta.stop_frame - data_meta.start_frame) / data_meta.chunk_size)),
        ):
            response = task.api.retrieve_data(
                task.id, type="chunk", quality=quality, number=chunk_id, _parse_response=False
            )[1]

            chunk_file = io.BytesIO(response.data)

            chunk_audio, sampling_rate = read_audio_pcm(chunk_file)

            assert chunk_audio.shape[0] / sampling_rate >= data_meta.size / 1000

    @pytest.mark.timeout(
        # This test has to check all the job chunks availability, it can make many requests
        timeout=300
    )
    @parametrize("task", [fixture_ref(fxt_audio_task_from_uploaded_data)])
    @parametrize("indexing", ["absolute", "relative"])
    def test_can_get_job_chunks(self, task: Task, indexing: str):
        jobs = sorted(task.get_jobs(), key=lambda j: j.start_frame)

        assert len(jobs) == 1  # only 1 job is allowed per task so far

        for job in jobs:
            job_meta = job.get_meta()

            assert job.data_chunk_size == job.frame_count
            assert job.data_compressed_chunk_type == "audio_mp3"
            assert job.data_original_chunk_type == "audio_mp3"

        for quality, chunk_id in product(
            ["original", "compressed"],
            range(math.ceil((job_meta.stop_frame - job_meta.start_frame) / job_meta.chunk_size)),
        ):
            response = job.api.retrieve_data(
                job.id,
                type="chunk",
                quality=quality,
                **({"number": chunk_id} if indexing == "absolute" else {"index": chunk_id}),
                _parse_response=False,
            )[1]

            chunk_file = io.BytesIO(response.data)

            chunk_audio, sampling_rate = read_audio_pcm(chunk_file)

            assert chunk_audio.shape[0] / sampling_rate >= job_meta.size / 1000

    @parametrize("task", [fixture_ref(fxt_audio_task_from_uploaded_data)])
    def test_can_create_gt_job(self, task: Task):
        gt_job = self.client.jobs.api.create(
            job_write_request=models.JobWriteRequest(type="ground_truth", task_id=task.id)
        )[0]

        assert gt_job.type == "ground_truth"
        assert gt_job.frame_count == task.size

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_can_create_task_with_gt_job(self, fxt_test_name: str, source_filename: Path):
        task = self.client.tasks.create_from_data(
            spec={
                "name": fxt_test_name,
            },
            resources=[source_filename],
            data_params={"validation_params": {"mode": "gt"}},
        )

        gt_job = next(j for j in task.get_jobs() if j.type == "ground_truth")

        assert gt_job.type == "ground_truth"
        assert gt_job.frame_count == task.size

    @parametrize("task", [fixture_ref(fxt_audio_task_from_uploaded_data)])
    def test_cant_export_dataset(self, task: Task):
        with pytest.raises(BackgroundRequestException) as capture:
            task.export_dataset("Generic TSV 1.0", filename=self.tmp_dir, include_images=True)

        assert "export as dataset is not supported for audio" in str(capture.value)

    @parametrize("task", [fixture_ref(fxt_audio_task_from_uploaded_data)])
    def test_cant_import_dataset(self, task: Task, fxt_test_name: str):
        project = self.client.projects.create({"name": fxt_test_name})

        temp_file = self.tmp_dir / "test.tsv"
        temp_file.write_text("test")

        with pytest.raises(BackgroundRequestException) as capture:
            project.import_dataset("Generic TSV 1.0", filename=temp_file)

        assert "import from dataset is not supported for audio" in str(capture.value)


class TestAudioAnnotations:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        restore_db_per_function,
        admin_user: str,
    ):
        self.user = admin_user

        with make_sdk_client(self.user) as client:
            self.client = client
            yield

    @parametrize("instance_type", ["task", "job"])
    def test_can_save_intervals(self, tasks, instance_type: str):
        task_id = next(t for t in tasks if t["media_type"] == "audio")["id"]

        task = self.client.tasks.retrieve(task_id)
        task.update({"labels": [{"name": "test", "type": "interval"}]})
        label = task.get_labels()[-1]

        payload = models.LabeledDataRequest(
            intervals=[
                models.LabeledIntervalRequest(
                    label_id=label.id,
                    start=0,
                    stop=task.size - 1,
                ),
            ]
        )

        if instance_type == "task":
            instance = task
        elif instance_type == "job":
            instance = task.get_jobs()[0]
        else:
            assert False, instance_type

        instance.set_annotations(payload)

        server_annotations = instance.get_annotations()

        assert len(server_annotations.intervals) == 1
        assert server_annotations.intervals[0].label_id == payload.intervals[0].label_id
        assert server_annotations.intervals[0].start == payload.intervals[0].start
        assert server_annotations.intervals[0].stop == payload.intervals[0].stop

    @parametrize("instance_type", ["task", "job"])
    def test_can_save_interval_with_null_stop(self, tasks, instance_type: str):
        task_id = next(t for t in tasks if t["media_type"] == "audio")["id"]

        task = self.client.tasks.retrieve(task_id)
        task.update({"labels": [{"name": "test", "type": "interval"}]})
        label = task.get_labels()[-1]

        payload = models.LabeledDataRequest(
            intervals=[
                models.LabeledIntervalRequest(
                    label_id=label.id,
                    start=0,
                    stop=None,
                ),
            ]
        )

        if instance_type == "task":
            instance = task
        elif instance_type == "job":
            instance = task.get_jobs()[0]
        else:
            assert False, instance_type

        instance.set_annotations(payload)

        server_annotations = instance.get_annotations()

        assert len(server_annotations.intervals) == 1
        assert server_annotations.intervals[0].label_id == payload.intervals[0].label_id
        assert server_annotations.intervals[0].start == payload.intervals[0].start
        assert server_annotations.intervals[0].stop is None

    @parametrize("instance_type", ["task", "job"])
    def test_cant_save_intervals_outside_range(self, tasks, instance_type: str):
        task_id = next(t for t in tasks if t["media_type"] == "audio")["id"]

        task = self.client.tasks.retrieve(task_id)
        labels = task.get_labels()

        payload = models.LabeledDataRequest(
            intervals=[
                models.LabeledIntervalRequest(
                    label_id=labels[0].id,
                    start=0,
                    stop=task.size,
                ),
            ]
        )

        if instance_type == "task":
            instance = task
        elif instance_type == "job":
            instance = task.get_jobs()[0]
        else:
            assert False, instance_type

        with pytest.raises(exceptions.ApiException) as capture:
            instance.set_annotations(payload)

        assert "cannot be outside" in str(capture.value)
