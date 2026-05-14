# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import io
import unittest
from enum import Enum
from typing import NamedTuple

import av
import numpy as np

from cvat.apps.engine.media_extractors import AudioReader, Mp3ChunkWriter
from cvat.apps.engine.media_io.audio_provider import add_padding

SAMPLE_RATE = 8000


class AudioLayout(str, Enum):
    MONO = "mono"
    STEREO = "stereo"

    @property
    def nb_channels(self) -> int:
        return 1 if self is AudioLayout.MONO else 2


class _AudioCase(NamedTuple):
    name: str
    container: str
    codec: str
    sample_format: str
    layout: AudioLayout
    is_planar: bool


def _generate_planar_samples_int16(layout: AudioLayout, n_samples: int) -> np.ndarray:
    """
    Synthesize planar int16 samples with shape (channels, n_samples).
    Mono: 440 Hz sine. Stereo: 440 Hz (western A4) left, 880 Hz (western A5) right.
    """
    t = np.arange(n_samples) / SAMPLE_RATE
    left = (np.sin(2 * np.pi * 440 * t) * 15000).astype(np.int16)
    if layout is AudioLayout.MONO:
        return left.reshape(1, -1)

    right = (np.sin(2 * np.pi * 880 * t) * 15000).astype(np.int16)
    return np.stack([left, right])


def _encode_audio(case: _AudioCase, *, duration_s: float) -> io.BytesIO:
    """Encode a synthetic test signal and return an in-memory buffer."""
    n_samples = int(round(duration_s * SAMPLE_RATE))
    planar = _generate_planar_samples_int16(case.layout, n_samples)

    # PyAV ndarray layout convention for av.AudioFrame.from_ndarray:
    # - planar formats expect shape (channels, samples), one row per channel;
    # - packed formats expect shape (1, channels * samples) with channels
    #   interleaved frame-by-frame (L, R, L, R, ...).
    if av.AudioFormat(case.sample_format).is_planar:
        arr = planar
    else:
        # Transpose (channels, samples) -> (samples, channels), then flatten
        # row-major to get the interleaved packed layout. Mono is a no-op.
        arr = planar.T.reshape(1, -1)

    # FFmpeg float sample formats (flt/fltp) are normalized to [-1.0, 1.0]:
    # "The floating-point formats are based on full volume being in the range
    # [-1.0, 1.0]."
    # https://ffmpeg.org/doxygen/trunk/group__lavu__sampfmts.html
    if case.sample_format.startswith("flt"):
        arr = arr.astype(np.float32) / 32768.0
    elif case.sample_format.startswith("s16"):
        pass  # synthesized samples are already int16
    else:
        raise ValueError(f"Unsupported sample format: {case.sample_format!r}")

    buf = io.BytesIO()
    with av.open(buf, "w", format=case.container) as container:
        stream = container.add_stream(case.codec, rate=SAMPLE_RATE)
        # PyAV: stream.layout / stream.format must be set before the first
        # encode() call; the codec uses them to negotiate the wire format.
        stream.layout = case.layout.value
        stream.format = case.sample_format

        frame = av.AudioFrame.from_ndarray(arr, format=case.sample_format, layout=case.layout.value)
        frame.sample_rate = SAMPLE_RATE

        for packet in stream.encode(frame):
            container.mux(packet)

        # Encoders are stateful and must be flushed at end-of-stream, otherwise
        # the trailing samples buffered by the codec are dropped. PyAV forwards
        # a None frame to FFmpeg's avcodec_send_frame(ctx, NULL), which enters
        # draining mode and emits the buffered packets. See the "Flushing /
        # draining" section in FFmpeg's encoding/decoding API docs:
        # https://ffmpeg.org/doxygen/trunk/group__lavc__encdec.html
        for packet in stream.encode(None):
            container.mux(packet)

    buf.seek(0)
    return buf


def _make_reader(
    case: _AudioCase,
    *,
    duration_s: float,
    start: int = 0,
    stop: int | None = None,
) -> AudioReader:
    return AudioReader([_encode_audio(case, duration_s=duration_s)], start=start, stop=stop)


def _read_concatenated_int16(reader: AudioReader, *, start=None, stop=None) -> np.ndarray:
    """Return decoded audio as planar int16 with shape (channels, samples)."""

    chunks: list[np.ndarray] = []
    for frame, _ in reader.read_frames(start=start, stop=stop):
        # PyAV: AudioFrame.to_ndarray shape mirrors the storage format:
        # - planar -> (channels, samples), one row per channel;
        # - packed -> (1, channels * samples) with interleaved channels.
        arr = frame.to_ndarray()

        # Normalize to planar for per-channel comparison.
        if not frame.format.is_planar:
            arr = arr.reshape(-1, frame.layout.nb_channels).T

        chunks.append(arr.astype(np.int16))

    return np.concatenate(chunks, axis=-1)


