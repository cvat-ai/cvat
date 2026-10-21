# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import os
from collections.abc import Iterator
from logging import Logger
from pathlib import Path
from types import SimpleNamespace

import av
import av.video.reformatter
import PIL.Image
import PIL.ImageChops
import PIL.ImageStat
import pytest
from shared.utils.config import SHARE_DIR

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.datasets as cvatds
import cvat_video_openh264 as video
from cvat_sdk import Client, models
from cvat_sdk.core.proxies.annotations import AnnotationUpdateAction
from cvat_sdk.core.proxies.tasks import ResourceType, Task

_FRAME_VALUES = (16, 48, 80, 112, 144, 176, 208)
_DELETED_FRAME_INDEXES = (1, 4)
_ACTIVE_FRAME_INDEXES = (0, 2, 3, 5, 6)
_H264_HIGH_PROFILE_VIDEO_PATH = SHARE_DIR / "videos" / "h264_high_profile.mp4"
_H264_HIGH_PROFILE_FRAME_COUNT = 121
_H264_HIGH_PROFILE_FRAME_INDEXES = (0, 60, 120)
_H264_HIGH_PROFILE_FRAME_SIZE = (864, 496)

pytestmark = pytest.mark.timeout(60)


def _write_source_video(path: Path) -> None:
    with av.open(path, "w") as container:
        stream = container.add_stream("mjpeg", rate=25)
        stream.width = 100
        stream.height = 50
        stream.color_range = av.video.reformatter.ColorRange.JPEG

        for frame_value in _FRAME_VALUES:
            image = PIL.Image.new("RGB", (stream.width, stream.height), (frame_value,) * 3)
            for packet in stream.encode(av.VideoFrame.from_image(image)):
                container.mux(packet)

        for packet in stream.encode():
            container.mux(packet)


def _pyav_openh264_candidates() -> Iterator[Path]:
    av_package_dir = Path(av.__file__).resolve().parent
    search_dirs = (
        av_package_dir / ".dylibs",
        av_package_dir.parent / "av.libs",
        av_package_dir,
    )
    seen = set()

    for search_dir in search_dirs:
        if not search_dir.is_dir():
            continue

        for pattern in ("libopenh264*", "openh264*"):
            for candidate in sorted(search_dir.glob(pattern)):
                if candidate.is_file() and candidate not in seen:
                    seen.add(candidate)
                    yield candidate


@pytest.fixture
def fxt_openh264_library(monkeypatch: pytest.MonkeyPatch) -> str:
    explicit_library = os.environ.get("CVAT_OPENH264_LIBRARY")
    if explicit_library:
        decoder_info = video.resolve_decoder(library_path=explicit_library)
        return decoder_info.library_path

    try:
        decoder_info = video.resolve_decoder()
    except video.DecoderUnavailableError:
        pass
    else:
        monkeypatch.setenv("CVAT_OPENH264_LIBRARY", decoder_info.library_path)
        return decoder_info.library_path

    for candidate in _pyav_openh264_candidates():
        try:
            decoder_info = video.resolve_decoder(library_path=candidate)
        except video.DecoderUnavailableError:
            continue

        monkeypatch.setenv("CVAT_OPENH264_LIBRARY", decoder_info.library_path)
        return decoder_info.library_path

    pytest.skip(
        "requires OpenH264 via CVAT_OPENH264_LIBRARY, the system loader, "
        "or the test runtime's PyAV bundle"
    )


@pytest.fixture(autouse=True)
def _common_setup(
    tmp_path: Path,
    fxt_login: tuple[Client, str],
    fxt_logger: tuple[Logger, io.StringIO],
    fxt_openh264_library: str,
    restore_redis_ondisk_per_function,
    restore_redis_inmem_per_function,
) -> None:
    del fxt_openh264_library

    logger = fxt_logger[0]
    client = fxt_login[0]
    client.logger = logger
    client.config.cache_dir = tmp_path / "cache"

    for api_logger_name in client.api_client.configuration.logger:
        client.api_client.configuration.logger[api_logger_name] = logger


@pytest.fixture
def fxt_video_task(
    tmp_path: Path,
    fxt_login: tuple[Client, str],
) -> tuple[Client, Task]:
    video_path = tmp_path / "video.mkv"
    _write_source_video(video_path)

    client = fxt_login[0]
    task = client.tasks.create_from_data(
        models.TaskWriteRequest(
            "SDK video chunk E2E test task",
            labels=[models.PatchedLabelRequest(name="video-object")],
        ),
        resource_type=ResourceType.LOCAL,
        resources=[video_path],
        data_params={"chunk_size": 3},
    )
    task.remove_frames_by_ids(list(_DELETED_FRAME_INDEXES))

    assert task.data_original_chunk_type == "video"
    assert task.data_chunk_size == 3
    return client, task


def _load_server_frame(task: Task, frame_index: int) -> PIL.Image.Image:
    image = PIL.Image.open(task.get_frame(frame_index, quality="original"))
    image.load()
    return image.convert("RGB")


def _assert_images_close(
    actual: PIL.Image.Image,
    expected: PIL.Image.Image,
    *,
    max_mean_difference: float = 6,
) -> None:
    assert actual.mode == "RGB"
    assert actual.size == expected.size

    difference = PIL.ImageChops.difference(actual, expected)
    assert max(PIL.ImageStat.Stat(difference).mean) < max_mean_difference


