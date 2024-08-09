# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import tempfile
import unittest
from typing import Optional

from datumaro import IDataset
from datumaro.components.operations import ExactComparator
from datumaro.util.os_util import rmfile, rmtree

from cvat.apps.dataset_manager.util import current_function_name


class FileRemover:
    def __init__(self, path, is_dir=False):
        self.path = path
        self.is_dir = is_dir

    def __enter__(self):
        return self.path

    def __exit__(self, exc_type=None, exc_value=None, traceback=None):
        if self.is_dir:
            try:
                rmtree(self.path)
            except unittest.SkipTest:
                # Suppress skip test errors from git.util.rmtree
                if not exc_type:
                    raise
        else:
            rmfile(self.path)


class TestDir(FileRemover):
    """
    Creates a temporary directory for a test. Uses the name of
    the test function to name the directory.

    Usage:

    .. code-block::

        with TestDir() as test_dir:
            ...
    """

    def __init__(self, path: Optional[str] = None, frame_id: int = 2):
        if not path:
            prefix = f"temp_{current_function_name(frame_id)}-"
        else:
            prefix = None
        self._prefix = prefix

        super().__init__(path, is_dir=True)

    def __enter__(self) -> str:
        """
        Creates a test directory.

        Returns: path to the directory
        """

        path = self.path

        if path is None:
            path = tempfile.mkdtemp(dir=os.getcwd(), prefix=self._prefix)
            self.path = path
        else:
            os.makedirs(path, exist_ok=False)

        return path


def compare_datasets(expected: IDataset, actual: IDataset):
    comparator = ExactComparator()
    _, unmatched, expected_extra, actual_extra, errors = comparator.compare_datasets(
        expected, actual
    )
    assert not unmatched, f"Datasets have unmatched items: {unmatched}"
    assert not actual_extra, f"Actual has following extra items: {actual_extra}"
    assert not expected_extra, f"Expected has following extra items: {expected_extra}"
    assert not errors, f"There were following errors while comparing datasets: {errors}"
