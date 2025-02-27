# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum

from django.db import models

from cvat.apps.engine.models import Job, Project, Task


class TargetChoice(str, Enum):
    JOB = "job"
    TASK = "task"
    PROJECT = "project"

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value


class GranularityChoice(str, Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value


class ViewChoice(str, Enum):
    NUMERIC = "numeric"
    HISTOGRAM = "histogram"

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value


class TransformOperationType(str, Enum):
    BINARY = "binary"

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value


class BinaryOperatorType(str, Enum):
    ADDITION = "+"
    SUBTRACTION = "-"
    MULTIPLICATION = "*"
    DIVISION = "/"

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value


class AnalyticsReport(models.Model):
    job = models.OneToOneField(
        Job,
        on_delete=models.CASCADE,
        related_name="analytics_report",
        null=True,
    )
    task = models.OneToOneField(
        Task,
        on_delete=models.CASCADE,
        related_name="analytics_report",
        null=True,
    )
    project = models.OneToOneField(
        Project,
        on_delete=models.CASCADE,
        related_name="analytics_report",
        null=True,
    )
    created_date = models.DateTimeField(auto_now=True)
    statistics = models.JSONField()

    def get_task(self) -> Task:
        if self.task is not None:
            return self.task
        else:
            return self.job.segment.task

    @property
    def organization_id(self):
        if self.job is not None:
            return getattr(self.job.segment.task.organization, "id")
        elif self.task is not None:
            return getattr(self.task.organization, "id", None)
        elif self.project is not None:
            return getattr(self.project.organization, "id", None)

        return None
