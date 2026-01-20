# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import tempfile
import unittest
from types import TracebackType
from unittest.mock import patch

from datumaro.components.dataset import StreamDataset
from datumaro.util.os_util import rmfile, rmtree

from cvat.apps.dataset_manager.bindings import CvatDataExtractor
from cvat.apps.dataset_manager.task import JobAnnotation
from cvat.apps.dataset_manager.util import current_function_name


class FileRemover:
    def __init__(self, path: str, is_dir: bool = False):
        self.path = path
        self.is_dir = is_dir

    def __enter__(self) -> str:
        return self.path

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
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

    def __init__(self, path: str | None = None, frame_id: int = 2):
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


def ensure_streaming_importers(cls):
    original_import_from = StreamDataset.import_from

    def mock_import_from(*args, **kwargs):
        dataset = original_import_from(*args, **kwargs)
        extractor = dataset._data._source

        annotation_initiation_counter = 0

        class ExtractorWrapper:
            def __getattr__(self, attr):
                return getattr(extractor, attr)

            def __len__(self):
                return len(extractor)

            def __iter__(self):
                nonlocal annotation_initiation_counter
                for item in extractor:
                    yield item
                    if item.annotations_are_initialized:
                        annotation_initiation_counter += 1
                    # annotations should be initialized once per item and no more
                    assert annotation_initiation_counter <= len(extractor)

        dataset._data._source = ExtractorWrapper()

        return dataset

    return patch.object(StreamDataset, "import_from", mock_import_from)(cls)


def ensure_extractors_efficiency(cls):
    class MockExtractor(CvatDataExtractor):
        def __init__(self, *args, **kwargs):
            self.ann_init_counter = 0
            super().__init__(*args, **kwargs)

        def _read_cvat_anno(self, *args, **kwargs):
            self.ann_init_counter += 1
            # annotations should be initialized once per item and no more
            assert self.ann_init_counter <= len(self)
            return super()._read_cvat_anno(*args, **kwargs)

    class MockJobAnnotation(JobAnnotation):
        def _init_shapes_from_db(self, *, streaming: bool = False):
            super()._init_shapes_from_db(streaming=streaming)

            assert isinstance(self.ir_data.shapes, list) != streaming

            if streaming:
                # should only generate shapes once
                shapes = self.ir_data.shapes

                already_iterated = False

                class SinglePass:
                    def __iter__(self):
                        return self

                    def __next__(self):
                        nonlocal already_iterated
                        assert not already_iterated
                        try:
                            return next(shapes)
                        except StopIteration:
                            already_iterated = True
                            raise

                self.ir_data.shapes = SinglePass()

    cls = patch(
        "cvat.apps.dataset_manager.bindings.CvatDataExtractor",
        MockExtractor,
    )(cls)
    cls = patch(
        "cvat.apps.dataset_manager.task.JobAnnotation",
        MockJobAnnotation,
    )(cls)
    return cls
