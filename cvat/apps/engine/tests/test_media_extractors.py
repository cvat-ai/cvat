# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

from cvat.apps.engine.media_extractors import PdfReader

PAGE_COUNT = 10


def _generate_pdf(path: Path, page_count: int) -> None:
    pages = [Image.fromarray(np.ones((50, 100, 3), dtype=np.uint8)) for _ in range(page_count)]
    pages[0].save(path, "pdf", save_all=True, resolution=200, append_images=pages[1:])


class PdfReaderFrameRangeTest(unittest.TestCase):
    """
    `stop` is a 0-based inclusive frame index, the same as for every other
    ImageListReader. pdf2image's `last_page`, which PdfReader delegates to, is a
    1-based inclusive page number, so the two need converting between.
    """

    def setUp(self):
        source_dir = tempfile.TemporaryDirectory()
        self.addCleanup(source_dir.cleanup)

        self._source = Path(source_dir.name) / "source.pdf"
        _generate_pdf(self._source, PAGE_COUNT)

    def _frame_count(self, **kwargs) -> int:
        # PdfReader removes its source unless an extract_dir is given, so each
        # reader gets its own copy.
        work_dir = tempfile.TemporaryDirectory()
        self.addCleanup(work_dir.cleanup)

        pdf = Path(work_dir.name) / "source.pdf"
        pdf.write_bytes(self._source.read_bytes())

        return len(list(PdfReader([pdf], **kwargs).frame_range))

    def test_reads_every_page_when_stop_is_not_set(self):
        self.assertEqual(self._frame_count(), PAGE_COUNT)

    def test_stop_is_inclusive(self):
        for stop in range(PAGE_COUNT):
            with self.subTest(stop=stop):
                self.assertEqual(self._frame_count(stop=stop), stop + 1)

    def test_stop_beyond_the_last_page_is_clamped(self):
        self.assertEqual(self._frame_count(stop=PAGE_COUNT + 5), PAGE_COUNT)

    def test_start_and_stop_select_a_closed_range(self):
        self.assertEqual(self._frame_count(start=2, stop=6), 5)
