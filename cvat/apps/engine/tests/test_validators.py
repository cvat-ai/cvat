# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest
from pathlib import Path

from rest_framework import serializers

from cvat.apps.engine.serializers import CanonicalRelativePathValidator
from cvat.utils.paths import join_untrusted_path


class TestCanonicalRelativePathValidator(unittest.TestCase):
    def test_safe_paths(self):
        validator = CanonicalRelativePathValidator()

        for path in ["image.jpg", "images/image.jpg", "images/nested/manifest.jsonl"]:
            with self.subTest(path=path):
                validator(path)

    def test_safe_paths_with_trailing_slash(self):
        validator = CanonicalRelativePathValidator(allow_trailing_slash=True)

        for path in ["image.jpg", "images/", "images/nested/"]:
            with self.subTest(path=path):
                validator(path)

    def test_unsafe_paths(self):
        validator = CanonicalRelativePathValidator()

        for path, expected_message in [
            ("", "path is empty"),
            ("/image.jpg", "path is not relative"),
            ("../image.jpg", "path contains a '..' segment"),
            ("images/..", "path contains a '..' segment"),
            ("images/../image.jpg", "path contains a '..' segment"),
            ("images/", "path has a trailing slash"),
            ("./image.jpg", "path is not in canonical form"),
            ("images//image.jpg", "path is not in canonical form"),
        ]:
            with self.subTest(path=path):
                with self.assertRaises(serializers.ValidationError) as ex:
                    validator(path)
                self.assertEqual(ex.exception.detail[0], expected_message)

    def test_unsafe_paths_with_trailing_slash(self):
        validator = CanonicalRelativePathValidator(allow_trailing_slash=True)

        for path, expected_message in [
            ("/", "path is not relative"),
            ("/images/", "path is not relative"),
            ("../images/", "path contains a '..' segment"),
            ("images/../", "path contains a '..' segment"),
            ("./images/", "path is not in canonical form"),
            ("images//nested/", "path is not in canonical form"),
            ("images//", "path is not in canonical form"),
        ]:
            with self.subTest(path=path):
                with self.assertRaises(serializers.ValidationError) as ex:
                    validator(path)
                self.assertEqual(ex.exception.detail[0], expected_message)


class TestPathUtils(unittest.TestCase):
    def test_join_untrusted_path(self):
        root = Path(__file__).parent
        self.assertEqual(join_untrusted_path(root, "file.txt"), root / "file.txt")

        with self.assertRaises(ValueError):
            join_untrusted_path(root, "../file.txt")
