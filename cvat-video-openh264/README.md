# CVAT OpenH264 video adapter

`cvat-video-openh264` is the standalone video-decoding adapter for CVAT's Python clients.
It parses the constrained MP4/H.264 chunks produced by CVAT and decodes them into
`PIL.Image.Image` frames using a separately supplied OpenH264 shared library.

The package ships no OpenH264 binary, PyAV, FFmpeg, `libx264`, codec downloader, or
install-time network hook. This development package must not be published or installed
alongside the current `cvat-sdk` wheel while that wheel still owns the
`cvat_video_openh264` import namespace. Publication remains gated on that coordinated
package-ownership switchover.

## Isolated development install

```shell
python -m pip install -e './cvat-video-openh264[test]'
```

## Example

```python
from pathlib import Path

from cvat_video_openh264 import iter_frames

for image in iter_frames(
    Path("0.mp4"),
    library_path=Path("/opt/codecs/libopenh264.so"),
):
    process(image)
```

If `library_path` is omitted, the adapter checks `CVAT_OPENH264_LIBRARY` and then the
platform's normal system-library discovery. Discovery and decoding begin only when the
returned iterator is advanced.

`iter_frames()` yields images in MP4 sample order. The returned generator owns the open
chunk file and one decoder; exhausting or closing it releases both. Each yielded image
owns its pixel data and remains valid after iteration advances or the decoder closes.
The frame-count integrity check runs only when iteration finishes normally; closing the
generator early does not validate the remaining samples.

The parser accepts the narrow CVAT-generated format used by the current proof of concept:

- exactly one MP4 video track with exactly one `avc1` sample-description entry;
- constrained-baseline H.264 with SPS and PPS entries in `avcC`;
- `stsz`, `stsc`, and exactly one `stco` or `co64` sample-table mapping;
- decode-order samples without nonzero composition offsets;
- bounded sample counts and sizes whose offsets remain inside the file.

Malformed boxes, unsupported profiles, reordered composition timestamps, inconsistent
sample tables, invalid decoder output, and frame-count mismatches raise
`UnsupportedVideoChunkError`. All public decoder exceptions derive from
`VideoDecoderError`. `DecoderInfo`, `resolve_decoder()`, and the PoC exception names remain
available for compatibility.

## Development

```shell
python -m pytest cvat-video-openh264/tests
python -m build --outdir /tmp/cvat-video-openh264-dist cvat-video-openh264
python cvat-video-openh264/scripts/check_artifacts.py /tmp/cvat-video-openh264-dist/*
python cvat-video-openh264/scripts/check_fixture_inventory.py
```

Package tests must not depend on PyAV or a codec binary.