_FORMAT_CASES: tuple[_AudioCase, ...] = (
    _AudioCase("wav_mono_packed_s16", "wav", "pcm_s16le", "s16", AudioLayout.MONO, False),
    _AudioCase("wav_stereo_packed_s16", "wav", "pcm_s16le", "s16", AudioLayout.STEREO, False),
    _AudioCase("wav_stereo_packed_flt", "wav", "pcm_f32le", "flt", AudioLayout.STEREO, False),
    _AudioCase("wavpack_mono_planar_s16p", "wv", "wavpack", "s16p", AudioLayout.MONO, True),
    _AudioCase("wavpack_stereo_planar_s16p", "wv", "wavpack", "s16p", AudioLayout.STEREO, True),
    _AudioCase("wavpack_stereo_planar_fltp", "wv", "wavpack", "fltp", AudioLayout.STEREO, True),
)


class AudioReaderFormatsTest(unittest.TestCase):
    """
    Verify AudioReader handles common audio layouts (mono/stereo) and sample
    formats (packed/planar) when generated on the fly via PyAV.
    """

    DURATION_S = 1.0
    TOTAL_SAMPLES = int(SAMPLE_RATE * DURATION_S)

    def test_full_read_recovers_all_samples(self):
        for case in _FORMAT_CASES:
            with self.subTest(case=case.name):
                reader = _make_reader(case, duration_s=self.DURATION_S)

                self.assertEqual(reader.sampling_rate, SAMPLE_RATE)
                self.assertAlmostEqual(reader.duration, self.DURATION_S, places=3)
                self.assertEqual(reader.length, int(self.DURATION_S * AudioReader.FRAME_RATE))
                self.assertEqual(reader.format_name, case.codec)

                total_samples = 0
                first_frame: av.AudioFrame | None = None
                for frame, extra in reader:
                    self.assertIsNone(extra)
                    self.assertIsInstance(frame, av.AudioFrame)
                    if first_frame is None:
                        first_frame = frame
                    total_samples += frame.samples

                self.assertIsNotNone(first_frame)
                self.assertEqual(first_frame.format.is_planar, case.is_planar)
                # Observed PyAV/FFmpeg behavior: PCM WAV streams carry no
                # explicit channel_layout tag, so FFmpeg's channel-layout
                # descriptor falls back to "1 channels" / "2 channels" instead
                # of "mono" / "stereo". Compare via nb_channels to stay codec-
                # agnostic.
                self.assertEqual(first_frame.layout.nb_channels, case.layout.nb_channels)
                self.assertEqual(first_frame.format.name, case.sample_format)
                self.assertEqual(total_samples, self.TOTAL_SAMPLES)
                self.assertGreater(reader.get_frame_count(), 0)

    def test_repeated_iteration_yields_same_total(self):
        # Iterating twice must re-open the stream and produce the same total
        # without state leaking between iterations.
        for case in _FORMAT_CASES:
            with self.subTest(case=case.name):
                reader = _make_reader(case, duration_s=self.DURATION_S)
                totals = [sum(f.samples for f, _ in reader) for _ in range(2)]
                self.assertEqual(totals[0], totals[1])
                self.assertEqual(totals[0], self.TOTAL_SAMPLES)


