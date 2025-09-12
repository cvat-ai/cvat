import os
import tempfile
from collections import namedtuple
from typing import Callable, Optional
from unittest import TestCase, mock
from unittest.mock import MagicMock, Mock

import numpy as np
from datumaro import AnnotationType, Bbox, LabelCategories
from datumaro.components import media
from datumaro.components.dataset import StreamDataset
from datumaro.components.dataset_base import CategoriesInfo, DatasetBase, DatasetItem
from django.contrib.auth.models import Group, User
from rest_framework import status
from rq.job import Job as RQJob

from cvat.apps.dataset_manager.annotation import AnnotationIR
from cvat.apps.dataset_manager.bindings import (
    CommonData,
    CVATProjectDataExtractor,
    CvatTaskOrJobDataExtractor,
    JobData,
    ProjectData,
    TaskData,
    import_dm_annotations,
)
from cvat.apps.dataset_manager.formats import registry
from cvat.apps.dataset_manager.formats.registry import dm_env, importer
from cvat.apps.dataset_manager.project import import_dataset_as_project
from cvat.apps.dataset_manager.task import import_job_annotations, import_task_annotations
from cvat.apps.dataset_manager.util import TmpDirManager
from cvat.apps.engine.models import LabelType
from cvat.apps.engine.tests.utils import (
    ApiTestBase,
    ForceLogin,
    generate_image_file,
    get_paginated_collection,
)


