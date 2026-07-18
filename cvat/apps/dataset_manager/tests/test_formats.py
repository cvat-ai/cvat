# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import itertools
import json
import os.path as osp
import tempfile
import zipfile
from io import BytesIO

import datumaro
import numpy as np
from datumaro.components.annotation import Mask
from datumaro.components.dataset import Dataset, DatasetItem
from django.contrib.auth.models import Group, User
from rest_framework import status

import cvat.apps.dataset_manager as dm
from cvat.apps.dataset_manager.annotation import AnnotationIR
from cvat.apps.dataset_manager.bindings import CvatDataExtractor, TaskData, find_dataset_root
from cvat.apps.dataset_manager.task import TaskAnnotation
from cvat.apps.dataset_manager.tests.utils import (
    ensure_extractors_efficiency,
    ensure_streaming_importers,
)
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.models import Task
from cvat.apps.engine.tests.utils import (
    ApiTestBase,
    ForceLogin,
    generate_image_file,
    get_paginated_collection,
)


class _DbTestBase(ApiTestBase):
    def setUp(self):
        super().setUp()

    @classmethod
    def setUpTestData(cls):
        cls.create_db_users()

    @classmethod
    def create_db_users(cls):
        group, _ = Group.objects.get_or_create(name="adm")

        admin = User.objects.create_superuser(username="test", password="test", email="")
        admin.groups.add(group)

        cls.user = admin

    def _put_api_v2_task_id_annotations(self, tid, data):
        with ForceLogin(self.user, self.client):
            response = self.client.put(f"/api/tasks/{tid}/annotations", data=data, format="json")

        return response

    def _put_api_v2_job_id_annotations(self, jid, data):
        with ForceLogin(self.user, self.client):
            response = self.client.put(f"/api/jobs/{jid}/annotations", data=data, format="json")

        return response

    def _create_task(self, data, image_data):
        with ForceLogin(self.user, self.client):
            response = self.client.post("/api/tasks", data=data, format="json")
            assert response.status_code == status.HTTP_201_CREATED, response.status_code
            tid = response.data["id"]

            response = self.client.post(f"/api/tasks/{tid}/data", data=image_data)
            assert response.status_code == status.HTTP_202_ACCEPTED, response.status_code
            rq_id = response.json()["rq_id"]

            response = self.client.get(f"/api/requests/{rq_id}")
            assert response.status_code == status.HTTP_200_OK, response.status_code
            assert response.json()["status"] == "finished", response.json().get("status")

            response = self.client.get(f"/api/tasks/{tid}")

            if 200 <= response.status_code < 400:
                labels_response = list(
                    get_paginated_collection(
                        lambda page: self.client.get(
                            "/api/labels", query_params={"task_id": tid, "page": page}
                        )
                    )
                )
                response.data["labels"] = labels_response

            task = response.data

        return task


