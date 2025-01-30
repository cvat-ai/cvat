# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import itertools
import os
from logging import Logger
from pathlib import Path

import pytest
from cvat_sdk import Client, models
from cvat_sdk.core.proxies.tasks import ResourceType

try:
    import cvat_sdk.pytorch as cvatpt
    import PIL.Image
    import torch
    import torchvision.transforms
    import torchvision.transforms.functional as TF
    from torch.utils.data import DataLoader
except ModuleNotFoundError as e:
    if e.name.split(".")[0] not in {"torch", "torchvision"}:
        raise

    cvatpt = None

from shared.utils.helpers import generate_image_files

from .util import restrict_api_requests


@pytest.fixture(autouse=True)
def _common_setup(
    tmp_path: Path,
    fxt_login: tuple[Client, str],
    fxt_logger: tuple[Logger, io.StringIO],
    restore_redis_ondisk_per_function,
    restore_redis_inmem_per_function,
):
    logger = fxt_logger[0]
    client = fxt_login[0]
    client.logger = logger
    client.config.cache_dir = tmp_path / "cache"

    api_client = client.api_client
    for k in api_client.configuration.logger:
        api_client.configuration.logger[k] = logger


@pytest.mark.skipif(cvatpt is None, reason="PyTorch dependencies are not installed")
class TestTaskVisionDataset:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        tmp_path: Path,
        fxt_login: tuple[Client, str],
    ):
        self.client = fxt_login[0]
        self.images = generate_image_files(10)

        image_dir = tmp_path / "images"
        image_dir.mkdir()

        image_paths = []
        for image in self.images:
            image_path = image_dir / image.name
            image_path.write_bytes(image.getbuffer())
            image_paths.append(image_path)

        self.task = self.client.tasks.create_from_data(
            models.TaskWriteRequest(
                "PyTorch integration test task",
                labels=[
                    models.PatchedLabelRequest(name="person"),
                    models.PatchedLabelRequest(name="car"),
                ],
            ),
            resource_type=ResourceType.LOCAL,
            resources=list(map(os.fspath, image_paths)),
            data_params={"chunk_size": 3},
        )

        self.label_ids = sorted(l.id for l in self.task.get_labels())

        self.task.update_annotations(
            models.PatchedLabeledDataRequest(
                tags=[
                    models.LabeledImageRequest(frame=5, label_id=self.label_ids[0]),
                    models.LabeledImageRequest(frame=6, label_id=self.label_ids[1]),
                    models.LabeledImageRequest(frame=8, label_id=self.label_ids[0]),
                    models.LabeledImageRequest(frame=8, label_id=self.label_ids[1]),
                ],
                shapes=[
                    models.LabeledShapeRequest(
                        frame=6,
                        label_id=self.label_ids[1],
                        type=models.ShapeType("rectangle"),
                        points=[1.0, 2.0, 3.0, 4.0],
                    ),
                    models.LabeledShapeRequest(
                        frame=7,
                        label_id=self.label_ids[0],
                        type=models.ShapeType("points"),
                        points=[1.1, 2.1, 3.1, 4.1],
                    ),
                ],
            )
        )

    def test_basic(self):
        dataset = cvatpt.TaskVisionDataset(self.client, self.task.id)

        # verify that the cache is not empty
        assert list(self.client.config.cache_dir.iterdir())

        assert len(dataset) == self.task.size

        for index, (sample_image, sample_target) in enumerate(dataset):
            sample_image_tensor = TF.pil_to_tensor(sample_image)
            reference_tensor = TF.pil_to_tensor(PIL.Image.open(self.images[index]))
            assert torch.equal(sample_image_tensor, reference_tensor)

            for index, label_id in enumerate(self.label_ids):
                assert sample_target.label_id_to_index[label_id] == index

        assert not dataset[0][1].annotations.tags
        assert not dataset[0][1].annotations.shapes

        assert len(dataset[5][1].annotations.tags) == 1
        assert dataset[5][1].annotations.tags[0].label_id == self.label_ids[0]
        assert not dataset[5][1].annotations.shapes

        assert len(dataset[6][1].annotations.tags) == 1
        assert dataset[6][1].annotations.tags[0].label_id == self.label_ids[1]
        assert len(dataset[6][1].annotations.shapes) == 1
        assert dataset[6][1].annotations.shapes[0].type.value == "rectangle"
        assert dataset[6][1].annotations.shapes[0].points == [1.0, 2.0, 3.0, 4.0]

        assert not dataset[7][1].annotations.tags
        assert len(dataset[7][1].annotations.shapes) == 1
        assert dataset[7][1].annotations.shapes[0].type.value == "points"
        assert dataset[7][1].annotations.shapes[0].points == [1.1, 2.1, 3.1, 4.1]

    def test_deleted_frame(self):
        self.task.remove_frames_by_ids([1])

        dataset = cvatpt.TaskVisionDataset(self.client, self.task.id)

        assert len(dataset) == self.task.size - 1

        # sample #0 is still frame #0
        assert torch.equal(
            TF.pil_to_tensor(dataset[0][0]), TF.pil_to_tensor(PIL.Image.open(self.images[0]))
        )

        # sample #1 is now frame #2
        assert torch.equal(
            TF.pil_to_tensor(dataset[1][0]), TF.pil_to_tensor(PIL.Image.open(self.images[2]))
        )

        # sample #4 is now frame #5
        assert len(dataset[4][1].annotations.tags) == 1
        assert dataset[4][1].annotations.tags[0].label_id == self.label_ids[0]
        assert not dataset[4][1].annotations.shapes

    def test_extract_single_label_index(self):
        dataset = cvatpt.TaskVisionDataset(
            self.client,
            self.task.id,
            transform=torchvision.transforms.PILToTensor(),
            target_transform=cvatpt.ExtractSingleLabelIndex(),
        )

        assert torch.equal(dataset[5][1], torch.tensor(0))
        assert torch.equal(dataset[6][1], torch.tensor(1))

        with pytest.raises(ValueError):
            # no tags
            _ = dataset[7]

        with pytest.raises(ValueError):
            # multiple tags
            _ = dataset[8]

        # make sure the samples can be batched with the default collater
        loader = DataLoader(dataset, batch_size=2, sampler=[5, 6])

        batch = next(iter(loader))
        assert torch.equal(batch[0][0], TF.pil_to_tensor(PIL.Image.open(self.images[5])))
        assert torch.equal(batch[0][1], TF.pil_to_tensor(PIL.Image.open(self.images[6])))
        assert torch.equal(batch[1], torch.tensor([0, 1]))

    def test_extract_bounding_boxes(self):
        dataset = cvatpt.TaskVisionDataset(
            self.client,
            self.task.id,
            transform=torchvision.transforms.PILToTensor(),
            target_transform=cvatpt.ExtractBoundingBoxes(include_shape_types={"rectangle"}),
        )

        assert torch.equal(dataset[0][1]["boxes"], torch.tensor([]))
        assert torch.equal(dataset[0][1]["labels"], torch.tensor([]))

        assert torch.equal(dataset[6][1]["boxes"], torch.tensor([(1.0, 2.0, 3.0, 4.0)]))
        assert torch.equal(dataset[6][1]["labels"], torch.tensor([1]))

        # points are filtered out
        assert torch.equal(dataset[7][1]["boxes"], torch.tensor([]))
        assert torch.equal(dataset[7][1]["labels"], torch.tensor([]))

    def test_transforms(self):
        dataset = cvatpt.TaskVisionDataset(
            self.client,
            self.task.id,
            transforms=lambda x, y: (y, x),
        )

        assert isinstance(dataset[0][0], cvatpt.Target)
        assert isinstance(dataset[0][1], PIL.Image.Image)

    def test_custom_label_mapping(self):
        label_name_to_id = {label.name: label.id for label in self.task.get_labels()}

        dataset = cvatpt.TaskVisionDataset(
            self.client,
            self.task.id,
            label_name_to_index={"person": 123, "car": 456},
        )

        _, target = dataset[5]
        assert target.label_id_to_index[label_name_to_id["person"]] == 123
        assert target.label_id_to_index[label_name_to_id["car"]] == 456

    def test_offline(self, monkeypatch: pytest.MonkeyPatch):
        dataset = cvatpt.TaskVisionDataset(
            self.client,
            self.task.id,
            update_policy=cvatpt.UpdatePolicy.IF_MISSING_OR_STALE,
        )

        fresh_samples = list(dataset)

        restrict_api_requests(monkeypatch)

        dataset = cvatpt.TaskVisionDataset(
            self.client,
            self.task.id,
            update_policy=cvatpt.UpdatePolicy.NEVER,
        )

        cached_samples = list(dataset)

        assert fresh_samples == cached_samples

    def test_update(self, monkeypatch: pytest.MonkeyPatch):
        dataset = cvatpt.TaskVisionDataset(
            self.client,
            self.task.id,
        )

        # Recreating the dataset should only result in minimal requests.
        restrict_api_requests(
            monkeypatch, allow_paths={f"/api/tasks/{self.task.id}", "/api/labels"}
        )

        dataset = cvatpt.TaskVisionDataset(
            self.client,
            self.task.id,
        )

        assert dataset[5][1].annotations.tags[0].label_id == self.label_ids[0]

        # After an update, the annotations should be redownloaded.
        monkeypatch.undo()

        self.task.update_annotations(
            models.PatchedLabeledDataRequest(
                tags=[
                    models.LabeledImageRequest(
                        id=dataset[5][1].annotations.tags[0].id, frame=5, label_id=self.label_ids[1]
                    ),
                ]
            )
        )

        dataset = cvatpt.TaskVisionDataset(
            self.client,
            self.task.id,
        )

        assert dataset[5][1].annotations.tags[0].label_id == self.label_ids[1]


