# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import json
import os
import os.path as osp
import shutil
from tempfile import TemporaryDirectory

from cvat.apps.dataset_manager.bindings import (CvatTaskDataExtractor,
    import_dm_annotations)
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.settings.base import BASE_DIR
from datumaro.components.project import Project

from ..registry import dm_env, exporter


@exporter(name="Datumaro", ext="ZIP", version="1.0")
class DatumaroProjectExporter:
    _REMOTE_IMAGES_EXTRACTOR = 'cvat_rest_api_task_images'
    _TEMPLATES_DIR = osp.join(osp.dirname(__file__), 'export_templates')

    @staticmethod
    def _save_image_info(save_dir, task_data):
        os.makedirs(save_dir, exist_ok=True)

        config = {
            'server_url': task_data._host or 'localhost',
            'task_id': task_data.db_task.id,
        }

        images = []
        images_meta = { 'images': images, }
        for frame_id, frame in task_data.frame_info.items():
            images.append({
                'id': frame_id,
                'name': osp.basename(frame['path']),
                'width': frame['width'],
                'height': frame['height'],
            })

        with open(osp.join(save_dir, 'config.json'), 'w') as config_file:
            json.dump(config, config_file)
        with open(osp.join(save_dir, 'images_meta.json'), 'w') as images_file:
            json.dump(images_meta, images_file)

    def _export(self, task_data, save_dir, save_images=False):
        dataset = CvatTaskDataExtractor(task_data, include_images=save_images)
        dm_env.converters.get('datumaro_project').convert(dataset,
            save_dir=save_dir, save_images=save_images,
            project_config={ 'project_name': task_data.db_task.name, }
        )

        project = Project.load(save_dir)
        target_dir = project.config.project_dir
        os.makedirs(target_dir, exist_ok=True)
        shutil.copyfile(
            osp.join(self._TEMPLATES_DIR, 'README.md'),
            osp.join(target_dir, 'README.md'))

        if not save_images:
            # add remote links to images
            source_name = 'task_%s_images' % task_data.db_task.id
            project.add_source(source_name, {
                'format': self._REMOTE_IMAGES_EXTRACTOR,
            })
            self._save_image_info(
                osp.join(save_dir, project.local_source_dir(source_name)),
                task_data)
            project.save()

            templates_dir = osp.join(self._TEMPLATES_DIR, 'plugins')
            target_dir = osp.join(project.config.project_dir,
                project.config.env_dir, project.config.plugins_dir)
            os.makedirs(target_dir, exist_ok=True)
            shutil.copyfile(
                osp.join(templates_dir, self._REMOTE_IMAGES_EXTRACTOR + '.py'),
                osp.join(target_dir, self._REMOTE_IMAGES_EXTRACTOR + '.py'))

        # Make CVAT CLI module available to the user
        cvat_utils_dst_dir = osp.join(save_dir, 'cvat', 'utils')
        os.makedirs(cvat_utils_dst_dir)
        shutil.copytree(osp.join(BASE_DIR, 'utils', 'cli'),
            osp.join(cvat_utils_dst_dir, 'cli'))

    def __call__(self, dst_file, task_data, save_images=False):
        with TemporaryDirectory() as temp_dir:
            self._export(task_data, save_dir=temp_dir, save_images=save_images)
            make_zip_archive(temp_dir, dst_file)