@ensure_extractors_efficiency
class TaskExportTest(_DbTestBase):
    def _generate_custom_annotations(self, annotations, task):
        self._put_api_v2_task_id_annotations(task["id"], annotations)
        return annotations

    def _generate_annotations(self, task):
        annotations = {
            "version": 0,
            "tags": [
                {"frame": 0, "label_id": task["labels"][0]["id"], "group": None, "attributes": []}
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0],
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][0]["default_value"],
                        },
                    ],
                    "points": [1.0, 2.1, 100, 300.222],
                    "type": "rectangle",
                    "occluded": False,
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False,
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][0]["id"],
                    "group": 1,
                    "source": "manual",
                    "attributes": [],
                    "points": [100, 300.222, 400, 500, 1, 3],
                    "type": "points",
                    "occluded": False,
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][0]["id"],
                    "group": 1,
                    "source": "manual",
                    "attributes": [],
                    "points": [2.0, 2.1, 400, 500, 1, 3],
                    "type": "polyline",
                    "occluded": False,
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0],
                        },
                    ],
                    "shapes": [
                        {
                            "frame": 0,
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                            "attributes": [
                                {
                                    "spec_id": task["labels"][0]["attributes"][1]["id"],
                                    "value": task["labels"][0]["attributes"][1]["default_value"],
                                }
                            ],
                        },
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [2.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": True,
                            "outside": True,
                        },
                    ],
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                        }
                    ],
                },
            ],
        }
        return self._generate_custom_annotations(annotations, task)

    def _generate_task_images(self, count):  # pylint: disable=no-self-use
        images = {f"client_files[{i}]": generate_image_file(f"image_{i}.jpg") for i in range(count)}
        images["image_quality"] = 75
        return images

    def _generate_task(self, images, **overrides):
        task = {
            "name": "my task #1",
            "overlap": 0,
            "segment_size": 100,
            "labels": [
                {
                    "name": "car",
                    "attributes": [
                        {
                            "name": "model",
                            "mutable": False,
                            "input_type": "select",
                            "default_value": "mazda",
                            "values": ["bmw", "mazda", "renault"],
                        },
                        {
                            "name": "parked",
                            "mutable": True,
                            "input_type": "checkbox",
                            "default_value": "false",
                            "values": [],
                        },
                    ],
                },
                {"name": "person"},
            ],
        }
        task.update(overrides)
        return self._create_task(task, images)

    @staticmethod
    def _test_export(check, task, format_name, **export_args):
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = osp.join(temp_dir, format_name)
            dm.task.export_task(task["id"], file_path, format_name=format_name, **export_args)

            check(file_path)

    def test_export_formats_query(self):
        formats = dm.views.get_export_formats()

        self.assertEqual(
            {f.DISPLAY_NAME for f in formats},
            {
                "CamVid 1.0",
                "Cityscapes 1.0",
                "COCO 1.0",
                "COCO Keypoints 1.0",
                "CVAT for images 1.1",
                "CVAT for video 1.1",
                "Datumaro 1.0",
                "Datumaro 3D 1.0",
                "Generic TSV 1.0",
                "ICDAR Localization 1.0",
                "ICDAR Recognition 1.0",
                "ICDAR Segmentation 1.0",
                "ImageNet 1.0",
                "KITTI 1.0",
                "Kitti Raw Format 1.0",
                "LabelMe 3.0",
                "LFW 1.0",
                "Market-1501 1.0",
                "MOT 1.1",
                "MOTS PNG 1.0",
                "Open Images V6 1.0",
                "PASCAL VOC 1.1",
                "Segmentation mask 1.1",
                "Sly Point Cloud Format 1.0",
                "Ultralytics YOLO Classification 1.0",
                "Ultralytics YOLO Detection 1.0",
                "Ultralytics YOLO Detection Track 1.0",
                "Ultralytics YOLO Oriented Bounding Boxes 1.0",
                "Ultralytics YOLO Pose 1.0",
                "Ultralytics YOLO Segmentation 1.0",
                "VGGFace2 1.0",
                "WiderFace 1.0",
                "YOLO 1.1",
            },
        )

    def test_import_formats_query(self):
        formats = dm.views.get_import_formats()

        self.assertEqual(
            {f.DISPLAY_NAME for f in formats},
            {
                "CamVid 1.0",
                "Cityscapes 1.0",
                "COCO 1.0",
                "COCO Keypoints 1.0",
                "CVAT 1.1",
                "Datumaro 1.0",
                "Datumaro 3D 1.0",
                "Generic TSV 1.0",
                "ICDAR Localization 1.0",
                "ICDAR Recognition 1.0",
                "ICDAR Segmentation 1.0",
                "ImageNet 1.0",
                "KITTI 1.0",
                "Kitti Raw Format 1.0",
                "LabelMe 3.0",
                "LFW 1.0",
                "Market-1501 1.0",
                "MOT 1.1",
                "MOTS PNG 1.0",
                "Open Images V6 1.0",
                "PASCAL VOC 1.1",
                "Segmentation mask 1.1",
                "Sly Point Cloud Format 1.0",
                "Ultralytics YOLO Classification 1.0",
                "Ultralytics YOLO Detection 1.0",
                "Ultralytics YOLO Oriented Bounding Boxes 1.0",
                "Ultralytics YOLO Pose 1.0",
                "Ultralytics YOLO Segmentation 1.0",
                "VGGFace2 1.0",
                "WiderFace 1.0",
                "YOLO 1.1",
            },
        )

    def test_exports(self):
        def check(file_path):
            with open(file_path, "rb") as f:
                self.assertTrue(len(f.read()) != 0)

        for f in dm.views.get_export_formats():
            format_name = f.DISPLAY_NAME

            images = self._generate_task_images(3)
            task = self._generate_task(images)
            self._generate_annotations(task)
            for save_images in {True, False}:
                with self.subTest(format=format_name, save_images=save_images):
                    if not f.ENABLED:
                        self.skipTest("Format is disabled")
                    if format_name in ("VGGFace2 1.0", "Generic TSV 1.0"):
                        self.skipTest("Format is disabled")

                    self._test_export(check, task, format_name, save_images=save_images)

    def test_empty_images_are_exported(self):
        dm_env = dm.formats.registry.dm_env

        for format_name, importer_name in [
            ("COCO 1.0", "coco"),
            ("COCO Keypoints 1.0", "coco_person_keypoints"),
            ("CVAT for images 1.1", "cvat"),
            # ('CVAT for video 1.1', 'cvat'), # does not support
            ("Datumaro 1.0", "datumaro"),
            ("LabelMe 3.0", "label_me"),
            # ('MOT 1.1', 'mot_seq'), # does not support
            # ('MOTS PNG 1.0', 'mots_png'), # does not support
            ("PASCAL VOC 1.1", "voc"),
            ("Segmentation mask 1.1", "voc"),
            ("YOLO 1.1", "yolo"),
            ("ImageNet 1.0", "imagenet_txt"),
            ("CamVid 1.0", "camvid"),
            ("WiderFace 1.0", "wider_face"),
            ("VGGFace2 1.0", "vgg_face2"),
            ("Market-1501 1.0", "market1501"),
            ("ICDAR Recognition 1.0", "icdar_word_recognition"),
            ("ICDAR Localization 1.0", "icdar_text_localization"),
            ("ICDAR Segmentation 1.0", "icdar_text_segmentation"),
            # ('KITTI 1.0', 'kitti') format does not support empty annotations
            ("LFW 1.0", "lfw"),
            # ('Cityscapes 1.0', 'cityscapes'), does not support, empty annotations
            ("Ultralytics YOLO Classification 1.0", "yolo_ultralytics_classification"),
            ("Ultralytics YOLO Oriented Bounding Boxes 1.0", "yolo_ultralytics_oriented_boxes"),
            ("Ultralytics YOLO Detection 1.0", "yolo_ultralytics_detection"),
            ("Ultralytics YOLO Pose 1.0", "yolo_ultralytics_pose"),
            ("Ultralytics YOLO Segmentation 1.0", "yolo_ultralytics_segmentation"),
        ]:
            with self.subTest(format=format_name):
                if not dm.formats.registry.EXPORT_FORMATS[format_name].ENABLED:
                    self.skipTest("Format is disabled")

                images = self._generate_task_images(3)
                task = self._generate_task(images)

                def check(file_path):
                    def load_dataset(src):
                        return datumaro.components.dataset.Dataset.import_from(
                            src, importer_name, env=dm_env
                        )

                    if zipfile.is_zipfile(file_path):
                        with tempfile.TemporaryDirectory() as tmp_dir:
                            zipfile.ZipFile(file_path).extractall(tmp_dir)
                            dataset = load_dataset(tmp_dir)
                            self.assertEqual(len(dataset), task["size"])
                    else:
                        dataset = load_dataset(file_path)
                        self.assertEqual(len(dataset), task["size"])

                self._test_export(check, task, format_name, save_images=False)

    def test_can_skip_outside(self):
        images = self._generate_task_images(3)
        task = self._generate_task(images)
        self._generate_annotations(task)
        task_ann = TaskAnnotation(task["id"])
        task_ann.init_from_db()
        task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task["id"]))

        extractor = CvatDataExtractor(task_data)
        dm_dataset = datumaro.components.project.Dataset.from_extractors(extractor)
        self.assertEqual(4, len(dm_dataset.get("image_1").annotations))

    def test_no_outside_shapes_in_per_frame_export(self):
        images = self._generate_task_images(3)
        task = self._generate_task(images)
        self._generate_annotations(task)
        task_ann = TaskAnnotation(task["id"])
        task_ann.init_from_db()
        task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task["id"]))

        outside_count = 0
        for f in task_data.group_by_frame(include_empty=True):
            for ann in f.labeled_shapes:
                if getattr(ann, "outside", None):
                    outside_count += 1
        self.assertEqual(0, outside_count)

    def test_cant_make_rel_frame_id_from_unknown(self):
        images = self._generate_task_images(3)
        images["frame_filter"] = "step=2"
        task = self._generate_task(images)
        task_data = TaskData(AnnotationIR("2d"), Task.objects.get(pk=task["id"]))

        with self.assertRaisesRegex(ValueError, r"Unknown"):
            task_data.rel_frame_id(1)  # the task has only 0 and 2 frames

    def test_can_make_rel_frame_id_from_known(self):
        images = self._generate_task_images(6)
        images["frame_filter"] = "step=2"
        images["start_frame"] = 1
        task = self._generate_task(images)
        task_data = TaskData(AnnotationIR("2d"), Task.objects.get(pk=task["id"]))

        self.assertEqual(2, task_data.rel_frame_id(5))

    def test_cant_make_abs_frame_id_from_unknown(self):
        images = self._generate_task_images(3)
        images["frame_filter"] = "step=2"
        task = self._generate_task(images)
        task_data = TaskData(AnnotationIR("2d"), Task.objects.get(pk=task["id"]))

        with self.assertRaisesRegex(ValueError, r"Unknown"):
            task_data.abs_frame_id(2)  # the task has only 0 and 1 indices

    def test_can_make_abs_frame_id_from_known(self):
        images = self._generate_task_images(6)
        images["frame_filter"] = "step=2"
        images["start_frame"] = 1
        task = self._generate_task(images)
        task_data = TaskData(AnnotationIR("2d"), Task.objects.get(pk=task["id"]))

        self.assertEqual(5, task_data.abs_frame_id(2))

    def _get_task_jobs(self, tid):
        with ForceLogin(self.user, self.client):
            return get_paginated_collection(
                lambda page: self.client.get(
                    "/api/jobs", query_params={"task_id": tid, "page": page}, format="json"
                )
            )

    def test_frames_outside_are_not_generated(self):
        # https://github.com/openvinotoolkit/cvat/issues/2827
        images = self._generate_task_images(10)
        images["start_frame"] = 0
        task = self._generate_task(images, overlap=3, segment_size=6)
        jobs = sorted(self._get_task_jobs(task["id"]), key=lambda v: v["id"])
        annotations = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": [
                {
                    "frame": 6,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 6,
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                            "attributes": [],
                        },
                    ],
                },
            ],
        }
        self._put_api_v2_job_id_annotations(jobs[2]["id"], annotations)

        task_ann = TaskAnnotation(task["id"])
        task_ann.init_from_db()
        task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task["id"]))

        i = -1
        for i, frame in enumerate(task_data.group_by_frame()):
            self.assertTrue(frame.frame in range(6, 10))
        self.assertEqual(i + 1, 4)

    def _delete_job_frames(self, job_id: int, deleted_frames: list[int]):
        with ForceLogin(self.user, self.client):
            response = self.client.patch(
                f"/api/jobs/{job_id}/data/meta?org=",
                data=dict(deleted_frames=deleted_frames),
                format="json",
            )
            assert response.status_code == status.HTTP_200_OK, response.status_code

    def test_track_keyframes_on_deleted_frames_do_not_affect_later_frames(self):
        images = self._generate_task_images(4)
        task = self._generate_task(images)
        job = self._get_task_jobs(task["id"])[0]

        annotations = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 0,
                            "points": [1, 2, 3, 4],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                            "attributes": [],
                        },
                        {
                            "frame": 1,
                            "points": [5, 6, 7, 8],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": True,
                            "attributes": [],
                        },
                        {
                            "frame": 2,
                            "points": [9, 10, 11, 12],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                            "attributes": [],
                        },
                    ],
                },
            ],
        }
        self._put_api_v2_job_id_annotations(job["id"], annotations)
        self._delete_job_frames(job["id"], [2])

        task_ann = TaskAnnotation(task["id"])
        task_ann.init_from_db()
        task_data = TaskData(task_ann.ir_data, Task.objects.get(pk=task["id"]))
        extractor = CvatDataExtractor(task_data)
        dm_dataset = Dataset.from_extractors(extractor)

        assert len(dm_dataset.get("image_3").annotations) == 0