@pytest.mark.skipif(cvatpt is None, reason="PyTorch dependencies are not installed")
class TestProjectVisionDataset:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        tmp_path: Path,
        fxt_login: tuple[Client, str],
    ):
        self.client = fxt_login[0]

        self.project = self.client.projects.create(
            models.ProjectWriteRequest(
                "PyTorch integration test project",
                labels=[
                    models.PatchedLabelRequest(name="person"),
                    models.PatchedLabelRequest(name="car"),
                ],
            )
        )
        self.label_ids = sorted(l.id for l in self.project.get_labels())

        subsets = ["Train", "Test", "Val"]
        num_images_per_task = 3

        all_images = generate_image_files(num_images_per_task * len(subsets))

        self.images_per_task = list(zip(*[iter(all_images)] * num_images_per_task))

        image_dir = tmp_path / "images"
        image_dir.mkdir()

        image_paths_per_task = []
        for images in self.images_per_task:
            image_paths = []
            for image in images:
                image_path = image_dir / image.name
                image_path.write_bytes(image.getbuffer())
                image_paths.append(image_path)
            image_paths_per_task.append(image_paths)

        self.tasks = [
            self.client.tasks.create_from_data(
                models.TaskWriteRequest(
                    "PyTorch integration test task",
                    project_id=self.project.id,
                    subset=subset,
                ),
                resource_type=ResourceType.LOCAL,
                resources=image_paths,
                data_params={"image_quality": 70},
            )
            for subset, image_paths in zip(subsets, image_paths_per_task)
        ]

        # sort both self.tasks and self.images_per_task in the order that ProjectVisionDataset uses
        self.tasks, self.images_per_task = zip(
            *sorted(zip(self.tasks, self.images_per_task), key=lambda t: t[0].id)
        )

        for task_id, label_index in ((0, 0), (1, 1), (2, 0)):
            self.tasks[task_id].update_annotations(
                models.PatchedLabeledDataRequest(
                    tags=[
                        models.LabeledImageRequest(
                            frame=task_id, label_id=self.label_ids[label_index]
                        ),
                    ],
                )
            )

    def test_basic(self):
        dataset = cvatpt.ProjectVisionDataset(self.client, self.project.id)

        assert len(dataset) == sum(task.size for task in self.tasks)

        for sample, image in zip(dataset, itertools.chain.from_iterable(self.images_per_task)):
            assert torch.equal(TF.pil_to_tensor(sample[0]), TF.pil_to_tensor(PIL.Image.open(image)))

        assert dataset[0][1].annotations.tags[0].label_id == self.label_ids[0]
        assert dataset[4][1].annotations.tags[0].label_id == self.label_ids[1]
        assert dataset[8][1].annotations.tags[0].label_id == self.label_ids[0]

    def _test_filtering(self, **kwargs):
        dataset = cvatpt.ProjectVisionDataset(self.client, self.project.id, **kwargs)

        assert len(dataset) == sum(task.size for task in self.tasks[1:])

        for sample, image in zip(dataset, itertools.chain.from_iterable(self.images_per_task[1:])):
            assert torch.equal(TF.pil_to_tensor(sample[0]), TF.pil_to_tensor(PIL.Image.open(image)))

        assert dataset[1][1].annotations.tags[0].label_id == self.label_ids[1]
        assert dataset[5][1].annotations.tags[0].label_id == self.label_ids[0]

    def test_task_filter(self):
        self._test_filtering(task_filter=lambda t: t.subset != self.tasks[0].subset)

    def test_include_subsets(self):
        self._test_filtering(include_subsets={self.tasks[1].subset, self.tasks[2].subset})

    def test_custom_label_mapping(self):
        label_name_to_id = {label.name: label.id for label in self.project.get_labels()}

        dataset = cvatpt.ProjectVisionDataset(
            self.client, self.project.id, label_name_to_index={"person": 123, "car": 456}
        )

        _, target = dataset[5]
        assert target.label_id_to_index[label_name_to_id["person"]] == 123
        assert target.label_id_to_index[label_name_to_id["car"]] == 456

    def test_separate_transforms(self):
        dataset = cvatpt.ProjectVisionDataset(
            self.client,
            self.project.id,
            transform=torchvision.transforms.ToTensor(),
            target_transform=cvatpt.ExtractSingleLabelIndex(),
        )

        assert torch.equal(
            dataset[0][0], TF.pil_to_tensor(PIL.Image.open(self.images_per_task[0][0]))
        )
        assert torch.equal(dataset[0][1], torch.tensor(0))

    def test_combined_transforms(self):
        dataset = cvatpt.ProjectVisionDataset(
            self.client,
            self.project.id,
            transforms=lambda x, y: (y, x),
        )

        assert isinstance(dataset[0][0], cvatpt.Target)
        assert isinstance(dataset[0][1], PIL.Image.Image)

    def test_offline(self, monkeypatch: pytest.MonkeyPatch):
        dataset = cvatpt.ProjectVisionDataset(
            self.client,
            self.project.id,
            update_policy=cvatpt.UpdatePolicy.IF_MISSING_OR_STALE,
        )

        fresh_samples = list(dataset)

        restrict_api_requests(monkeypatch)

        dataset = cvatpt.ProjectVisionDataset(
            self.client,
            self.project.id,
            update_policy=cvatpt.UpdatePolicy.NEVER,
        )

        cached_samples = list(dataset)

        assert fresh_samples == cached_samples
