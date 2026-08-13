# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset
from datumaro.components.errors import DatasetError, DatasetImportError, DatasetNotFoundError
from django.test import SimpleTestCase

from cvat.apps.dataset_manager.util import format_exception_chain


class FormatExceptionChainTest(SimpleTestCase):
    def test_includes_all_causes(self):
        with self.assertRaises(RuntimeError) as capture:
            try:
                raise ValueError("root cause")
            except ValueError as inner:
                raise RuntimeError("outer error") from inner

        self.assertEqual(format_exception_chain(capture.exception), "outer error: root cause")

    def test_skips_messages_embedded_in_previous_links(self):
        with self.assertRaises(RuntimeError) as capture:
            try:
                raise ValueError("root cause")
            except ValueError as inner:
                raise RuntimeError(f"outer error: {inner}") from inner

        self.assertEqual(format_exception_chain(capture.exception), "outer error: root cause")

    def test_follows_implicit_context(self):
        with self.assertRaises(RuntimeError) as capture:
            try:
                raise ValueError("root cause")
            except ValueError:
                raise RuntimeError("outer error")

        self.assertEqual(format_exception_chain(capture.exception), "outer error: root cause")

    def test_empty_message_falls_back_to_type_name(self):
        self.assertEqual(format_exception_chain(ValueError()), "ValueError")

    def test_stops_at_non_exception_links(self):
        with self.assertRaises(RuntimeError) as capture:
            try:
                raise KeyboardInterrupt("internal detail")
            except BaseException as inner:
                raise RuntimeError("outer error") from inner

        self.assertEqual(format_exception_chain(capture.exception), "outer error")

    def test_dataset_import_error_reports_underlying_reason(self):
        # A dataset that looks like YOLO 1.1 but is missing obj.names:
        # datumaro reports a generic "Failed to import dataset" error, and only
        # the underlying FileNotFoundError holds the actual reason
        with TemporaryDirectory() as tmp_dir:
            with open(osp.join(tmp_dir, "obj.data"), "w") as f:
                f.write("classes = 1\ntrain = train.txt\nnames = obj.names\nbackup = backup/\n")
            with open(osp.join(tmp_dir, "train.txt"), "w") as f:
                f.write("obj_train_data/img1.jpg\n")

            with self.assertRaises((DatasetError, DatasetImportError, DatasetNotFoundError)) as c:
                Dataset.import_from(tmp_dir, "yolo").init_cache()

        message = format_exception_chain(c.exception)
        self.assertIn("Failed to import dataset 'yolo'", message)
        self.assertIn("obj.names", message)
