# CVAT MP4/H.264 video reader

`cvat-mp4-h264` decodes the H.264 video track of an MP4 file into `VideoFrame` objects
using Cisco's OpenH264 shared library.

The package ships no OpenH264 binary, PyAV, FFmpeg, `libx264`, or install-time network hook.
The OpenH264 library is downloaded only when you run the command below.

## OpenH264 library

```shell
python -m cvat_mp4_h264 install   # download Cisco's OpenH264 2.7.0 for this system
python -m cvat_mp4_h264 status    # show which library is used
python -m cvat_mp4_h264 remove    # delete the downloaded library
```

`install` downloads the library from `https://ciscobinary.openh264.org/`, checks its SHA-256,
and stores it in the user data directory. Supported systems: Linux x86_64 and arm64
(glibc 2.27 or newer), macOS x86_64 and arm64, Windows x86_64.

OpenH264 Video Codec provided by Cisco Systems, Inc.

To use another OpenH264 2.x library, set `CVAT_OPENH264_LIBRARY` to its path;
it takes priority over the downloaded copy:

```shell
export CVAT_OPENH264_LIBRARY=/path/to/libopenh264.so
```

## Isolated development install

```shell
cd cvat-mp4-h264 && uv pip install --editable .
```

## Example

```python
from pathlib import Path

from cvat_mp4_h264 import VideoMp4ChunkReader

for path in sorted(Path("videos").glob("*.mp4")):
    reader = VideoMp4ChunkReader(path)
    print(f"{path}: {len(reader)} frames")

    for frame in reader:
        process(frame.to_image())
```

The OpenH264 library is taken from the `CVAT_OPENH264_LIBRARY` environment variable, else from
the copy downloaded by `python -m cvat_mp4_h264 install`; no other locations are searched.
The library must be built for the operating system and CPU architecture the Python process
runs on.

`len(reader)` reads the frame count from the MP4 sample tables, without decoding.

Each yielded `VideoFrame` keeps the decoded picture in the decoder's I420 pixel format:
it owns copies of its Y, U and V planes and remains valid after iteration advances or the
decoder closes. `to_image()` converts it into an RGB `PIL.Image.Image`, so frames that
are skipped never pay for the conversion.

## Supported files

The reader accepts only the video chunks CVAT writes: FFmpeg's MP4 layout around
libopenh264 output, which every official CVAT image has produced since v1.2.0:

- exactly one track, with exactly one `avc1` sample-description entry;
- constrained-baseline H.264 with 4-byte NAL lengths and SPS and PPS entries in `avcC`;
- `stco`, `stsc` and `stsz` sample tables, with every frame inside `mdat`;
- 32-bit box sizes only.

Other files, including chunks encoded with `libx264`, raise `UnsupportedVideoError`, and so
does invalid decoder output. A missing or unloadable OpenH264 library raises
`VideoDecoderUnavailableError`, and a library of an unsupported version raises its subclass
`DecoderVersionMismatchError`. All of these errors derive from `VideoDecoderError`.
