# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from typing import Callable, List

from django.db import transaction

from cvat.apps.engine import models
from cvat.apps.engine.serializers import DataSerializer
from cvat.apps.engine.task import _create_thread as create_task
from cvat.apps.dataset_manager.task import TaskAnnotation

from .annotation import AnnotationIR
from .bindings import ProjectData, load_dataset_data
from .formats.registry import make_exporter, make_importer

def export_project(project_id, dst_file, format_name,
        server_url=None, save_images=False):
    # For big tasks dump function may run for a long time and
    # we dont need to acquire lock after the task has been initialized from DB.
    # But there is the bug with corrupted dump file in case 2 or
    # more dump request received at the same time:
    # https://github.com/opencv/cvat/issues/217
    with transaction.atomic():
        project = ProjectAnnotationAndData(project_id)
        project.init_from_db()

    exporter = make_exporter(format_name)
    with open(dst_file, 'wb') as f:
        project.export(f, exporter, host=server_url, save_images=save_images)

class ProjectAnnotationAndData:
    def __init__(self, pk: int):
        self.db_project = models.Project.objects.get(id=pk)
        self.db_tasks = models.Task.objects.filter(project__id=pk).order_by('id')

        self.task_annotations: dict[int, TaskAnnotation] = dict()
        self.annotation_irs: dict[int, AnnotationIR] = dict()

        self.tasks_to_add: list[models.Task] = []

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

    def add_task(self, task: models.Task, files: List[str]):
        def split_name(file):
            path, name = os.path.split(file)
            if os.path.exists(path):
                data['server_files_path'] = path
            else:
                data['server_files_path'] = os.path.join(os.path.abspath(os.sep), path)
            return name


        task.project = self.db_project
        serializer = DataSerializer(data={
            "server_files": files,
            #TODO: followed fields whould be replaced with proper input values from request
            "use_cache": False,
            "use_zip_chunks": True,
            "image_quality": 70,
        })
        serializer.is_valid(raise_exception=True)
        db_data = serializer.save()
        task.data = db_data
        task.save()
        data = {k:v for k, v in serializer.data.items()}
        data['use_zip_chunks'] = serializer.validated_data['use_zip_chunks']
        data['use_cache'] = serializer.validated_data['use_cache']
        data['copy_data'] = serializer.validated_data['copy_data']
        data['stop_frame'] = None
        data['server_files'] = list(map(split_name, data['server_files']))

        create_task(task, data)
        #TODO: update db_tasks

    def init_from_db(self):
        self.reset()

        for task in self.db_tasks:
            annotation = TaskAnnotation(pk=task.id)
            annotation.init_from_db()
            self.task_annotations[task.id] = annotation
            self.annotation_irs[task.id] = annotation.ir_data

    def export(self, dst_file: str, exporter: Callable, host: str='', **options):
        project_data = ProjectData(
            annotation_irs=self.annotation_irs,
            db_project=self.db_project,
            host=host
        )
        exporter(dst_file, project_data, **options)

    def load_dataset_data(self, *args, **kwargs):
        load_dataset_data(self, *args, **kwargs)


    def import_dataset(self, dataset_file, importer):
        project_data = ProjectData(
            annotation_irs=self.annotation_irs,
            db_project=self.db_project,
        )

        importer(dataset_file, project_data, self.load_dataset_data)

    @property
    def data(self) -> dict:
        raise NotImplementedError()

@transaction.atomic
def import_dataset_as_project(project_id, dataset_file, format_name):
    project = ProjectAnnotationAndData(project_id)
    project.init_from_db()

    importer = make_importer(format_name)
    with open(dataset_file, 'rb') as f:
        project.import_dataset(f, importer)