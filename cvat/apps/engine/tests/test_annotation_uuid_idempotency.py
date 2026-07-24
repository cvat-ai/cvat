# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import uuid

from django.contrib.auth.models import User
from django.test import TestCase

from cvat.apps.dataset_manager.task import JobAnnotation
from cvat.apps.engine.models import (
    Data,
    Job,
    JobType,
    Label,
    LabeledShape,
    Segment,
    ShapeType,
    Task,
)


class AnnotationUUIDIdempotencyTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(username="admin", email="", password="")
        self.db_data = Data.objects.create(size=1, stop_frame=0, image_quality=50)
        self.task = Task.objects.create(
            name="uuid-idempotency-task",
            owner=self.user,
            overlap=0,
            segment_size=0,
            data=self.db_data,
        )
        self.label = Label.objects.create(task=self.task, name="car")
        self.job = Job.objects.create(
            segment=Segment.objects.create(task=self.task, start_frame=0, stop_frame=0),
            type=JobType.ANNOTATION,
        )

    def _shape_payload(self, shape_uuid: str) -> dict:
        return {
            "version": 0,
            "tags": [],
            "shapes": [
                {
                    "uuid": shape_uuid,
                    "label_id": self.label.id,
                    "group": 0,
                    "source": "manual",
                    "type": ShapeType.RECTANGLE,
                    "frame": 0,
                    "occluded": False,
                    "outside": False,
                    "z_order": 0,
                    "rotation": 0,
                    "points": [1.0, 2.0, 3.0, 4.0],
                    "attributes": [],
                    "elements": [],
                }
            ],
            "tracks": [],
            "intervals": [],
        }

    def test_create_without_uuid_still_inserts(self):
        def make_payload():
            payload = self._shape_payload(str(uuid.uuid4()))
            del payload["shapes"][0]["uuid"]
            return payload

        JobAnnotation(self.job.id).create(make_payload())
        JobAnnotation(self.job.id).create(make_payload())

        assert LabeledShape.objects.filter(job=self.job).count() == 2

    def test_create_with_same_uuid_does_not_duplicate(self):
        shape_uuid = str(uuid.uuid4())

        first = JobAnnotation(self.job.id)
        first.create(self._shape_payload(shape_uuid))
        first_id = first.data["shapes"][0]["id"]

        second = JobAnnotation(self.job.id)
        second.create(self._shape_payload(shape_uuid))
        second_id = second.data["shapes"][0]["id"]

        assert first_id == second_id
        assert LabeledShape.objects.filter(job=self.job, uuid=shape_uuid).count() == 1
