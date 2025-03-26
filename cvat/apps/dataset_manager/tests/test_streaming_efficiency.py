import os
import tempfile
from typing import Callable, Generator, Optional, Tuple
from unittest import TestCase, mock
from unittest.mock import MagicMock, Mock

import numpy as np
from datumaro import AnnotationType, Bbox, LabelCategories
from datumaro.components import media
from datumaro.components.dataset import StreamDataset
from datumaro.components.dataset_base import (
    CategoriesInfo,
    DatasetItem,
    StreamingDatasetBase,
    StreamingSubsetBase,
)
from django.contrib.auth.models import Group, User
from rest_framework import status
from rq.job import Job as RQJob

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
        if data_cls is not ProjectData:
            mock._replace.return_value = mock
        return mock

    @staticmethod
    def _make_counting_data_extractor_cls(extractor_cls):
        class CountingDataExtractor(extractor_cls):
            def __init__(self, *args, **kwargs):
                self.items_processed = 0
                super().__init__(*args, **kwargs)

            def _process_one_frame_data(
                self, frame_data: CommonData.Frame | ProjectData.Frame
            ) -> DatasetItem:
                self.items_processed += 1
                return super()._process_one_frame_data(frame_data)

        return CountingDataExtractor

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
        elif data_cls is JobData:
            assert len(subsets) == 1
            instance_data.db_instance.segment.task = Mock(id=0)
        elif data_cls is ProjectData:
            instance_data.tasks = [Mock(id=index) for index in range(len(subsets))]

        instance_data.group_by_frame.return_value = [
            self._make_mock_frame(
                data_cls=data_cls,
                id=index,
                task_id=subsets.index(subset),
                name=f"{item_id}.png",
                subset=subset,
                frame=index,
            )
            for index, (item_id, subset) in enumerate(item_ids)
        ]
        if data_cls is not ProjectData:
            instance_data.__len__.return_value = len(item_ids)
            instance_data.frame_info = {
                index: dict(id=item_id, subset=subset)
                for index, (item_id, subset) in enumerate(item_ids)
            }
            instance_data.get_included_frames.return_value = set(instance_data.frame_info.keys())

        return instance_data

    def test_can_stream_efficiently_on_export_for_tasks_and_jobs(self):
        item_ids = {("image", "foo"), ("another_image", "foo")}
        for data_cls in [TaskData, JobData]:
            with self.subTest(data_cls=data_cls.__name__):
                instance_data = self._make_mock_instance_data(data_cls, item_ids)
                extractor_cls = self._make_counting_data_extractor_cls(CvatTaskOrJobDataExtractor)

                with extractor_cls(instance_data=instance_data) as extractor:
                    dataset = StreamDataset.from_extractors(extractor, env=dm_env)
                    assert set(dataset.ids()) == item_ids, set(dataset.ids())
                    # did not iterate anything to init a dataset or to access ids
                    assert instance_data.group_by_frame.call_count == 0
                    assert extractor.items_processed == 0

                    # processes items when dataset is iterated and iterates over frame data
                    list(dataset)
                    assert extractor.items_processed == len(item_ids)
                    assert instance_data.group_by_frame.call_count == 1

                    # does not keep items in memory
                    list(dataset)
                    assert extractor.items_processed == len(item_ids) * 2
                    assert instance_data.group_by_frame.call_count == 2

                    # iterates frames once, when items are iterated through subsets
                    for subset in dataset.subsets().values():
                        list(subset)
                    assert extractor.items_processed == len(item_ids) * 3
                    assert instance_data.group_by_frame.call_count == 3

    @mock.patch("attr.evolve", lambda x, **kwargs: x)
    def test_can_stream_efficiently_on_export_for_projects(self):
        # counts should be the same as for task/job case, but it's a work in progress for now
        item_ids = {
            ("image", "foo"),
            ("another_image", "foo"),
            ("third_image", "bar"),
            ("fourth_image", "bar"),
        }
        instance_data = self._make_mock_instance_data(ProjectData, item_ids)
        extractor_cls = self._make_counting_data_extractor_cls(CVATProjectDataExtractor)

        with extractor_cls(instance_data=instance_data) as extractor:
            dataset = StreamDataset.from_extractors(extractor, env=dm_env)
            # iterated over instance frame data
            assert instance_data.group_by_frame.call_count == 1
            assert extractor.items_processed == 0

            # does not process any items to get ids
            assert set(dataset.ids()) == item_ids
            assert extractor.items_processed == 0

            # processes items when dataset is iterated
            list(dataset)
            assert extractor.items_processed == len(item_ids)

            # does not keep items in memory
            list(dataset)
            assert extractor.items_processed == len(item_ids) * 2

            # iterates frames once, when items are iterated through subsets
            for subset in dataset.subsets().values():
                list(subset)
            assert extractor.items_processed == len(item_ids) * 3

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

        class DummyStreamingExtractor(StreamingDatasetBase):
            def __init__(self):
                super().__init__(length=6, subsets=subsets)
                self.iter_subset_call_dict = {subset: 0 for subset in self._subsets}
                self.iter_call_count = 0

            def __iter__(self):
                self.iter_call_count += 1
                yield from super().__iter__()

            def get_subset(self, name: str) -> StreamingSubsetBase:
                assert name in self._subsets

                class _SubsetExtractor(StreamingSubsetBase):
                    def __init__(self, parent):
                        super().__init__(subset=name)
                        self.parent = parent
                        self._dummy_ids = [f"{name}_1", f"{name}_2"]

                    def __iter__(self):
                        self.parent.iter_subset_call_dict[name] += 1
                        for item_id, image_path in dataset_items[name]:
                            yield DatasetItem(
                                id=item_id,
                                subset=name,
                                media=media.Image.from_file(image_path),
                                annotations=[
                                    Bbox(x=5, y=5, w=2, h=2, label=1),
                                ],
                            )

                    def ids(self) -> Generator[Tuple[str, str], None, None]:
                        for item_id, _ in dataset_items[name]:
                            yield item_id, name

                    def categories(self):
                        return self.parent.categories()

                return _SubsetExtractor(self)

            def categories(self) -> CategoriesInfo:
                return {AnnotationType.label: LabelCategories.from_iterable(["a", "b", "c"])}

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
            assert self.extractor.iter_call_count == 0
            assert self.extractor.iter_subset_call_dict == {"train": 1, "test": 0, "foo": 0}

    def test_import_task_annotations_efficiency(self):
        with TmpDirManager.get_tmp_directory() as temp_dir:
            fake_file_name = os.path.join(temp_dir, "fake.zip")
            open(fake_file_name, "w").close()
            import_task_annotations(fake_file_name, self.task_id, "dummy_format 1.0", True)
            assert self.extractor.iter_call_count == 0
            assert self.extractor.iter_subset_call_dict == {"train": 1, "test": 0, "foo": 0}

    @mock.patch("rq.get_current_job")
    def test_import_project_annotations_efficiency(self, mock_current_job):
        mock_current_job.return_value = Mock(spec=RQJob, meta=dict())
        mock_current_job.return_value.save_meta = lambda: None

        with TmpDirManager.get_tmp_directory() as temp_dir:
            fake_file_name = os.path.join(temp_dir, "fake.zip")
            open(fake_file_name, "w").close()
            import_dataset_as_project(fake_file_name, self.project_id, "dummy_format 1.0", True)
            assert self.extractor.iter_call_count == 0

            # well, it should be 1, but it's a work in progress
            assert self.extractor.iter_subset_call_dict == {"train": 2, "test": 2, "foo": 2}