class TestExtractors(TestCase):
    @staticmethod
    def _make_mock_frame(data_cls, **kwargs):
        mock = Mock(spec=data_cls.Frame)
        for key, value in kwargs.items():
            setattr(mock, key, value)
        mock.labeled_shapes = []
        mock.tags = []
        mock.height = 10
        mock.width = 10
        return mock

    @staticmethod
    def _make_counting_data_extractor_cls(extractor_cls):
        class CountingDataExtractor(extractor_cls):
            def __init__(self, *args, **kwargs):
                self.item_anns_processed = 0
                super().__init__(*args, **kwargs)

            def _read_cvat_anno(self, *args, **kwargs):
                self.item_anns_processed += 1
                return super()._read_cvat_anno(*args, **kwargs)

        return CountingDataExtractor

    @staticmethod
    def _make_mock_job_data(item_ids):
        class MockJobData(JobData):
            def __init__(self):
                pass

        instance_data = MockJobData()

        instance_data._meta = {
            instance_data.META_FIELD: dict(
                subset="foo",
                labels=[
                    ("label", dict(name="LabelName", attributes=[], type=LabelType.ANY)),
                ],
            ),
        }

        instance_data._db_task = Mock()
        instance_data._db_task.id = 0

        instance_data._db_data = Mock()
        instance_data._db_data.start_frame = 0

        instance_data._db_job = Mock()
        instance_data._db_job.segment.task.id = 0
        instance_data._db_job.segment.start_frame = 0
        instance_data._db_job.segment.stop_frame = len(item_ids) - 1

        instance_data._initialized_included_frames = {i for i in range(len(item_ids))}
        instance_data._deleted_frames = {}
        instance_data._use_server_track_ids = False
        instance_data._frame_step = 1
        instance_data._label_mapping = {
            0: namedtuple(
                "MockLabel",
                ["name", "id", "color", "type"],
            )(
                name="LabelName",
                id=0,
                color="bar",
                type="foobar",
            ),
        }

        instance_data._frame_info = {
            index: dict(
                id=item_id,
                subset=subset,
                path="path.jpg",
                height=100,
                width=100,
            )
            for index, (item_id, subset) in enumerate(item_ids)
        }

        _shape_generator_was_iterated = False

        def shape_generator():
            nonlocal _shape_generator_was_iterated
            _shape_generator_was_iterated = True
            yield dict(
                frame=0,
                id=0,
                type="rectangle",
                label_id=0,
                points=[0, 0, 0, 0],
                rotation=0,
                occluded=False,
                source="manual",
                attributes={},
            )

        def shape_generator_was_iterated():
            return _shape_generator_was_iterated

        instance_data._annotation_ir = AnnotationIR(dimension="2d")
        instance_data._annotation_ir.shapes = shape_generator()

        return instance_data, shape_generator_was_iterated

    def _make_mock_instance_data(self, data_cls, item_ids):
        instance_data = MagicMock(spec_set=data_cls)
        instance_data.META_FIELD = "meta"
        instance_data.meta = dict(
            meta=dict(
                subset="foo",
                labels=[
                    ("label", dict(name="name", attributes=[], type=LabelType.ANY)),
                ],
            ),
        )
        subsets = sorted(set(subset for _, subset in item_ids))
        if data_cls is TaskData:
            assert len(subsets) == 1
            instance_data.db_instance = Mock(id=0)
        elif data_cls is ProjectData:
            instance_data.tasks = [Mock(id=index) for index in range(len(subsets))]

        def mock_group_by_frame(*args, **kwargs):
            for index, (item_id, subset) in enumerate(item_ids):
                yield self._make_mock_frame(
                    data_cls=data_cls,
                    id=index,
                    task_id=subsets.index(subset),
                    name=f"{item_id}.png",
                    subset=subset,
                    frame=index,
                )

        instance_data.group_by_frame.side_effect = mock_group_by_frame

        if data_cls is not ProjectData:
            instance_data.is_stream = False
            instance_data.__len__.return_value = len(item_ids)
            instance_data.frame_info = {
                index: dict(id=item_id, subset=subset)
                for index, (item_id, subset) in enumerate(item_ids)
            }
            instance_data.get_included_frames.return_value = set(instance_data.frame_info.keys())

        return instance_data

    @mock.patch("attr.evolve", lambda x, **kwargs: x)
    def test_can_stream_efficiently_on_export(self):
        for data_cls in [TaskData, JobData, ProjectData]:
            if data_cls is ProjectData:
                item_ids = {
                    ("image", "foo"),
                    ("another_image", "foo"),
                    ("third_image", "bar"),
                    ("fourth_image", "bar"),
                }
            else:
                item_ids = {("image", "foo"), ("another_image", "foo")}
            with self.subTest(data_cls=data_cls.__name__):
                instance_data = self._make_mock_instance_data(data_cls, item_ids)
                extractor_cls = (
                    CVATProjectDataExtractor
                    if data_cls is ProjectData
                    else CvatTaskOrJobDataExtractor
                )
                extractor_cls = self._make_counting_data_extractor_cls(extractor_cls)

                if data_cls in [JobData, TaskData]:
                    instance_data, shape_generator_was_iterated = self._make_mock_job_data(item_ids)
                    with extractor_cls(instance_data=instance_data) as extractor:
                        dataset = StreamDataset.from_extractors(extractor, env=dm_env)

                        # does not generate shapes to get various dataset properties
                        len(dataset)
                        list(dataset.subsets())
                        for subset in dataset.subsets():
                            subset_dataset = dataset.get_subset(subset).as_dataset()
                            len(subset_dataset)
                            list(subset_dataset.subsets())
                        assert not shape_generator_was_iterated()

                        # does not generate shapes to iterate items
                        assert len(list(dataset)) == len(item_ids)
                        assert not shape_generator_was_iterated()

                        # does not generate shapes to iterate subset items
                        for subset in dataset.subsets():
                            subset_dataset = dataset.get_subset(subset).as_dataset()
                            list(subset_dataset)
                        assert not shape_generator_was_iterated()

                        # generates shapes only when annotations are accessed
                        annotations = list(item.annotations for item in dataset)
                        assert any(annotations), annotations
                        assert shape_generator_was_iterated()

                        # does not keep shapes or annotations in memory
                        # annotations can be accessed only once
                        annotations = list(item.annotations for item in dataset)
                        assert not any(annotations), annotations
                else:
                    with extractor_cls(instance_data=instance_data) as extractor:
                        dataset = StreamDataset.from_extractors(extractor, env=dm_env)
                        # iterated over instance frame data on init
                        assert instance_data.group_by_frame.call_count == 1

                        # does not convert annotations to get various dataset properties
                        len(dataset)
                        list(dataset.subsets())
                        assert extractor.item_anns_processed == 0

                        # does not convert annotations to get various subset properties
                        for subset in dataset.subsets():
                            subset_dataset = dataset.get_subset(subset).as_dataset()
                            len(subset_dataset)
                            list(subset_dataset.subsets())
                        assert extractor.item_anns_processed == 0

                        # does not convert annotations to iterate items
                        list(dataset)
                        for subset in dataset.subsets():
                            subset_dataset = dataset.get_subset(subset).as_dataset()
                            list(subset_dataset)
                        assert extractor.item_anns_processed == 0

                        # initiates annotations only when they are accessed
                        list(item.annotations for item in dataset)
                        assert extractor.item_anns_processed == len(
                            item_ids
                        ), extractor.item_anns_processed

                        # does not keep annotations in memory
                        list(item.annotations for item in dataset)
                        assert (
                            extractor.item_anns_processed == len(item_ids) * 2
                        ), extractor.item_anns_processed

                        # did not iterate over instance frame data anymore
                        assert instance_data.group_by_frame.call_count == 1


