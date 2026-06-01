# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import math
from collections.abc import Generator, Sequence
from itertools import product
from pathlib import Path, PurePosixPath

import pytest
from cvat_sdk import exceptions, models
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


def _expected_substitutions_hash(substitutions: list[dict]) -> str:
    """Mirror of models.compute_substitutions_hash for test assertions."""
    import hashlib
    import json

    if not substitutions:
        return ""

    canonical = [
        {
            "pattern": e.get("pattern", ""),
            "replacement": e.get("replacement", ""),
            "anchored": bool(e.get("anchored", False)),
        }
        for e in substitutions
    ]
    payload = json.dumps(canonical, ensure_ascii=False, separators=(",", ":"))
    return hashlib.md5(payload.encode("utf-8"), usedforsecurity=False).hexdigest()


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

    def compute_report_and_summary(self, task_id: int) -> tuple[dict, dict]:
        """Compute a report and return (full blob, curated API summary)."""

        response = self.client.api_client.quality_api.create_report(
            quality_report_create_request=models.QualityReportCreateRequest(task_id=task_id),
            _parse_response=False,
        )[1]
        rq_id = response.json()["rq_id"]
        response = self.client.wait_for_completion(rq_id, status_check_period=0.1)[1]
        report_id = response.json()["result_id"]
        blob = self.client.api_client.quality_api.retrieve_report_data(report_id)[1].json()
        summary = self.client.api_client.quality_api.retrieve_report(
            report_id, _parse_response=False
        )[1].json()["summary"]
        return blob, summary

    def _make_transcription_task(
        self, name: str, source_filename: Path, *, attr_names: Sequence[str] = ("transcription",)
    ):
        """Audio task with one label carrying the given text attributes.

        Returns (task, gt_job, label, attrs) where `attrs` maps attribute name
        → spec object."""
        task = self.client.tasks.create_from_data(
            spec={
                "name": name,
                "labels": [
                    {
                        "name": "speaker1",
                        "attributes": [
                            {"name": n, "input_type": "text", "values": [], "mutable": True}
                            for n in attr_names
                        ],
                    },
                ],
            },
            resources=[source_filename],
            data_params={"validation_params": {"mode": "gt"}},
        )
        gt_job = next(j for j in task.get_jobs() if j.type == "ground_truth")
        label = task.get_labels()[0]
        attrs = {a.name: a for a in label.attributes}
        return task, gt_job, label, attrs

    def _set_transcription_requirement(self, task: Task, **requirement_kwargs):
        settings = self.client.api_client.quality_api.list_settings(task_id=task.id)[0].results[0]
        return self.client.api_client.quality_api.partial_update_settings(
            settings.id,
            patched_quality_settings_request=models.PatchedQualitySettingsRequest(
                transcription_requirements=[
                    models.PatchedTranscriptionRequirementRequest(**requirement_kwargs)
                ]
            ),
        )

    @staticmethod
    def _interval(label, start: int, stop: int, attr_text: dict | None = None):
        """`attr_text` maps attribute spec id → text value."""
        return models.LabeledIntervalRequest(
            label_id=label.id,
            start=start,
            stop=stop,
            attributes=[
                models.AttributeValRequest(spec_id=spec_id, value=value)
                for spec_id, value in (attr_text or {}).items()
            ],
        )

    def _set_gt_ds(self, task: Task, gt_job: Job, gt_intervals, ds_intervals):
        task.set_annotations(models.LabeledDataRequest(intervals=ds_intervals))
        gt_job.set_annotations(models.LabeledDataRequest(intervals=gt_intervals))
        gt_job.update(dict(stage="acceptance", state="completed"))

    @staticmethod
    def _transcription_summary(report: dict) -> dict:
        return next(
            a
            for a in report["comparison_summary"]["annotation_components"]["attribute"]
            if a["comparator"] == "transcription"
        )

    def _score_single_pair(
        self,
        fxt_test_name: str,
        source_filename: Path,
        *,
        gt_text: str,
        ds_text: str,
        **requirement_kwargs,
    ) -> dict:
        """End-to-end: one interval per side over the same span, scored under a
        single transcription requirement. Returns the report dict."""
        task, gt_job, label, attrs = self._make_transcription_task(fxt_test_name, source_filename)
        attr = attrs["transcription"]
        self._set_transcription_requirement(task, attribute_id=attr.id, **requirement_kwargs)
        self._set_gt_ds(
            task,
            gt_job,
            [self._interval(label, 0, 1000, {attr.id: gt_text})],
            [self._interval(label, 0, 1000, {attr.id: ds_text})],
        )
        return self.compute_report(task.id)

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

        settings = self.client.api_client.quality_api.list_settings(task_id=task.id)[0].results[0]
        self.client.api_client.quality_api.partial_update_settings(
            settings.id,
            patched_quality_settings_request=models.PatchedQualitySettingsRequest(
                iou_threshold=0.1,
            ),
        )

        report = self.compute_report(task.id)

        assert report["comparison_summary"]["conflicts_by_type"] == {"low_overlap": 2}
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
                        granularity="word",
                        grouping_strategy="filter",
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

        transcription_summaries = [
            a
            for a in report["comparison_summary"]["annotation_components"]["attribute"]
            if a["comparator"] == "transcription"
        ]
        assert len(transcription_summaries) == 1
        summary = transcription_summaries[0]
        assert summary["attribute"] == [transcription_attr.name, label.name]
        assert summary["total_count"] == 1
        assert summary["invalid_count"] == 1
        assert summary["valid_count"] == 0
        # "test text" vs "different text": 1 substitution, 1 hit → WER 0.5
        assert summary["substitutions"] == 1
        assert summary["hits"] == 1
        # Cost-weighted rate: error_mass / ref_length = (0.5 * 2) / 2 = 0.5
        assert summary["ref_length"] == 2
        assert summary["error_mass"] == 1.0
        assert summary["error_rate"] == 0.5

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
                        granularity="word",
                        grouping_strategy="filter",
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

    def test_rejects_negative_chunk_threshold(self):
        # metric_threshold has no upper bound (error-rate cost is unbounded),
        # but must be >= 0. The schema bound is enforced client-side.
        with pytest.raises(exceptions.ApiValueError):
            models.PatchedTranscriptionRequirementRequest(
                attribute_id=1,
                metric_threshold=-0.5,
                acceptance_threshold=0.2,
            )

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_rejects_cross_label_grouping_attribute(
        self, fxt_test_name: str, source_filename: Path
    ):
        task = self.client.tasks.create_from_data(
            spec={
                "name": fxt_test_name,
                "labels": [
                    {
                        "name": "speaker1",
                        "attributes": [
                            {
                                "name": "transcription",
                                "input_type": "text",
                                "values": [],
                                "mutable": True,
                            },
                        ],
                    },
                    {
                        "name": "speaker2",
                        "attributes": [
                            {
                                "name": "other_attr",
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

        labels = task.get_labels()
        transcription_attr = next(
            a for label in labels for a in label.attributes if a.name == "transcription"
        )
        other_label_attr = next(
            a for label in labels for a in label.attributes if a.name == "other_attr"
        )

        settings = self.client.api_client.quality_api.list_settings(task_id=task.id)[0].results[0]
        _, response = self.client.api_client.quality_api.partial_update_settings(
            settings.id,
            patched_quality_settings_request=models.PatchedQualitySettingsRequest(
                transcription_requirements=[
                    models.PatchedTranscriptionRequirementRequest(
                        attribute_id=transcription_attr.id,
                        grouping_attribute_id=other_label_attr.id,
                        acceptance_threshold=0.2,
                    )
                ]
            ),
            _check_status=False,
            _parse_response=False,
        )
        assert response.status == 400
        assert b"same label" in response.data

    def _make_task_with_transcription_attr(self, fxt_test_name: str, source_filename: Path) -> dict:
        """Spin up a minimal audio task with a single text attribute named
        ``transcription``. Returns the attribute spec dict plus its parent
        task id; used by the validation-error tests below."""

        task = self.client.tasks.create_from_data(
            spec={
                "name": fxt_test_name,
                "labels": [
                    {
                        "name": "speaker1",
                        "attributes": [
                            {
                                "name": "transcription",
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
        label = task.get_labels()[0]
        attr = next(a for a in label.attributes if a.name == "transcription")
        return {"id": attr.id, "task_id": task.id}

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_join_strategy_emits_attribute_conflict(
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
                        ],
                    },
                ],
            },
            resources=[source_filename],
            data_params={"validation_params": {"mode": "gt"}},
        )
        gt_job = next(j for j in task.get_jobs() if j.type == "ground_truth")
        label = task.get_labels()[0]
        transcription_attr = next(a for a in label.attributes if a.name == transcription_attr_name)

        settings = self.client.api_client.quality_api.list_settings(task_id=task.id)[0].results[0]
        self.client.api_client.quality_api.partial_update_settings(
            settings.id,
            patched_quality_settings_request=models.PatchedQualitySettingsRequest(
                transcription_requirements=[
                    models.PatchedTranscriptionRequirementRequest(
                        attribute_id=transcription_attr.id,
                        granularity="word",
                        grouping_strategy="join",
                        acceptance_threshold=0.2,
                    )
                ]
            ),
        )

        def interval(start, stop, text):
            return models.LabeledIntervalRequest(
                label_id=label.id,
                start=start,
                stop=stop,
                attributes=[
                    models.AttributeValRequest(spec_id=transcription_attr.id, value=text),
                ],
            )

        # Same time spans on both sides → clean interval matches (no interval
        # conflicts). Joined text differs by one word, so the join group fails.
        gt_annotations = models.LabeledDataRequest(
            intervals=[interval(0, 1000, "hello"), interval(1000, 2000, "world")]
        )
        ds_annotations = models.LabeledDataRequest(
            intervals=[interval(0, 1000, "hello"), interval(1000, 2000, "planet")]
        )
        task.set_annotations(ds_annotations)
        gt_job.set_annotations(gt_annotations)
        gt_job.update(dict(stage="acceptance", state="completed"))

        report = self.compute_report(task.id)

        assert report["comparison_summary"]["conflicts_by_type"] == {
            "mismatching_attributes": 1,
        }

        transcription_summaries = [
            a
            for a in report["comparison_summary"]["annotation_components"]["attribute"]
            if a["comparator"] == "transcription"
        ]
        assert len(transcription_summaries) == 1
        summary = transcription_summaries[0]
        assert summary["total_count"] == 1  # one group comparison
        assert summary["invalid_count"] == 1
        assert summary["substitutions"] == 1  # world → planet
        assert summary["hits"] == 1  # hello
        assert summary["missing_count"] == 0
        assert summary["extra_count"] == 0
        # joined "hello world" vs "hello planet": 1 sub / 2 ref words = 0.5
        assert summary["ref_length"] == 2
        assert summary["error_mass"] == 1.0
        assert summary["error_rate"] == 0.5

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_join_strategy_reports_missing_and_extra_groups(
        self, fxt_test_name: str, source_filename: Path
    ):
        task = self.client.tasks.create_from_data(
            spec={
                "name": fxt_test_name,
                "labels": [
                    {
                        "name": "speaker1",
                        "attributes": [
                            {
                                "name": "transcription",
                                "input_type": "text",
                                "values": [],
                                "mutable": True,
                            },
                            {
                                "name": "speaker_tag",
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
        label = task.get_labels()[0]
        transcription_attr = next(a for a in label.attributes if a.name == "transcription")
        grouping_attr = next(a for a in label.attributes if a.name == "speaker_tag")

        settings = self.client.api_client.quality_api.list_settings(task_id=task.id)[0].results[0]
        self.client.api_client.quality_api.partial_update_settings(
            settings.id,
            patched_quality_settings_request=models.PatchedQualitySettingsRequest(
                # Disable plain attribute comparison so the differing
                # `speaker_tag` values don't add a mismatching_attributes
                # conflict on top of the missing / extra group conflicts.
                compare_attributes=False,
                transcription_requirements=[
                    models.PatchedTranscriptionRequirementRequest(
                        attribute_id=transcription_attr.id,
                        granularity="word",
                        grouping_strategy="join",
                        grouping_attribute_id=grouping_attr.id,
                        acceptance_threshold=0.2,
                    )
                ],
            ),
        )

        def interval(speaker, text):
            return models.LabeledIntervalRequest(
                label_id=label.id,
                start=0,
                stop=1000,
                attributes=[
                    models.AttributeValRequest(spec_id=transcription_attr.id, value=text),
                    models.AttributeValRequest(spec_id=grouping_attr.id, value=speaker),
                ],
            )

        # GT group key "A" and DS group key "B" share no key → one missing
        # (GT-only) group and one extra (DS-only) group.
        gt_annotations = models.LabeledDataRequest(intervals=[interval("A", "hello")])
        ds_annotations = models.LabeledDataRequest(intervals=[interval("B", "hello")])
        task.set_annotations(ds_annotations)
        gt_job.set_annotations(gt_annotations)
        gt_job.update(dict(stage="acceptance", state="completed"))

        report = self.compute_report(task.id)

        assert report["comparison_summary"]["conflicts_by_type"] == {
            "missing_annotation": 1,
            "extra_annotation": 1,
        }

        summary = next(
            a
            for a in report["comparison_summary"]["annotation_components"]["attribute"]
            if a["comparator"] == "transcription"
        )
        assert summary["total_count"] == 0  # no shared group scored
        assert summary["missing_count"] == 1
        assert summary["extra_count"] == 1
        # No scored group → no error mass / reference length.
        assert summary["ref_length"] == 0
        assert summary["error_mass"] == 0.0
        assert summary["error_rate"] == 0.0

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_soft_metric_scores_near_match_below_one(
        self, fxt_test_name: str, source_filename: Path
    ):
        # "color" vs "colour": one word, 1 char edit / max-len 6 = 0.167 under
        # normalized-lev. Equality would score this a full 1.0 substitution.
        report = self._score_single_pair(
            fxt_test_name,
            source_filename,
            gt_text="color",
            ds_text="colour",
            granularity="word",
            grouping_strategy="filter",
            metric="normalized-lev",
            acceptance_threshold=0.5,
        )

        assert report["comparison_summary"]["conflicts_by_type"] == {}
        summary = self._transcription_summary(report)
        assert summary["valid_count"] == 1
        assert summary["invalid_count"] == 0
        assert summary["ref_length"] == 1
        assert summary["error_rate"] == pytest.approx(1 / 6, abs=1e-4)

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_metric_threshold_binarizes_soft_cost(self, fxt_test_name: str, source_filename: Path):
        # Same near-match, but metric_threshold rounds the per-chunk cost:
        # 0.167 <= 0.5 → 0, so the soft cost collapses to zero error.
        report = self._score_single_pair(
            fxt_test_name,
            source_filename,
            gt_text="color",
            ds_text="colour",
            granularity="word",
            grouping_strategy="filter",
            metric="normalized-lev",
            metric_threshold=0.5,
            acceptance_threshold=0.5,
        )

        summary = self._transcription_summary(report)
        assert summary["error_mass"] == 0.0
        assert summary["error_rate"] == 0.0
        assert summary["valid_count"] == 1

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_character_granularity_reports_cer(self, fxt_test_name: str, source_filename: Path):
        # "cat" vs "cot": 1 char substitution / 3 ref chars = 0.333 CER.
        report = self._score_single_pair(
            fxt_test_name,
            source_filename,
            gt_text="cat",
            ds_text="cot",
            granularity="character",
            grouping_strategy="filter",
            acceptance_threshold=0.5,
        )

        summary = self._transcription_summary(report)
        assert summary["ref_length"] == 3  # characters, not words
        assert summary["error_rate"] == pytest.approx(1 / 3, abs=1e-4)
        assert summary["valid_count"] == 1  # 0.333 < 0.5 acceptance

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_basic_normalizer_folds_case_and_whitespace(
        self, fxt_test_name: str, source_filename: Path
    ):
        # The basic preset casefolds and collapses whitespace, so these match.
        report = self._score_single_pair(
            fxt_test_name,
            source_filename,
            gt_text="Hello   World",
            ds_text="hello world",
            granularity="word",
            grouping_strategy="filter",
            normalizer_preset="basic",
            acceptance_threshold=0.2,
        )

        assert report["comparison_summary"]["conflicts_by_type"] == {}
        summary = self._transcription_summary(report)
        assert summary["error_rate"] == 0.0
        assert summary["valid_count"] == 1

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_corpus_error_rate_aggregates_over_pairs(
        self, fxt_test_name: str, source_filename: Path
    ):
        # Two matched interval pairs; one clean, one with a single word error.
        # Corpus rate is the micro-average: 1 error / 4 ref words = 0.25.
        task, gt_job, label, attrs = self._make_transcription_task(fxt_test_name, source_filename)
        attr = attrs["transcription"]
        self._set_transcription_requirement(
            task,
            attribute_id=attr.id,
            granularity="word",
            grouping_strategy="filter",
            acceptance_threshold=0.6,  # 0.5 per-pair error stays satisfied
        )
        self._set_gt_ds(
            task,
            gt_job,
            [
                self._interval(label, 0, 1000, {attr.id: "alpha beta"}),
                self._interval(label, 1000, 2000, {attr.id: "gamma delta"}),
            ],
            [
                self._interval(label, 0, 1000, {attr.id: "alpha beta"}),
                self._interval(label, 1000, 2000, {attr.id: "gamma omega"}),
            ],
        )

        report = self.compute_report(task.id)

        summary = self._transcription_summary(report)
        assert summary["total_count"] == 2  # two scored pairs
        assert summary["substitutions"] == 1  # delta → omega
        assert summary["hits"] == 3  # alpha, beta, gamma
        assert summary["ref_length"] == 4
        assert summary["error_mass"] == pytest.approx(1.0, abs=1e-4)
        assert summary["error_rate"] == pytest.approx(0.25, abs=1e-4)

        # Headline rate on the component summary: single requirement, so it
        # equals the attribute micro-average — no per-attribute summing needed.
        component = report["comparison_summary"]["annotation_components"]["transcription"]
        assert component["error_rate"] == pytest.approx(0.25, abs=1e-4)
        assert component["ref_length"] == 4
        assert component["substitutions"] == 1

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_summary_exposes_transcription_corpus_rate(
        self, fxt_test_name: str, source_filename: Path
    ):
        # The headline rate must be reachable from the curated API summary
        # (no full-blob download), and pre-aggregated (no manual summing).
        task, gt_job, label, attrs = self._make_transcription_task(fxt_test_name, source_filename)
        attr = attrs["transcription"]
        self._set_transcription_requirement(
            task,
            attribute_id=attr.id,
            granularity="word",
            grouping_strategy="filter",
            acceptance_threshold=0.6,
        )
        self._set_gt_ds(
            task,
            gt_job,
            [self._interval(label, 0, 1000, {attr.id: "hello world"})],
            [self._interval(label, 0, 1000, {attr.id: "hello planet"})],  # 1 sub / 2 words
        )

        blob, summary = self.compute_report_and_summary(task.id)

        assert blob["comparison_summary"]["annotation_components"]["transcription"][
            "error_rate"
        ] == pytest.approx(0.5, abs=1e-4)
        assert summary["transcription_error_rate"] == pytest.approx(0.5, abs=1e-4)

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_summary_omits_transcription_rate_without_requirements(
        self, fxt_test_name: str, source_filename: Path
    ):
        # No transcription requirement → headline is null in the blob and
        # absent from the curated summary.
        task, gt_job, label, attrs = self._make_transcription_task(fxt_test_name, source_filename)
        self._set_gt_ds(
            task,
            gt_job,
            [self._interval(label, 0, 1000)],
            [self._interval(label, 0, 1000)],
        )

        blob, summary = self.compute_report_and_summary(task.id)

        assert blob["comparison_summary"]["annotation_components"].get("transcription") is None
        assert "transcription_error_rate" not in summary

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_boundary_tolerance_relaxes_join_overlap(
        self, fxt_test_name: str, source_filename: Path
    ):
        # Same word in one join group but on intervals that don't overlap
        # (gap of 50). The boundary tolerance should relax the alignment overlap
        # gate so the word still matches.
        task, gt_job, label, attrs = self._make_transcription_task(fxt_test_name, source_filename)
        attr = attrs["transcription"]
        self._set_transcription_requirement(
            task,
            attribute_id=attr.id,
            granularity="word",
            alignment="word",
            grouping_strategy="join",
            acceptance_threshold=0.2,
        )
        self._set_gt_ds(
            task,
            gt_job,
            [self._interval(label, 0, 100, {attr.id: "alpha"})],
            [self._interval(label, 150, 250, {attr.id: "alpha"})],  # 50-unit gap
        )

        settings = self.client.api_client.quality_api.list_settings(task_id=task.id)[0].results[0]

        # No tolerance → intervals don't overlap → the word can't match.
        self.client.api_client.quality_api.partial_update_settings(
            settings.id,
            patched_quality_settings_request=models.PatchedQualitySettingsRequest(
                interval_boundary_tolerance=0,
            ),
        )
        strict = self._transcription_summary(self.compute_report(task.id))
        assert strict["error_rate"] > 0

        # Tolerance (ms) wider than the 50ms gap → intervals overlap → match.
        self.client.api_client.quality_api.partial_update_settings(
            settings.id,
            patched_quality_settings_request=models.PatchedQualitySettingsRequest(
                interval_boundary_tolerance=60,
            ),
        )
        relaxed = self._transcription_summary(self.compute_report(task.id))
        assert relaxed["error_rate"] == 0.0

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_target_metric_transcription_error_rate(
        self, fxt_test_name: str, source_filename: Path
    ):
        # target_metric=transcription_error_rate is a lower-is-better metric whose
        # threshold may exceed 1, and round-trips on the settings.
        task, _, _, attrs = self._make_transcription_task(fxt_test_name, source_filename)
        attr = attrs["transcription"]
        self._set_transcription_requirement(
            task,
            attribute_id=attr.id,
            granularity="word",
            grouping_strategy="filter",
            acceptance_threshold=0.6,
        )

        settings = self.client.api_client.quality_api.list_settings(task_id=task.id)[0].results[0]
        updated, _ = self.client.api_client.quality_api.partial_update_settings(
            settings.id,
            patched_quality_settings_request=models.PatchedQualitySettingsRequest(
                target_metric="transcription_error_rate",
                target_metric_threshold=1.5,  # unbounded above for this metric
            ),
        )
        assert str(updated.target_metric) == "transcription_error_rate"
        assert updated.target_metric_threshold == pytest.approx(1.5)
        # The requirement set earlier must survive the unrelated settings patch.
        assert len(updated.transcription_requirements) == 1

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_rejects_target_metric_threshold_above_one_for_shape_metrics(
        self, fxt_test_name: str, source_filename: Path
    ):
        # A threshold > 1 is only allowed for the unbounded transcription_error_rate.
        task, _, _, _ = self._make_transcription_task(fxt_test_name, source_filename)
        settings = self.client.api_client.quality_api.list_settings(task_id=task.id)[0].results[0]
        _, response = self.client.api_client.quality_api.partial_update_settings(
            settings.id,
            patched_quality_settings_request=models.PatchedQualitySettingsRequest(
                target_metric="accuracy",
                target_metric_threshold=1.5,
            ),
            _parse_response=False,
            _check_status=False,
        )
        assert response.status == 400

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_join_strategy_groups_by_attribute(self, fxt_test_name: str, source_filename: Path):
        # Two speakers; each speaker's intervals join into one group keyed by
        # (label, speaker_tag). GT and DS agree per speaker → two valid groups,
        # no conflicts.
        task, gt_job, label, attrs = self._make_transcription_task(
            fxt_test_name, source_filename, attr_names=("transcription", "speaker_tag")
        )
        text_attr, tag_attr = attrs["transcription"], attrs["speaker_tag"]
        self._set_transcription_requirement(
            task,
            attribute_id=text_attr.id,
            granularity="word",
            grouping_strategy="join",
            grouping_attribute_id=tag_attr.id,
            compare_attributes=False,  # don't score speaker_tag as a plain attr
            acceptance_threshold=0.2,
        )

        def intervals():
            return [
                self._interval(label, 0, 1000, {text_attr.id: "hello", tag_attr.id: "A"}),
                self._interval(label, 1000, 2000, {text_attr.id: "world", tag_attr.id: "A"}),
                self._interval(label, 2000, 3000, {text_attr.id: "good", tag_attr.id: "B"}),
                self._interval(label, 3000, 4000, {text_attr.id: "morning", tag_attr.id: "B"}),
            ]

        self._set_gt_ds(task, gt_job, intervals(), intervals())

        report = self.compute_report(task.id)

        assert report["comparison_summary"]["conflicts_by_type"] == {}
        summary = self._transcription_summary(report)
        assert summary["total_count"] == 2  # one group per speaker
        assert summary["valid_count"] == 2
        assert summary["invalid_count"] == 0
        assert summary["missing_count"] == 0
        assert summary["extra_count"] == 0
        assert summary["error_rate"] == 0.0

    @parametrize("source_filename", [fixture_ref("fxt_local_audio_file_path")])
    def test_report_exposes_requirement_id(self, fxt_test_name: str, source_filename: Path):
        # The transcription attribute summary carries the server id of its
        # requirement, matching the requirement config in the report blob.
        report = self._score_single_pair(
            fxt_test_name,
            source_filename,
            gt_text="hello world",
            ds_text="hello world",
            granularity="word",
            grouping_strategy="filter",
            acceptance_threshold=0.2,
        )
        summary = self._transcription_summary(report)
        param_ids = {r["id"] for r in report["parameters"]["transcription_requirements"]}
        assert summary["requirement_id"] in param_ids
        assert summary["requirement_id"] > 0
