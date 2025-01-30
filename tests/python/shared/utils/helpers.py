# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import subprocess
from collections.abc import Generator
from contextlib import closing
from io import BytesIO
from typing import Optional

import av
import av.video.reformatter
from PIL import Image

from shared.fixtures.init import get_server_image_tag


def generate_image_file(filename="image.png", size=(100, 50), color=(0, 0, 0)):
    f = BytesIO()
    f.name = filename
    image = Image.new("RGB", size=size, color=color)
    image.save(f)
    f.seek(0)

    return f


def generate_image_files(
    count: int,
    *,
    prefixes: Optional[list[str]] = None,
    filenames: Optional[list[str]] = None,
    sizes: Optional[list[tuple[int, int]]] = None,
) -> list[BytesIO]:
    assert not (prefixes and filenames), "prefixes cannot be used together with filenames"
    assert not prefixes or len(prefixes) == count
    assert not filenames or len(filenames) == count

    images = []
    for i in range(count):
        prefix = prefixes[i] if prefixes else ""
        filename = f"{prefix}{i}.jpeg" if not filenames else filenames[i]
        image = generate_image_file(
            filename, color=(i, i, i), **({"size": sizes[i]}) if sizes else {}
        )
        images.append(image)

    return images


def generate_video_file(num_frames: int, size=(100, 50)) -> BytesIO:
    f = BytesIO()
    f.name = "video.avi"

    with av.open(f, "w") as container:
        stream = container.add_stream("mjpeg", rate=60)
        stream.width = size[0]
        stream.height = size[1]
        stream.color_range = av.video.reformatter.ColorRange.JPEG

        for i in range(num_frames):
            frame = av.VideoFrame.from_image(Image.new("RGB", size=size, color=(i, i, i)))
            for packet in stream.encode(frame):
                container.mux(packet)

    f.seek(0)

    return f


def read_video_file(file: BytesIO) -> Generator[Image.Image, None, None]:
    file.seek(0)

    with av.open(file) as container:
        video_stream = container.streams.video[0]

        with closing(video_stream.codec_context):  # pyav has a memory leak in stream.close()
            with closing(container.demux(video_stream)) as demux_iter:
                for packet in demux_iter:
                    for frame in packet.decode():
                        yield frame.to_image()


def generate_manifest(path: str) -> None:
    command = [
        "docker",
        "run",
        "--rm",
        "-u",
        "root:root",
        "-v",
        f"{path}:/local",
        "--entrypoint",
        "python3",
        get_server_image_tag(),
        "utils/dataset_manifest/create.py",
        "--output-dir",
        "/local",
        "/local",
    ]
    subprocess.check_output(command)
