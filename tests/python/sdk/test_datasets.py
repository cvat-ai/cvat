# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from logging import Logger
from pathlib import Path
from typing import Tuple

import cvat_sdk.datasets as cvatds
import PIL.Image
import pytest
from cvat_sdk import Client, models
from cvat_sdk.core.proxies.tasks import ResourceType

from shared.utils.helpers import generate_image_files

from .util import restrict_api_requests


@pytest.fixture(autouse=True)
def _common_setup(
    tmp_path: Path,
    fxt_login: Tuple[Client, str],
    fxt_logger: Tuple[Logger, io.StringIO],
):
    logger = fxt_logger[0]
    client = fxt_login[0]
    client.logger = logger
    client.config.cache_dir = tmp_path / "cache"

    api_client = client.api_client
    for k in api_client.configuration.logger:
        api_client.configuration.logger[k] = logger


class TestTaskDataset:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        tmp_path: Path,
        fxt_login: Tuple[Client, str],
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
                "Dataset layer test task",
                labels=[
                    models.PatchedLabelRequest(name="person"),
                    models.PatchedLabelRequest(name="car"),
                ],
            ),
            resource_type=ResourceType.LOCAL,
            resources=image_paths,
            data_params={"chunk_size": 3},
        )

        self.expected_labels = sorted(self.task.get_labels(), key=lambda l: l.id)

        self.task.update_annotations(
            models.PatchedLabeledDataRequest(
                tags=[
                    models.LabeledImageRequest(frame=8, label_id=self.expected_labels[0].id),
                    models.LabeledImageRequest(frame=8, label_id=self.expected_labels[1].id),
                ],
                shapes=[
                    models.LabeledShapeRequest(
                        frame=6,
                        label_id=self.expected_labels[1].id,
                        type=models.ShapeType("rectangle"),
                        points=[1.0, 2.0, 3.0, 4.0],
                    ),
                ],
            )
        )

    def test_basic(self):
        dataset = cvatds.TaskDataset(self.client, self.task.id)

        # verify that the cache is not empty
        assert list(self.client.config.cache_dir.iterdir())

        for expected_label, actual_label in zip(
            self.expected_labels, sorted(dataset.labels, key=lambda l: l.id)
        ):
            assert expected_label.id == actual_label.id
            assert expected_label.name == actual_label.name

        assert len(dataset.samples) == self.task.size

        for index, sample in enumerate(dataset.samples):
            assert sample.frame_index == index
            assert sample.frame_name == self.images[index].name

            actual_image = sample.media.load_image()
            expected_image = PIL.Image.open(self.images[index])

            assert actual_image == expected_image

        assert not dataset.samples[0].annotations.tags
        assert not dataset.samples[1].annotations.shapes

        assert {tag.label_id for tag in dataset.samples[8].annotations.tags} == {
            label.id for label in self.expected_labels
        }
        assert not dataset.samples[8].annotations.shapes

        assert not dataset.samples[6].annotations.tags
        assert len(dataset.samples[6].annotations.shapes) == 1
        assert dataset.samples[6].annotations.shapes[0].type.value == "rectangle"
        assert dataset.samples[6].annotations.shapes[0].points == [1.0, 2.0, 3.0, 4.0]

    def test_deleted_frame(self):
        self.task.remove_frames_by_ids([1])

        dataset = cvatds.TaskDataset(self.client, self.task.id)

        assert len(dataset.samples) == self.task.size - 1

        # sample #0 is still frame #0
        assert dataset.samples[0].frame_index == 0
        assert dataset.samples[0].media.load_image() == PIL.Image.open(self.images[0])

        # sample #1 is now frame #2
        assert dataset.samples[1].frame_index == 2
        assert dataset.samples[1].media.load_image() == PIL.Image.open(self.images[2])

        # sample #5 is now frame #6
        assert dataset.samples[5].frame_index == 6
        assert dataset.samples[5].media.load_image() == PIL.Image.open(self.images[6])
        assert len(dataset.samples[5].annotations.shapes) == 1

    def test_offline(self, monkeypatch: pytest.MonkeyPatch):
        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
            update_policy=cvatds.UpdatePolicy.IF_MISSING_OR_STALE,
        )

        fresh_samples = list(dataset.samples)

        restrict_api_requests(monkeypatch)

        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
            update_policy=cvatds.UpdatePolicy.NEVER,
        )

        cached_samples = list(dataset.samples)

        for fresh_sample, cached_sample in zip(fresh_samples, cached_samples):
            assert fresh_sample.frame_index == cached_sample.frame_index
            assert fresh_sample.annotations == cached_sample.annotations
            assert fresh_sample.media.load_image() == cached_sample.media.load_image()

    def test_update(self, monkeypatch: pytest.MonkeyPatch):
        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
        )

        # Recreating the dataset should only result in minimal requests.
        restrict_api_requests(
            monkeypatch, allow_paths={f"/api/tasks/{self.task.id}", "/api/labels"}
        )

        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
        )

        assert dataset.samples[6].annotations.shapes[0].label_id == self.expected_labels[1].id

        # After an update, the annotations should be redownloaded.
        monkeypatch.undo()

        self.task.update_annotations(
            models.PatchedLabeledDataRequest(
                shapes=[
                    models.LabeledShapeRequest(
                        id=dataset.samples[6].annotations.shapes[0].id,
                        frame=6,
                        label_id=self.expected_labels[0].id,
                        type=models.ShapeType("rectangle"),
                        points=[1.0, 2.0, 3.0, 4.0],
                    ),
                ]
            )
        )

        dataset = cvatds.TaskDataset(
            self.client,
            self.task.id,
        )

        assert dataset.samples[6].annotations.shapes[0].label_id == self.expected_labels[0].id

    def test_no_annotations(self):
        dataset = cvatds.TaskDataset(self.client, self.task.id, load_annotations=False)

        for index, sample in enumerate(dataset.samples):
            assert sample.frame_index == index
            assert sample.frame_name == self.images[index].name

            actual_image = sample.media.load_image()
            expected_image = PIL.Image.open(self.images[index])

            assert actual_image == expected_image

            assert sample.annotations is None
