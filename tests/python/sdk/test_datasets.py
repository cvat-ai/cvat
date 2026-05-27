# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import threading
from logging import Logger
from pathlib import Path

import cvat_sdk.datasets as cvatds
import PIL.Image
import pytest
from cvat_sdk import Client, models
from cvat_sdk.core.proxies.annotations import AnnotationUpdateAction
from cvat_sdk.core.proxies.tasks import ResourceType

from shared.utils.helpers import generate_image_files, generate_video_file

from .util import restrict_api_requests


@pytest.fixture(autouse=True)
def _common_setup(
    tmp_path: Path,
    fxt_login: tuple[Client, str],
    fxt_logger: tuple[Logger, io.StringIO],
    restore_redis_ondisk_per_function,
    restore_redis_inmem_per_function,
):
    logger = fxt_logger[0]
    client = fxt_login[0]
    client.logger = logger
    client.config.cache_dir = tmp_path / "cache"

    api_client = client.api_client
    for k in api_client.configuration.logger:
        api_client.configuration.logger[k] = logger


class TestTaskDataset:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        tmp_path: Path,
        fxt_login: tuple[Client, str],
    ):
        self.client = fxt_login[0]
        self.tmp_path = tmp_path
        self.images = generate_image_files(10)

        image_dir = tmp_path / "images"
        image_dir.mkdir()

        image_paths = []
        for image in self.images:
            image_path = image_dir / image.name
            image_path.write_bytes(image.getbuffer())
            image_paths.append(image_path)

        self.image_paths = image_paths
        self.task = self.client.tasks.create_from_data(
            models.TaskWriteRequest(
                "Dataset layer test task",
                labels=[
                    models.PatchedLabelRequest(name="person"),
                    models.PatchedLabelRequest(name="car"),
                ],
            ),
            resource_type=ResourceType.LOCAL,
            resources=image_paths,
            data_params={"chunk_size": 3},
        )

        self.expected_labels = sorted(self.task.get_labels(), key=lambda l: l.id)

        self.task.update_annotations(
            models.PatchedLabeledDataRequest(
                tags=[
                    models.LabeledImageRequest(frame=8, label_id=self.expected_labels[0].id),
                    models.LabeledImageRequest(frame=8, label_id=self.expected_labels[1].id),
                ],
                shapes=[
                    models.LabeledShapeRequest(
                        frame=6,
                        label_id=self.expected_labels[1].id,
                        type=models.ShapeType("rectangle"),
                        points=[1.0, 2.0, 3.0, 4.0],
                    ),
                ],
            ),
            action=AnnotationUpdateAction.CREATE,
        )

    @pytest.mark.parametrize("media_download_policy", cvatds.MediaDownloadPolicy)
    def test_basic(self, media_download_policy: cvatds.MediaDownloadPolicy):
        dataset = cvatds.TaskDataset(
            self.client, self.task.id, media_download_policy=media_download_policy
        )

        # verify that the cache is not empty
        assert list(self.client.config.cache_dir.iterdir())

        for expected_label, actual_label in zip(
            self.expected_labels, sorted(dataset.labels, key=lambda l: l.id)
        ):
            assert expected_label.id == actual_label.id
            assert expected_label.name == actual_label.name

        assert len(dataset.samples) == self.task.size

        for index, sample in enumerate(dataset.samples):
            assert sample.frame_index == index
            assert sample.frame_name == self.images[index].name

            actual_image = sample.media.load_image()
            expected_image = PIL.Image.open(self.images[index])

            assert actual_image == expected_image

        assert not dataset.samples[0].annotations.tags
        assert not dataset.samples[1].annotations.shapes

        assert {tag.label_id for tag in dataset.samples[8].annotations.tags} == {
            label.id for label in self.expected_labels
        }
        assert not dataset.samples[8].annotations.shapes

        assert not dataset.samples[6].annotations.tags
        assert len(dataset.samples[6].annotations.shapes) == 1
        assert dataset.samples[6].annotations.shapes[0].type.value == "rectangle"
        assert dataset.samples[6].annotations.shapes[0].points == [1.0, 2.0, 3.0, 4.0]

    @pytest.mark.parametrize("media_download_policy", cvatds.MediaDownloadPolicy)
    def test_deleted_frame(self, media_download_policy: cvatds.MediaDownloadPolicy):
        self.task.remove_frames_by_ids([1])

        dataset = cvatds.TaskDataset(
            self.client, self.task.id, media_download_policy=media_download_policy
        )

        assert len(dataset.samples) == self.task.size - 1

        # sample #0 is still frame #0
        assert dataset.samples[0].frame_index == 0
        assert dataset.samples[0].media.load_image() == PIL.Image.open(self.images[0])

        # sample #1 is now frame #2
        assert dataset.samples[1].frame_index == 2
        assert dataset.samples[1].media.load_image() == PIL.Image.open(self.images[2])

        # sample #5 is now frame #6
        assert dataset.samples[5].frame_index == 6
        assert dataset.samples[5].media.load_image() == PIL.Image.open(self.images[6])
        assert len(dataset.samples[5].annotations.shapes) == 1

    def test_offline(self, monkeypatch: pytest.MonkeyPatch):
        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
            update_policy=cvatds.UpdatePolicy.IF_MISSING_OR_STALE,
        )

        fresh_samples = list(dataset.samples)

        restrict_api_requests(monkeypatch)

        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
            update_policy=cvatds.UpdatePolicy.NEVER,
        )

        cached_samples = list(dataset.samples)

        for fresh_sample, cached_sample in zip(fresh_samples, cached_samples):
            assert fresh_sample.frame_index == cached_sample.frame_index
            assert fresh_sample.annotations == cached_sample.annotations
            assert fresh_sample.media.load_image() == cached_sample.media.load_image()

    def test_update(self, monkeypatch: pytest.MonkeyPatch):
        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
        )

        # Recreating the dataset should only result in minimal requests.
        restrict_api_requests(
            monkeypatch, allow_paths={f"/api/tasks/{self.task.id}", "/api/labels"}
        )

        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
        )

        assert dataset.samples[6].annotations.shapes[0].label_id == self.expected_labels[1].id

        # After an update, the annotations should be redownloaded.
        monkeypatch.undo()

        self.task.update_annotations(
            models.PatchedLabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        id=dataset.samples[6].annotations.shapes[0].id,
                        frame=6,
                        label_id=self.expected_labels[0].id,
                        type=models.ShapeType("rectangle"),
                        points=[1.0, 2.0, 3.0, 4.0],
                    ),
                ]
            )
        )

        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
        )

        assert dataset.samples[6].annotations.shapes[0].label_id == self.expected_labels[0].id

    def test_no_annotations(self):
        dataset = cvatds.TaskDataset(self.client, self.task.id, load_annotations=False)

        for index, sample in enumerate(dataset.samples):
            assert sample.frame_index == index
            assert sample.frame_name == self.images[index].name

            actual_image = sample.media.load_image()
            expected_image = PIL.Image.open(self.images[index])

            assert actual_image == expected_image

            assert sample.annotations is None

    def test_iter_sample_chunks_prefetches_and_deletes_finished_chunks(
        self, monkeypatch: pytest.MonkeyPatch
    ):
        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
            load_annotations=False,
            media_download_policy=cvatds.MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND,
        )

        second_chunk_download_started = threading.Event()
        allow_second_chunk_download = threading.Event()
        original_ensure_chunk = dataset._cache_manager.ensure_chunk

        def wrapped_ensure_chunk(task, chunk_index):
            if chunk_index == 1:
                second_chunk_download_started.set()
                assert allow_second_chunk_download.wait(timeout=5)

            return original_ensure_chunk(task, chunk_index)

        monkeypatch.setattr(dataset._cache_manager, "ensure_chunk", wrapped_ensure_chunk)

        chunk_dir = dataset._cache_manager.chunk_dir(self.task.id)
        chunk_iterator = iter(dataset.iter_sample_chunks(delete_finished_chunks=True))

        first_chunk_samples = next(chunk_iterator)

        assert [sample.frame_index for sample in first_chunk_samples] == [0, 1, 2]
        assert second_chunk_download_started.wait(timeout=5)
        assert (chunk_dir / "0.zip").exists()
        assert not (chunk_dir / "1.zip").exists()

        for sample in first_chunk_samples:
            assert sample.media.load_image() == PIL.Image.open(self.images[sample.frame_index])

        allow_second_chunk_download.set()

        second_chunk_samples = next(chunk_iterator)

        assert [sample.frame_index for sample in second_chunk_samples] == [3, 4, 5]
        assert not (chunk_dir / "0.zip").exists()

        for _ in chunk_iterator:
            pass

    def test_iter_sample_chunks_rejects_fetch_frames_on_demand(self):
        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
            load_annotations=False,
            media_download_policy=cvatds.MediaDownloadPolicy.FETCH_FRAMES_ON_DEMAND,
        )

        with pytest.raises(
            cvatds.UnsupportedDatasetError,
            match="iter_sample_chunks is not supported with FETCH_FRAMES_ON_DEMAND",
        ):
            list(dataset.iter_sample_chunks())

    def test_video_task_is_unsupported_for_chunked_media_access(self):
        video_file = generate_video_file(4)
        video_path = self.tmp_path / video_file.name
        video_path.write_bytes(video_file.getbuffer())

        video_task = self.client.tasks.create_from_data(
            models.TaskWriteRequest(
                "Dataset layer video task",
                labels=[models.PatchedLabelRequest(name="video-object")],
            ),
            resource_type=ResourceType.LOCAL,
            resources=[video_path],
        )

        with pytest.raises(
            cvatds.UnsupportedDatasetError,
            match="Chunk-based media access is only supported for tasks with image chunks",
        ):
            cvatds.TaskDataset(
                self.client,
                video_task.id,
                load_annotations=False,
                media_download_policy=cvatds.MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND,
            )

    def test_iter_sample_chunks_keeps_files_when_delete_is_disabled(self):
        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
            load_annotations=False,
            media_download_policy=cvatds.MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND,
        )

        chunk_dir = dataset._cache_manager.chunk_dir(self.task.id)

        sample_chunks = list(dataset.iter_sample_chunks(delete_finished_chunks=False))

        assert [len(chunk_samples) for chunk_samples in sample_chunks] == [3, 3, 3, 1]
        assert all((chunk_dir / f"{chunk_index}.zip").exists() for chunk_index in range(4))

    def test_iter_sample_chunks_yields_single_chunk(self):
        single_chunk_task = self.client.tasks.create_from_data(
            models.TaskWriteRequest(
                "Dataset layer single chunk task",
                labels=[
                    models.PatchedLabelRequest(name="person"),
                ],
            ),
            resource_type=ResourceType.LOCAL,
            resources=self.image_paths,
            data_params={"chunk_size": len(self.image_paths)},
        )

        dataset = cvatds.TaskDataset(
            self.client,
            single_chunk_task.id,
            load_annotations=False,
            media_download_policy=cvatds.MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND,
        )

        sample_chunks = list(dataset.iter_sample_chunks())

        assert len(sample_chunks) == 1
        assert [sample.frame_index for sample in sample_chunks[0]] == list(
            range(len(self.image_paths))
        )
