# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from collections.abc import Generator
from itertools import product
from pathlib import Path, PurePosixPath

import librosa
import numpy as np
import pytest
from cvat_sdk.core.exceptions import BackgroundRequestException
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from PIL import Image
from pytest_cases import fixture, fixture_ref, parametrize

import shared.utils.s3 as s3
from rest_api._test_base import TestTasksBase
from shared.utils.config import (
    SHARE_DIR,
    make_sdk_client,
)


def read_audio_pcm(
    f: Path | io.IOBase, *, offset_ms: int = 0, rate: int = 8000
) -> tuple[np.ndarray, float]:
    return librosa.load(f, mono=True, sr=rate, offset=offset_ms / 1000)


@fixture(scope="session")
def fxt_local_audio_file_path() -> Generator[Path, None, None]:
    yield SHARE_DIR / "audio" / "sample1.mp3"


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
    @parametrize("source_filename", [fixture_ref(fxt_local_audio_file_path)], scope="session")
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
        assert task.media_type.value == "audio"
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

        assert task.media_type.value == "audio"
        assert task.dimension == "1d"
        assert task.mode == "interpolation"
        assert task.size > 0
        assert task.data_cloud_storage_id == cloud_storage_id

    @parametrize(
        "source_path, cover_image_path",
        [
            (fixture_ref(fxt_local_audio_file_path), None),
            fixture_ref(fxt_local_audio_with_cover),
        ],
    )
    def test_can_use_cover_image_for_preview(self, fxt_test_name, source_path, cover_image_path):
        task = self.client.tasks.create_from_data(
            spec={"name": fxt_test_name},
            resources=[source_path],
        )

        actual = Image.open(task.get_preview())

        if cover_image_path is None:
            return  # noop, the file should just be a valid default image now

        expected = Image.open(cover_image_path)
        expected.thumbnail((256, 256))

        TestTasksBase._compare_images(expected, actual, must_be_identical=False)

    @parametrize("task", [fixture_ref(fxt_audio_task_from_uploaded_data)])
    def test_can_split_into_jobs(self, task: Task):
        # Only 1 job is allowed for audio data
        assert task.jobs.count == 1

    @parametrize("source_filename", [fixture_ref(fxt_local_audio_file_path)])
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
        assert task.data_compressed_chunk_type.value == "audio_mp3"
        assert task.data_original_chunk_type.value == "audio_mp3"

        for quality, (chunk_id, chunk_frame_range) in product(
            ["original", "compressed"],
            [(data_meta.start_frame, data_meta.stop_frame)],
        ):
            response = task.api.retrieve_data(
                task.id, type="chunk", quality=quality, number=chunk_id, _parse_response=False
            )[1]

            start_offset = int(response.headers["X-Media-Offset"])
            chunk_file = io.BytesIO(response.data)

            chunk_audio, sampling_rate = read_audio_pcm(chunk_file, offset_ms=start_offset)

            assert chunk_audio.shape[0] / sampling_rate >= data_meta.size / 1000

    # def test_can_get_job_chunks(self):
    # def test_can_get_task_preview(self):
    # def test_can_get_job_previews(self):
