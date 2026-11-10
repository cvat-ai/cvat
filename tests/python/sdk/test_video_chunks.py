# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import contextlib
import logging
import os
from pathlib import Path
from types import SimpleNamespace

import av
import PIL.Image
import PIL.ImageChops
import PIL.ImageStat
import pytest

import cvat_sdk.auto_annotation as cvataa
import cvat_sdk.auto_annotation.driver as auto_annotation_driver
import cvat_sdk.datasets.task_dataset as task_dataset_module
import cvat_video_openh264 as video
import cvat_video_openh264._reader as video_reader
from cvat_sdk.datasets.common import MediaDownloadPolicy, Sample
from cvat_sdk.datasets.task_dataset import TaskDataset


def _write_cvat_style_chunk(path: Path, frame_count: int = 4) -> list[PIL.Image.Image]:
    source_images = [
        PIL.Image.new("RGB", (32, 24), (frame_index * 40,) * 3)
        for frame_index in range(frame_count)
    ]

    with av.open(path, "w", format="mp4") as container:
        try:
            codec = av.codec.Codec("libopenh264", "w")
            profile = "constrained_baseline"
        except av.codec.codec.UnknownCodecError:
            codec = av.codec.Codec("libx264", "w")
            profile = "baseline"

        stream = container.add_stream(codec.name, rate=25)
        stream.width = source_images[0].width
        stream.height = source_images[0].height
        stream.pix_fmt = "yuv420p"
        stream.profile = profile
        stream.options = {"profile": profile}

        for source_image in source_images:
            for packet in stream.encode(av.VideoFrame.from_image(source_image)):
                container.mux(packet)

        for packet in stream.encode():
            container.mux(packet)

    return source_images


