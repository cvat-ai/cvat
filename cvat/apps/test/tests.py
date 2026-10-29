
from rest_framework import status

from cvat.apps.engine.models import Job, Label, LabeledShape
from cvat.apps.engine.tests.test_rest_api import (
    create_db_users,
    create_dummy_db_tasks,
)
from cvat.apps.engine.tests.utils import ApiTestBase, ForceLogin


class AnnotationCountAPITests(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.task = create_dummy_db_tasks(cls)[0]

        cls.label = Label.objects.create(
            task=cls.task,
            name="Test label",
        )

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get(
            f"/api/tasks/{self.task.id}/annotation-counts"
        )
        self.assertEqual(
            response.status_code, status.HTTP_401_UNAUTHORIZED
        )

    def test_task_owner_can_get_empty_counts(self):
        with ForceLogin(self.owner, self.client):
            response = self.client.get(
                f"/api/tasks/{self.task.id}/annotation-counts"
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["task_id"], self.task.id)
        self.assertEqual(response.data["counts"], [])

    def test_user_without_task_access_is_forbidden(self):
        with ForceLogin(self.user, self.client):
            response = self.client.get(
                f"/api/tasks/{self.task.id}/annotation-counts"
            )

        self.assertEqual(
            response.status_code, status.HTTP_403_FORBIDDEN
        )

    def test_annotation_counts_include_existing_shapes(self):
        job = Job.objects.filter(segment__task=self.task).first()
        self.assertIsNotNone(job)

        LabeledShape.objects.create(
            job=job,
            label=self.label,
            frame=0,
            group=0,
            type="rectangle",
            points=[1.0, 2.0, 100.0, 200.0],
            source="manual",
        )

        with ForceLogin(self.owner, self.client):
            response = self.client.get(
                f"/api/tasks/{self.task.id}/annotation-counts"
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["counts"],
            [{"label": self.label.name, "count": 1}],
        )
