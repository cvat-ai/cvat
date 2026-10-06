# SPDX-License-Identifier: MIT

from rest_framework import status

from cvat.apps.engine.models import (
    Label,
    LabeledImage,
    LabeledShape,
    LabeledTrack,
    MediaType,
    ShapeType,
    TaskMode,
)
from cvat.apps.engine.tests.test_rest_api import create_db_task, create_db_users
from cvat.apps.engine.tests.utils import ApiTestBase, ForceLogin


def create_task(owner, label_names):
    # 10 images split into 2 jobs of 5 images each
    return create_db_task(
        {
            "name": "annotation counts",
            "owner": owner,
            "overlap": 0,
            "segment_size": 5,
            "image_quality": 50,
            "size": 10,
            "media_type": MediaType.IMAGE,
            "mode": TaskMode.ANNOTATION,
            "labels": [{"name": name} for name in label_names],
        }
    )


class AnnotationCountsTest(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

        cls.task = create_task(cls.owner, ["cat", "dog", "bird"])
        cat, dog = (cls.task.label_set.get(name=name) for name in ("cat", "dog"))
        job1, job2 = (segment.job_set.get() for segment in cls.task.segment_set.order_by("id"))

        def shape(job, label, frame, type=ShapeType.RECTANGLE, **kwargs):
            return LabeledShape.objects.create(
                job=job, label=label, frame=frame, type=type, **kwargs
            )

        # cat: 5 objects
        shape(job1, cat, 0, group=0)  # 1: no group
        shape(job2, cat, 6, group=None)  # 2: no group, in the second job
        shape(job1, cat, 1, group=1)  # 3: two pieces of one object
        shape(job1, cat, 1, group=1)
        shape(job1, cat, 2, group=1)  # 4: the same group number on another frame
        skeleton = shape(job1, cat, 3, type=ShapeType.SKELETON)  # 5: a skeleton
        cat_point = Label.objects.create(task=cls.task, name="cat-point", parent=cat)
        shape(job1, cat_point, 3, parent=skeleton, type=ShapeType.POINTS)  # its point is skipped

        # dog: 2 objects
        LabeledTrack.objects.create(job=job2, label=dog, frame=5)
        LabeledImage.objects.create(job=job1, label=dog, frame=0)

        # bird: no annotations

        # annotations of another task must not be counted
        other_task = create_task(cls.owner, ["cat"])
        other_job = other_task.segment_set.first().job_set.get()
        shape(other_job, other_task.label_set.get(), 0)

        cls.empty_task = create_task(cls.owner, ["cat", "dog"])

    def _get_counts(self, user, task):
        with ForceLogin(user, self.client):
            return self.client.get(f"/api/test/tasks/{task.id}/annotation-counts")

    def test_counts_objects_per_label(self):
        response = self._get_counts(self.admin, self.task)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 7)
        self.assertEqual(
            [(label["name"], label["count"]) for label in response.data["labels"]],
            [("cat", 5), ("dog", 2), ("bird", 0)],
        )

    def test_counts_per_shape_type(self):
        with ForceLogin(self.admin, self.client):
            response = self.client.get(
                f"/api/test/tasks/{self.task.id}/annotation-counts", {"group_by": "shape_type"}
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [(label["name"], label["shape_types"]) for label in response.data["labels"]],
            [
                ("cat", {"rectangle": 4, "skeleton": 1}),
                ("dog", {"other": 2}),  # a track and a tag have no single shape type
                ("bird", {}),
            ],
        )

    def test_unknown_grouping_is_refused(self):
        with ForceLogin(self.admin, self.client):
            response = self.client.get(
                f"/api/test/tasks/{self.task.id}/annotation-counts", {"group_by": "frame"}
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_task_without_annotations(self):
        response = self._get_counts(self.admin, self.empty_task)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 0)
        self.assertEqual(
            [(label["name"], label["count"]) for label in response.data["labels"]],
            [("cat", 0), ("dog", 0)],
        )

    def test_owner_can_see_counts(self):
        response = self._get_counts(self.owner, self.task)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_without_access_is_refused(self):
        response = self._get_counts(self.user, self.task)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_request_without_login_is_refused(self):
        response = self._get_counts(None, self.task)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
