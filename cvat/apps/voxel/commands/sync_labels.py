import datetime
import io
import os
from django.conf import settings
from cvat.apps.voxel.commands.voxel_command import VoxelCommand
from google.cloud import firestore
from google.cloud import storage
from google.oauth2 import service_account
from cvat.apps.dataset_manager.formats.cvat import dump_as_cvat_interpolation

_GCP_PROJECT = "sodium-carving-227300"


class SyncLabels(VoxelCommand):
    """Syncs task labels to Google Cloud."""

    def __init__(self, task_id, video_uuid):
        self.task_id = task_id
        self.video_uuid = self._sanitize_video_uuid(video_uuid)
        # Note: this file needs to be available in the prod Docker container
        key_path = '{}/voxel_keys/sodium-carving-227300-6d23b84328c2.json'.format(
            os.getcwd())
        self.credentials = service_account.Credentials.from_service_account_file(
            key_path)

    def _sanitize_video_uuid(self, video_uuid):
        """Sanitize UUIDs since it most likely comes from CVAT task name."""
        # Strip file extensions
        return video_uuid.strip().split('.')[0]

    def _sync_to_firestore(self, cvat_xml):
        # TODO: Convert CVAT XML to our JSON format
        # This may be better as a cloud function so we don't have to duplicate
        # this logic between CVAT and voxelsafety repositories.
        #     convertor = Convertor(self.video_uuid, xml=cvat_xml)
        #     convertor.parse()
        #     internal_json = convertor.get_label_json()
        db = firestore.Client(
            credentials=self.credentials, project=_GCP_PROJECT)
        collection = settings.VOXEL_LABEL_FIRESTORE_COLLECTION
        doc_ref = db.collection(collection).document(self.video_uuid)
        doc_ref.set({
            'cvat_task_id': self.task_id,
            'updated_at': datetime.datetime.utcnow(),
            'cvat_xml': cvat_xml,
            # 'internal_json': internal_json,
        }, merge=True)

    def _sync_cvat_xml_to_gcs(self, cvat_xml):
        """Pushes CVAT XML to Google Cloud Storage bucket."""
        client = storage.Client(
            credentials=self.credentials, project=_GCP_PROJECT)
        bucket = client.bucket(settings.VOXEL_LABEL_BUCKET_NAME)
        blob_name = '{}.xml'.format(self.video_uuid)
        blob = bucket.blob(blob_name)
        blob.upload_from_string(cvat_xml, content_type='text/xml')

    def execute(self, task_annotation):
        xml_stream = io.StringIO()
        task_annotation.export(xml_stream, dump_as_cvat_interpolation)
        cvat_xml = xml_stream.getvalue()
        self._sync_cvat_xml_to_gcs(cvat_xml)
        # self._sync_to_firestore(cvat_xml)
