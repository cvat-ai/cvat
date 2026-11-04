# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os.path as osp
from tempfile import TemporaryDirectory

from datumaro.components.dataset import Dataset
from datumaro.components.errors import DatasetError, DatasetImportError, DatasetNotFoundError
from django.test import SimpleTestCase

from cvat.apps.dataset_manager.util import format_exception_chain, format_import_exception


class FormatExceptionChainTest(SimpleTestCase):
    def test_can_include_all_causes(self):
        with self.assertRaises(RuntimeError) as capture:
            try:
                raise ValueError("root cause")
            except ValueError as inner:
                raise RuntimeError("outer error") from inner

        self.assertEqual(format_exception_chain(capture.exception), "outer error: root cause")

    def test_can_skip_messages_embedded_in_previous_links(self):
        with self.assertRaises(RuntimeError) as capture:
            try:
                raise ValueError("root cause")
            except ValueError as inner:
                raise RuntimeError(f"outer error: {inner}") from inner

        self.assertEqual(format_exception_chain(capture.exception), "outer error: root cause")

    def test_can_keep_a_short_message_included_in_an_outer_one(self):
        with self.assertRaises(RuntimeError) as capture:
            try:
                {}["x"]
            except KeyError as inner:
                raise RuntimeError("failed at '/tmp/tmp0abc'") from inner

        self.assertEqual(format_exception_chain(capture.exception), "failed at '/tmp/tmp0abc': 'x'")

    def test_can_follow_implicit_context(self):
        with self.assertRaises(RuntimeError) as capture:
            try:
                raise ValueError("root cause")
            except ValueError:
                raise RuntimeError("outer error")

        self.assertEqual(format_exception_chain(capture.exception), "outer error: root cause")

    def test_can_fall_back_to_type_name_on_empty_message(self):
        self.assertEqual(format_exception_chain(ValueError()), "ValueError")

    def test_can_skip_ignored_links(self):
        with self.assertRaises(RuntimeError) as capture:
            try:
                try:
                    raise ValueError("root cause")
                except ValueError as innermost:
                    raise TypeError("ignored error") from innermost
            except TypeError as inner:
                raise RuntimeError("outer error") from inner

        self.assertEqual(
            format_exception_chain(capture.exception, ignore=lambda ex: isinstance(ex, TypeError)),
            "outer error: root cause",
        )

    def test_can_limit_the_chain_depth(self):
        with self.assertRaises(RuntimeError) as capture:
            try:
                try:
                    raise ValueError("deepest cause")
                except ValueError as innermost:
                    raise ValueError("root cause") from innermost
            except ValueError as inner:
                raise RuntimeError("outer error") from inner

        self.assertEqual(
            format_exception_chain(capture.exception, max_depth=2), "outer error: root cause"
        )

    def test_can_limit_the_message_length(self):
        self.assertEqual(
            format_exception_chain(ValueError("a" * 100), max_length=10), "aaaaaaaaaa..."
        )

    def test_can_stop_at_non_exception_links(self):
        with self.assertRaises(RuntimeError) as capture:
            try:
                raise KeyboardInterrupt("internal detail")
            except BaseException as inner:
                raise RuntimeError("outer error") from inner

        self.assertEqual(format_exception_chain(capture.exception), "outer error")


class FormatImportExceptionTest(SimpleTestCase):
    def test_can_skip_the_datumaro_import_context_error(self):
        with self.assertRaises(RuntimeError) as capture:
            try:
                raise TypeError("Base.__init__() got an unexpected keyword argument 'ctx'")
            except TypeError:
                raise RuntimeError("outer error")

        self.assertEqual(format_import_exception(capture.exception), "outer error")

    def test_can_skip_private_exception_types(self):
        class _InternalError(Exception):
            pass

        with self.assertRaises(RuntimeError) as capture:
            try:
                raise ValueError("root cause")
            except ValueError as innermost:
                try:
                    raise _InternalError("internal detail") from innermost
                except _InternalError as inner:
                    raise RuntimeError("outer error") from inner

        self.assertEqual(format_import_exception(capture.exception), "outer error: root cause")

    def test_can_report_underlying_reason_of_dataset_import_error(self):
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

        message = format_import_exception(c.exception)
        self.assertIn("Failed to import dataset 'yolo'", message)
        self.assertIn("obj.names", message)
