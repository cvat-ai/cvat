
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datetime import timedelta
import json
import os
import os.path as osp
import shutil
import sys
import tempfile

from django.utils import timezone
import django_rq

from cvat.apps.engine.log import slogger
from cvat.apps.engine.models import Task
from .util import current_function_name, make_zip_archive

_CVAT_ROOT_DIR = __file__[:__file__.rfind('cvat/')]
_DATUMARO_REPO_PATH = osp.join(_CVAT_ROOT_DIR, 'datumaro')
sys.path.append(_DATUMARO_REPO_PATH)
from datumaro.components.project import Project, Environment
import datumaro.components.extractor as datumaro
from .bindings import CvatImagesDirExtractor, CvatTaskExtractor


_MODULE_NAME = __package__ + '.' + osp.splitext(osp.basename(__file__))[0]
def log_exception(logger=None, exc_info=True):
    if logger is None:
        logger = slogger
    logger.exception("[%s @ %s]: exception occurred" % \
            (_MODULE_NAME, current_function_name(2)),
        exc_info=exc_info)

_TASK_IMAGES_EXTRACTOR = '_cvat_task_images'
_TASK_ANNO_EXTRACTOR = '_cvat_task_anno'
_TASK_IMAGES_REMOTE_EXTRACTOR = 'cvat_rest_api_task_images'

def get_export_cache_dir(db_task):
    return osp.join(db_task.get_task_dirname(), 'export_cache')

EXPORT_FORMAT_DATUMARO_PROJECT = "datumaro_project"


class TaskProject:
    @staticmethod
    def _get_datumaro_project_dir(db_task):
        return osp.join(db_task.get_task_dirname(), 'datumaro')

    @staticmethod
    def create(db_task):
        task_project = TaskProject(db_task)
        task_project._create()
        return task_project

    @staticmethod
    def load(db_task):
        task_project = TaskProject(db_task)
        task_project._load()
        task_project._init_dataset()
        return task_project

    @staticmethod
    def from_task(db_task, user):
        task_project = TaskProject(db_task)
        task_project._import_from_task(user)
        return task_project

    def __init__(self, db_task):
        self._db_task = db_task
        self._project_dir = self._get_datumaro_project_dir(db_task)
        self._project = None
        self._dataset = None

    def _create(self):
        self._project = Project.generate(self._project_dir)
        self._project.add_source('task_%s' % self._db_task.id, {
            'url': self._db_task.get_data_dirname(),
            'format': _TASK_IMAGES_EXTRACTOR,
        })
        self._project.env.extractors.register(_TASK_IMAGES_EXTRACTOR,
            CvatImagesDirExtractor)

        self._init_dataset()
        self._dataset.define_categories(self._generate_categories())

        self.save()

    def _load(self):
        self._project = Project.load(self._project_dir)
        self._project.env.extractors.register(_TASK_IMAGES_EXTRACTOR,
            CvatImagesDirExtractor)

    def _import_from_task(self, user):
        self._project = Project.generate(self._project_dir,
            config={'project_name': self._db_task.name})

        self._project.add_source('task_%s_images' % self._db_task.id, {
            'url': self._db_task.get_data_dirname(),
            'format': _TASK_IMAGES_EXTRACTOR,
        })
        self._project.env.extractors.register(_TASK_IMAGES_EXTRACTOR,
            CvatImagesDirExtractor)

        self._project.add_source('task_%s_anno' % self._db_task.id, {
            'format': _TASK_ANNO_EXTRACTOR,
        })
        self._project.env.extractors.register(_TASK_ANNO_EXTRACTOR,
            lambda url: CvatTaskExtractor(url,
                db_task=self._db_task, user=user))

        self._init_dataset()

    def _init_dataset(self):
        self._dataset = self._project.make_dataset()

    def _generate_categories(self):
        categories = {}
        label_categories = datumaro.LabelCategories()

        db_labels = self._db_task.label_set.all()
        for db_label in db_labels:
            db_attributes = db_label.attributespec_set.all()
            label_categories.add(db_label.name)

            for db_attr in db_attributes:
                label_categories.attributes.add(db_attr.name)

        categories[datumaro.AnnotationType.label] = label_categories

        return categories

    def put_annotations(self, annotations):
        raise NotImplementedError()

    def save(self, save_dir=None, save_images=False):
        if self._dataset is not None:
            self._dataset.save(save_dir=save_dir, save_images=save_images)
        else:
            self._project.save(save_dir=save_dir)

    def export(self, dst_format, save_dir, save_images=False, server_url=None):
        if self._dataset is None:
            self._init_dataset()
        if dst_format == EXPORT_FORMAT_DATUMARO_PROJECT:
            self._remote_export(save_dir=save_dir, server_url=server_url)
        else:
            converter = self._dataset.env.make_converter(dst_format,
                save_images=save_images)
            self._dataset.export_project(converter=converter, save_dir=save_dir)

    def _remote_image_converter(self, save_dir, server_url=None):
        os.makedirs(save_dir, exist_ok=True)

        db_task = self._db_task
        items = []
        config = {
            'server_host': 'localhost',
            'task_id': db_task.id,
        }
        if server_url:
            if ':' in server_url:
                host, port = server_url.rsplit(':', maxsplit=1)
            else:
                host = server_url
                port = None
            config['server_host'] = host
            if port is not None:
                config['server_port'] = int(port)

        images_meta = {
            'images': items,
        }
        db_video = getattr(self._db_task, 'video', None)
        if db_video is not None:
            for i in range(self._db_task.size):
                frame_info = {
                    'id': i,
                    'width': db_video.width,
                    'height': db_video.height,
                }
                items.append(frame_info)
        else:
            for db_image in self._db_task.image_set.all():
                frame_info = {
                    'id': db_image.frame,
                    'name': osp.basename(db_image.path),
                    'width': db_image.width,
                    'height': db_image.height,
                }
                items.append(frame_info)

        with open(osp.join(save_dir, 'config.json'), 'w') as config_file:
            json.dump(config, config_file)
        with open(osp.join(save_dir, 'images_meta.json'), 'w') as images_file:
            json.dump(images_meta, images_file)

    def _remote_export(self, save_dir, server_url=None):
        if self._dataset is None:
            self._init_dataset()

        os.makedirs(save_dir, exist_ok=True)
        self._dataset.save(save_dir=save_dir, save_images=False, merge=True)

        exported_project = Project.load(save_dir)
        source_name = 'task_%s_images' % self._db_task.id
        exported_project.add_source(source_name, {
            'format': _TASK_IMAGES_REMOTE_EXTRACTOR,
        })
        self._remote_image_converter(
            osp.join(save_dir, exported_project.local_source_dir(source_name)),
            server_url=server_url)
        exported_project.save()


        templates_dir = osp.join(osp.dirname(__file__), 'export_templates')
        target_dir = exported_project.config.project_dir
        os.makedirs(target_dir, exist_ok=True)
        shutil.copyfile(
            osp.join(templates_dir, 'README.md'),
            osp.join(target_dir, 'README.md'))

        templates_dir = osp.join(templates_dir, 'plugins')
        target_dir = osp.join(target_dir,
            exported_project.config.env_dir,
            exported_project.config.plugins_dir)
        os.makedirs(target_dir, exist_ok=True)
        shutil.copyfile(
            osp.join(templates_dir, _TASK_IMAGES_REMOTE_EXTRACTOR + '.py'),
            osp.join(target_dir, _TASK_IMAGES_REMOTE_EXTRACTOR + '.py'))

        # NOTE: put datumaro component to the archive so that
        # it was available to the user
        shutil.copytree(_DATUMARO_REPO_PATH, osp.join(save_dir, 'datumaro'),
            ignore=lambda src, names: ['__pycache__'] + [
                n for n in names
                if sum([int(n.endswith(ext)) for ext in
                        ['.pyx', '.pyo', '.pyd', '.pyc']])
            ])

        # include CVAT CLI module also
        cvat_utils_dst_dir = osp.join(save_dir, 'cvat', 'utils')
        os.makedirs(cvat_utils_dst_dir)
        shutil.copytree(osp.join(_CVAT_ROOT_DIR, 'utils', 'cli'),
            osp.join(cvat_utils_dst_dir, 'cli'))


