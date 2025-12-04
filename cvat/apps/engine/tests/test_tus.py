# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, Mock, mock_open, patch

from cvat.apps.engine.tus import TusChunk, TusFile


class TestTusFileWriteChunk(unittest.TestCase):
    """Tests for TusFile.__write_chunk_data method to ensure streaming upload works correctly"""

    @staticmethod
    def _create_mock_chunk(size, offset=0, mock_request=None):
        """Helper method to create a mock TusChunk with specified parameters"""
        chunk = TusChunk.__new__(TusChunk)
        chunk.offset = offset
        chunk.size = size
        chunk.request = mock_request
        chunk.BUFFER_SIZE = TusChunk.BUFFER_SIZE
        return chunk

    def test_write_chunk_data_reads_in_small_buffers(self):
        """Test that data is read in BUFFER_SIZE chunks, not all at once"""
        mock_request = Mock()
        chunk_data = b"x" * (TusChunk.BUFFER_SIZE * 2 + 1000)
        mock_request.read = Mock(
            side_effect=[
                chunk_data[: TusChunk.BUFFER_SIZE],
                chunk_data[TusChunk.BUFFER_SIZE : TusChunk.BUFFER_SIZE * 2],
                chunk_data[TusChunk.BUFFER_SIZE * 2 :],  # Remaining 1000 bytes
            ]
        )

        chunk = self._create_mock_chunk(len(chunk_data), offset=0, mock_request=mock_request)

        mock_file = Mock()
        mock_file.write = Mock(return_value=None)

        tus_file = TusFile.__new__(TusFile)

        bytes_written = tus_file._TusFile__write_chunk_data(chunk, mock_file)

        assert bytes_written == len(chunk_data)
        assert mock_request.read.call_count == 3
        assert mock_file.write.call_count == 3

        mock_request.read.assert_any_call(TusChunk.BUFFER_SIZE)
        mock_request.read.assert_any_call(TusChunk.BUFFER_SIZE)
        mock_request.read.assert_any_call(1000)

    def test_write_chunk_data_handles_interrupted_upload(self):
        """Test that interrupted upload saves partial data and returns actual bytes written"""
        mock_request = Mock()
        expected_data = b"x" * TusChunk.BUFFER_SIZE * 3
        mock_request.read = Mock(
            side_effect=[
                expected_data[: TusChunk.BUFFER_SIZE],
                expected_data[TusChunk.BUFFER_SIZE : TusChunk.BUFFER_SIZE * 2],
                b"",  # Connection interrupted - returns empty bytes
            ]
        )

        chunk = self._create_mock_chunk(len(expected_data), offset=0, mock_request=mock_request)

        mock_file = Mock()
        written_data = []
        mock_file.write = Mock(side_effect=lambda data: written_data.append(data))

        tus_file = TusFile.__new__(TusFile)

        bytes_written = tus_file._TusFile__write_chunk_data(chunk, mock_file)

        assert bytes_written == TusChunk.BUFFER_SIZE * 2
        assert len(written_data) == 2
        assert mock_file.write.call_count == 2
        assert b"".join(written_data) == expected_data[: TusChunk.BUFFER_SIZE * 2]

    def test_write_chunk_data_with_exact_buffer_size(self):
        """Test writing data that is exactly BUFFER_SIZE"""
        mock_request = Mock()
        chunk_data = b"a" * TusChunk.BUFFER_SIZE
        mock_request.read = Mock(return_value=chunk_data)

        chunk = self._create_mock_chunk(TusChunk.BUFFER_SIZE, offset=0, mock_request=mock_request)

        mock_file = Mock()
        mock_file.write = Mock(return_value=None)

        tus_file = TusFile.__new__(TusFile)

        bytes_written = tus_file._TusFile__write_chunk_data(chunk, mock_file)

        assert bytes_written == TusChunk.BUFFER_SIZE
        assert mock_request.read.call_count == 1
        mock_request.read.assert_called_once_with(TusChunk.BUFFER_SIZE)
        assert mock_file.write.call_count == 1

    def test_write_chunk_data_with_small_chunk(self):
        """Test writing data smaller than BUFFER_SIZE"""
        mock_request = Mock()
        chunk_data = b"small data"
        mock_request.read = Mock(return_value=chunk_data)

        chunk = self._create_mock_chunk(len(chunk_data), offset=0, mock_request=mock_request)

        mock_file = Mock()
        mock_file.write = Mock(return_value=None)

        tus_file = TusFile.__new__(TusFile)

        bytes_written = tus_file._TusFile__write_chunk_data(chunk, mock_file)

        assert bytes_written == len(chunk_data)
        mock_request.read.assert_called_once_with(len(chunk_data))
        mock_file.write.assert_called_once_with(chunk_data)

    def test_write_chunk_data_empty_request(self):
        """Test handling of immediately interrupted connection (no data read)"""
        mock_request = Mock()
        mock_request.read = Mock(return_value=b"")

        chunk = self._create_mock_chunk(1000, offset=0, mock_request=mock_request)

        mock_file = Mock()
        mock_file.write = Mock(return_value=None)

        tus_file = TusFile.__new__(TusFile)

        bytes_written = tus_file._TusFile__write_chunk_data(chunk, mock_file)

        assert bytes_written == 0
        assert mock_file.write.call_count == 0

    def test_write_chunk_integration_with_real_file(self):
        """Integration test with real file I/O operations"""
        import json
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            chunk_data = b"test data for upload" * 100  # 2000 bytes
            mock_request = Mock()
            mock_request.read = Mock(return_value=chunk_data)

            from cvat.apps.engine.tus import TusFile

            metadata = TusFile.TusMeta(
                file_size=len(chunk_data) + 100, offset=100, filename="test_file.dat"
            )

            file_id = TusFile.FileID(user_id=123)

            file_path = temp_path / file_id.as_str
            meta_path = temp_path / (file_id.as_str + ".meta")

            with open(file_path, "wb") as f:
                f.write(b"\0" * (len(chunk_data) + 100))

            with open(meta_path, "w") as f:
                json.dump(
                    {
                        "file_size": metadata.file_size,
                        "offset": metadata.offset,
                        "filename": metadata.filename,
                    },
                    f,
                )

            tus_file = TusFile(file_id=file_id, upload_dir=temp_path)
            tus_file.meta_file.init_from_file()

            chunk = self._create_mock_chunk(len(chunk_data), offset=100, mock_request=mock_request)

            tus_file.write_chunk(chunk)

            with open(file_path, "rb") as f:
                content = f.read()

            self.assertEqual(content[:100], b"\0" * 100)
            self.assertEqual(content[100 : 100 + len(chunk_data)], chunk_data)

            with open(meta_path, "r") as f:
                meta_data = json.load(f)

            self.assertEqual(meta_data["offset"], 100 + len(chunk_data))
            self.assertEqual(tus_file.offset, 100 + len(chunk_data))

    def test_write_chunk_integration_interrupted_upload_with_real_file(self):
        """Integration test: interrupted upload saves partial data to real file"""
        import json
        import tempfile

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            full_data = b"X" * (TusChunk.BUFFER_SIZE * 3)

            mock_request = Mock()
            mock_request.read = Mock(
                side_effect=[
                    full_data[: TusChunk.BUFFER_SIZE],
                    full_data[TusChunk.BUFFER_SIZE : TusChunk.BUFFER_SIZE * 2],
                    b"",  # Connection interrupted
                ]
            )

            from cvat.apps.engine.tus import TusFile

            metadata = TusFile.TusMeta(
                file_size=len(full_data), offset=0, filename="test_interrupted.dat"
            )

            file_id = TusFile.FileID(user_id=456)
            file_path = temp_path / file_id.as_str
            meta_path = temp_path / (file_id.as_str + ".meta")

            with open(file_path, "wb") as f:
                f.write(b"\0" * len(full_data))

            with open(meta_path, "w") as f:
                json.dump(
                    {"file_size": metadata.file_size, "offset": 0, "filename": metadata.filename}, f
                )

            tus_file = TusFile(file_id=file_id, upload_dir=temp_path)
            tus_file.meta_file.init_from_file()

            chunk = self._create_mock_chunk(len(full_data), offset=0, mock_request=mock_request)

            # Act: write chunk (will be interrupted)
            tus_file.write_chunk(chunk)

            with open(file_path, "rb") as f:
                content = f.read()

            expected_written = TusChunk.BUFFER_SIZE * 2
            self.assertEqual(content[:expected_written], full_data[:expected_written])
            self.assertEqual(
                content[expected_written:], b"\0" * (len(full_data) - expected_written)
            )

            with open(meta_path, "r") as f:
                meta_data = json.load(f)

            self.assertEqual(meta_data["offset"], expected_written)
            self.assertFalse(tus_file.is_complete())

            self.assertEqual(tus_file.offset, expected_written)
