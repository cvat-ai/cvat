
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp

from datumaro.components.extractor import DatasetItem, SourceExtractor, Importer
from datumaro.components.converter import Converter
from datumaro.util.image import save_image


class ImageDirImporter(Importer):
    EXTRACTOR_NAME = 'image_dir'

    def __call__(self, path, **extra_params):
        from datumaro.components.project import Project # cyclic import
        project = Project()

        if not osp.isdir(path):
            raise Exception("Can't find a directory at '%s'" % path)

        source_name = osp.basename(osp.normpath(path))
        project.add_source(source_name, {
            'url': source_name,
            'format': self.EXTRACTOR_NAME,
            'options': dict(extra_params),
        })

        return project


class ImageDirExtractor(SourceExtractor):
    _SUPPORTED_FORMATS = ['.png', '.jpg']

    def __init__(self, url):
        super().__init__()

        assert osp.isdir(url), url

        items = []
        for dirpath, _, filenames in os.walk(url):
            for name in filenames:
                path = osp.join(dirpath, name)
                if not self._is_image(path):
                    continue

                item_id = osp.relpath(osp.splitext(path)[0], url)
                items.append(DatasetItem(id=item_id, image=path))

        self._items = items

    def __iter__(self):
        for item in self._items:
            yield item

    def __len__(self):
        return len(self._items)

    def _is_image(self, path):
        if not osp.isfile(path):
            return False
        for ext in self._SUPPORTED_FORMATS:
            if path.endswith(ext):
                return True
        return False


class ImageDirConverter(Converter):
    def __call__(self, extractor, save_dir):
        os.makedirs(save_dir, exist_ok=True)

        for item in extractor:
            if item.has_image and item.image.has_data:
                save_image(osp.join(save_dir, item.id + '.jpg'),
                    item.image.data, create_dir=True)
