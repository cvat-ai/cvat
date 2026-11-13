# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import json
import zipfile

import PIL.Image
import pytest

torch = pytest.importorskip("torch")
torchvision = pytest.importorskip("torchvision")

from cvat_sdk import Client
from cvat_sdk.core.client import Config
from cvat_sdk.datasets.caching import UpdatePolicy, make_cache_manager
from cvat_sdk.pytorch import ProjectVisionDataset
from cvat_sdk.pytorch.transforms import ExtractSingleLabelIndex


@pytest.fixture
def client(tmp_path):
    with Client(
        "http://localhost:8080",
        config=Config(cache_dir=tmp_path / "cache"),
        check_server_version=False,
    ) as client:
        yield client


def _cache_project(client, tasks, *, deleted_frames=()):
    # Real serialized SDK cache, read through UpdatePolicy.NEVER. No API mock.
    cache = make_cache_manager(client, UpdatePolicy.NEVER)
    label = {"id": 11, "name": "sample"}
    project = {
        "model": {"id": 7, "name": "offline", "tasks": {"count": len(tasks)}, "labels": {}},
        "tasks": [task_id for task_id, _ in tasks],
        "labels": [label],
    }
    cache.project_dir(7).mkdir(parents=True)
    cache.project_json_path(7).write_text(json.dumps(project))
    for task_id, subset in tasks:
        task = {
            "model": {
                "id": task_id,
                "name": str(task_id),
                "size": 2,
                "data_chunk_size": 2,
                "data_original_chunk_type": "imageset",
                "subset": subset,
                "jobs": {"completed": 0, "validation": 0},
                "labels": {},
            },
            "labels": [label],
        }
        cache.task_dir(task_id).mkdir(parents=True)
        cache.task_json_path(task_id).write_text(json.dumps(task))
        metadata = {
            "chunks_updated_date": "2026-01-01T00:00:00Z",
            "deleted_frames": list(deleted_frames),
            "frames": [
                {"name": f"{index}.png", "width": 4, "height": 3, "related_files": 0}
                for index in range(2)
            ],
        }
        (cache.task_dir(task_id) / "data_meta.json").write_text(json.dumps(metadata))
        annotations = {
            "version": 0,
            "tags": [{"frame": index, "label_id": 11} for index in range(2)],
            "shapes": [],
            "tracks": [],
        }
        (cache.task_dir(task_id) / "annotations.json").write_text(json.dumps(annotations))
        cache.chunk_dir(task_id).mkdir()
        with zipfile.ZipFile(cache.chunk_dir(task_id) / "0.zip", "w") as chunk:
            for index in range(2):
                image = PIL.Image.new("RGB", (4, 3), (task_id * 10 + index, 0, 0))
                buffer = io.BytesIO()
                image.save(buffer, format="PNG")
                chunk.writestr(f"{index}.png", buffer.getvalue())


@pytest.mark.parametrize(
    "options",
    [
        {"task_filter": lambda task: False},
        {"include_subsets": []},
        {"include_subsets": ["missing"]},
        {"task_filter": lambda task: task.id == 2, "include_subsets": ["train"]},
    ],
)
def test_empty_project_selection_is_a_valid_empty_dataset(client, options):
    _cache_project(client, [(4, "train"), (2, "validation")])
    dataset = ProjectVisionDataset(client, 7, update_policy=UpdatePolicy.NEVER, **options)
    assert len(dataset) == 0
    assert list(dataset) == []
    assert list(torch.utils.data.DataLoader(dataset, batch_size=3)) == []
    for index in (0, -1, 3):
        with pytest.raises(IndexError):
            dataset[index]


def test_project_without_tasks_is_empty(client):
    _cache_project(client, [])
    dataset = ProjectVisionDataset(client, 7, update_policy=UpdatePolicy.NEVER)
    assert len(dataset) == 0
    assert list(dataset) == []
    assert list(torch.utils.data.DataLoader(dataset, batch_size=1)) == []


@pytest.mark.parametrize(
    "options, expected",
    [
        ({}, [20, 21, 40, 41]),
        ({"include_subsets": ["train"]}, [40, 41]),
        ({"task_filter": lambda task: task.id == 2}, [20, 21]),
        ({"include_subsets": ["validation", "train"]}, [20, 21, 40, 41]),
    ],
)
def test_nonempty_selection_preserves_order_images_and_transforms(client, options, expected):
    _cache_project(client, [(4, "train"), (2, "validation")])
    dataset = ProjectVisionDataset(
        client,
        7,
        update_policy=UpdatePolicy.NEVER,
        transform=torchvision.transforms.functional.pil_to_tensor,
        target_transform=ExtractSingleLabelIndex(),
        **options,
    )
    images, labels = [], []
    for batch_images, batch_labels in torch.utils.data.DataLoader(dataset, batch_size=3):
        images.extend(batch_images[:, 0, 0, 0].tolist())
        labels.extend(batch_labels.tolist())
    assert len(dataset) == len(expected)
    assert images == expected
    assert labels == [0] * len(expected)


def test_existing_all_deleted_task_sequence_remains_empty(client):
    _cache_project(client, [(2, "train")], deleted_frames=(0, 1))
    dataset = ProjectVisionDataset(client, 7, update_policy=UpdatePolicy.NEVER)
    assert len(dataset) == 0
    assert list(torch.utils.data.DataLoader(dataset, batch_size=2)) == []


def test_empty_selection_does_not_execute_transforms_or_training_steps(client):
    _cache_project(client, [(2, "train")])

    def unexpected_transform(image):
        raise AssertionError("An empty dataset has no images to transform")

    dataset = ProjectVisionDataset(
        client,
        7,
        update_policy=UpdatePolicy.NEVER,
        include_subsets=["validation"],
        transform=unexpected_transform,
    )
    model = torch.nn.Linear(4 * 3 * 3, 2)
    before = {key: value.clone() for key, value in model.state_dict().items()}
    optimizer = torch.optim.SGD(model.parameters(), lr=0.1)
    for images, labels in torch.utils.data.DataLoader(dataset, batch_size=2):
        optimizer.zero_grad()
        torch.nn.functional.cross_entropy(model(images.flatten(1)), labels).backward()
        optimizer.step()
    for key, value in model.state_dict().items():
        torch.testing.assert_close(value, before[key], rtol=0, atol=0)