DEFAULT_FORMAT = EXPORT_FORMAT_DATUMARO_PROJECT
DEFAULT_CACHE_TTL = timedelta(hours=10)
CACHE_TTL = DEFAULT_CACHE_TTL

def export_project(task_id, user, dst_format=None, server_url=None):
    try:
        db_task = Task.objects.get(pk=task_id)

        if not dst_format:
            dst_format = DEFAULT_FORMAT

        cache_dir = get_export_cache_dir(db_task)
        save_dir = osp.join(cache_dir, dst_format)
        archive_path = osp.normpath(save_dir) + '.zip'

        task_time = timezone.localtime(db_task.updated_date).timestamp()
        if not (osp.exists(archive_path) and \
                task_time <= osp.getmtime(archive_path)):
            os.makedirs(cache_dir, exist_ok=True)
            with tempfile.TemporaryDirectory(
                    dir=cache_dir, prefix=dst_format + '_') as temp_dir:
                project = TaskProject.from_task(db_task, user)
                project.export(dst_format, save_dir=temp_dir, save_images=True,
                    server_url=server_url)

                os.makedirs(cache_dir, exist_ok=True)
                make_zip_archive(temp_dir, archive_path)

            archive_ctime = osp.getctime(archive_path)
            scheduler = django_rq.get_scheduler()
            cleaning_job = scheduler.enqueue_in(time_delta=CACHE_TTL,
                func=clear_export_cache,
                task_id=task_id,
                file_path=archive_path, file_ctime=archive_ctime)
            slogger.task[task_id].info(
                "The task '{}' is exported as '{}' "
                "and available for downloading for next '{}'. "
                "Export cache cleaning job is enqueued, "
                "id '{}', start in '{}'".format(
                    db_task.name, dst_format, CACHE_TTL,
                    cleaning_job.id, CACHE_TTL))

        return archive_path
    except Exception:
        log_exception(slogger.task[task_id])
        raise

def clear_export_cache(task_id, file_path, file_ctime):
    try:
        if osp.exists(file_path) and osp.getctime(file_path) == file_ctime:
            os.remove(file_path)
            slogger.task[task_id].info(
                "Export cache file '{}' successfully removed" \
                .format(file_path))
    except Exception:
        log_exception(slogger.task[task_id])
        raise


EXPORT_FORMATS = [
    {
        'name': 'Datumaro',
        'tag': EXPORT_FORMAT_DATUMARO_PROJECT,
        'is_default': True,
    },
    {
        'name': 'PASCAL VOC 2012',
        'tag': 'voc',
        'is_default': False,
    },
    {
        'name': 'MS COCO',
        'tag': 'coco',
        'is_default': False,
    },
    {
        'name': 'YOLO',
        'tag': 'yolo',
        'is_default': False,
    },
    {
        'name': 'TF Detection API TFrecord',
        'tag': 'tf_detection_api',
        'is_default': False,
    },
]

def get_export_formats():
    converters = Environment().converters

    available_formats = set(converters.items)
    available_formats.add(EXPORT_FORMAT_DATUMARO_PROJECT)

    public_formats = []
    for fmt in EXPORT_FORMATS:
        if fmt['tag'] in available_formats:
            public_formats.append(fmt)

    return public_formats