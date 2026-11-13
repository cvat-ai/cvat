# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import math
import sys
import tempfile
import threading
from logging import Logger
from pathlib import Path

import av
import cvat_mp4_h264
import cvat_sdk.datasets as cvatds
import PIL.Image
import pytest
from cvat_sdk import Client, models
from cvat_sdk.core.exceptions import ChunkReaderUnavailableException
from cvat_sdk.core.proxies.annotations import AnnotationUpdateAction
from cvat_sdk.core.proxies.tasks import ResourceType

from shared.utils.helpers import generate_image_files, generate_video_file

from .util import restrict_api_requests


def _decode_with_ffmpeg(chunk: io.BytesIO) -> list[PIL.Image.Image]:
    """
    Decode a video chunk with FFmpeg into RGB images.

    Only the decoding is FFmpeg's: the YUV-to-RGB conversion is cvat_mp4_h264's own, because
    FFmpeg's chroma upsampling differs from it by up to ~120 levels on sharp colour edges.
    """

    images = []
    with av.open(chunk) as container:
        for frame in container.decode(video=0):
            yuv = frame.to_ndarray(format="yuv420p")
            width, height = frame.width, frame.height
            chroma_size = (height // 2, width // 2)
            planes = (
                yuv[:height],
                yuv[height : height + height // 4].reshape(chroma_size),
                yuv[height + height // 4 :].reshape(chroma_size),
            )
            images.append(
                cvat_mp4_h264.VideoFrame(
                    width=width,
                    height=height,
                    planes=tuple(PIL.Image.fromarray(plane) for plane in planes),
                ).to_image()
            )

    return images


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

    @pytest.mark.parametrize("media_download_policy", cvatds.MediaDownloadPolicy)
    def test_iter_samples_with_deleted_frames(
        self, media_download_policy: cvatds.MediaDownloadPolicy
    ):
        deleted_frame_indexes = {1, 3, 8}
        self.task.remove_frames_by_ids(sorted(deleted_frame_indexes))

        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
            load_annotations=False,
            media_download_policy=media_download_policy,
        )

        with dataset.iter_samples() as samples:
            for sample, expected_frame_index in zip(
                samples,
                (index for index in range(len(self.images)) if index not in deleted_frame_indexes),
                strict=True,
            ):
                assert sample.frame_index == expected_frame_index
                assert sample.media.load_image() == PIL.Image.open(
                    self.images[expected_frame_index]
                )

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

    def test_iter_samples_prefetches_and_deletes_finished_chunks(
        self, monkeypatch: pytest.MonkeyPatch
    ):
        # Seed the shared cache first. The iterator below uses a temporary chunk directory,
        # so these files let the test verify that temporary cleanup does not touch cached chunks.
        cvatds.TaskDataset(
            self.client,
            self.task.id,
            load_annotations=False,
            media_download_policy=cvatds.MediaDownloadPolicy.PRELOAD_ALL,
        )

        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
            load_annotations=False,
            media_download_policy=cvatds.MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND,
        )

        observed_temp_dirs = []
        original_temporary_directory = tempfile.TemporaryDirectory

        def recording_temporary_directory(*args, **kwargs):
            temp_dir = original_temporary_directory(*args, **kwargs)
            observed_temp_dirs.append(Path(temp_dir.name))
            return temp_dir

        monkeypatch.setattr(tempfile, "TemporaryDirectory", recording_temporary_directory)

        second_chunk_download_started = threading.Event()
        allow_second_chunk_download = threading.Event()
        cache_manager_class = type(dataset._cache_manager)
        original_ensure_chunk = cache_manager_class.ensure_chunk

        def paused_ensure_chunk(cache_manager, *, task, chunk_index):
            # Pause the background prefetch of chunk #1 into the temporary directory.
            # This keeps chunk #0 readable while proving that chunk #1 is being fetched
            # before callers request it.
            if cache_manager is not dataset._cache_manager and chunk_index == 1:
                second_chunk_download_started.set()
                allow_second_chunk_download.wait()

            return original_ensure_chunk(cache_manager, task=task, chunk_index=chunk_index)

        monkeypatch.setattr(cache_manager_class, "ensure_chunk", paused_ensure_chunk)

        chunk_dir = dataset._cache_manager.chunk_dir(self.task.id)
        assert (chunk_dir / "0.zip").exists()
        assert (chunk_dir / "1.zip").exists()

        with dataset.iter_samples(temporary_chunks=True) as samples:
            # Reading the first chunk should start downloading the next chunk in the background.
            for expected_frame_index in range(3):
                sample = next(samples)
                assert sample.frame_index == expected_frame_index
                assert sample.media.load_image() == PIL.Image.open(
                    self.images[expected_frame_index]
                )

            second_chunk_download_started.wait()
            assert len(observed_temp_dirs) == 1
            temp_dir = observed_temp_dirs[0]
            temp_chunk_dir = next(temp_dir.glob(f"servers/*/tasks/{self.task.id}/chunks"))
            assert (temp_chunk_dir / "0.zip").exists()
            assert not (temp_chunk_dir / "1.zip").exists()
            assert (chunk_dir / "0.zip").exists()
            assert (chunk_dir / "1.zip").exists()

            # Let the background download finish. Advancing into chunk #1 should then delete
            # the temporary copy of chunk #0, while leaving the shared cache untouched.
            allow_second_chunk_download.set()

            fourth_sample = next(samples)

            assert fourth_sample.frame_index == 3
            assert not (temp_chunk_dir / "0.zip").exists()
            assert (chunk_dir / "0.zip").exists()

            for _ in samples:
                pass

        assert not temp_dir.exists()

    def test_iter_samples_works_with_fetch_frames_on_demand(self):
        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
            load_annotations=False,
            media_download_policy=cvatds.MediaDownloadPolicy.FETCH_FRAMES_ON_DEMAND,
        )

        with dataset.iter_samples() as samples:
            for expected_frame_index, sample in zip(range(self.task.size), samples, strict=True):
                assert sample.frame_index == expected_frame_index
                assert sample.media.load_image() == PIL.Image.open(
                    self.images[expected_frame_index]
                )

    def test_iter_samples_rejects_temporary_chunks_with_preload_all(self):
        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
            load_annotations=False,
            media_download_policy=cvatds.MediaDownloadPolicy.PRELOAD_ALL,
        )

        with pytest.raises(AssertionError):
            with dataset.iter_samples(temporary_chunks=True):
                pass

    def _create_video_task(self) -> int:
        video_file = generate_video_file(4)
        video_path = self.tmp_path / video_file.name
        video_path.write_bytes(video_file.getbuffer())

        return self.client.tasks.create_from_data(
            models.TaskWriteRequest(
                "Dataset layer video task",
                labels=[models.PatchedLabelRequest(name="video-object")],
            ),
            resource_type=ResourceType.LOCAL,
            resources=[video_path],
        ).id

    @pytest.mark.parametrize(
        "media_download_policy",
        [
            cvatds.MediaDownloadPolicy.PRELOAD_ALL,
            cvatds.MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND,
        ],
    )
    def test_video_task_without_video_extra_is_rejected_for_chunk_based_media_access(
        self,
        monkeypatch: pytest.MonkeyPatch,
        media_download_policy: cvatds.MediaDownloadPolicy,
    ):
        video_task_id = self._create_video_task()
        monkeypatch.setitem(sys.modules, "cvat_mp4_h264", None)

        with pytest.raises(ChunkReaderUnavailableException, match=r"cvat-sdk\[video\]"):
            cvatds.TaskDataset(
                self.client,
                video_task_id,
                load_annotations=False,
                media_download_policy=media_download_policy,
            )

    def test_video_task_without_video_extra_works_with_fetch_frames_on_demand(
        self, monkeypatch: pytest.MonkeyPatch
    ):
        video_task_id = self._create_video_task()
        monkeypatch.setitem(sys.modules, "cvat_mp4_h264", None)

        dataset = cvatds.TaskDataset(
            self.client,
            video_task_id,
            load_annotations=False,
            media_download_policy=cvatds.MediaDownloadPolicy.FETCH_FRAMES_ON_DEMAND,
        )

        assert len(dataset.samples) == 4

    @pytest.mark.parametrize(
        "media_download_policy",
        [
            cvatds.MediaDownloadPolicy.PRELOAD_ALL,
            cvatds.MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND,
        ],
    )
    def test_iter_samples_keeps_files_when_delete_is_disabled(
        self, media_download_policy: cvatds.MediaDownloadPolicy
    ):
        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
            load_annotations=False,
            media_download_policy=media_download_policy,
        )

        chunk_dir = dataset._cache_manager.chunk_dir(self.task.id)

        with dataset.iter_samples(temporary_chunks=False) as samples:
            for expected_frame_index, sample in zip(range(self.task.size), samples, strict=True):
                assert sample.frame_index == expected_frame_index
                assert sample.media.load_image() == PIL.Image.open(
                    self.images[expected_frame_index]
                )

        assert all((chunk_dir / f"{chunk_index}.zip").exists() for chunk_index in range(4))

    @pytest.mark.parametrize(
        "media_download_policy",
        [
            cvatds.MediaDownloadPolicy.PRELOAD_ALL,
            cvatds.MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND,
        ],
    )
    def test_video_task(self, media_download_policy: cvatds.MediaDownloadPolicy):
        video_task = self.client.tasks.create_from_data(
            models.TaskWriteRequest(
                "Dataset layer video task",
                labels=[models.PatchedLabelRequest(name="car")],
            ),
            resource_type=ResourceType.LOCAL,
            resources=[Path(__file__).parent / "assets" / "video_task" / "video.mp4"],
            # 7 frames give chunks of 3, 3 and 1 frames
            data_params={"chunk_size": 3},
        )

        dataset = cvatds.TaskDataset(
            self.client,
            video_task.id,
            load_annotations=False,
            media_download_policy=media_download_policy,
        )

        # The server encodes the chunks itself, and its output is not reproducible across
        # environments, so the expected frames come from FFmpeg decoding the same chunks.
        expected_images = []
        for chunk_index in range(math.ceil(video_task.size / video_task.data_chunk_size)):
            chunk = io.BytesIO()
            video_task.download_chunk(chunk_index, chunk, quality="original")
            chunk.seek(0)
            expected_images.extend(_decode_with_ffmpeg(chunk=chunk))

        assert len(dataset.samples) == len(expected_images) == video_task.size == 7

        for index, sample in enumerate(dataset.samples):
            assert sample.frame_index == index
            assert sample.media.load_image() == expected_images[index]
