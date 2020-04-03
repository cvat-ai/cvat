# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from tempfile import TemporaryDirectory

from cvat.apps.dataset_manager.bindings import import_dm_annotations, CvatAnnotationsExtractor
from cvat.apps.dataset_manager.formats import dm_env, Exporter
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.settings.base import DATUMARO_PATH


class DatumaroProjectExporter(Exporter):
    NAME = "DatumaroProject"
    EXT = "ZIP"
    VERSION = "1.0"
    DISPLAY_NAME = "{name} {ext} {version}"

    _REMOTE_IMAGES_EXTRACTOR = 'cvat_rest_api_task_images'
    _TEMPLATES_DIR = osp.join(osp.dirname(__file__), 'export_templates')

    def _save_remote_images(self, save_dir, server_url=None):
        os.makedirs(save_dir, exist_ok=True)

        db_task = self._db_task
        items = []
        config = {
            'server_url': server_url or 'localhost',
            'task_id': db_task.id,
        }

        images_meta = {
            'images': items,
        }
        db_video = getattr(self._db_task.data, 'video', None)
        if db_video is not None:
            for i in range(self._db_task.data.size):
                frame_info = {
                    'id': i,
                    'name': 'frame_%06d' % i,
                    'width': db_video.width,
                    'height': db_video.height,
                }
                items.append(frame_info)
        else:
            for db_image in self._db_task.data.images.all():
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

    def _export(self, dataset, save_dir, save_images=False):
        converter = env.make_converter('datumaro_project',
            save_images=save_images,
            config={ 'project_name': self._db_task.name, }
        )
        converter(dataset, save_dir=save_dir)

        target_dir = project.config.project_dir
        os.makedirs(target_dir, exist_ok=True)
        shutil.copyfile(
            osp.join(self._TEMPLATES_DIR, 'README.md'),
            osp.join(target_dir, 'README.md'))

        if not save_images:
            # add remote link to images
            source_name = 'task_%s_images' % self._db_task.id
            project.add_source(source_name, {
                'format': self._REMOTE_IMAGES_EXTRACTOR,
            })
            self._save_remote_images(
                osp.join(save_dir, project.local_source_dir(source_name)),
                server_url=server_url)
            project.save()

            templates_dir = osp.join(self._TEMPLATES_DIR, 'plugins')
            target_dir = osp.join(project.config.project_dir,
                project.config.env_dir, project.config.plugins_dir)
            os.makedirs(target_dir, exist_ok=True)
            shutil.copyfile(
                osp.join(templates_dir, self._REMOTE_IMAGES_EXTRACTOR + '.py'),
                osp.join(target_dir, self._REMOTE_IMAGES_EXTRACTOR + '.py'))

        # Make Datumaro and CVAT CLI modules available to the user
        shutil.copytree(DATUMARO_PATH, osp.join(save_dir, 'datumaro'),
            ignore=lambda src, names: ['__pycache__'] + [
                n for n in names
                if sum([int(n.endswith(ext)) for ext in
                        ['.pyx', '.pyo', '.pyd', '.pyc']])
            ])

        cvat_utils_dst_dir = osp.join(save_dir, 'cvat', 'utils')
        os.makedirs(cvat_utils_dst_dir)
        shutil.copytree(osp.join(_CVAT_ROOT_DIR, 'utils', 'cli'),
            osp.join(cvat_utils_dst_dir, 'cli'))

    def __call__(self, dst_file, annotations, save_images=False):
        self._db_task = annotations._db_task

        with TemporaryDirectory() as temp_dir:
            dataset = CvatAnnotationsExtractor(annotations)
            self._export(dataset, save_dir=temp_dir, save_images=save_images)
            make_zip_archive(temp_dir, file_object)
