# Copyright (C) 2022-2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import json
import os
from pathlib import Path
from typing import Optional

import packaging.version as pv
import pytest
from cvat_cli.cli import CLI
from cvat_sdk import Client, make_client
from cvat_sdk.api_client import exceptions, models
from cvat_sdk.core.proxies.tasks import ResourceType, Task
from PIL import Image

from sdk.util import generate_coco_json
from shared.utils.config import BASE_URL, USER_PASS
from shared.utils.helpers import generate_image_file

from .util import generate_images, run_cli


class TestCLI:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        restore_db_per_function,  # force fixture call order to allow DB setup
        fxt_stdout: io.StringIO,
        tmp_path: Path,
        admin_user: str,
    ):
        self.tmp_path = tmp_path
        self.stdout = fxt_stdout
        self.host, self.port = BASE_URL.rsplit(":", maxsplit=1)
        self.user = admin_user
        self.password = USER_PASS
        self.client = make_client(
            host=self.host, port=self.port, credentials=(self.user, self.password)
        )
        self.client.config.status_check_period = 0.01

        yield

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

    def run_cli(
        self, cmd: str, *args: str, expected_code: int = 0, organization: Optional[str] = None
    ) -> str:
        common_args = [
            f"--auth={self.user}:{self.password}",
            f"--server-host={self.host}",
            f"--server-port={self.port}",
        ]

        if organization is not None:
            common_args.append(f"--organization={organization}")

        run_cli(
            self,
            *common_args,
            cmd,
            *args,
            expected_code=expected_code,
        )
        return self.stdout.getvalue()

    def test_can_create_task_from_local_images(self):
        files = generate_images(self.tmp_path, 5)

        stdout = self.run_cli(
            "create",
            "test_task",
            ResourceType.LOCAL.name,
            *map(os.fspath, files),
            "--labels",
            json.dumps([{"name": "car"}, {"name": "person"}]),
            "--completion_verification_period",
            "0.01",
        )

        task_id = int(stdout.split()[-1])
        assert self.client.tasks.retrieve(task_id).size == 5

    def test_can_create_task_from_local_images_with_parameters(self):
        # Checks for regressions of <https://github.com/cvat-ai/cvat/issues/4962>

        files = generate_images(self.tmp_path, 7)
        files.sort(reverse=True)
        frame_step = 3

        stdout = self.run_cli(
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

        task_id = int(stdout.split()[-1])
        task = self.client.tasks.retrieve(task_id)
        frames = task.get_frames_info()
        assert [f.name for f in frames] == [
            f.name for i, f in enumerate(files) if i % frame_step == 0
        ]
        assert task.get_meta().frame_filter == f"step={frame_step}"
        assert task.bug_tracker == "http://localhost/bug"

    def test_can_list_tasks_in_simple_format(self, fxt_new_task: Task):
        output = self.run_cli("ls")

        results = output.split("\n")
        assert any(str(fxt_new_task.id) in r for r in results)

    def test_can_list_tasks_in_json_format(self, fxt_new_task: Task):
        output = self.run_cli("ls", "--json")

        results = json.loads(output)
        assert any(r["id"] == fxt_new_task.id for r in results)

    def test_can_delete_task(self, fxt_new_task: Task):
        self.run_cli("delete", str(fxt_new_task.id))

        with pytest.raises(exceptions.NotFoundException):
            fxt_new_task.fetch()

    def test_can_download_task_annotations(self, fxt_new_task: Task):
        filename = self.tmp_path / "task_{fxt_new_task.id}-cvat.zip"
        self.run_cli(
            "dump",
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
            "export",
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
        self.run_cli("upload", str(fxt_new_task.id), str(fxt_coco_file), "--format", "COCO 1.0")

    def test_can_create_from_backup(self, fxt_new_task: Task, fxt_backup_file: Path):
        stdout = self.run_cli("import", str(fxt_backup_file))

        task_id = int(stdout.split()[-1])
        assert task_id
        assert task_id != fxt_new_task.id
        assert self.client.tasks.retrieve(task_id).size == fxt_new_task.size

    def test_can_warn_on_mismatching_server_version(self, monkeypatch, caplog):
        def mocked_version(_):
            return pv.Version("0")

        # We don't actually run a separate process in the tests here, so it works
        monkeypatch.setattr(Client, "get_server_version", mocked_version)

        self.run_cli("ls")

        assert "Server version '0' is not compatible with SDK version" in caplog.text

    @pytest.mark.parametrize("verify", [True, False])
    def test_can_control_ssl_verification_with_arg(self, monkeypatch, verify: bool):
        # TODO: Very hacky implementation, improve it, if possible
        class MyException(Exception):
            pass

        normal_init = CLI.__init__

        def my_init(self, *args, **kwargs):
            normal_init(self, *args, **kwargs)
            raise MyException(self.client.api_client.configuration.verify_ssl)

        monkeypatch.setattr(CLI, "__init__", my_init)

        with pytest.raises(MyException) as capture:
            self.run_cli(*(["--insecure"] if not verify else []), "ls")

        assert capture.value.args[0] == verify

    def test_can_control_organization_context(self):
        org = "cli-test-org"
        self.client.organizations.create(models.OrganizationWriteRequest(org))

        files = generate_images(self.tmp_path, 1)

        stdout = self.run_cli(
            "create",
            "personal_task",
            ResourceType.LOCAL.name,
            *map(os.fspath, files),
            "--labels=" + json.dumps([{"name": "person"}]),
            "--completion_verification_period=0.01",
            organization="",
        )

        personal_task_id = int(stdout.split()[-1])

        stdout = self.run_cli(
            "create",
            "org_task",
            ResourceType.LOCAL.name,
            *map(os.fspath, files),
            "--labels=" + json.dumps([{"name": "person"}]),
            "--completion_verification_period=0.01",
            organization=org,
        )

        org_task_id = int(stdout.split()[-1])

        personal_task_ids = list(map(int, self.run_cli("ls", organization="").split()))
        assert personal_task_id in personal_task_ids
        assert org_task_id not in personal_task_ids

        org_task_ids = list(map(int, self.run_cli("ls", organization=org).split()))
        assert personal_task_id not in org_task_ids
        assert org_task_id in org_task_ids

        all_task_ids = list(map(int, self.run_cli("ls").split()))
        assert personal_task_id in all_task_ids
        assert org_task_id in all_task_ids

    def test_auto_annotate_with_module(self, fxt_new_task: Task):
        annotations = fxt_new_task.get_annotations()
        assert not annotations.shapes

        self.run_cli(
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