class AudioReaderFilterTest(unittest.TestCase):
    DURATION_S = 2.0
    START_MS = 100
    STOP_MS = 1200

    # Approximate filter range in samples: [START_MS/1000 * SR, STOP_MS/1000 * SR + 1).
    APPROX_RANGE_SAMPLES = int(SAMPLE_RATE * (STOP_MS - START_MS) / 1000)
    FULL_SAMPLES = int(SAMPLE_RATE * DURATION_S)

    # The trimmed sample count is not an exact match for APPROX_RANGE_SAMPLES
    # because decoders emit fixed-size packets and the start/stop boundaries
    # generally fall inside (not on) a packet. Three things can shift the count:
    # 1) container.seek() snaps to a keyframe / packet boundary, so the first
    #    decoded frame can begin before START_MS;
    # 2) the frame containing the STOP_MS boundary is processed entirely by the
    #    outer loop, with _filter_audio_frame clipping to the boundary;
    # 3) format-specific priming / encoder delay (irrelevant for pcm_* but
    #    present for some other codecs).
    # For pcm_s16le / pcm_f32le the decoded packet is ~1024 samples, so a
    # two-packet tolerance on each side covers cases (1) and (2). For wavpack,
    # which emits one giant frame, _filter_audio_frame clips exactly and the
    # observed count effectively equals APPROX_RANGE_SAMPLES.
    PACKET_SAMPLES_TOLERANCE = 1024 * 2

    def _assert_trimmed(self, total: int):
        self.assertGreater(total, 0)
        self.assertLess(total, self.FULL_SAMPLES)
        self.assertLessEqual(abs(total - self.APPROX_RANGE_SAMPLES), self.PACKET_SAMPLES_TOLERANCE)

    def test_can_trim_via_constructor(self):
        for case in _FORMAT_CASES:
            with self.subTest(case=case.name):
                reader = _make_reader(
                    case, duration_s=self.DURATION_S, start=self.START_MS, stop=self.STOP_MS
                )
                self._assert_trimmed(sum(f.samples for f, _ in reader))

    def test_can_trim_via_read_frames(self):
        for case in _FORMAT_CASES:
            with self.subTest(case=case.name):
                reader = _make_reader(case, duration_s=self.DURATION_S)
                trimmed = sum(
                    f.samples for f, _ in reader.read_frames(start=self.START_MS, stop=self.STOP_MS)
                )
                self._assert_trimmed(trimmed)