class TestImporters(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        cls.create_db_users()

    @classmethod
    def create_db_users(cls):
        group, _ = Group.objects.get_or_create(name="adm")
        admin = User.objects.create_superuser(username="test", password="test", email="")
        admin.groups.add(group)
        cls.user = admin

    def setUp(self):
        super().setUp()

        project = self._create_project()
        self.project_id = project["id"]
        task = self._generate_task()
        self.task_id = task["id"]
        jobs = list(self._get_task_jobs(self.task_id))
        assert len(jobs) == 1
        self.job_id = jobs[0]["id"]

        self.dir_name = tempfile.TemporaryDirectory()
        self.extractor = self._make_extractor(self.dir_name.name)
        self._make_importer()

    def tearDown(self):
        del registry.IMPORT_FORMATS["dummy_format 1.0"]
        self.dir_name.cleanup()
        super().tearDown()

    def _make_extractor(self, dir_name):
        image = media.Image.from_numpy(data=np.ones((4, 2, 3)))
        subsets = ["train", "test", "foo"]

        dataset_items = {}
        for subset in subsets:
            dataset_items[subset] = []
            for index in [1, 2]:
                item_id = f"{subset}_{index}"
                image_path = os.path.join(dir_name, f"{item_id}.png")
                image.save(image_path)
                dataset_items[subset].append((item_id, image_path))

        class DummyStreamingExtractor(DatasetBase):
            def __init__(self):
                super().__init__(subsets=subsets)
                self.ann_init_count = 0

            def _gen_anns(self):
                assert self.ann_init_count < 6
                self.ann_init_count += 1
                return [Bbox(x=5, y=5, w=2, h=2, label=1)]

            def __iter__(self):
                for name in subsets:
                    for item_id, image_path in dataset_items[name]:
                        yield DatasetItem(
                            id=item_id,
                            subset=name,
                            media=media.Image.from_file(image_path),
                            annotations=self._gen_anns,
                        )

            def categories(self) -> CategoriesInfo:
                return {AnnotationType.label: LabelCategories.from_iterable(["a", "b", "c"])}

            @property
            def is_stream(self) -> bool:
                return True

        return DummyStreamingExtractor()

    def _generate_task(self):
        images = {
            "client_files[0]": generate_image_file("train_1.jpg", size=(4, 2)),
            "client_files[1]": generate_image_file("train_2.jpg", size=(4, 2)),
            "image_quality": 75,
        }
        task = {
            "name": "my task #1",
            "overlap": 0,
            "segment_size": 100,
            "labels": [
                {"name": "a"},
                {"name": "b"},
                {"name": "c"},
            ],
        }
        return self._create_task(task, images)

    def _create_project(self):
        data = {
            "name": "my project #1",
            "labels": [
                {"name": "a"},
                {"name": "b"},
                {"name": "c"},
            ],
        }
        with ForceLogin(self.user, self.client):
            response = self.client.post("/api/projects", data=data, format="json")
            assert response.status_code == status.HTTP_201_CREATED, response.status_code
            project = response.data

        return project

    def _create_task(self, data, image_data):
        with ForceLogin(self.user, self.client):
            response = self.client.post("/api/tasks", data=data, format="json")
            assert response.status_code == status.HTTP_201_CREATED, response.status_code
            tid = response.data["id"]

            response = self.client.post("/api/tasks/%s/data" % tid, data=image_data)
            assert response.status_code == status.HTTP_202_ACCEPTED, response.status_code
            rq_id = response.json()["rq_id"]

            response = self.client.get(f"/api/requests/{rq_id}")
            assert response.status_code == status.HTTP_200_OK, response.status_code
            assert response.json()["status"] == "finished", response.json().get("status")

            response = self.client.get("/api/tasks/%s" % tid)

            if 200 <= response.status_code < 400:
                labels_response = list(
                    get_paginated_collection(
                        lambda page: self.client.get("/api/labels?task_id=%s&page=%s" % (tid, page))
                    )
                )
                response.data["labels"] = labels_response

            task = response.data

        return task

    def _get_task_jobs(self, tid):
        with ForceLogin(self.user, self.client):
            return get_paginated_collection(
                lambda page: self.client.get(
                    "/api/jobs?task_id=%s&page=%s" % (tid, page), format="json"
                )
            )

    def _make_importer(self):
        @importer(name="dummy_format", ext="ZIP", version="1.0")
        def _dummy_importer(
            src_file,
            temp_dir: str,
            instance_data: ProjectData | CommonData,
            *,
            load_data_callback: Optional[Callable] = None,
            import_kwargs: dict | None = None,
            **kwargs,
        ):
            extractor = self.extractor

            # import single subset to job and task
            if not isinstance(instance_data, ProjectData):
                extractor = extractor.get_subset("train")

            dataset = StreamDataset.from_extractors(extractor)
            dataset._source_path = temp_dir
            if load_data_callback is not None:
                load_data_callback(dataset, instance_data)
            import_dm_annotations(dataset, instance_data)

    def test_import_job_annotations_efficiency(self):
        with TmpDirManager.get_tmp_directory() as temp_dir:
            fake_file_name = os.path.join(temp_dir, "fake.zip")
            open(fake_file_name, "w").close()
            import_job_annotations(fake_file_name, self.job_id, "dummy_format 1.0", True)
            assert self.extractor.ann_init_count == 2

    def test_import_task_annotations_efficiency(self):
        with TmpDirManager.get_tmp_directory() as temp_dir:
            fake_file_name = os.path.join(temp_dir, "fake.zip")
            open(fake_file_name, "w").close()
            import_task_annotations(fake_file_name, self.task_id, "dummy_format 1.0", True)
            assert self.extractor.ann_init_count == 2

    @mock.patch("rq.get_current_job")
    def test_import_project_annotations_efficiency(self, mock_current_job):
        mock_current_job.return_value = Mock(spec=RQJob, meta=dict())
        mock_current_job.return_value.save_meta = lambda: None

        from cvat.apps.engine.rq import AbstractRQMeta

        with (
            TmpDirManager.get_tmp_directory() as temp_dir,
            mock.patch.object(AbstractRQMeta, "save", return_value=None),
        ):
            fake_file_name = os.path.join(temp_dir, "fake.zip")
            open(fake_file_name, "w").close()
            import_dataset_as_project(fake_file_name, self.project_id, "dummy_format 1.0", True)
            assert self.extractor.ann_init_count == 6
