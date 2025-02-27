# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os
from pathlib import Path

import pytest
from cvat_sdk.api_client import exceptions
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from PIL import Image

from sdk.util import generate_coco_json
from shared.utils.helpers import generate_image_file

from .util import TestCliBase, generate_images


class TestCliTasks(TestCliBase):
    @pytest.fixture
    def fxt_image_file(self):
        img_path = self.tmp_path / "img_0.png"
        with img_path.open("wb") as f:
            f.write(generate_image_file(filename=str(img_path)).getvalue())

        return img_path

    @pytest.fixture
    def fxt_coco_file(self, fxt_image_file: Path):
        img_filename = fxt_image_file
        img_size = Image.open(img_filename).size
        ann_filename = self.tmp_path / "coco.json"
        generate_coco_json(ann_filename, img_info=(img_filename, *img_size))

        yield ann_filename

    @pytest.fixture
    def fxt_backup_file(self, fxt_new_task: Task, fxt_coco_file: str):
        backup_path = self.tmp_path / "backup.zip"

        fxt_new_task.import_annotations("COCO 1.0", filename=fxt_coco_file)
        fxt_new_task.download_backup(backup_path)

        yield backup_path

    @pytest.fixture
    def fxt_new_task(self):
        files = generate_images(self.tmp_path, 5)

        task = self.client.tasks.create_from_data(
            spec={
                "name": "test_task",
                "labels": [{"name": "car"}, {"name": "person"}],
            },
            resource_type=ResourceType.LOCAL,
            resources=files,
        )

        return task

    def test_can_create_task_from_local_images(self):
        files = generate_images(self.tmp_path, 5)

        stdout = self.run_cli(
            "task",
            "create",
            "test_task",
            ResourceType.LOCAL.name,
            *map(os.fspath, files),
            "--labels",
            json.dumps([{"name": "car"}, {"name": "person"}]),
            "--completion_verification_period",
            "0.01",
        )

        task_id = int(stdout.rstrip("\n"))
        assert self.client.tasks.retrieve(task_id).size == 5

    def test_can_create_task_from_local_images_with_parameters(self):
        # Checks for regressions of <https://github.com/cvat-ai/cvat/issues/4962>

        files = generate_images(self.tmp_path, 7)
        files.sort(reverse=True)
        frame_step = 3

        stdout = self.run_cli(
            "task",
            "create",
            "test_task",
            ResourceType.LOCAL.name,
            *map(os.fspath, files),
            "--labels",
            json.dumps([{"name": "car"}, {"name": "person"}]),
            "--completion_verification_period",
            "0.01",
            "--sorting-method",
            "predefined",
            "--frame_step",
            str(frame_step),
            "--bug_tracker",
            "http://localhost/bug",
        )

        task_id = int(stdout.rstrip("\n"))
        task = self.client.tasks.retrieve(task_id)
        frames = task.get_frames_info()
        assert [f.name for f in frames] == [
            f.name for i, f in enumerate(files) if i % frame_step == 0
        ]
        assert task.get_meta().frame_filter == f"step={frame_step}"
        assert task.bug_tracker == "http://localhost/bug"

    def test_can_list_tasks_in_simple_format(self, fxt_new_task: Task):
        output = self.run_cli("task", "ls")

        results = output.split("\n")
        assert any(str(fxt_new_task.id) in r for r in results)

    def test_can_list_tasks_in_json_format(self, fxt_new_task: Task):
        output = self.run_cli("task", "ls", "--json")

        results = json.loads(output)
        assert any(r["id"] == fxt_new_task.id for r in results)

    def test_can_delete_task(self, fxt_new_task: Task):
        self.run_cli("task", "delete", str(fxt_new_task.id))

        with pytest.raises(exceptions.NotFoundException):
            fxt_new_task.fetch()

    def test_can_download_task_annotations(self, fxt_new_task: Task):
        filename = self.tmp_path / "task_{fxt_new_task.id}-cvat.zip"
        self.run_cli(
            "task",
            "export-dataset",
            str(fxt_new_task.id),
            str(filename),
            "--format",
            "CVAT for images 1.1",
            "--with-images",
            "no",
            "--completion_verification_period",
            "0.01",
        )

        assert 0 < filename.stat().st_size

    def test_can_download_task_backup(self, fxt_new_task: Task):
        filename = self.tmp_path / "task_{fxt_new_task.id}-cvat.zip"
        self.run_cli(
            "task",
            "backup",
            str(fxt_new_task.id),
            str(filename),
            "--completion_verification_period",
            "0.01",
        )

        assert 0 < filename.stat().st_size

    @pytest.mark.parametrize("quality", ("compressed", "original"))
    def test_can_download_task_frames(self, fxt_new_task: Task, quality: str):
        out_dir = str(self.tmp_path / "downloads")
        self.run_cli(
            "task",
            "frames",
            str(fxt_new_task.id),
            "0",
            "1",
            "--outdir",
            out_dir,
            "--quality",
            quality,
        )

        assert set(os.listdir(out_dir)) == {
            "task_{}_frame_{:06d}.jpg".format(fxt_new_task.id, i) for i in range(2)
        }

    def test_can_upload_annotations(self, fxt_new_task: Task, fxt_coco_file: Path):
        self.run_cli(
            "task",
            "import-dataset",
            str(fxt_new_task.id),
            str(fxt_coco_file),
            "--format",
            "COCO 1.0",
        )

    def test_can_create_from_backup(self, fxt_new_task: Task, fxt_backup_file: Path):
        stdout = self.run_cli("task", "create-from-backup", str(fxt_backup_file))

        task_id = int(stdout.rstrip("\n"))
        assert task_id
        assert task_id != fxt_new_task.id
        assert self.client.tasks.retrieve(task_id).size == fxt_new_task.size

    def test_auto_annotate_with_module(self, fxt_new_task: Task):
        annotations = fxt_new_task.get_annotations()
        assert not annotations.shapes

        self.run_cli(
            "task",
            "auto-annotate",
            str(fxt_new_task.id),
            f"--function-module={__package__}.example_function",
        )

        annotations = fxt_new_task.get_annotations()
        assert annotations.shapes

    def test_auto_annotate_with_file(self, fxt_new_task: Task):
        annotations = fxt_new_task.get_annotations()
        assert not annotations.shapes

        self.run_cli(
            "task",
            "auto-annotate",
            str(fxt_new_task.id),
            f"--function-file={Path(__file__).with_name('example_function.py')}",
        )

        annotations = fxt_new_task.get_annotations()
        assert annotations.shapes

    def test_auto_annotate_with_parameters(self, fxt_new_task: Task):
        annotations = fxt_new_task.get_annotations()
        assert not annotations.shapes

        self.run_cli(
            "task",
            "auto-annotate",
            str(fxt_new_task.id),
            f"--function-module={__package__}.example_parameterized_function",
            "-ps=str:string",
            "-pi=int:123",
            "-pf=float:5.5",
            "-pb=bool:false",
        )

        annotations = fxt_new_task.get_annotations()
        assert annotations.shapes

    def test_auto_annotate_with_threshold(self, fxt_new_task: Task):
        annotations = fxt_new_task.get_annotations()
        assert not annotations.shapes

        self.run_cli(
            "task",
            "auto-annotate",
            str(fxt_new_task.id),
            f"--function-module={__package__}.conf_threshold_function",
            "--conf-threshold=0.75",
        )

        annotations = fxt_new_task.get_annotations()
        assert annotations.shapes[0].points[0] == 0.75  # python:S1244 NOSONAR

    def test_auto_annotate_with_cmtp(self, fxt_new_task: Task):
        self.run_cli(
            "task",
            "auto-annotate",
            str(fxt_new_task.id),
            f"--function-module={__package__}.cmtp_function",
            "--clear-existing",
        )

        annotations = fxt_new_task.get_annotations()
        assert annotations.shapes[0].type.value == "mask"

        self.run_cli(
            "task",
            "auto-annotate",
            str(fxt_new_task.id),
            f"--function-module={__package__}.cmtp_function",
            "--clear-existing",
            "--conv-mask-to-poly",
        )

        annotations = fxt_new_task.get_annotations()
        assert annotations.shapes[0].type.value == "polygon"

    def test_legacy_alias(self, caplog):
        # All legacy aliases are implemented the same way;
        # no need to test every single one.
        self.run_cli("ls")

        assert "deprecated" in caplog.text
        assert "task ls" in caplog.text
