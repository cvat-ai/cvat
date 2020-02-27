
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
import getpass
import json
import os, os.path as osp
import requests

from datumaro.components.config import (Config,
    SchemaBuilder as _SchemaBuilder,
)
import datumaro.components.extractor as datumaro
from datumaro.util.image import lazy_image, load_image, Image

from cvat.utils.cli.core import CLI as CVAT_CLI, CVAT_API_V1


CONFIG_SCHEMA = _SchemaBuilder() \
    .add('task_id', int) \
    .add('server_host', str) \
    .add('server_port', int) \
    .build()

DEFAULT_CONFIG = Config({
    'server_port': 80
}, schema=CONFIG_SCHEMA, mutable=False)

class cvat_rest_api_task_images(datumaro.SourceExtractor):
    def _image_local_path(self, item_id):
        task_id = self._config.task_id
        return osp.join(self._cache_dir,
            'task_{}_frame_{:06d}.jpg'.format(task_id, int(item_id)))

    def _make_image_loader(self, item_id):
        return lazy_image(item_id,
            lambda item_id: self._image_loader(item_id, self))

    def _is_image_cached(self, item_id):
        return osp.isfile(self._image_local_path(item_id))

    def _download_image(self, item_id):
        self._connect()
        os.makedirs(self._cache_dir, exist_ok=True)
        self._cvat_cli.tasks_frame(task_id=self._config.task_id,
            frame_ids=[item_id], outdir=self._cache_dir)

    def _connect(self):
        if self._session is not None:
            return

        session = None
        try:
            print("Enter credentials for '%s:%s' to read task data:" % \
                (self._config.server_host, self._config.server_port))
            username = input('User: ')
            password = getpass.getpass()

            session = requests.Session()
            session.auth = (username, password)

            api = CVAT_API_V1(self._config.server_host,
                self._config.server_port)
            cli = CVAT_CLI(session, api)

            self._session = session
            self._cvat_cli = cli
        except Exception:
            if session is not None:
                session.close()

    def __del__(self):
        if hasattr(self, '_session'):
            if self._session is not None:
                self._session.close()

    @staticmethod
    def _image_loader(item_id, extractor):
        if not extractor._is_image_cached(item_id):
            extractor._download_image(item_id)
        local_path = extractor._image_local_path(item_id)
        return load_image(local_path)

    def __init__(self, url):
        super().__init__()

        local_dir = url
        self._local_dir = local_dir
        self._cache_dir = osp.join(local_dir, 'images')

        with open(osp.join(url, 'config.json'), 'r') as config_file:
            config = json.load(config_file)
            config = Config(config,
                fallback=DEFAULT_CONFIG, schema=CONFIG_SCHEMA)
        self._config = config

        with open(osp.join(url, 'images_meta.json'), 'r') as images_file:
            images_meta = json.load(images_file)
            image_list = images_meta['images']

        items = []
        for entry in image_list:
            item_id = entry['id']
            item_filename = entry.get('name', str(item_id))
            size = None
            if entry.get('height') and entry.get('width'):
                size = (entry['height'], entry['width'])
            image = Image(data=self._make_image_loader(item_id),
                path=item_filename, size=size)
            item = datumaro.DatasetItem(id=item_id, image=image)
            items.append((item.id, item))

        items = sorted(items, key=lambda e: int(e[0]))
        items = OrderedDict(items)
        self._items = items

        self._cvat_cli = None
        self._session = None

    def __iter__(self):
        for item in self._items.values():
            yield item

    def __len__(self):
        return len(self._items)

    def subsets(self):
        return None

    def get(self, item_id, subset=None, path=None):
        if path or subset:
            raise KeyError()
        return self._items[item_id]
