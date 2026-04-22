# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import math
from collections.abc import Generator
from itertools import product
from pathlib import Path, PurePosixPath

import pytest
from cvat_sdk import models
from cvat_sdk.core.exceptions import BackgroundRequestException
from cvat_sdk.core.proxies.jobs import Job
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
                return  # noop, the file should just be a valid default image now

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
        assert task.data_compressed_chunk_type.value == "audio_mp3"
        assert task.data_original_chunk_type.value == "audio_mp3"

        for quality, chunk_id in product(
            ["original", "compressed"],
            range(math.ceil((data_meta.stop_frame - data_meta.start_frame) / data_meta.chunk_size)),
        ):
            response = task.api.retrieve_data(
                task.id, type="chunk", quality=quality, number=chunk_id, _parse_response=False
            )[1]

            start_offset = int(response.headers["X-Media-Offset"])
            chunk_file = io.BytesIO(response.data)

            chunk_audio, sampling_rate = read_audio_pcm(chunk_file, offset_ms=start_offset)

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
            assert job.data_compressed_chunk_type.value == "audio_mp3"
            assert job.data_original_chunk_type.value == "audio_mp3"

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

            start_offset = int(response.headers["X-Media-Offset"])
            chunk_file = io.BytesIO(response.data)

            chunk_audio, sampling_rate = read_audio_pcm(chunk_file, offset_ms=start_offset)

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


