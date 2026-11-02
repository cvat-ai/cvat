# CVAT MP4/H.264 video reader

`cvat-mp4-h264` decodes the H.264 video track of an MP4 file into `VideoFrame` objects
using a separately supplied OpenH264 shared library.

The package ships no OpenH264 binary, PyAV, FFmpeg, `libx264`, codec downloader, or
install-time network hook. It uses a separately supplied OpenH264 shared library at runtime.

## Isolated development install

```shell
cd cvat-mp4-h264 && uv pip install --editable .
```

## Example

```python
from pathlib import Path

from cvat_mp4_h264 import VideoMp4ChunkReader

for path in sorted(Path("videos").glob("*.mp4")):
    reader = VideoMp4ChunkReader(path, library_path="/opt/codecs/libopenh264.so")
    print(f"{path}: {len(reader)} frames")

    for frame in reader:
        process(frame.to_image())
```

`library_path` points at the OpenH264 shared library. If it is omitted, the path is taken from the
`CVAT_OPENH264_LIBRARY` environment variable; no other locations are searched.

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
