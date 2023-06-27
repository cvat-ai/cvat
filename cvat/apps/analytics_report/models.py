# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum
from django.db import models

from cvat.apps.engine.models import Job

class TypeChoice(str, Enum):
    JOB = 'job'
    TASK = 'task'
    PROJECT = 'project'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value

class GranularityChoice(str, Enum):
    DAY = 'day'
    WEEK = 'week'
    MONTH = 'month'

    @classmethod
    def choices(cls):
        return tuple((x.value, x.name) for x in cls)

    @classmethod
    def list(cls):
        return list(map(lambda x: x.value, cls))

    def __str__(self):
        return self.value

class ViewChoice(str, Enum):
    NUMERIC = 'numeric'
    HISTOGRAM = 'histogram'

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
        primary_key=True,
    )
    created_date = models.DateTimeField(auto_now=True)
    statistics = models.JSONField()

    # def get_task(self):
    #     return self.job.segment.task

    # def get_json_report(self) -> str:
    #     return self.data

    # @property
    # def organization_id(self):
    #     if task := self.get_task():
    #         return getattr(task.organization, "id", None)
    #     return None