class FrameMatchingTest(_DbTestBase):
    def _generate_task_images(self, paths):  # pylint: disable=no-self-use
        f = BytesIO()
        with zipfile.ZipFile(f, "w") as archive:
            for path in paths:
                archive.writestr(path, generate_image_file(path).getvalue())
        f.name = "images.zip"
        f.seek(0)

        return {
            "client_files[0]": f,
            "image_quality": 75,
        }

    def _generate_task(self, images):
        task = {
            "name": "my task #1",
            "overlap": 0,
            "segment_size": 100,
            "labels": [
                {
                    "name": "car",
                    "attributes": [
                        {
                            "name": "model",
                            "mutable": False,
                            "input_type": "select",
                            "default_value": "mazda",
                            "values": ["bmw", "mazda", "renault"],
                        },
                        {
                            "name": "parked",
                            "mutable": True,
                            "input_type": "checkbox",
                            "default_value": "false",
                            "values": [],
                        },
                    ],
                },
                {"name": "person"},
            ],
        }
        return self._create_task(task, images)

    def test_frame_matching(self):
        task_paths = [
            "a.jpg",
            "a/a.jpg",
            "a/b.jpg",
            "b/a.jpg",
            "b/c.jpg",
            "a/b/c.jpg",
            "a/b/d.jpg",
        ]

        images = self._generate_task_images(task_paths)
        task = self._generate_task(images)
        task_data = TaskData(AnnotationIR("2d"), Task.objects.get(pk=task["id"]))

        for input_path, expected, root in [
            ("z.jpg", None, ""),  # unknown item
            ("z/a.jpg", None, ""),  # unknown item
            ("d.jpg", "a/b/d.jpg", "a/b"),  # match with root hint
            ("b/d.jpg", "a/b/d.jpg", "a"),  # match with root hint
        ] + list(
            zip(task_paths, task_paths, [None] * len(task_paths))
        ):  # exact matches
            with self.subTest(input=input_path):
                actual = task_data.match_frame(input_path, root)
                if actual is not None:
                    actual = task_data.frame_info[actual]["path"]
                self.assertEqual(expected, actual)

    def test_dataset_root(self):
        for task_paths, dataset_paths, expected in [
            (["a.jpg", "b/c/a.jpg"], ["a.jpg", "b/c/a.jpg"], ""),
            (["b/a.jpg", "b/c/a.jpg"], ["a.jpg", "c/a.jpg"], "b"),  # 'images from share' case
            (["b/c/a.jpg"], ["a.jpg"], "b/c"),  # 'images from share' case
            (["a.jpg"], ["z.jpg"], None),
        ]:
            with self.subTest(expected=expected):
                images = self._generate_task_images(task_paths)
                task = self._generate_task(images)
                task_data = TaskData(AnnotationIR("2d"), Task.objects.get(pk=task["id"]))
                dataset = [DatasetItem(id=osp.splitext(p)[0]) for p in dataset_paths]

                root = find_dataset_root(dataset, task_data)
                self.assertEqual(expected, root)


