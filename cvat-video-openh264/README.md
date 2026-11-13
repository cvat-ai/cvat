# CVAT OpenH264 video adapter

`cvat-video-openh264` is the standalone video-decoding adapter for CVAT's Python clients.
It parses the constrained MP4/H.264 chunks produced by CVAT and decodes them into
`PIL.Image.Image` frames using a separately supplied OpenH264 shared library.

The package ships no OpenH264 binary, PyAV, FFmpeg, `libx264`, codec downloader, or
install-time network hook. It uses a separately supplied OpenH264 shared library at runtime.

## Isolated development install

```shell
cd cvat-video-openh264 && uv pip install --editable . --group test
```

## Example

```python
from pathlib import Path

from cvat_video_openh264 import iter_frames, resolve_decoder

decoder = resolve_decoder(library_path=Path("/opt/codecs/libopenh264.so"))

for chunk in sorted(Path("chunks").glob("*.mp4")):
    for image in iter_frames(chunk, decoder=decoder):
        process(image)
```

`resolve_decoder()` loads and version-validates the library once; passing its result to
`iter_frames()` keeps repeated calls from reloading the codec. If `library_path` is
omitted, the adapter checks `CVAT_OPENH264_LIBRARY` and then the platform's normal
system-library discovery. `iter_frames()` without a `decoder` resolves the library the
same way, and discovery and decoding begin only when the returned iterator is advanced.

`iter_frames()` processes AVC samples in the sequence defined by the MP4 sample tables.
The supported format rejects composition offsets, so this sequence is also presentation
order. The returned generator owns the open chunk file and one native decoder; exhausting
or closing it releases both. Each call creates its own native decoder, because decoding
state must not carry over between independent chunks; only the loaded library is shared.
Each yielded image owns its pixel data and remains valid after iteration advances or the
decoder closes.

The parser accepts the constrained CVAT-generated MP4/H.264 format:

- exactly one MP4 video track with exactly one `avc1` sample-description entry;
- constrained-baseline H.264 with SPS and PPS entries in `avcC`;
- `stsz`, `stsc`, and exactly one `stco` or `co64` sample-table mapping;
- decode-order samples without nonzero composition offsets;
- bounded sample counts and sizes whose offsets remain inside the file.

Malformed boxes, unsupported profiles, reordered composition timestamps, inconsistent
sample tables, and invalid decoder output raise `UnsupportedVideoChunkError`. All public
decoder exceptions derive from `VideoDecoderError`. `DecoderInfo` and `resolve_decoder()`
provide the public decoder discovery API.

## Development

```shell
python -m pytest cvat-video-openh264/tests
python -m build --outdir /tmp/cvat-video-openh264-dist cvat-video-openh264
python cvat-video-openh264/scripts/check_artifacts.py /tmp/cvat-video-openh264-dist/*
```

Package tests must not depend on PyAV or a codec binary.
