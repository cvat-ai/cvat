import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from cvat.apps.engine.backup import TaskExporter


class _EmptyManager:
    def all(self):
        return []


class _ImagesManager:
    def __init__(self, images):
        self._images = images

    def all(self):
        return self._images

    def order_by(self, field):
        assert field == "frame"
        return _ImagesManager(sorted(self._images, key=lambda image: image.frame))


class TestTaskBackupExporter(unittest.TestCase):
    def test_downloads_backing_cloud_storage_images_in_frame_order(self):
        images = [
            SimpleNamespace(frame=1, path="1.png"),
            SimpleNamespace(frame=0, path="0.png"),
        ]

        with tempfile.TemporaryDirectory() as tmp_dir:
            exporter = TaskExporter.__new__(TaskExporter)
            exporter.DATA_DIRNAME = TaskExporter.DATA_DIRNAME
            exporter._db_task = mock.Mock()
            exporter._db_data = SimpleNamespace(
                get_upload_dirname=lambda: Path(tmp_dir),
                images=_ImagesManager(images),
                related_files=_EmptyManager(),
            )
            exporter._write_filtered_media_manifest = mock.Mock()
            exporter._write_files = mock.Mock()

            def read_raw_images(*args, **kwargs):
                yield None, f"{tmp_dir}/0.png"
                yield None, f"{tmp_dir}/1.png"

            media_cache = mock.Mock()
            media_cache.read_raw_images.side_effect = read_raw_images

            with mock.patch("cvat.apps.engine.backup.MediaCache", return_value=media_cache):
                exporter._write_data_from_cloud_storage(mock.Mock(), "task")

        media_cache.read_raw_images.assert_called_once_with(
            exporter._db_task, frame_ids=[0, 1], decode=False
        )