@ensure_streaming_importers
class TaskAnnotationsImportTest(_DbTestBase):
    def _generate_custom_annotations(self, annotations, task):
        self._put_api_v2_task_id_annotations(task["id"], annotations)
        return annotations

    def _generate_task_images(self, count, name="image", **image_params):
        images = {
            f"client_files[{i}]": generate_image_file(f"{name}_{i}.jpg", **image_params)
            for i in range(count)
        }
        images["image_quality"] = 75
        return images

    def _generate_task_images_by_names(self, names, **image_params):
        images = {
            f"client_files[{i}]": generate_image_file(f"{name}.jpg", **image_params)
            for i, name in enumerate(names)
        }
        images["image_quality"] = 75
        return images

    def _generate_task(self, images, annotation_format, **overrides):
        labels = []
        if annotation_format in ["ICDAR Recognition 1.0", "ICDAR Localization 1.0"]:
            labels = [
                {
                    "name": "icdar",
                    "attributes": [
                        {
                            "name": "text",
                            "mutable": False,
                            "input_type": "text",
                            "values": ["word1", "word2"],
                        }
                    ],
                }
            ]
        elif annotation_format == "ICDAR Segmentation 1.0":
            labels = [
                {
                    "name": "icdar",
                    "attributes": [
                        {
                            "name": "text",
                            "mutable": False,
                            "input_type": "text",
                            "values": ["word_1", "word_2", "word_3"],
                        },
                        {
                            "name": "index",
                            "mutable": False,
                            "input_type": "number",
                            "values": ["0", "1", "2"],
                        },
                        {
                            "name": "color",
                            "mutable": False,
                            "input_type": "text",
                            "values": ["100 110 240", "10 15 20", "120 128 64"],
                        },
                        {
                            "name": "center",
                            "mutable": False,
                            "input_type": "text",
                            "values": ["1 2", "2 4", "10 45"],
                        },
                    ],
                }
            ]
        elif annotation_format == "COCO Keypoints 1.0":
            labels = [
                {
                    "name": "car",
                    "type": "skeleton",
                    "attributes": [],
                    "svg": '<circle r="5" stroke="black" fill="blue" cx="50" cy="50" data-type="node" data-element-id="0" data-node-id="0" data-label-name="kp1"></circle>',
                    "sublabels": [
                        {"name": "kp1", "type": "points", "attributes": []},
                    ],
                }
            ]
        elif annotation_format == "Market-1501 1.0":
            labels = [
                {
                    "name": "market-1501",
                    "attributes": [
                        {
                            "name": "query",
                            "mutable": False,
                            "input_type": "select",
                            "values": ["True", "False"],
                        },
                        {
                            "name": "camera_id",
                            "mutable": False,
                            "input_type": "number",
                            "values": ["0", "1", "2", "3"],
                        },
                        {
                            "name": "person_id",
                            "mutable": False,
                            "input_type": "number",
                            "values": ["1", "2", "3"],
                        },
                    ],
                }
            ]
        else:
            labels = [
                {
                    "name": "car",
                    "attributes": [
                        {
                            "name": "model",
                            "mutable": False,
                            "input_type": "select",
                            "default_value": "mazda",
                            "values": ["bmw", "mazda", "renault"],
                        },
                        {
                            "name": "parked",
                            "mutable": True,
                            "input_type": "checkbox",
                            "default_value": "false",
                            "values": [],
                        },
                    ],
                },
                {
                    "name": "background",
                    "attributes": [],
                },
                {"name": "person"},
            ]

        task = {"name": "my task #1", "overlap": 0, "segment_size": 100, "labels": labels}
        task.update(overrides)
        return self._create_task(task, images)

    def _generate_annotations(self, task, annotation_format):
        shapes = []
        tracks = []
        tags = []

        if annotation_format in ["ICDAR Recognition 1.0", "ICDAR Localization 1.0"]:
            shapes = [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0],
                        },
                    ],
                    "points": [1.0, 2.1, 10.6, 53.22],
                    "type": "rectangle",
                    "occluded": False,
                }
            ]
        elif annotation_format == "Market-1501 1.0":
            tags = [
                {
                    "frame": 1,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][1],
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][1]["values"][2],
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][2]["id"],
                            "value": task["labels"][0]["attributes"][2]["values"][0],
                        },
                    ],
                }
            ]
        elif annotation_format == "ICDAR Segmentation 1.0":
            shapes = [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0],
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][1]["values"][0],
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][2]["id"],
                            "value": task["labels"][0]["attributes"][2]["values"][1],
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][3]["id"],
                            "value": task["labels"][0]["attributes"][3]["values"][2],
                        },
                    ],
                    "points": [1.0, 2.1, 10.6, 53.22],
                    "type": "rectangle",
                    "occluded": False,
                }
            ]
        elif annotation_format == "COCO Keypoints 1.0":
            shapes = [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [],
                    "points": [],
                    "type": "skeleton",
                    "occluded": False,
                    "elements": [
                        {
                            "frame": 0,
                            "label_id": task["labels"][0]["sublabels"][0]["id"],
                            "group": 0,
                            "source": "manual",
                            "attributes": [],
                            "points": [1.0, 2.0],
                            "type": "points",
                            "occluded": False,
                            "outside": False,
                        }
                    ],
                }
            ]
        else:
            rectangle_shape_wo_attrs = {
                "frame": 1,
                "label_id": task["labels"][1]["id"],
                "group": 0,
                "source": "manual",
                "attributes": [],
                "points": [2.0, 2.1, 40, 10.7],
                "type": "rectangle",
                "occluded": False,
            }

            rectangle_shape_with_attrs = {
                "frame": 0,
                "label_id": task["labels"][0]["id"],
                "group": 0,
                "source": "manual",
                "attributes": [
                    {
                        "spec_id": task["labels"][0]["attributes"][0]["id"],
                        "value": task["labels"][0]["attributes"][0]["values"][0],
                    },
                    {
                        "spec_id": task["labels"][0]["attributes"][1]["id"],
                        "value": task["labels"][0]["attributes"][1]["default_value"],
                    },
                ],
                "points": [1.0, 2.1, 10.6, 13.22],
                "type": "rectangle",
                "occluded": False,
            }

            track_wo_attrs = {
                "frame": 0,
                "label_id": task["labels"][1]["id"],
                "group": 0,
                "source": "manual",
                "attributes": [],
                "shapes": [
                    {
                        "frame": 0,
                        "attributes": [],
                        "points": [1.0, 2.1, 10.6, 53.22, 30, 20.222],
                        "type": "polygon",
                        "occluded": False,
                        "outside": False,
                    }
                ],
            }

            tag_wo_attrs = {
                "frame": 0,
                "label_id": task["labels"][0]["id"],
                "group": None,
                "attributes": [],
            }

            tag_with_attrs = {
                "frame": 1,
                "label_id": task["labels"][0]["id"],
                "group": 3,
                "source": "manual",
                "attributes": [
                    {
                        "spec_id": task["labels"][0]["attributes"][0]["id"],
                        "value": task["labels"][0]["attributes"][0]["values"][1],
                    },
                    {
                        "spec_id": task["labels"][0]["attributes"][1]["id"],
                        "value": task["labels"][0]["attributes"][1]["default_value"],
                    },
                ],
            }

            if annotation_format == "VGGFace2 1.0":
                shapes = [rectangle_shape_wo_attrs]
            elif annotation_format == "CVAT 1.1":
                shapes = [rectangle_shape_wo_attrs, rectangle_shape_with_attrs]
                tags = [tag_with_attrs, tag_wo_attrs]
            elif annotation_format == "MOTS PNG 1.0":
                tracks = [track_wo_attrs]
            else:
                shapes = [rectangle_shape_wo_attrs, rectangle_shape_with_attrs]
                tags = [tag_wo_attrs]
                tracks = [track_wo_attrs]

        annotations = {"version": 0, "tags": tags, "shapes": shapes, "tracks": tracks}

        return self._generate_custom_annotations(annotations, task)

    def _test_can_import_annotations(self, task, import_format):
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = osp.join(temp_dir, import_format)

            export_format = import_format
            if import_format == "CVAT 1.1":
                export_format = "CVAT for images 1.1"

            dm.task.export_task(task["id"], file_path, format_name=export_format)
            expected_ann = TaskAnnotation(task["id"])
            expected_ann.init_from_db()

            dm.task.import_task_annotations(file_path, task["id"], import_format, True)
            actual_ann = TaskAnnotation(task["id"])
            actual_ann.init_from_db()

            self.assertEqual(len(expected_ann.data), len(actual_ann.data))

    def test_can_import_annotations_for_image_with_dots_in_filename(self):
        for f in dm.views.get_import_formats():
            format_name = f.DISPLAY_NAME

            if format_name == "Market-1501 1.0":
                images = self._generate_task_images_by_names(
                    ["img0.0.0_0", "1.0_c3s1_000000_00", "img0.0.0_1"]
                )
            else:
                images = self._generate_task_images(3, "img0.0.0")
            task = self._generate_task(images, format_name)
            self._generate_annotations(task, format_name)

            with self.subTest(format=format_name):
                if not f.ENABLED:
                    self.skipTest("Format is disabled")
                elif f.DISPLAY_NAME == "Generic TSV 1.0":
                    self.skipTest("Not relevant")

                self._test_can_import_annotations(task, format_name)

    def test_can_import_mots_annotations_with_split_masks(self):
        # https://github.com/openvinotoolkit/cvat/issues/3360

        format_name = "MOTS PNG 1.0"
        source_dataset = Dataset.from_iterable(
            [
                DatasetItem(
                    id="image_0",
                    annotations=[
                        Mask(
                            np.array([[1, 1, 1, 0, 1, 1, 1]] * 5),
                            label=0,
                            attributes={"track_id": 0},
                        )
                    ],
                )
            ],
            categories=["label_0"],
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            dataset_dir = osp.join(temp_dir, "dataset")
            source_dataset.export(dataset_dir, "mots_png")
            dataset_path = osp.join(temp_dir, "annotations.zip")
            make_zip_archive(dataset_dir, dataset_path)

            images = self._generate_task_images(1, size=(5, 7))
            task = {
                "name": "test",
                "overlap": 0,
                "segment_size": 100,
                "labels": [{"name": "label_0"}],
            }
            task.update()
            task = self._create_task(task, images)

            dm.task.import_task_annotations(dataset_path, task["id"], format_name, True)
            self._test_can_import_annotations(task, format_name)

    def _make_coco_annotation_without_iscrowd(
        self, format_name: str = "COCO 1.0", has_segmentation: bool = True
    ) -> dict:
        if format_name == "COCO Keypoints 1.0":
            annotation = {
                "id": 1,
                "image_id": 1,
                "category_id": 1,
                "bbox": [10.0, 10.0, 10.0, 10.0],
                "area": 100.0,
                "keypoints": [15, 15, 2],
                "num_keypoints": 1,
                **({"segmentation": []} if has_segmentation else {}),
                # No "iscrowd" field — simulates Azure-sourced annotations
            }
            category = {
                "id": 1,
                "name": "car",
                "supercategory": "",
                "keypoints": ["kp1"],
                "skeleton": [],
            }
        else:
            annotation = {
                "id": 1,
                "image_id": 1,
                "category_id": 1,
                "bbox": [10.0, 10.0, 10.0, 10.0],
                "area": 100.0,
                **(
                    {"segmentation": [[10.0, 10.0, 20.0, 10.0, 20.0, 20.0, 10.0, 20.0]]}
                    if has_segmentation
                    else {}
                ),
                # No "iscrowd" field — simulates Azure-sourced annotations
            }
            category = {"id": 1, "name": "car", "supercategory": ""}
        return {
            "info": {},
            "licenses": [],
            "images": [{"id": 1, "file_name": "image_0.jpg", "height": 100, "width": 100}],
            "annotations": [annotation],
            "categories": [category],
        }

    def test_can_import_coco_without_iscrowd(self) -> None:
        format_cases = [
            ("COCO 1.0", "annotations/instances_default.json"),
            ("COCO Keypoints 1.0", "annotations/person_keypoints_default.json"),
        ]
        for (format_name, zip_annotation_filename), use_zip, has_segmentation in itertools.product(
            format_cases, (True, False), (True, False)
        ):
            with self.subTest(
                format_name=format_name,
                use_zip=use_zip,
                has_segmentation=has_segmentation,
            ):
                images = self._generate_task_images(1)
                task = self._generate_task(images, format_name)
                annotation_data = self._make_coco_annotation_without_iscrowd(
                    format_name, has_segmentation
                )

                with tempfile.TemporaryDirectory() as temp_dir:
                    if use_zip:
                        file_path = osp.join(temp_dir, "annotations.zip")
                        with zipfile.ZipFile(file_path, "w") as zf:
                            zf.writestr(zip_annotation_filename, json.dumps(annotation_data))
                    else:
                        file_path = osp.join(temp_dir, "annotations.json")
                        with open(file_path, "w") as f:
                            json.dump(annotation_data, f)

                    dm.task.import_task_annotations(file_path, task["id"], format_name, True)

                    task_ann = TaskAnnotation(task["id"])
                    task_ann.init_from_db()
                    self.assertEqual(1, len(task_ann.ir_data.shapes))
