
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
import os
import os.path as osp

from datumaro.components.converter import Converter
from datumaro.components.extractor import DEFAULT_SUBSET_NAME, AnnotationType
from datumaro.components.formats.yolo import YoloPath
from datumaro.util.image import save_image


def _make_yolo_bbox(img_size, box):
    # https://github.com/pjreddie/darknet/blob/master/scripts/voc_label.py
    # <x> <y> <width> <height> - values relative to width and height of image
    # <x> <y> - are center of rectangle
    x = (box[0] + box[2]) / 2 / img_size[0]
    y = (box[1] + box[3]) / 2 / img_size[1]
    w = (box[2] - box[0]) / img_size[0]
    h = (box[3] - box[1]) / img_size[1]
    return x, y, w, h

class YoloConverter(Converter):
    # https://github.com/pjreddie/darknet/wiki/YOLO:-Real-Time-Object-Detection

    def __init__(self, task=None, save_images=False, apply_colormap=False):
        super().__init__()
        self._task = task
        self._save_images = save_images
        self._apply_colormap = apply_colormap

    def __call__(self, extractor, save_dir):
        images_dir = osp.join(save_dir, YoloPath.IMAGES_DIR)

        os.makedirs(save_dir, exist_ok=True)
        os.makedirs(images_dir, exist_ok=True)

        label_categories = extractor.categories()[AnnotationType.label]
        label_ids = {label.name: idx
            for idx, label in enumerate(label_categories.items)}
        with open(osp.join(save_dir, 'obj.names'), 'w') as f:
            f.writelines(l[0]
                for l in sorted(label_ids.items(), key=lambda x: x[1]))

        subsets = extractor.subsets()
        if len(subsets) == 0:
            subsets = [ None ]

        for subset_name in subsets:
            if subset_name:
                subset = extractor.get_subset(subset_name)
            else:
                subset_name = DEFAULT_SUBSET_NAME
                subset = extractor

            annotations_dir = osp.join(save_dir, subset_name,
                YoloPath.ANNOTATIONS_DIR)
            os.makedirs(annotations_dir, exist_ok=True)

            subset_images = OrderedDict()

            for item in subset:
                if self._save_images:
                    image_name = '%s.jpg' % item.id
                    subset_images[item.id] = osp.join(subset_name, image_name)
                    image_path = osp.join(images_dir, image_name)
                    if not osp.exists(image_path):
                        save_image(item.image, image_path)

                height, width, _ = item.image.shape

                yolo_annotation = ''
                for bbox in item.annotations:
                    if bbox.type is not AnnotationType.bbox:
                        continue
                    if bbox.label is None:
                        continue

                    yolo_bb = _make_yolo_bbox((width, height), bbox.points)
                    yolo_bb = ' '.join('%.6f' % p for p in yolo_bb)
                    yolo_annotation += '%s %s\n' % (bbox.label, yolo_bb)

                annotation_path = osp.join(annotations_dir, '%s.txt' % item.id)
                with open(annotation_path, 'w') as f:
                    f.write(yolo_annotation)

            if self._save_images:
                with open(osp.join(save_dir, '%s.txt' % subset_name)) as f:
                    f.writelines(subset_images.values())