# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from collections.abc import Mapping
from contextlib import nullcontext
from typing import Any, Callable

import rq
from datumaro.components.errors import DatasetError, DatasetImportError, DatasetNotFoundError
from django.conf import settings
from django.db import transaction

from cvat.apps.dataset_manager.task import TaskAnnotation
from cvat.apps.dataset_manager.util import TmpDirManager
from cvat.apps.engine import models
from cvat.apps.engine.log import DatasetLogManager
from cvat.apps.engine.rq_job_handler import RQJobMetaField
from cvat.apps.engine.serializers import DataSerializer, TaskWriteSerializer
from cvat.apps.engine.task import _create_thread as create_task

from .annotation import AnnotationIR
from .bindings import CvatDatasetNotFoundError, CvatImportError, ProjectData, load_dataset_data
from .formats.registry import make_exporter, make_importer

dlogger = DatasetLogManager()

def export_project(
    project_id: int,
    dst_file: str,
    *,
    format_name: str,
    server_url: str | None = None,
    save_images: bool = False,
    temp_dir: str | None = None,
):
    # For big tasks dump function may run for a long time and
    # we dont need to acquire lock after the task has been initialized from DB.
    # But there is the bug with corrupted dump file in case 2 or
    # more dump request received at the same time:
    # https://github.com/cvat-ai/cvat/issues/217
    with transaction.atomic():
        project = ProjectAnnotationAndData(project_id)
        project.init_from_db()

    exporter = make_exporter(format_name)
    with open(dst_file, 'wb') as f:
        project.export(f, exporter, host=server_url, save_images=save_images, temp_dir=temp_dir)

class ProjectAnnotationAndData:
    def __init__(self, pk: int):
        self.db_project = models.Project.objects.get(id=pk)
        self.db_tasks = models.Task.objects.filter(project__id=pk).exclude(data=None).order_by('id')

        self.task_annotations: dict[int, TaskAnnotation] = dict()
        self.annotation_irs: dict[int, AnnotationIR] = dict()

        self.tasks_to_add: list[models.Task] = []

    def reset(self):
        for annotation_ir in self.annotation_irs.values():
            annotation_ir.reset()

    def put(self, tasks_data: Mapping[int,Any]):
        for task_id, data in tasks_data.items():
            self.task_annotations[task_id].put(data)

    def create(self, tasks_data: Mapping[int,Any]):
        for task_id, data in tasks_data.items():
            self.task_annotations[task_id].create(data)

    def update(self, tasks_data: Mapping[int,Any]):
        for task_id, data in tasks_data.items():
            self.task_annotations[task_id].update(data)

    def delete(self, tasks_data: Mapping[int,Any]=None):
        if tasks_data is not None:
            for task_id, data in tasks_data.items():
                self.task_annotations[task_id].put(data)
        else:
            for task_annotation in self.task_annotations.values():
                task_annotation.delete()

    def add_task(self, task_fields: dict, files: dict, project_data: ProjectData = None):
        def split_name(file):
            _, name = file.split(files['data_root'])
            return name


        data_serializer = DataSerializer(data={
            "server_files": files['media'],
            #TODO: following fields should be replaced with proper input values from request in future
            "use_cache": False,
            "use_zip_chunks": True,
            "image_quality": 70,
        })
        data_serializer.is_valid(raise_exception=True)
        db_data = data_serializer.save()
        db_task = TaskWriteSerializer.create(None, {
            **task_fields,
            'data_id': db_data.id,
            'project_id': self.db_project.id
        })
        data = {k:v for k, v in data_serializer.data.items()}
        data['use_zip_chunks'] = data_serializer.validated_data['use_zip_chunks']
        data['use_cache'] = data_serializer.validated_data['use_cache']
        data['copy_data'] = data_serializer.validated_data['copy_data']
        data['server_files_path'] = files['data_root']
        data['stop_frame'] = None
        data['server_files'] = list(map(split_name, data['server_files']))

        create_task(db_task, data, is_dataset_import=True)
        self.db_tasks = models.Task.objects.filter(project__id=self.db_project.id).exclude(data=None).order_by('id')
        self.init_from_db()
        if project_data is not None:
            project_data.new_tasks.add(db_task.id)
            project_data.init()

    def add_labels(self, labels: list[models.Label], attributes: list[tuple[str, models.AttributeSpec]] = None):
        for label in labels:
            label.project = self.db_project
            # We need label_id here, so we can't use bulk_create here
            label.save()

        for label_name, attribute in attributes or []:
            label, = filter(lambda l: l.name == label_name, labels)
            attribute.label = label
        if attributes:
            models.AttributeSpec.objects.bulk_create([a[1] for a in attributes])

    def init_from_db(self):
        self.reset()

        for task in self.db_tasks:
            annotation = TaskAnnotation(pk=task.id)
            annotation.init_from_db()
            self.task_annotations[task.id] = annotation
            self.annotation_irs[task.id] = annotation.ir_data

    def export(
        self,
        dst_file: io.BufferedWriter,
        exporter: Callable[..., None],
        *,
        host: str = '',
        temp_dir: str | None = None,
        **options
    ):
        project_data = ProjectData(
            annotation_irs=self.annotation_irs,
            db_project=self.db_project,
            host=host
        )

        with (
            TmpDirManager.get_tmp_directory_for_export(
                instance_type=self.db_project.__class__.__name__,
            ) if not temp_dir else nullcontext(temp_dir)
        ) as temp_dir:
            exporter(dst_file, temp_dir, project_data, **options)

    def load_dataset_data(self, *args, **kwargs):
        load_dataset_data(self, *args, **kwargs)

    def import_dataset(self, dataset_file, importer, **options):
        project_data = ProjectData(
            annotation_irs=self.annotation_irs,
            db_project=self.db_project,
            task_annotations=self.task_annotations,
            project_annotation=self,
        )
        project_data.soft_attribute_import = True

        with TmpDirManager.get_tmp_directory() as temp_dir:
            try:
                importer(dataset_file, temp_dir, project_data, load_data_callback=self.load_dataset_data, **options)
            except (DatasetNotFoundError, CvatDatasetNotFoundError) as not_found:
                if settings.CVAT_LOG_IMPORT_ERRORS:
                    dlogger.log_import_error(
                        entity="project",
                        entity_id=self.db_project.id,
                        format_name=importer.DISPLAY_NAME,
                        base_error=str(not_found),
                        dir_path=temp_dir,
                    )

                raise not_found

        self.create({tid: ir.serialize() for tid, ir in self.annotation_irs.items() if tid in project_data.new_tasks})

    @property
    def data(self) -> dict:
        raise NotImplementedError()

@transaction.atomic
def import_dataset_as_project(src_file, project_id, format_name, conv_mask_to_poly):
    rq_job = rq.get_current_job()
    rq_job.meta[RQJobMetaField.STATUS] = 'Dataset import has been started...'
    rq_job.meta[RQJobMetaField.PROGRESS] = 0.
    rq_job.save_meta()

    project = ProjectAnnotationAndData(project_id)
    project.init_from_db()

    importer = make_importer(format_name)
    with open(src_file, 'rb') as f:
        try:
            project.import_dataset(f, importer, conv_mask_to_poly=conv_mask_to_poly)
        except (DatasetError, DatasetImportError, DatasetNotFoundError) as ex:
            raise CvatImportError(str(ex))
