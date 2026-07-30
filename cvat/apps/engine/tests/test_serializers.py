# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase

from cvat.apps.engine.models import DimensionType, Project, Task
from cvat.apps.engine.serializers import ProjectReadSerializer


class TestProjectReadSerializer(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.owner = User.objects.create_user(username="owner")
        cls.project = Project.objects.create(name="project", owner=cls.owner)
        Task.objects.bulk_create(
            [
                Task(name="empty subset", project=cls.project, owner=cls.owner),
                Task(
                    name="train",
                    project=cls.project,
                    owner=cls.owner,
                    subset="train",
                    dimension=DimensionType.DIM_2D.value,
                ),
                Task(
                    name="train duplicate",
                    project=cls.project,
                    owner=cls.owner,
                    subset="train",
                ),
                Task(name="validation", project=cls.project, owner=cls.owner, subset="validation"),
            ]
        )

    def test_to_representation_does_not_load_task_models_for_summary_fields(self) -> None:
        project = Project.objects.get(pk=self.project.pk)

        with patch.object(
            Task,
            "from_db",
            side_effect=AssertionError("Task rows must not be materialized"),
        ):
            data = ProjectReadSerializer(project, context={"request": None}).data

        assert set(data["task_subsets"]) == {"train", "validation"}
        assert data["dimension"] == DimensionType.DIM_2D.value