def test_iter_frames_demuxes_all_samples_lazily(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    chunk_path = tmp_path / "0.mp4"
    source_images = _write_cvat_style_chunk(chunk_path)
    decoded_access_units = []
    decoder_closed = False

    class FakeDecoder:
        def __init__(self, decoder_info: video.DecoderInfo) -> None:
            assert decoder_info.library_path == "fake-openh264"

        def decode(self, access_unit: bytes) -> PIL.Image.Image:
            assert access_unit.startswith(b"\x00\x00\x00\x01")
            decoded_access_units.append(access_unit)
            return source_images[len(decoded_access_units) - 1]

        def close(self) -> None:
            nonlocal decoder_closed
            decoder_closed = True

    monkeypatch.setattr(
        video_reader,
        "resolve_decoder",
        lambda **_: video.DecoderInfo(library_path="fake-openh264", version=None),
    )
    monkeypatch.setattr(video_reader, "_OpenH264Decoder", FakeDecoder)

    frames = video.iter_frames(chunk_path)
    assert next(frames) == source_images[0]
    assert len(decoded_access_units) == 1

    assert list(frames) == source_images[1:]
    assert len(decoded_access_units) == len(source_images)
    assert decoder_closed


def test_iter_frames_closes_decoder_when_consumer_stops_early(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    chunk_path = tmp_path / "0.mp4"
    _write_cvat_style_chunk(chunk_path)
    decoder_closed = False

    class FakeDecoder:
        def __init__(self, decoder_info: video.DecoderInfo) -> None:
            pass

        def decode(self, access_unit: bytes) -> PIL.Image.Image:
            return PIL.Image.new("RGB", (1, 1))

        def close(self) -> None:
            nonlocal decoder_closed
            decoder_closed = True

    monkeypatch.setattr(
        video_reader,
        "resolve_decoder",
        lambda **_: video.DecoderInfo(library_path="fake-openh264", version=None),
    )
    monkeypatch.setattr(video_reader, "_OpenH264Decoder", FakeDecoder)

    frames = video.iter_frames(chunk_path)
    next(frames)
    frames.close()

    assert decoder_closed


def test_task_dataset_closes_video_reader_and_deletes_temporary_chunk(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    dataset = TaskDataset.__new__(TaskDataset)
    dataset._task = SimpleNamespace(
        id=123,
        data_chunk_size=3,
        data_original_chunk_type="video",
    )
    dataset._chunk_dir = tmp_path / "shared"

    temporary_chunk = tmp_path / "0.mp4"
    temporary_chunk.touch()
    reader_closed = False

    def fake_iter_video_frames(chunk_path: Path):
        nonlocal reader_closed
        assert chunk_path == temporary_chunk
        try:
            for frame_index in range(3):
                yield PIL.Image.new("L", (1, 1), frame_index)
        finally:
            reader_closed = True

    monkeypatch.setattr(
        task_dataset_module,
        "iter_video_frames",
        fake_iter_video_frames,
    )

    sample = Sample(
        frame_index=0,
        frame_name="video.mp4",
        annotations=None,
        media=object(),
    )
    samples = dataset._iter_samples_from_chunks(
        [(0, [sample])],
        chunk_dir=tmp_path,
        temporary_chunks=True,
    )

    yielded_sample = next(samples)
    yielded_media = yielded_sample.media
    assert yielded_media.load_image().getpixel((0, 0)) == 0
    samples.close()

    assert reader_closed
    assert not temporary_chunk.exists()
    with pytest.raises(RuntimeError, match="released"):
        yielded_media.load_image()

    temporary_chunk.touch()
    reader_closed = False
    dataset._frame_annotations = {2: None}

    image = dataset._load_frame_image_from_chunk_dir(2, tmp_path)

    assert image.getpixel((0, 0)) == 2
    assert reader_closed
    assert temporary_chunk.exists()


@pytest.mark.parametrize(
    ("original_chunk_type", "expected_media_download_policy", "expected_temporary_chunks"),
    [
        ("imageset", MediaDownloadPolicy.PRELOAD_ALL, None),
        ("video", MediaDownloadPolicy.FETCH_CHUNKS_ON_DEMAND, True),
    ],
)
def test_sdk_auto_annotation_selects_chunk_iteration_by_original_type(
    monkeypatch: pytest.MonkeyPatch,
    original_chunk_type: str,
    expected_media_download_policy: MediaDownloadPolicy,
    expected_temporary_chunks: bool | None,
):
    observed = {}

    class Media:
        def load_image(self) -> PIL.Image.Image:
            return PIL.Image.new("RGB", (1, 1))

    class FakeDataset:
        def __init__(
            self,
            client,
            task_id,
            *,
            load_annotations,
            media_download_policy,
        ) -> None:
            observed["dataset_arguments"] = (
                task_id,
                load_annotations,
                media_download_policy,
            )
            self.labels = []
            self.samples = [
                Sample(
                    frame_index=0,
                    frame_name="frame.png",
                    annotations=None,
                    media=Media(),
                )
            ]

        @contextlib.contextmanager
        def iter_samples(self, *, temporary_chunks: bool):
            observed["temporary_chunks"] = temporary_chunks
            yield iter(self.samples)

    class TasksApi:
        def update_annotations(self, task_id, *, labeled_data_request) -> None:
            observed["uploaded_task_id"] = task_id

    class Tasks:
        api = TasksApi()

        def retrieve(self, task_id: int) -> SimpleNamespace:
            observed["retrieved_task_id"] = task_id
            return SimpleNamespace(data_original_chunk_type=original_chunk_type)

    monkeypatch.setattr(auto_annotation_driver, "TaskDataset", FakeDataset)

    function = SimpleNamespace(
        spec=cvataa.DetectionFunctionSpec(labels=[]),
        detect=lambda context, image: [],
    )
    client = SimpleNamespace(
        logger=logging.getLogger("test-sdk-video-chunks"),
        tasks=Tasks(),
    )

    cvataa.annotate_task(client, 123, function, clear_existing=True)

    expected_observed = {
        "retrieved_task_id": 123,
        "dataset_arguments": (
            123,
            False,
            expected_media_download_policy,
        ),
        "uploaded_task_id": 123,
    }
    if expected_temporary_chunks is not None:
        expected_observed["temporary_chunks"] = expected_temporary_chunks

    assert observed == expected_observed


def test_iter_frames_rejects_non_mp4_input(tmp_path: Path):
    chunk_path = tmp_path / "0.mp4"
    chunk_path.write_bytes(b"not an MP4 chunk")

    with pytest.raises(video.UnsupportedVideoChunkError, match="invalid|'moov'|movie"):
        next(video.iter_frames(chunk_path))


def test_resolve_decoder_reports_invalid_explicit_library(tmp_path: Path):
    missing_library = tmp_path / "libopenh264.so"

    with pytest.raises(video.DecoderUnavailableError, match="Could not load"):
        video.resolve_decoder(library_path=missing_library)


@pytest.mark.skipif(
    not os.environ.get("CVAT_OPENH264_LIBRARY"),
    reason="requires an explicitly provisioned OpenH264 library",
)
def test_openh264_decodes_cvat_style_chunk(tmp_path: Path):
    chunk_path = tmp_path / "0.mp4"
    source_images = _write_cvat_style_chunk(chunk_path)

    decoded_images = list(video.iter_frames(chunk_path))

    assert len(decoded_images) == len(source_images)
    for source_image, decoded_image in zip(source_images, decoded_images, strict=True):
        difference = PIL.ImageChops.difference(source_image, decoded_image)
        assert max(PIL.ImageStat.Stat(difference).mean) < 4