@pytest.mark.usefixtures("restore_redis_ondisk_after_class")
@pytest.mark.usefixtures("restore_redis_ondisk_per_class")
@pytest.mark.usefixtures("restore_db_per_class")
@pytest.mark.usefixtures("restore_cvat_data_per_class")
class TestAudioQuality:
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
    def fxt_audio_task_with_gt_job(
        cls, request: pytest.FixtureRequest, admin_user, source_filename: Path
    ):
        with make_sdk_client(admin_user) as client:
            task = client.tasks.create_from_data(
                spec={
                    "name": f"{request.node.name}[{request.fixturename}]",
                    "labels": [
                        {
                            "name": "speaker1",
                        },
                        {
                            "name": "speaker2",
                        },
                    ],
                },
                resources=[source_filename],
                data_params={"validation_params": {"mode": "gt"}},
            )

            gt_job = next(j for j in task.get_jobs() if j.type == "ground_truth")

            yield (task, gt_job)

    def compute_report(self, task_id: int) -> dict:
        response = self.client.api_client.quality_api.create_report(
            quality_report_create_request=models.QualityReportCreateRequest(task_id=task_id),
            _parse_response=False,
        )[1]
        rq_id = response.json()["rq_id"]

        response = self.client.wait_for_completion(rq_id, status_check_period=0.1)[1]

        report_id = response.json()["result_id"]
        return self.client.api_client.quality_api.retrieve_report_data(report_id)[1].json()

    @parametrize("task, gt_job", [fixture_ref(fxt_audio_task_with_gt_job)])
    def test_simple_matching(self, task: Task, gt_job: Job):
        label0, label1 = task.get_labels()

        gt_annotations = models.LabeledDataRequest(
            intervals=[
                models.LabeledIntervalRequest(
                    label_id=label0.id,
                    start=0,
                    stop=1000,
                ),
                models.LabeledIntervalRequest(
                    label_id=label0.id,
                    start=1000,
                    stop=2000,
                ),
                models.LabeledIntervalRequest(
                    label_id=label0.id,
                    start=2000,
                    stop=2500,
                ),
            ]
        )

        ds_annotations = models.LabeledDataRequest(
            intervals=[
                # matches GT annotation 1
                models.LabeledIntervalRequest(
                    label_id=label0.id,
                    start=200,
                    stop=900,
                ),
                # matches GT annotation 2
                models.LabeledIntervalRequest(
                    label_id=label0.id,
                    start=900,
                    stop=1800,
                ),
                # label mismatch
                models.LabeledIntervalRequest(
                    label_id=label1.id,
                    start=2100,
                    stop=2400,
                ),
            ]
        )

        task.set_annotations(ds_annotations)

        gt_job.set_annotations(gt_annotations)
        gt_job.update(dict(stage="acceptance", state="completed"))

        report = self.compute_report(task.id)

        assert report["comparison_summary"]["annotations"]["valid_count"] == 2
        assert report["comparison_summary"]["annotations"]["total_count"] == 3
        assert report["comparison_summary"]["annotations"]["gt_count"] == 3
        assert report["comparison_summary"]["annotations"]["ds_count"] == 3
        assert report["comparison_summary"]["annotation_components"]["shape"]["valid_count"] == 3
        assert report["comparison_summary"]["annotation_components"]["label"]["valid_count"] == 2

    @parametrize("task, gt_job", [fixture_ref(fxt_audio_task_with_gt_job)])
    def test_label_first_matching(self, task: Task, gt_job: Job):
        label0, label1 = task.get_labels()

        gt_annotations = models.LabeledDataRequest(
            intervals=[
                models.LabeledIntervalRequest(
                    label_id=label0.id,
                    start=0,
                    stop=1000,
                ),
                models.LabeledIntervalRequest(
                    label_id=label1.id,
                    start=1000,
                    stop=1500,
                ),
            ]
        )

        ds_annotations = models.LabeledDataRequest(
            intervals=[
                # should match GT annotation 1
                models.LabeledIntervalRequest(
                    label_id=label0.id,
                    start=250,
                    stop=1250,
                ),
                # has better overlap with GT annotation 1 than DS annotation 1
                models.LabeledIntervalRequest(
                    label_id=label1.id,
                    start=0,
                    stop=1250,
                ),
            ]
        )

        task.set_annotations(ds_annotations)

        gt_job.set_annotations(gt_annotations)
        gt_job.update(dict(stage="acceptance", state="completed"))

        report = self.compute_report(task.id)

        assert not report["comparison_summary"]["conflicts_by_type"]
        assert report["comparison_summary"]["annotations"]["valid_count"] == 2
        assert report["comparison_summary"]["annotations"]["total_count"] == 2

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_transcription_matching_affects_overall_matches(
        self, fxt_test_name: str, source_filename: Path
    ):
        transcription_attr_name = "transcription"

        task = self.client.tasks.create_from_data(
            spec={
                "name": fxt_test_name,
                "labels": [
                    {
                        "name": "speaker1",
                        "attributes": [
                            {
                                "name": transcription_attr_name,
                                "input_type": "text",
                                "values": [],
                                "mutable": True,
                            },
                            {
                                "name": "non transcription",
                                "input_type": "text",
                                "values": [],
                                "mutable": True,
                            },
                        ],
                    },
                ],
            },
            resources=[source_filename],
            data_params={"validation_params": {"mode": "gt"}},
        )

        gt_job = next(j for j in task.get_jobs() if j.type == "ground_truth")

        labels = task.get_labels()
        label = labels[0]
        transcription_attr = next(
            a for label in labels for a in label.attributes if a.name == transcription_attr_name
        )

        settings = self.client.api_client.quality_api.list_settings(task_id=task.id)[0].results[0]
        settings = self.client.api_client.quality_api.partial_update_settings(
            settings.id,
            patched_quality_settings_request=models.PatchedQualitySettingsRequest(
                transcription_requirements=[
                    models.PatchedTranscriptionRequirementRequest(
                        attribute_id=transcription_attr.id,
                        metric="wer",
                        acceptance_threshold=0.2,
                    )
                ]
            ),
        )

        gt_annotations = models.LabeledDataRequest(
            intervals=[
                models.LabeledIntervalRequest(
                    label_id=label.id,
                    start=0,
                    stop=1000,
                    attributes=[
                        models.AttributeValRequest(
                            spec_id=transcription_attr.id,
                            value="test text",
                        ),
                    ],
                ),
            ]
        )

        ds_annotations = models.LabeledDataRequest(
            intervals=[
                models.LabeledIntervalRequest(
                    label_id=label.id,
                    start=0,
                    stop=1000,
                    attributes=[
                        models.AttributeValRequest(
                            spec_id=transcription_attr.id,
                            value="different text",
                        ),
                    ],
                ),
            ]
        )

        task.set_annotations(ds_annotations)

        gt_job.set_annotations(gt_annotations)
        gt_job.update(dict(stage="acceptance", state="completed"))

        report = self.compute_report(task.id)

        assert report["comparison_summary"]["conflicts_by_type"] == {
            "mismatching_attributes": 1,
        }
        assert report["comparison_summary"]["annotations"]["valid_count"] == 0
        assert report["comparison_summary"]["annotations"]["total_count"] == 2
        assert report["comparison_summary"]["annotation_components"]["shape"]["valid_count"] == 1
        assert report["comparison_summary"]["annotation_components"]["label"]["valid_count"] == 1
        assert len(report["comparison_summary"]["annotation_components"]["attribute"]) == len(
            label.attributes
        )

        transcription_attr_stats_id, transcription_attr_stats = next(
            (i, a)
            for i, a in enumerate(
                report["comparison_summary"]["annotation_components"]["attribute"]
            )
            if a["attribute"] == [transcription_attr.name, label.name]
        )
        assert transcription_attr_stats["valid_count"] == 0
        assert transcription_attr_stats["invalid_count"] == 1
        assert transcription_attr_stats["total_count"] == 1

        for i, other_attr_stats in enumerate(
            report["comparison_summary"]["annotation_components"]["attribute"]
        ):
            if i == transcription_attr_stats_id:
                continue

            assert other_attr_stats["valid_count"] == 1
            assert other_attr_stats["total_count"] == 1

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_only_transcription_attributes_affect_shape_matching(
        self, fxt_test_name: str, source_filename: Path
    ):
        transcription_attr_name = "transcription"

        task = self.client.tasks.create_from_data(
            spec={
                "name": fxt_test_name,
                "labels": [
                    {
                        "name": "speaker1",
                        "attributes": [
                            {
                                "name": transcription_attr_name,
                                "input_type": "text",
                                "values": [],
                                "mutable": True,
                            },
                            {
                                "name": "non transcription",
                                "input_type": "text",
                                "values": [],
                                "mutable": True,
                            },
                        ],
                    },
                ],
            },
            resources=[source_filename],
            data_params={"validation_params": {"mode": "gt"}},
        )

        gt_job = next(j for j in task.get_jobs() if j.type == "ground_truth")

        labels = task.get_labels()
        label = labels[0]
        transcription_attr = next(
            a for label in labels for a in label.attributes if a.name == transcription_attr_name
        )
        other_attr = next(
            a
            for label in labels
            for a in label.attributes
            if a.input_type.value == "text" and a.id != transcription_attr.id
        )

        settings = self.client.api_client.quality_api.list_settings(task_id=task.id)[0].results[0]
        settings = self.client.api_client.quality_api.partial_update_settings(
            settings.id,
            patched_quality_settings_request=models.PatchedQualitySettingsRequest(
                transcription_requirements=[
                    models.PatchedTranscriptionRequirementRequest(
                        attribute_id=transcription_attr.id,
                        metric="wer",
                        acceptance_threshold=0.2,
                    )
                ]
            ),
        )

        gt_annotations = models.LabeledDataRequest(
            intervals=[
                models.LabeledIntervalRequest(
                    label_id=label.id,
                    start=0,
                    stop=1000,
                    attributes=[
                        models.AttributeValRequest(
                            spec_id=transcription_attr.id,
                            value="test text",
                        ),
                        models.AttributeValRequest(
                            spec_id=other_attr.id,
                            value="test text",
                        ),
                    ],
                ),
            ]
        )

        ds_annotations = models.LabeledDataRequest(
            intervals=[
                models.LabeledIntervalRequest(
                    label_id=label.id,
                    start=0,
                    stop=1000,
                    attributes=[
                        models.AttributeValRequest(
                            spec_id=transcription_attr.id,
                            value="test text",
                        ),
                        models.AttributeValRequest(
                            spec_id=other_attr.id,
                            value="different text",
                        ),
                    ],
                ),
            ]
        )

        task.set_annotations(ds_annotations)

        gt_job.set_annotations(gt_annotations)
        gt_job.update(dict(stage="acceptance", state="completed"))

        report = self.compute_report(task.id)

        assert report["comparison_summary"]["conflicts_by_type"] == {
            "mismatching_attributes": 1,
        }
        assert report["comparison_summary"]["annotations"]["valid_count"] == 1
        assert report["comparison_summary"]["annotations"]["total_count"] == 1
        assert len(report["comparison_summary"]["annotation_components"]["attribute"]) == len(
            label.attributes
        )
        for attr_stats in report["comparison_summary"]["annotation_components"]["attribute"]:
            assert attr_stats["valid_count"] == int(attr_stats["attribute"][0] != other_attr.name)
            assert attr_stats["total_count"] == 1