def test_task_dataset_decodes_server_video_chunks_end_to_end(
    fxt_video_task: tuple[Client, Task],
) -> None:
    client, task = fxt_video_task
    dataset = cvatds.TaskDataset(
        client,
        task.id,
        load_annotations=False,
        media_download_policy=cvatds.MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND,
    )

    assert [sample.frame_index for sample in dataset.samples] == list(_ACTIVE_FRAME_INDEXES)
    assert not list(dataset._chunk_dir.iterdir())

    previous_media = None
    with dataset.iter_samples() as samples:
        for expected_frame_index in _ACTIVE_FRAME_INDEXES:
            sample = next(samples)

            if previous_media is not None:
                with pytest.raises(RuntimeError, match="released"):
                    previous_media.load_image()

            assert sample.frame_index == expected_frame_index
            assert sample.frame_name == "video.mkv"
            _assert_images_close(
                sample.media.load_image(),
                _load_server_frame(task, expected_frame_index),
            )
            previous_media = sample.media

        with pytest.raises(StopIteration):
            next(samples)
        with pytest.raises(RuntimeError, match="released"):
            previous_media.load_image()

    chunk_paths = sorted(dataset._chunk_dir.iterdir())
    assert [path.name for path in chunk_paths] == ["0.mp4", "1.mp4", "2.mp4"]
    assert all(path.read_bytes()[4:8] == b"ftyp" for path in chunk_paths)

    random_access_sample = dataset.samples[2]
    assert random_access_sample.frame_index == 3
    _assert_images_close(
        random_access_sample.media.load_image(),
        _load_server_frame(task, random_access_sample.frame_index),
    )


def test_task_dataset_decodes_real_h264_video_end_to_end(
    fxt_login: tuple[Client, str],
) -> None:
    client = fxt_login[0]
    task = client.tasks.create_from_data(
        models.TaskWriteRequest(
            "SDK real H.264 video chunk E2E test task",
            labels=[models.PatchedLabelRequest(name="video-object")],
        ),
        resource_type=ResourceType.LOCAL,
        resources=[_H264_HIGH_PROFILE_VIDEO_PATH],
        data_params={"chunk_size": 25},
    )

    assert task.data_original_chunk_type == "video"
    assert task.data_chunk_size == 25
    assert task.size == _H264_HIGH_PROFILE_FRAME_COUNT

    dataset = cvatds.TaskDataset(
        client,
        task.id,
        load_annotations=False,
        media_download_policy=cvatds.MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND,
    )

    assert len(dataset.samples) == _H264_HIGH_PROFILE_FRAME_COUNT
    assert not list(dataset._chunk_dir.iterdir())

    with dataset.iter_samples(temporary_chunks=True) as samples:
        for expected_frame_index, sample in enumerate(samples):
            assert sample.frame_index == expected_frame_index
            assert sample.frame_name == _H264_HIGH_PROFILE_VIDEO_PATH.name

            if expected_frame_index in _H264_HIGH_PROFILE_FRAME_INDEXES:
                image = sample.media.load_image()
                assert image.size == _H264_HIGH_PROFILE_FRAME_SIZE
                _assert_images_close(
                    image,
                    _load_server_frame(task, expected_frame_index),
                )

    assert not list(dataset._chunk_dir.iterdir())


def test_auto_annotation_processes_server_video_chunks_end_to_end(
    fxt_video_task: tuple[Client, Task],
) -> None:
    client, task = fxt_video_task
    task_label = task.get_labels()[0]
    task.update_annotations(
        models.PatchedLabeledDataRequest(
            shapes=[
                models.LabeledShapeRequest(
                    frame=0,
                    label_id=task_label.id,
                    type="rectangle",
                    points=[1, 2, 3, 4],
                )
            ]
        ),
        action=AnnotationUpdateAction.CREATE,
    )

    observed_images = []

    def detect(
        context: cvataa.DetectionFunctionContext, image: PIL.Image.Image
    ) -> list[models.LabeledShapeRequest]:
        assert context.frame_name == "video.mkv"
        observed_images.append(image.copy())
        return [cvataa.rectangle(123, [5, 6, 20, 30])]

    function = SimpleNamespace(
        spec=cvataa.DetectionFunctionSpec(labels=[cvataa.label_spec("video-object", 123)]),
        detect=detect,
    )

    cvataa.annotate_task(client, task.id, function, clear_existing=True)

    assert len(observed_images) == len(_ACTIVE_FRAME_INDEXES)
    for observed_image, expected_frame_index in zip(
        observed_images, _ACTIVE_FRAME_INDEXES, strict=True
    ):
        _assert_images_close(
            observed_image,
            _load_server_frame(task, expected_frame_index),
        )

    annotations = task.get_annotations()
    assert not annotations.tags
    assert not annotations.tracks

    shapes = sorted(annotations.shapes, key=lambda shape: shape.frame)
    assert [shape.frame for shape in shapes] == list(_ACTIVE_FRAME_INDEXES)
    assert all(shape.label_id == task_label.id for shape in shapes)
    assert all(shape.type.value == "rectangle" for shape in shapes)
    assert all(shape.points == [5, 6, 20, 30] for shape in shapes)

    assert not list(client.config.cache_dir.rglob("*.mp4"))
