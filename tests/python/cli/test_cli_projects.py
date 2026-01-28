# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os

import pytest
from cvat_sdk.api_client import exceptions
from cvat_sdk.core.proxies.projects import Project

from .util import TestCliBase


class TestCliProjects(TestCliBase):
    @pytest.fixture
    def fxt_new_project(self):
        project = self.client.projects.create(
            spec={
                "name": "test_project",
                "labels": [{"name": "car"}, {"name": "person"}],
            },
        )

        return project

    def test_can_create_project(self):
        stdout = self.run_cli(
            "project",
            "create",
            "new_project",
            "--labels",
            json.dumps([{"name": "car"}, {"name": "person"}]),
            "--bug_tracker",
            "https://bugs.example/",
        )

        project_id = int(stdout.rstrip("\n"))
        created_project = self.client.projects.retrieve(project_id)
        assert created_project.name == "new_project"
        assert created_project.bug_tracker == "https://bugs.example/"
        assert {label.name for label in created_project.get_labels()} == {"car", "person"}

    def test_can_create_project_from_dataset(self, fxt_coco_dataset):
        stdout = self.run_cli(
            "project",
            "create",
            "new_project",
            "--dataset_path",
            os.fspath(fxt_coco_dataset),
            "--dataset_format",
            "COCO 1.0",
        )

        project_id = int(stdout.rstrip("\n"))
        created_project = self.client.projects.retrieve(project_id)
        assert created_project.name == "new_project"
        assert {label.name for label in created_project.get_labels()} == {"car", "person"}
        assert created_project.tasks.count == 1

    def test_can_list_projects_in_simple_format(self, fxt_new_project: Project):
        output = self.run_cli("project", "ls")

        results = output.split("\n")
        assert any(str(fxt_new_project.id) in r for r in results)

    def test_can_list_project_in_json_format(self, fxt_new_project: Project):
        output = self.run_cli("project", "ls", "--json")

        results = json.loads(output)
        assert any(r["id"] == fxt_new_project.id for r in results)

    def test_can_delete_project(self, fxt_new_project: Project):
        self.run_cli("project", "delete", str(fxt_new_project.id))

        with pytest.raises(exceptions.NotFoundException):
            fxt_new_project.fetch()
