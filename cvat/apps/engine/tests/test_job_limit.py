from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from cvat.apps.engine import models
from cvat.apps.engine.task import _create_segments_and_jobs, _generate_segment_params


class TestGenerateSegmentParams(TestCase):
    """
    Tests for _generate_segment_params function to verify job_size calculation
    """

    def setUp(self):
        """Set up test fixtures"""
        self.db_task = MagicMock(spec=models.Task)
        self.db_task.segment_size = 10
        self.db_task.overlap = 0
        self.db_task.mode = "annotation"
        self.db_task.data = MagicMock()
        self.db_task.data.size = 100

    def test_generate_segment_params_without_job_file_mapping(self):
        segments_params = _generate_segment_params(
            db_task=self.db_task,
            data_size=100,
        )

        self.assertEqual(segments_params.segment_size, 10)
        self.assertEqual(segments_params.overlap, 0)
        self.assertEqual(segments_params.job_size, 10)

    def test_generate_segment_params_with_overlap(self):
        self.db_task.segment_size = 10
        self.db_task.overlap = 2

        segments_params = _generate_segment_params(
            db_task=self.db_task,
            data_size=100,
        )

        self.assertEqual(segments_params.overlap, 2)
        self.assertEqual(segments_params.job_size, 13)

    def test_generate_segment_params_with_job_file_mapping(self):
        job_file_mapping = [
            ["file1.jpg", "file2.jpg"],
            ["file3.jpg", "file4.jpg", "file5.jpg"],
            ["file6.jpg"],
        ]

        segments_params = _generate_segment_params(
            db_task=self.db_task,
            job_file_mapping=job_file_mapping,
        )

        self.assertEqual(segments_params.job_size, 3)
        self.assertEqual(segments_params.segment_size, 0)
        self.assertEqual(segments_params.overlap, 0)

    def test_generate_segment_params_with_large_segment_size(self):
        self.db_task.segment_size = 200

        segments_params = _generate_segment_params(
            db_task=self.db_task,
            data_size=100,
        )

        self.assertEqual(segments_params.segment_size, 100)
        self.assertEqual(segments_params.job_size, 1)

    def test_generate_segment_params_with_interpolation_mode(self):
        self.db_task.mode = "interpolation"
        self.db_task.overlap = None
        self.db_task.segment_size = 20

        segments_params = _generate_segment_params(
            db_task=self.db_task,
            data_size=100,
        )

        self.assertEqual(segments_params.overlap, 5)
        self.assertEqual(segments_params.job_size, 7)


class TestCreateSegmentsAndJobs(TestCase):
    """
    Tests for _create_segments_and_jobs function to verify MAX_JOBS_PER_TASK validation
    """

    def setUp(self):
        """Set up test fixtures"""
        self.db_task = MagicMock(spec=models.Task)
        self.db_task.id = 1
        self.db_task.segment_size = 10
        self.db_task.overlap = 0
        self.db_task.mode = "annotation"
        self.db_task.consensus_replicas = 0
        self.db_task.data = MagicMock()
        self.db_task.data.size = 100
        self.db_task.data.save = MagicMock()
        self.db_task.save = MagicMock()

        self.update_status_callback = MagicMock()

    @override_settings(MAX_JOBS_PER_TASK=10)
    @patch("cvat.apps.engine.task.models.Segment")
    @patch("cvat.apps.engine.task.models.Job")
    @patch("cvat.apps.engine.task.slogger")
    def test_create_segments_and_jobs_within_limit(
        self, mock_slogger, mock_job_class, mock_segment_class
    ):
        mock_segment = MagicMock()
        mock_segment_class.return_value = mock_segment
        mock_job = MagicMock()
        mock_job_class.return_value = mock_job
        mock_job.make_dirs = MagicMock()

        _create_segments_and_jobs(
            db_task=self.db_task,
            update_status_callback=self.update_status_callback,
        )

        self.assertEqual(mock_job_class.call_count, 10)

    @override_settings(MAX_JOBS_PER_TASK=5)
    def test_create_segments_and_jobs_exceeds_limit(self):
        with self.assertRaises(ValueError) as context:
            _create_segments_and_jobs(
                db_task=self.db_task,
                update_status_callback=self.update_status_callback,
            )

        self.assertIn("10", str(context.exception))
        self.assertIn("5", str(context.exception))

    @override_settings(MAX_JOBS_PER_TASK=50)
    @patch("cvat.apps.engine.task.models.Segment")
    @patch("cvat.apps.engine.task.models.Job")
    @patch("cvat.apps.engine.task.slogger")
    def test_create_segments_and_jobs_with_consensus_replicas(
        self, mock_slogger, mock_job_class, mock_segment_class
    ):
        self.db_task.consensus_replicas = 2

        mock_segment = MagicMock()
        mock_segment_class.return_value = mock_segment
        mock_job = MagicMock()
        mock_job_class.return_value = mock_job
        mock_job.id = 1
        mock_job.make_dirs = MagicMock()

        _create_segments_and_jobs(
            db_task=self.db_task,
            update_status_callback=self.update_status_callback,
        )
        self.assertEqual(mock_job_class.call_count, 30)

    @override_settings(MAX_JOBS_PER_TASK=20)
    def test_create_segments_and_jobs_with_consensus_replicas_exceeds_limit(self):
        self.db_task.consensus_replicas = 2

        with self.assertRaises(ValueError) as context:
            _create_segments_and_jobs(
                db_task=self.db_task,
                update_status_callback=self.update_status_callback,
            )

        self.assertIn("30", str(context.exception))
        self.assertIn("20", str(context.exception))

    @override_settings(MAX_JOBS_PER_TASK=15)
    @patch("cvat.apps.engine.task.models.Segment")
    @patch("cvat.apps.engine.task.models.Job")
    @patch("cvat.apps.engine.task.slogger")
    def test_create_segments_and_jobs_with_job_file_mapping(
        self, mock_slogger, mock_job_class, mock_segment_class
    ):
        job_file_mapping = [
            ["file1.jpg", "file2.jpg"],
            ["file3.jpg", "file4.jpg", "file5.jpg"],
            ["file6.jpg"],
        ]

        mock_segment = MagicMock()
        mock_segment_class.return_value = mock_segment
        mock_job = MagicMock()
        mock_job_class.return_value = mock_job
        mock_job.make_dirs = MagicMock()

        _create_segments_and_jobs(
            db_task=self.db_task,
            update_status_callback=self.update_status_callback,
            job_file_mapping=job_file_mapping,
        )

        self.assertEqual(mock_job_class.call_count, 3)

    @override_settings(MAX_JOBS_PER_TASK=2)
    def test_create_segments_and_jobs_with_job_file_mapping_exceeds_limit(self):
        job_file_mapping = [
            ["file1.jpg", "file2.jpg"],
            ["file3.jpg", "file4.jpg", "file5.jpg"],
            ["file6.jpg"],
        ]

        with self.assertRaises(ValueError) as context:
            _create_segments_and_jobs(
                db_task=self.db_task,
                update_status_callback=self.update_status_callback,
                job_file_mapping=job_file_mapping,
            )

        self.assertIn("3", str(context.exception))
        self.assertIn("2", str(context.exception))
