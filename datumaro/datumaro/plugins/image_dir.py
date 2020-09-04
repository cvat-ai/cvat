
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import logging as log
import os
import os.path as osp

from datumaro.components.extractor import DatasetItem, SourceExtractor, Importer
from datumaro.components.converter import Converter
from datumaro.util.image import Image


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
    def __init__(self, url):
        super().__init__()

        assert osp.isdir(url), url

        items = []
        for dirpath, _, filenames in os.walk(url):
            for name in filenames:
                path = osp.join(dirpath, name)
                try:
                    image = Image(path)
                    # force loading
                    image.data # pylint: disable=pointless-statement
                except Exception:
                    continue

                item_id = osp.relpath(osp.splitext(path)[0], url)
                items.append(DatasetItem(id=item_id, image=image))

        self._items = items

    def __iter__(self):
        for item in self._items:
            yield item

    def __len__(self):
        return len(self._items)


class ImageDirConverter(Converter):
    DEFAULT_IMAGE_EXT = '.jpg'

    def apply(self):
        os.makedirs(self._save_dir, exist_ok=True)

        for item in self._extractor:
            if item.has_image:
                self._save_image(item,
                    osp.join(self._save_dir, self._make_image_filename(item)))
            else:
                log.debug("Item '%s' has no image info", item.id)