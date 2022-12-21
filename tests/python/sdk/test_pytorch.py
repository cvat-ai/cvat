# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import os
from logging import Logger
from pathlib import Path
from typing import Tuple

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
except ImportError:
    cvatpt = None

from shared.utils.helpers import generate_image_files


@pytest.mark.skipif(cvatpt is None, reason="PyTorch dependencies are not installed")
class TestTaskVisionDataset:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        monkeypatch: pytest.MonkeyPatch,
        tmp_path: Path,
        fxt_login: Tuple[Client, str],
        fxt_logger: Tuple[Logger, io.StringIO],
        fxt_stdout: io.StringIO,
    ):
        self.tmp_path = tmp_path
        logger, self.logger_stream = fxt_logger
        self.stdout = fxt_stdout
        self.client, self.user = fxt_login
        self.client.logger = logger

        api_client = self.client.api_client
        for k in api_client.configuration.logger:
            api_client.configuration.logger[k] = logger

        monkeypatch.setattr(cvatpt, "_CACHE_DIR", self.tmp_path / "cache")

        self._create_task()

        yield

    def _create_task(self):
        self.images = generate_image_files(10)

        image_dir = self.tmp_path / "images"
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
            ResourceType.LOCAL,
            list(map(os.fspath, image_paths)),
            data_params={"chunk_size": 3},
        )

        self.label_ids = sorted(l.id for l in self.task.labels)

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
        label_name_to_id = {label.name: label.id for label in self.task.labels}

        dataset = cvatpt.TaskVisionDataset(
            self.client,
            self.task.id,
            label_name_to_index={"person": 123, "car": 456},
        )

        _, target = dataset[5]
        assert target.label_id_to_index[label_name_to_id["person"]] == 123
        assert target.label_id_to_index[label_name_to_id["car"]] == 456