class AudioReaderLosslessContentTest(unittest.TestCase):
    DURATION_S = 0.5
    N_SAMPLES = int(SAMPLE_RATE * DURATION_S)
    CASES = (c for c in _FORMAT_CASES if c.sample_format.startswith("s16"))

    def test_bit_exact_round_trip(self):
        for case in self.CASES:
            with self.subTest(case=case.name):
                original = _generate_planar_samples_int16(case.layout, self.N_SAMPLES)
                decoded = _read_concatenated_int16(_make_reader(case, duration_s=self.DURATION_S))
                self.assertEqual(decoded.shape[0], original.shape[0])

                # Anti-shrinking guard: decoders may emit a trailing packet
                # zero-padded to packet boundary, so decoded can exceed
                # N_SAMPLES. The next line slices the leading N_SAMPLES off
                # decoded -- without this check, a short decode would silently
                # truncate the slice and compare two equally-short arrays.
                self.assertGreaterEqual(decoded.shape[1], original.shape[1])
                np.testing.assert_array_equal(decoded[:, : original.shape[1]], original)

    def test_concatenated_slices_match_original(self):
        # Read the audio as a sequence of [start_ms, stop_ms] slices and verify
        # the stitched result reproduces the full signal sample-for-sample.
        # This is more of a correctness test than a practical case. In practice,
        # all segments are expected to have some configured overlap.

        # AudioReader interprets [a, b] as inclusive on both ends, returning
        # samples [a*sr/1000, b*sr/1000] (the underlying filter uses
        # filter_end = stop_sample + 1). Two adjacent slices [a, b] and [b, c]
        # therefore share one sample at index b*sr/1000; we drop it from each
        # non-first slice so the concatenated array tiles the source without
        # duplication.
        duration_ms = int(self.DURATION_S * 1000)

        # Use ms boundaries that are exact multiples of (1000 / SAMPLE_RATE);
        # otherwise the per-slice sample counts get rounded and stitching
        # leaves a gap between slices.
        boundaries_ms = [i * duration_ms // 4 for i in range(5)]  # [0, 25%, 50%, 75%, 100%]
        assert all(
            b * SAMPLE_RATE % 1000 == 0 for b in boundaries_ms
        ), "boundaries must align on sample grid"

        for case in self.CASES:
            with self.subTest(case=case.name):
                original = _generate_planar_samples_int16(case.layout, self.N_SAMPLES)
                reader = _make_reader(case, duration_s=self.DURATION_S)

                slices: list[np.ndarray] = []
                for start_ms, stop_ms in zip(boundaries_ms[:-1], boundaries_ms[1:]):
                    slices.append(_read_concatenated_int16(reader, start=start_ms, stop=stop_ms))

                # First slice kept whole; subsequent slices drop their leading
                # sample (the boundary sample duplicated from the prior slice).
                stitched = np.concatenate([slices[0]] + [s[:, 1:] for s in slices[1:]], axis=-1)

                self.assertEqual(stitched.shape, original.shape)
                np.testing.assert_array_equal(stitched, original)


class Mp3ChunkCreationTest(unittest.TestCase):
    """
    Exercise the building blocks of MP3 chunk creation used by
    cvat.apps.engine.media_io.audio_provider.prepare_audio_chunk:
    - add_padding pads the payload with silent samples on either side;
    - Mp3ChunkWriter.save_as_chunk encodes arbitrary input format/layout
      payloads to a playable MP3 chunk whose duration covers the full payload
      (modulo the encoder's priming/lookahead, which a right-side padding is
      expected to mask).
    """

    DURATION_S = 1.0

    # Production default for fresh chunks is (left=0, right=5000) samples --
    # see TaskAudioProvider._build_audio_chunk in audio_provider.py. The 5000-
    # sample right padding is the constant chosen as "big enough for most
    # cases" to cover libmp3lame's priming/lookahead (~1680 samples), which
    # causes the encoded MP3 to drop samples from the payload tail unless
    # extra silence is appended. The test's non-zero left padding exercises
    # the padding pipeline even though production prefers left=0 (MP3 priming
    # is masked by the LAME info tag a compliant decoder reads).
    #
    # Background on MP3 encoder delay:
    # - LAME introduces ~576 samples of encoder delay; decoder MDCT inverse
    #   adds another ~528-1152 samples. The MP3 bitstream itself has no
    #   standard way to record delay/padding, so seekless trimming is lossy.
    #   https://wiki.hydrogenaudio.org/index.php?title=Gapless_playback
    # - FFmpeg's libmp3lame wrapper (used by Mp3ChunkWriter via the
    #   "libmp3lame" codec): supported options and their meanings are listed
    #   in the upstream source:
    #   https://github.com/FFmpeg/FFmpeg/blob/master/libavcodec/libmp3lame.c
    LEFT_PADDING_SAMPLES = 100 * SAMPLE_RATE // 1000  # 100 ms
    RIGHT_PADDING_SAMPLES = 500 * SAMPLE_RATE // 1000  # 500 ms

    # Only lossless inputs: the duration assertions need exact source length.
    CASES = tuple(c for c in _FORMAT_CASES if c.codec in ("pcm_s16le", "wavpack"))

    def test_add_padding_preserves_sample_count(self):
        expected_extra_samples = self.LEFT_PADDING_SAMPLES + self.RIGHT_PADDING_SAMPLES

        for case in self.CASES:
            with self.subTest(case=case.name):
                reader = _make_reader(case, duration_s=self.DURATION_S)
                payload_samples = sum(f.samples for f, _ in reader.read_frames())

                padded_frames = list(
                    add_padding(
                        reader.read_frames(),
                        left_padding_samples=self.LEFT_PADDING_SAMPLES,
                        right_padding_samples=self.RIGHT_PADDING_SAMPLES,
                    )
                )
                padded_samples = sum(f.samples for f, _ in padded_frames)

                self.assertEqual(padded_samples, payload_samples + expected_extra_samples)

                # First and last frames should be silent padding of the requested length.
                first_frame = padded_frames[0][0]
                last_frame = padded_frames[-1][0]
                self.assertEqual(first_frame.samples, self.LEFT_PADDING_SAMPLES)
                self.assertEqual(last_frame.samples, self.RIGHT_PADDING_SAMPLES)
                self.assertTrue(np.all(first_frame.to_ndarray() == 0))
                self.assertTrue(np.all(last_frame.to_ndarray() == 0))

    def test_mp3_chunk_covers_full_payload_duration(self):
        for quality in Mp3ChunkWriter.AudioQuality:
            for case in self.CASES:
                with self.subTest(case=case.name, quality=quality.value):
                    reader = _make_reader(case, duration_s=self.DURATION_S)
                    padded_frames = add_padding(
                        reader.read_frames(),
                        left_padding_samples=self.LEFT_PADDING_SAMPLES,
                        right_padding_samples=self.RIGHT_PADDING_SAMPLES,
                    )

                    writer = Mp3ChunkWriter(quality=quality)
                    chunk = io.BytesIO()
                    writer.save_as_chunk(padded_frames, chunk)

                    chunk.seek(0)
                    self.assertGreater(len(chunk.getvalue()), 0)

                    result = AudioReader([chunk])
                    self.assertEqual(result.format_name, "mp3")
                    # libmp3lame resamples to its configured stream rate / layout.
                    self.assertEqual(result.sampling_rate, writer.rate)

                    # The output must cover at least the payload duration; the
                    # right padding masks libmp3lame's priming/lookahead. We
                    # allow some slack on the upper bound for the same reason.
                    expected_min_s = self.DURATION_S
                    expected_max_s = (
                        self.DURATION_S
                        + (self.LEFT_PADDING_SAMPLES + self.RIGHT_PADDING_SAMPLES) / SAMPLE_RATE
                        + 0.1
                    )
                    self.assertGreaterEqual(result.duration, expected_min_s)
                    self.assertLessEqual(result.duration, expected_max_s)
