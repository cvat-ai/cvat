
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
import logging as log
import os.path as osp

from pycocotools.coco import COCO
import pycocotools.mask as mask_utils

from datumaro.components.extractor import (SourceExtractor,
    DEFAULT_SUBSET_NAME, DatasetItem,
    AnnotationType, Label, RleMask, Points, Polygon, Bbox, Caption,
    LabelCategories, PointsCategories
)
from datumaro.util.image import Image

from .format import CocoTask, CocoPath


class _CocoExtractor(SourceExtractor):
    def __init__(self, path, task, merge_instance_polygons=False):
        super().__init__()

        assert osp.isfile(path)
        rootpath = path.rsplit(CocoPath.ANNOTATIONS_DIR, maxsplit=1)[0]
        self._path = rootpath
        self._task = task

        subset = osp.splitext(osp.basename(path))[0] \
            .rsplit('_', maxsplit=1)[1]
        if subset == DEFAULT_SUBSET_NAME:
            subset = None
        self._subset = subset

        self._merge_instance_polygons = merge_instance_polygons

        loader = self._make_subset_loader(path)
        self._load_categories(loader)
        self._items = self._load_items(loader)

    def categories(self):
        return self._categories

    def __iter__(self):
        for item in self._items.values():
            yield item

    def __len__(self):
        return len(self._items)

    def subsets(self):
        if self._subset:
            return [self._subset]
        return None

    def get_subset(self, name):
        if name != self._subset:
            return None
        return self

    @staticmethod
    def _make_subset_loader(path):
        # COCO API has an 'unclosed file' warning
        coco_api = COCO()
        with open(path, 'r') as f:
            import json
            dataset = json.load(f)

        coco_api.dataset = dataset
        coco_api.createIndex()
        return coco_api

    def _load_categories(self, loader):
        self._categories = {}

        if self._task in [CocoTask.instances, CocoTask.labels,
                CocoTask.person_keypoints, CocoTask.stuff, CocoTask.panoptic]:
            label_categories, label_map = self._load_label_categories(loader)
            self._categories[AnnotationType.label] = label_categories
            self._label_map = label_map

        if self._task == CocoTask.person_keypoints:
            person_kp_categories = self._load_person_kp_categories(loader)
            self._categories[AnnotationType.points] = person_kp_categories

    # pylint: disable=no-self-use
    def _load_label_categories(self, loader):
        catIds = loader.getCatIds()
        cats = loader.loadCats(catIds)

        categories = LabelCategories()
        label_map = {}
        for idx, cat in enumerate(cats):
            label_map[cat['id']] = idx
            categories.add(name=cat['name'], parent=cat['supercategory'])

        return categories, label_map
    # pylint: enable=no-self-use

    def _load_person_kp_categories(self, loader):
        catIds = loader.getCatIds()
        cats = loader.loadCats(catIds)

        categories = PointsCategories()
        for cat in cats:
            label_id = self._label_map[cat['id']]
            categories.add(label_id=label_id,
                labels=cat['keypoints'], adjacent=cat['skeleton'])

        return categories

    def _load_items(self, loader):
        items = OrderedDict()

        for img_id in loader.getImgIds():
            image_info = loader.loadImgs(img_id)[0]
            image_path = self._find_image(image_info['file_name'])
            if not image_path:
                image_path = image_info['file_name']
            image_size = (image_info.get('height'), image_info.get('width'))
            if all(image_size):
                image_size = (int(image_size[0]), int(image_size[1]))
            else:
                image_size = None
            image = Image(path=image_path, size=image_size)

            anns = loader.getAnnIds(imgIds=img_id)
            anns = loader.loadAnns(anns)
            anns = sum((self._load_annotations(a, image_info) for a in anns), [])

            items[img_id] = DatasetItem(id=img_id, subset=self._subset,
                image=image, annotations=anns)

        return items

    def _get_label_id(self, ann):
        cat_id = ann.get('category_id')
        if cat_id in [0, None]:
            return None
        return self._label_map[cat_id]

    def _load_annotations(self, ann, image_info=None):
        parsed_annotations = []

        ann_id = ann.get('id')

        attributes = {}
        if 'score' in ann:
            attributes['score'] = ann['score']

        group = ann_id # make sure all tasks' annotations are merged

        if self._task in [CocoTask.instances, CocoTask.person_keypoints]:
            x, y, w, h = ann['bbox']
            label_id = self._get_label_id(ann)

            is_crowd = bool(ann['iscrowd'])
            attributes['is_crowd'] = is_crowd

            if self._task is CocoTask.person_keypoints:
                keypoints = ann['keypoints']
                points = [p for i, p in enumerate(keypoints) if i % 3 != 2]
                visibility = keypoints[2::3]
                parsed_annotations.append(
                    Points(points, visibility, label=label_id,
                        id=ann_id, attributes=attributes, group=group)
                )

            segmentation = ann.get('segmentation')
            if segmentation and segmentation != [[]]:
                rle = None

                if isinstance(segmentation, list):
                    if not self._merge_instance_polygons:
                        # polygon - a single object can consist of multiple parts
                        for polygon_points in segmentation:
                            parsed_annotations.append(Polygon(
                                points=polygon_points, label=label_id,
                                id=ann_id, attributes=attributes, group=group
                            ))
                    else:
                        # merge all parts into a single mask RLE
                        img_h = image_info['height']
                        img_w = image_info['width']
                        rles = mask_utils.frPyObjects(segmentation, img_h, img_w)
                        rle = mask_utils.merge(rles)
                elif isinstance(segmentation['counts'], list):
                    # uncompressed RLE
                    img_h = image_info['height']
                    img_w = image_info['width']
                    mask_h, mask_w = segmentation['size']
                    if img_h == mask_h and img_w == mask_w:
                        rle = mask_utils.frPyObjects(
                            [segmentation], mask_h, mask_w)[0]
                    else:
                        log.warning("item #%s: mask #%s "
                            "does not match image size: %s vs. %s. "
                            "Skipping this annotation.",
                            image_info['id'], ann_id,
                            (mask_h, mask_w), (img_h, img_w)
                        )
                else:
                    # compressed RLE
                    rle = segmentation

                if rle is not None:
                    parsed_annotations.append(RleMask(rle=rle, label=label_id,
                        id=ann_id, attributes=attributes, group=group
                    ))
            else:
                parsed_annotations.append(
                    Bbox(x, y, w, h, label=label_id,
                        id=ann_id, attributes=attributes, group=group)
                )
        elif self._task is CocoTask.labels:
            label_id = self._get_label_id(ann)
            parsed_annotations.append(
                Label(label=label_id,
                    id=ann_id, attributes=attributes, group=group)
            )
        elif self._task is CocoTask.captions:
            caption = ann['caption']
            parsed_annotations.append(
                Caption(caption,
                    id=ann_id, attributes=attributes, group=group)
            )
        else:
            raise NotImplementedError()

        return parsed_annotations

    def _find_image(self, file_name):
        images_dir = osp.join(self._path, CocoPath.IMAGES_DIR)
        search_paths = [
            osp.join(images_dir, file_name),
            osp.join(images_dir, self._subset or DEFAULT_SUBSET_NAME, file_name),
        ]
        for image_path in search_paths:
            if osp.exists(image_path):
                return image_path
        return None

class CocoImageInfoExtractor(_CocoExtractor):
    def __init__(self, path, **kwargs):
        super().__init__(path, task=CocoTask.image_info, **kwargs)

class CocoCaptionsExtractor(_CocoExtractor):
    def __init__(self, path, **kwargs):
        super().__init__(path, task=CocoTask.captions, **kwargs)

class CocoInstancesExtractor(_CocoExtractor):
    def __init__(self, path, **kwargs):
        super().__init__(path, task=CocoTask.instances, **kwargs)

class CocoPersonKeypointsExtractor(_CocoExtractor):
    def __init__(self, path, **kwargs):
        super().__init__(path, task=CocoTask.person_keypoints, **kwargs)

class CocoLabelsExtractor(_CocoExtractor):
    def __init__(self, path, **kwargs):
        super().__init__(path, task=CocoTask.labels, **kwargs)