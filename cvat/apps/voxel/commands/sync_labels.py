import datetime
import io
import os
from django.conf import settings
from cvat.apps.voxel.commands.voxel_command import VoxelCommand
from google.cloud import firestore
from google.oauth2 import service_account
from cvat.apps.dataset_manager.formats.cvat import dump_as_cvat_interpolation


class SyncLabels(VoxelCommand):
    """Syncs task labels to Firestore."""

    def __init__(self, task_id, video_uuid):
        self.task_id = task_id
        self.video_uuid = self._sanitize_video_uuid(video_uuid)
        # Note: this file needs to be available in the prod Docker container
        key_path = '{}/keys/sodium-carving-227300-6d23b84328c2.json'.format(os.getcwd())
        credentials = service_account.Credentials.from_service_account_file(key_path)
        self.db = firestore.Client(credentials=credentials, project="sodium-carving-227300")

    def _sanitize_video_uuid(self, video_uuid):
        """Sanitize UUIDs since it most likely comes from CVAT task name."""
        # Strip file extensions
        return video_uuid.strip().split('.')[0]

    def execute(self, task_annotation):
        cvat_xml = io.StringIO()
        task_annotation.export(cvat_xml, dump_as_cvat_interpolation)

        # TODO: Convert CVAT XML to our JSON format
        # This may be better as a cloud function so we don't have to duplicate
        # this logic between CVAT and voxelsafety repositories.

        # convertor = Convertor(self.video_uuid, xml=cvat_xml)
        # convertor.parse()
        # internal_json = convertor.get_label_json()

        collection = settings.VOXEL_LABEL_FIRESTORE_COLLECTION
        doc_ref = self.db.collection(collection).document(self.video_uuid)
        doc_ref.set({
            'cvat_task_id': self.task_id,
            'updated_at': datetime.datetime.utcnow(),
            'cvat_xml': cvat_xml.getvalue(),
            # 'internal_json': internal_json,
        }, merge=True)