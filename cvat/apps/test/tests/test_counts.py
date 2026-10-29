# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.test import TestCase

from cvat.apps.engine import models
from cvat.apps.test.counts import count_annotations_by_label


class CountAnnotationsByLabelTest(TestCase):
    def setUp(self):
        self.data = models.Data.objects.create(size=1, stop_frame=0)
        self.task = models.Task.objects.create(name="task", data=self.data)
        self.segment = models.Segment.objects.create(task=self.task, start_frame=0, stop_frame=0)

        self.job = self._create_job()
        self.replica_job = self._create_job(type=models.JobType.REPLICA, parent_job=self.job)
        self.gt_job = self._create_job(type=models.JobType.GROUND_TRUTH)

        self.cat = self._create_label("cat")
        self.dog = self._create_label("dog")
        self.bird = self._create_label("bird")

    def _create_job(self, **kwargs):
        return models.Job.objects.create(segment=self.segment, **kwargs)

    def _create_label(self, name, **kwargs):
        return models.Label.objects.create(task=self.task, name=name, color="#000000", **kwargs)

    def _create_shape(self, job, label, **kwargs):
        return models.LabeledShape.objects.create(
            job=job,
            label=label,
            frame=0,
            type=models.ShapeType.RECTANGLE,
            points=[0, 0, 1, 1],
            **kwargs,
        )

    def _count(self, **kwargs):
        # refetch the task to drop the cached validation layout
        task = models.Task.objects.get(id=self.task.id)
        return {item["name"]: item["count"] for item in count_annotations_by_label(task, **kwargs)}

    def test_counts_shapes_per_label_and_lists_empty_labels(self):
        self._create_shape(self.job, self.cat)
        self._create_shape(self.job, self.cat)
        self._create_shape(self.job, self.dog)

        self.assertEqual(self._count(), {"cat": 2, "dog": 1, "bird": 0})

    def test_item_has_id_name_color_and_count(self):
        self._create_shape(self.job, self.cat)

        items = count_annotations_by_label(self.task)

        self.assertEqual(
            items[0], {"id": self.cat.id, "name": "cat", "color": "#000000", "count": 1}
        )

    def test_skeleton_counts_once_and_its_elements_are_skipped(self):
        skeleton_label = self._create_label("skeleton")
        point_label = self._create_label("point", parent=skeleton_label)
        skeleton = self._create_shape(self.job, skeleton_label)
        for _ in range(3):
            self._create_shape(self.job, point_label, parent=skeleton)

        counts = self._count()

        self.assertEqual(counts["skeleton"], 1)
        self.assertNotIn("point", counts)

    def test_track_counts_once_whatever_the_number_of_keyframes(self):
        track = models.LabeledTrack.objects.create(job=self.job, label=self.cat, frame=0)
        for frame in range(3):
            models.TrackedShape.objects.create(
                track=track, frame=frame, type=models.ShapeType.RECTANGLE, points=[0, 0, 1, 1]
            )

        self.assertEqual(self._count()["cat"], 1)

    def test_tags_are_counted(self):
        models.LabeledImage.objects.create(job=self.job, label=self.dog, frame=0)

        self.assertEqual(self._count()["dog"], 1)

    def test_shapes_tracks_and_tags_are_added_up(self):
        self._create_shape(self.job, self.cat)
        models.LabeledTrack.objects.create(job=self.job, label=self.cat, frame=0)
        models.LabeledImage.objects.create(job=self.job, label=self.cat, frame=0)

        self.assertEqual(self._count()["cat"], 3)

    def test_intervals_are_not_counted(self):
        models.LabeledInterval.objects.create(job=self.job, label=self.cat, start=0, stop=1)

        self.assertEqual(self._count()["cat"], 0)

    def test_replica_job_is_not_counted(self):
        self._create_shape(self.job, self.cat)
        self._create_shape(self.replica_job, self.cat)

        self.assertEqual(self._count()["cat"], 1)

    def test_gt_job_is_not_counted_without_gt_pool(self):
        self._create_shape(self.gt_job, self.cat)

        self.assertEqual(self._count()["cat"], 0)

    def test_gt_job_is_counted_with_gt_pool(self):
        models.ValidationLayout.objects.create(
            task_data=self.data, mode=models.ValidationMode.GT_POOL, frames=[], disabled_frames=[]
        )
        self._create_shape(self.job, self.cat)
        self._create_shape(self.gt_job, self.cat)

        self.assertEqual(self._count()["cat"], 2)

    def test_task_without_data_does_not_fail(self):
        self.task.data = None
        self.task.save()

        self.assertEqual(self._count(), {"cat": 0, "dog": 0, "bird": 0})

    def test_given_job_is_counted_whatever_its_type(self):
        self._create_shape(self.job, self.cat)
        self._create_shape(self.replica_job, self.dog)
        self._create_shape(self.gt_job, self.bird)

        self.assertEqual(self._count(job=self.job), {"cat": 1, "dog": 0, "bird": 0})
        self.assertEqual(self._count(job=self.replica_job), {"cat": 0, "dog": 1, "bird": 0})
        self.assertEqual(self._count(job=self.gt_job), {"cat": 0, "dog": 0, "bird": 1})

    def test_sorted_by_count_descending_then_name(self):
        self._create_shape(self.job, self.dog)
        self._create_shape(self.job, self.dog)
        self._create_shape(self.job, self.cat)

        names = [item["name"] for item in count_annotations_by_label(self.task)]

        self.assertEqual(names, ["dog", "cat", "bird"])

    def test_equal_counts_are_sorted_by_name(self):
        names = [item["name"] for item in count_annotations_by_label(self.task)]

        self.assertEqual(names, ["bird", "cat", "dog"])
