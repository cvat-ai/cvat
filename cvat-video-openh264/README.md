# CVAT OpenH264 video adapter

`cvat-video-openh264` is the independently built video-decoding adapter for CVAT's Python
clients. This package-development snapshot preserves the proof-of-concept decoder contract while
the native ABI boundary is hardened for production.

The package contains CVAT-owned Python code for parsing the constrained MP4/H.264 chunks produced
by CVAT, converting AVC samples to Annex B access units, converting decoded I420 planes to RGB,
and constructing Pillow images. It does **not** contain an OpenH264 binary, PyAV, FFmpeg,
`libx264`, a codec downloader, or an install-time network hook.

This project is intentionally isolated from `cvat-sdk` until the coordinated package-ownership
switchover. Do not install this distribution in an environment where the current `cvat-sdk`
wheel also owns the `cvat_video_openh264` import namespace.

## Public API

```python
from pathlib import Path

from cvat_video_openh264 import iter_frames

for image in iter_frames(
    Path("0.mp4"),
    library_path=Path("/opt/codecs/libopenh264.so"),
):
    process(image)
```

`iter_frames(path, *, library_path=None)` yields `PIL.Image.Image` objects in MP4 sample order.
The iterator owns one decoder. Exhausting or closing the iterator closes that decoder. Every
yielded image owns its pixel data and remains valid after iteration advances or the decoder is
closed.

If `library_path` is omitted, the adapter checks `CVAT_OPENH264_LIBRARY` and then the platform's
normal system-library discovery. Discovery and decoding begin only when the returned iterator is
advanced; importing the package or constructing the iterator does not load a codec, prompt, or
contact the network.

The following compatibility symbols remain available while the proof of concept is migrated:

- `DecoderInfo` and `resolve_decoder()`;
- `DecoderUnavailableError`;
- `UnsupportedVideoChunkError`.

All public decoder exceptions derive from `VideoDecoderError`.

## Accepted chunk contract

The parser accepts the narrow CVAT-generated format used by the current proof of concept:

- one MP4 video track using an `avc1` sample entry;
- constrained-baseline H.264 with SPS and PPS entries in `avcC`;
- `stsz`, `stsc`, and exactly one `stco` or `co64` sample-table mapping;
- decode-order samples with no nonzero composition offsets;
- bounded sample counts and sample sizes;
- sample offsets and sizes entirely inside the input file.

Malformed boxes, unsupported profiles, reordered composition timestamps, inconsistent sample
tables, invalid decoder output, and decoded-frame count mismatches raise
`UnsupportedVideoChunkError`. General-purpose MP4 files are outside this contract.

## Development

Run the package tests without installing `cvat-sdk`:

```shell
python -m pip install -e './cvat-video-openh264[test]'
python -m pytest cvat-video-openh264/tests
```

Build and inspect the standalone artifacts:

```shell
python -m build --outdir /tmp/cvat-video-openh264-dist cvat-video-openh264
python cvat-video-openh264/scripts/check_artifacts.py /tmp/cvat-video-openh264-dist/*
python cvat-video-openh264/scripts/check_fixture_inventory.py
```

The checked-in fixture inventory documents every package test asset and generator. Package tests
must not depend on PyAV or a codec binary.
