# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from typing import Callable

from django.db import transaction

from cvat.apps.engine import models
from cvat.apps.dataset_manager.task import TaskAnnotation

from .annotation import AnnotationIR
from .bindings import ProjectData
from .formats.registry import make_exporter

def export_project(project_id, dst_file, format_name,
        server_url=None, save_images=False):
    # For big tasks dump function may run for a long time and
    # we dont need to acquire lock after the task has been initialized from DB.
    # But there is the bug with corrupted dump file in case 2 or
    # more dump request received at the same time:
    # https://github.com/opencv/cvat/issues/217
    with transaction.atomic():
        project = ProjectAnnotation(project_id)
        project.init_from_db()

    exporter = make_exporter(format_name)
    with open(dst_file, 'wb') as f:
        project.export(f, exporter, host=server_url, save_images=save_images)

class ProjectAnnotation:
    def __init__(self, pk: int):
        self.db_project = models.Project.objects.get(id=pk)
        self.db_tasks = models.Task.objects.filter(project__id=pk).order_by('id')

        self.annotation_irs: dict[int, AnnotationIR] = dict()

    def reset(self):
        for annotation_ir in self.annotation_irs.values():
            annotation_ir.reset()

    def put(self, data):
        raise NotImplementedError()

    def create(self, data):
        raise NotImplementedError()

    def update(self, data):
        raise NotImplementedError()

    def delete(self, data=None):
        raise NotImplementedError()

    def init_from_db(self):
        self.reset()

        for task in self.db_tasks:
            annotation = TaskAnnotation(pk=task.id)
            annotation.init_from_db()
            self.annotation_irs[task.id] = annotation.ir_data

    def export(self, dst_file: str, exporter: Callable, host: str='', **options):
        project_data = ProjectData(
            annotation_irs=self.annotation_irs,
            db_project=self.db_project,
            host=host
        )
        exporter(dst_file, project_data, **options)
    @property
    def data(self) -> dict:
        raise NotImplementedError()