import io
import os
from django.conf import settings
from cvat.apps.voxel.commands.voxel_command import VoxelCommand
from google.cloud import storage
from google.oauth2 import service_account
from cvat.apps.dataset_manager.formats.cvat import dump_as_cvat_interpolation


class SyncLabels(VoxelCommand):
    """Syncs task labels to Google Cloud."""

    def __init__(self, task_id, video_uuid):
        self.task_id = task_id
        self.video_uuid = self._sanitize_video_uuid(video_uuid)
        # NOTE: this file needs to be available in the prod Docker container
        key_filename = os.getenv("VOXEL_KEY_FILENAME", "missing_env_var_VOXEL_KEY_FILENAME")
        key_path = f"{os.getcwd()}/voxel_keys/{key_filename}"
        self.credentials = (
            service_account.Credentials.from_service_account_file(key_path)
        )

    def _sanitize_video_uuid(self, video_uuid):
        """Sanitize UUIDs since it most likely comes from CVAT task name."""
        # Strip file extensions
        return video_uuid.strip().split(".")[0]

    def _sync_cvat_xml_to_gcs(self, cvat_xml):
        """Pushes CVAT XML to Google Cloud Storage bucket."""
        project = os.getenv("VOXEL_GCP_PROJECT", "missing_env_var_VOXEL_GCP_PROJECT")
        client = storage.Client(
            credentials=self.credentials, project=project)
        bucket = client.bucket(settings.VOXEL_LABEL_BUCKET_NAME)
        blob_name = f"{self.video_uuid}.xml"
        blob = bucket.blob(blob_name)
        blob.upload_from_string(cvat_xml, content_type='text/xml')

    def execute(self, task_annotation):
        xml_stream = io.StringIO()
        task_annotation.export(xml_stream, dump_as_cvat_interpolation)
        cvat_xml = xml_stream.getvalue()
        self._sync_cvat_xml_to_gcs(cvat_xml)
