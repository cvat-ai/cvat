
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import defaultdict
import numpy as np
import os
import os.path as osp

from pycocotools.coco import COCO
import pycocotools.mask as mask_utils

from datumaro.components.extractor import *
from datumaro.components.formats.ms_coco import *
from datumaro.util.image import lazy_image


class RleMask(MaskObject):
    def __init__(self, rle=None, label=None,
            id_=None, attributes=None, group=None):
        lazy_decode = lambda: mask_utils.decode(rle).astype(np.bool)
        super().__init__(image=lazy_decode, label=label,
            id_=id_, attributes=attributes, group=group)

        self._rle = rle

    def area(self):
        return mask_utils.area(self._rle)

    def bbox(self):
        return mask_utils.toBbox(self._rle)

    def __eq__(self, other):
        if not isinstance(other, __class__):
            return super().__eq__(other)
        return self._rle == other._rle


class CocoExtractor(Extractor):
    class Subset(Extractor):
        def __init__(self, name, parent):
            super().__init__()
            self._name = name
            self._parent = parent
            self.loaders = {}
            self.items = set()

        def __iter__(self):
            for img_id in self.items:
                yield self._parent._get(img_id, self._name)

        def __len__(self):
            return len(self.items)

        def categories(self):
            return self._parent.categories()

    def __init__(self, path, task):
        super().__init__()

        rootpath = path.rsplit(CocoPath.ANNOTATIONS_DIR, maxsplit=1)[0]
        self._path = rootpath
        self._task = task
        self._subsets = {}

        subset_name = osp.splitext(osp.basename(path))[0] \
            .rsplit('_', maxsplit=1)[1]
        if subset_name == DEFAULT_SUBSET_NAME:
            subset_name = None
        subset = CocoExtractor.Subset(subset_name, self)
        loader = self._make_subset_loader(path)
        subset.loaders[task] = loader
        for img_id in loader.getImgIds():
            subset.items.add(img_id)
        self._subsets[subset_name] = subset

        self._load_categories()

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

    def _load_categories(self):
        loaders = {}

        for subset in self._subsets.values():
            loaders.update(subset.loaders)

        self._categories = {}

        label_loader = loaders.get(CocoAnnotationType.labels)
        instances_loader = loaders.get(CocoAnnotationType.instances)
        person_kp_loader = loaders.get(CocoAnnotationType.person_keypoints)

        if label_loader is None and instances_loader is not None:
            label_loader = instances_loader
        if label_loader is None and person_kp_loader is not None:
            label_loader = person_kp_loader
        if label_loader is not None:
            label_categories, label_map = \
                self._load_label_categories(label_loader)
            self._categories[AnnotationType.label] = label_categories
            self._label_map = label_map

        if person_kp_loader is not None:
            person_kp_categories = \
                self._load_person_kp_categories(person_kp_loader)
            self._categories[AnnotationType.points] = person_kp_categories

    def _load_label_categories(self, loader):
        catIds = loader.getCatIds()
        cats = loader.loadCats(catIds)

        categories = LabelCategories()
        label_map = {}
        for idx, cat in enumerate(cats):
            label_map[cat['id']] = idx
            categories.add(name=cat['name'], parent=cat['supercategory'])

        return categories, label_map

    def _load_person_kp_categories(self, loader):
        catIds = loader.getCatIds()
        cats = loader.loadCats(catIds)

        categories = PointsCategories()
        for cat in cats:
            label_id, _ = self._categories[AnnotationType.label].find(cat['name'])
            categories.add(label_id=label_id,
                labels=cat['keypoints'], adjacent=cat['skeleton'])

        return categories

    def categories(self):
        return self._categories

    def __iter__(self):
        for subset_name, subset in self._subsets.items():
            for img_id in subset.items:
                yield self._get(img_id, subset_name)

    def __len__(self):
        length = 0
        for subset in self._subsets.values():
            length += len(subset)
        return length

    def subsets(self):
        return list(self._subsets)

    def get_subset(self, name):
        return self._subsets[name]

    def _get(self, img_id, subset):
        file_name = None
        image_info = None
        image = None
        annotations = []
        for ann_type, loader in self._subsets[subset].loaders.items():
            if image is None:
                image_info = loader.loadImgs(img_id)[0]
                file_name = image_info['file_name']
                if file_name != '':
                    file_path = osp.join(
                        self._path, CocoPath.IMAGES_DIR, subset, file_name)
                    if osp.exists(file_path):
                        image = lazy_image(file_path)

            annIds = loader.getAnnIds(imgIds=img_id)
            anns = loader.loadAnns(annIds)

            for ann in anns:
                self._parse_annotation(ann, ann_type, annotations, image_info)
        return DatasetItem(id_=img_id, subset=subset,
            image=image, annotations=annotations)

    def _parse_label(self, ann):
        cat_id = ann.get('category_id')
        if cat_id in [0, None]:
            return None
        return self._label_map[cat_id]

    def _parse_annotation(self, ann, ann_type, parsed_annotations,
            image_info=None):
        ann_id = ann.get('id')
        attributes = {}
        if 'score' in ann:
            attributes['score'] = ann['score']

        if ann_type is CocoAnnotationType.instances:
            x, y, w, h = ann['bbox']
            label_id = self._parse_label(ann)
            group = None

            is_crowd = bool(ann['iscrowd'])
            attributes['is_crowd'] = is_crowd

            segmentation = ann.get('segmentation')
            if segmentation is not None:
                group = ann_id

                if isinstance(segmentation, list):
                    # polygon -- a single object might consist of multiple parts
                    for polygon_points in segmentation:
                        parsed_annotations.append(PolygonObject(
                            points=polygon_points, label=label_id,
                            group=group
                        ))

                    # we merge all parts into one mask RLE code
                    img_h = image_info['height']
                    img_w = image_info['width']
                    rles = mask_utils.frPyObjects(segmentation, img_h, img_w)
                    rle = mask_utils.merge(rles)
                elif isinstance(segmentation['counts'], list):
                    # uncompressed RLE
                    img_h, img_w = segmentation['size']
                    rle = mask_utils.frPyObjects([segmentation], img_h, img_w)[0]
                else:
                    # compressed RLE
                    rle = segmentation

                parsed_annotations.append(RleMask(rle=rle, label=label_id,
                    group=group
                ))

            parsed_annotations.append(
                BboxObject(x, y, w, h, label=label_id,
                    id_=ann_id, attributes=attributes, group=group)
            )
        elif ann_type is CocoAnnotationType.labels:
            label_id = self._parse_label(ann)
            parsed_annotations.append(
                LabelObject(label=label_id,
                    id_=ann_id, attributes=attributes)
            )
        elif ann_type is CocoAnnotationType.person_keypoints:
            keypoints = ann['keypoints']
            points = [p for i, p in enumerate(keypoints) if i % 3 != 2]
            visibility = keypoints[2::3]
            bbox = ann.get('bbox')
            label_id = self._parse_label(ann)
            group = None
            if bbox is not None:
                group = ann_id
            parsed_annotations.append(
                PointsObject(points, visibility, label=label_id,
                    id_=ann_id, attributes=attributes, group=group)
            )
            if bbox is not None:
                parsed_annotations.append(
                    BboxObject(*bbox, label=label_id, group=group)
                )
        elif ann_type is CocoAnnotationType.captions:
            caption = ann['caption']
            parsed_annotations.append(
                CaptionObject(caption,
                    id_=ann_id, attributes=attributes)
            )
        else:
            raise NotImplementedError()

        return parsed_annotations

class CocoImageInfoExtractor(CocoExtractor):
    def __init__(self, path):
        super().__init__(path, task=CocoAnnotationType.image_info)

class CocoCaptionsExtractor(CocoExtractor):
    def __init__(self, path):
        super().__init__(path, task=CocoAnnotationType.captions)

class CocoInstancesExtractor(CocoExtractor):
    def __init__(self, path):
        super().__init__(path, task=CocoAnnotationType.instances)

class CocoPersonKeypointsExtractor(CocoExtractor):
    def __init__(self, path):
        super().__init__(path, task=CocoAnnotationType.person_keypoints)

class CocoLabelsExtractor(CocoExtractor):
    def __init__(self, path):
        super().__init__(path, task=CocoAnnotationType.labels)