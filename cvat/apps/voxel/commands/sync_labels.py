import io
import os
from django.conf import settings
from cvat.apps.voxel.commands.voxel_command import VoxelCommand
from google.cloud import storage
from google.oauth2 import service_account
from cvat.apps.dataset_manager.bindings import TaskData
from cvat.apps.dataset_manager.formats.cvat import dump_task_anno, dump_as_cvat_interpolation
from google.cloud.secretmanager import SecretManagerServiceClient
import json
import boto3

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

    def _sanitize_video_uuid(self, video_uuid: str) -> str:
        """Sanitize UUIDs since it most likely comes from CVAT task name."""
        # Strip file extensions
        return video_uuid.strip().split(".")[0]

    def _sync_cvat_xml_to_gcs(self, cvat_xml: str):
        """Pushes CVAT XML to Google Cloud Storage bucket."""
        project = os.getenv("VOXEL_GCP_PROJECT", "missing_env_var_VOXEL_GCP_PROJECT")
        secret_manager_client = SecretManagerServiceClient(credentials=self.credentials)
        name = f"projects/{project}/secrets/S3_ACCESS/versions/"
        response = secret_manager_client.access_secret_version(request={"name": name})
        payload = response.payload.data.decode("UTF-8")
        s3_access = json.loads(payload)
        os.env["AWS_ACCESS_KEY_ID"] = s3_access["AWS_ACCESS_KEY_ID"]
        os.env["AWS_SECRET_ACCESS_KEY"] = s3_access["AWS_ACCESS_SECRET"]

        bucket = client.bucket(settings.VOXEL_LABEL_BUCKET_NAME)
        client = boto3.client("s3")
        blob_name = f"{self.video_uuid}.xml"
        client.put_object(
            Bucket=bucket,
            Body=cvat_xml,
            Key=blob_name
        )

    def execute(self, task_data: TaskData):
        xml_stream = io.StringIO()
        dump_task_anno(xml_stream, task_data, dump_as_cvat_interpolation)
        cvat_xml = xml_stream.getvalue()
        self._sync_cvat_xml_to_gcs(cvat_xml)
