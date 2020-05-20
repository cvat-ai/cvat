
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
import logging as log
import os
import os.path as osp

from datumaro.components.converter import Converter
from datumaro.components.extractor import AnnotationType
from datumaro.components.cli_plugin import CliPlugin
from datumaro.util.image import save_image

from .format import YoloPath


def _make_yolo_bbox(img_size, box):
    # https://github.com/pjreddie/darknet/blob/master/scripts/voc_label.py
    # <x> <y> <width> <height> - values relative to width and height of image
    # <x> <y> - are center of rectangle
    x = (box[0] + box[2]) / 2 / img_size[0]
    y = (box[1] + box[3]) / 2 / img_size[1]
    w = (box[2] - box[0]) / img_size[0]
    h = (box[3] - box[1]) / img_size[1]
    return x, y, w, h

class YoloConverter(Converter, CliPlugin):
    # https://github.com/AlexeyAB/darknet#how-to-train-to-detect-your-custom-objects

    @classmethod
    def build_cmdline_parser(cls, **kwargs):
        parser = super().build_cmdline_parser(**kwargs)
        parser.add_argument('--save-images', action='store_true',
            help="Save images (default: %(default)s)")
        return parser

    def __init__(self, save_images=False):
        super().__init__()
        self._save_images = save_images

    def __call__(self, extractor, save_dir):
        os.makedirs(save_dir, exist_ok=True)

        label_categories = extractor.categories()[AnnotationType.label]
        label_ids = {label.name: idx
            for idx, label in enumerate(label_categories.items)}
        with open(osp.join(save_dir, 'obj.names'), 'w') as f:
            f.writelines('%s\n' % l[0]
                for l in sorted(label_ids.items(), key=lambda x: x[1]))

        subsets = extractor.subsets()
        if len(subsets) == 0:
            subsets = [ None ]

        subset_lists = OrderedDict()

        for subset_name in subsets:
            if subset_name and subset_name in YoloPath.SUBSET_NAMES:
                subset = extractor.get_subset(subset_name)
            elif not subset_name:
                subset_name = YoloPath.DEFAULT_SUBSET_NAME
                subset = extractor
            else:
                log.warn("Skipping subset export '%s'. "
                    "If specified, the only valid names are %s" % \
                    (subset_name, ', '.join(
                        "'%s'" % s for s in YoloPath.SUBSET_NAMES)))
                continue

            subset_dir = osp.join(save_dir, 'obj_%s_data' % subset_name)
            os.makedirs(subset_dir, exist_ok=True)

            image_paths = OrderedDict()

            for item in subset:
                if not item.has_image:
                    raise Exception("Failed to export item '%s': "
                        "item has no image info" % item.id)
                height, width = item.image.size

                image_name = item.id + '.jpg'
                if self._save_images:
                    if item.has_image and item.image.has_data:
                        save_image(osp.join(subset_dir, image_name),
                            item.image.data, create_dir=True)
                    else:
                        log.warning("Item '%s' has no image" % item.id)
                image_paths[item.id] = osp.join('data',
                    osp.basename(subset_dir), image_name)

                yolo_annotation = ''
                for bbox in item.annotations:
                    if bbox.type is not AnnotationType.bbox:
                        continue
                    if bbox.label is None:
                        continue

                    yolo_bb = _make_yolo_bbox((width, height), bbox.points)
                    yolo_bb = ' '.join('%.6f' % p for p in yolo_bb)
                    yolo_annotation += '%s %s\n' % (bbox.label, yolo_bb)

                annotation_path = osp.join(subset_dir, '%s.txt' % item.id)
                os.makedirs(osp.dirname(annotation_path), exist_ok=True)
                with open(annotation_path, 'w') as f:
                    f.write(yolo_annotation)

            subset_list_name = '%s.txt' % subset_name
            subset_lists[subset_name] = subset_list_name
            with open(osp.join(save_dir, subset_list_name), 'w') as f:
                f.writelines('%s\n' % s for s in image_paths.values())

        with open(osp.join(save_dir, 'obj.data'), 'w') as f:
            f.write('classes = %s\n' % len(label_ids))

            for subset_name, subset_list_name in subset_lists.items():
                f.write('%s = %s\n' % (subset_name,
                    osp.join('data', subset_list_name)))

            f.write('names = %s\n' % osp.join('data', 'obj.names'))
            f.write('backup = backup/\n')