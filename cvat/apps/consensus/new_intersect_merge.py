# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import itertools
import logging as log
import math
from collections import OrderedDict
from typing import Any, Callable, Dict, Iterable, List, Optional, Sequence, Tuple, Type, Union, cast

import attr
import datumaro as dm
import numpy as np
from attr import attrib, attrs
from datumaro.components.annotation import (
    Annotation,
    AnnotationType,
    Bbox,
    Label,
    LabelCategories,
    MaskCategories,
    PointsCategories,
)
from datumaro.components.cli_plugin import CliPlugin
from datumaro.components.dataset import Dataset, DatasetItemStorage, IDataset
from datumaro.components.errors import (
    AnnotationsTooCloseError,
    ConflictingCategoriesError,
    DatasetMergeError,
    FailedAttrVotingError,
    FailedLabelVotingError,
    MediaTypeError,
    MismatchingAttributesError,
    MismatchingImageInfoError,
    MismatchingMediaError,
    MismatchingMediaPathError,
    NoMatchingAnnError,
    NoMatchingItemError,
    VideoMergeError,
    WrongGroupError,
)
from datumaro.components.extractor import CategoriesInfo, DatasetItem
from datumaro.components.media import Image, MediaElement, MultiframeImage, PointCloud, Video
from datumaro.util import find
from datumaro.util.annotation_util import find_instances, max_bbox, mean_bbox
from datumaro.util.attrs_util import ensure_cls
from scipy.optimize import linear_sum_assignment


def OKS(a, b, sigma=0.1, bbox=None, scale=None, visibility_a=None, visibility_b=None):
    """
    Object Keypoint Similarity metric.
    https://cocodataset.org/#keypoints-eval
    """

    p1 = np.array(a.points).reshape((-1, 2))
    p2 = np.array(b.points).reshape((-1, 2))
    if len(p1) != len(p2):
        return 0

    if visibility_a is None:
        visibility_a = np.full(len(p1), True)
    else:
        visibility_a = np.asarray(visibility_a, dtype=bool)

    if visibility_b is None:
        visibility_b = np.full(len(p2), True)
    else:
        visibility_b = np.asarray(visibility_b, dtype=bool)

    if not scale:
        if bbox is None:
            bbox = dm.ops.mean_bbox([a, b])
        scale = bbox[2] * bbox[3]

    dists = np.linalg.norm(p1 - p2, axis=1)
    return np.sum(
        visibility_a
        * visibility_b
        * np.exp((visibility_a == visibility_b) * (-(dists**2) / (2 * scale * (2 * sigma) ** 2)))
    ) / np.sum(visibility_a | visibility_b, dtype=float)


def match_annotations_equal(a, b):
    matches = []
    a_unmatched = a[:]
    b_unmatched = b[:]
    for a_ann in a:
        for b_ann in b_unmatched:
            if a_ann != b_ann:
                continue

            matches.append((a_ann, b_ann))
            a_unmatched.remove(a_ann)
            b_unmatched.remove(b_ann)
            break

    return matches, a_unmatched, b_unmatched


def merge_annotations_equal(a, b):
    matches, a_unmatched, b_unmatched = match_annotations_equal(a, b)
    return [ann_a for (ann_a, _) in matches] + a_unmatched + b_unmatched


def merge_categories(sources):
    categories = {}
    for source_idx, source in enumerate(sources):
        for cat_type, source_cat in source.items():
            existing_cat = categories.setdefault(cat_type, source_cat)
            if existing_cat != source_cat and len(source_cat) != 0:
                if len(existing_cat) == 0:
                    categories[cat_type] = source_cat
                else:
                    raise ConflictingCategoriesError(
                        "Merging of datasets with different categories is "
                        "only allowed in 'merge' command.",
                        sources=list(range(source_idx)),
                    )
    return categories


class MergingStrategy(CliPlugin):
    @classmethod
    def merge(cls, sources, **options):
        instance = cls(**options)
        return instance(sources)

    def __init__(self, **options):
        super().__init__(**options)
        self.__dict__["_sources"] = None

    def __call__(self, sources):
        raise NotImplementedError()


class ExactMerge:
    """
    Merges several datasets using the "simple" algorithm:
        - items are matched by (id, subset) pairs
        - matching items share the media info available:

            - nothing + nothing = nothing
            - nothing + something = something
            - something A + something B = conflict
        - annotations are matched by value and shared
        - in case of conflicts, throws an error
    """

    @classmethod
    def merge(cls, *sources: IDataset) -> DatasetItemStorage:
        items = DatasetItemStorage()
        for source_idx, source in enumerate(sources):
            for item in source:
                existing_item = items.get(item.id, item.subset)
                if existing_item is not None:
                    try:
                        item = cls._merge_items(existing_item, item)
                    except DatasetMergeError as e:
                        e.sources = set(range(source_idx))
                        raise e

                items.put(item)
        return items

    @classmethod
    def _merge_items(cls, existing_item: DatasetItem, current_item: DatasetItem) -> DatasetItem:
        return existing_item.wrap(
            media=cls._merge_media(existing_item, current_item),
            attributes=cls._merge_attrs(
                existing_item.attributes,
                current_item.attributes,
                item_id=(existing_item.id, existing_item.subset),
            ),
            annotations=cls._merge_anno(existing_item.annotations, current_item.annotations),
        )

    @staticmethod
    def _merge_attrs(a: Dict[str, Any], b: Dict[str, Any], item_id: Tuple[str, str]) -> Dict:
        merged = {}

        for name in a.keys() | b.keys():
            a_val = a.get(name, None)
            b_val = b.get(name, None)

            if name not in a:
                m_val = b_val
            elif name not in b:
                m_val = a_val
            elif a_val != b_val:
                raise MismatchingAttributesError(item_id, name, a_val, b_val)
            else:
                m_val = a_val

            merged[name] = m_val

        return merged

    @classmethod
    def _merge_media(
        cls, item_a: DatasetItem, item_b: DatasetItem
    ) -> Union[Image, PointCloud, Video]:
        if (not item_a.media or isinstance(item_a.media, Image)) and (
            not item_b.media or isinstance(item_b.media, Image)
        ):
            media = cls._merge_images(item_a, item_b)
        elif (not item_a.media or isinstance(item_a.media, PointCloud)) and (
            not item_b.media or isinstance(item_b.media, PointCloud)
        ):
            media = cls._merge_point_clouds(item_a, item_b)
        elif (not item_a.media or isinstance(item_a.media, Video)) and (
            not item_b.media or isinstance(item_b.media, Video)
        ):
            media = cls._merge_videos(item_a, item_b)
        elif (not item_a.media or isinstance(item_a.media, MultiframeImage)) and (
            not item_b.media or isinstance(item_b.media, MultiframeImage)
        ):
            media = cls._merge_multiframe_images(item_a, item_b)
        elif (not item_a.media or isinstance(item_a.media, MediaElement)) and (
            not item_b.media or isinstance(item_b.media, MediaElement)
        ):
            if isinstance(item_a.media, MediaElement) and isinstance(item_b.media, MediaElement):
                if (
                    item_a.media.path
                    and item_b.media.path
                    and item_a.media.path != item_b.media.path
                ):
                    raise MismatchingMediaPathError(
                        (item_a.id, item_a.subset), item_a.media.path, item_b.media.path
                    )

                if item_a.media.path:
                    media = item_a.media
                else:
                    media = item_b.media

            elif isinstance(item_a.media, MediaElement):
                media = item_a.media
            else:
                media = item_b.media
        else:
            raise MismatchingMediaError((item_a.id, item_a.subset), item_a.media, item_b.media)
        return media

    @staticmethod
    def _merge_images(item_a: DatasetItem, item_b: DatasetItem) -> Image:
        media = None

        if isinstance(item_a.media, Image) and isinstance(item_b.media, Image):
            if (
                item_a.media.path
                and item_b.media.path
                and item_a.media.path != item_b.media.path
                and item_a.media.has_data is item_b.media.has_data
            ):
                # We use has_data as a replacement for path existence check
                # - If only one image has data, we'll use it. The other
                #   one is just a path metainfo, which is not significant
                #   in this case.
                # - If both images have data or both don't, we need
                #   to compare paths.
                #
                # Different paths can aclually point to the same file,
                # but it's not the case we'd like to allow here to be
                # a "simple" merging strategy used for extractor joining
                raise MismatchingMediaPathError(
                    (item_a.id, item_a.subset), item_a.media.path, item_b.media.path
                )

            if (
                item_a.media.has_size
                and item_b.media.has_size
                and item_a.media.size != item_b.media.size
            ):
                raise MismatchingImageInfoError(
                    (item_a.id, item_a.subset), item_a.media.size, item_b.media.size
                )

            # Avoid direct comparison here for better performance
            # If there are 2 "data-only" images, they won't be compared and
            # we just use the first one
            if item_a.media.has_data:
                media = item_a.media
            elif item_b.media.has_data:
                media = item_b.media
            elif item_a.media.path:
                media = item_a.media
            elif item_b.media.path:
                media = item_b.media
            elif item_a.media.has_size:
                media = item_a.media
            elif item_b.media.has_size:
                media = item_b.media
            else:
                assert False, "Unknown image field combination"

            if media and not media.has_data or not media.has_size:
                if item_a.media._size:
                    media._size = item_a.media._size
                elif item_b.media._size:
                    media._size = item_b.media._size
        elif isinstance(item_a.media, Image):
            media = item_a.media
        else:
            media = item_b.media

        return media

    @staticmethod
    def _merge_point_clouds(item_a: DatasetItem, item_b: DatasetItem) -> PointCloud:
        media = None

        if isinstance(item_a.media, PointCloud) and isinstance(item_b.media, PointCloud):
            if item_a.media.path and item_b.media.path and item_a.media.path != item_b.media.path:
                raise MismatchingMediaPathError(
                    (item_a.id, item_a.subset), item_a.media.path, item_b.media.path
                )

            if item_a.media.path or item_a.media.extra_images:
                media = item_a.media

                if item_b.media.extra_images:
                    for image in item_b.media.extra_images:
                        if image not in media.extra_images:
                            media.extra_images.append(image)
            else:
                media = item_b.media

                if item_a.media.extra_images:
                    for image in item_a.media.extra_images:
                        if image not in media.extra_images:
                            media.extra_images.append(image)

        elif isinstance(item_a.media, PointCloud):
            media = item_a.media
        else:
            media = item_b.media

        return media

    @staticmethod
    def _merge_videos(item_a: DatasetItem, item_b: DatasetItem) -> Video:
        media = None

        if isinstance(item_a.media, Video) and isinstance(item_b.media, Video):
            if (
                item_a.media.path is not item_b.media.path
                or item_a.media._start_frame is not item_b.media._start_frame
                or item_a.media._end_frame is not item_b.media._end_frame
                or item_a.media._step is not item_b.media._step
            ):
                raise VideoMergeError(item_a.id)

            media = item_a.media
        elif isinstance(item_a.media, Video):
            media = item_a.media
        else:
            media = item_b.media

        return media

    @staticmethod
    def _merge_multiframe_images(item_a: DatasetItem, item_b: DatasetItem) -> MultiframeImage:
        media = None

        if isinstance(item_a.media, MultiframeImage) and isinstance(item_b.media, MultiframeImage):
            if item_a.media.path and item_b.media.path and item_a.media.path != item_b.media.path:
                raise MismatchingMediaPathError(
                    (item_a.id, item_a.subset), item_a.media.path, item_b.media.path
                )

            if item_a.media.path or item_a.media.data:
                media = item_a.media

                if item_b.media.data:
                    for image in item_b.media.data:
                        if image not in media.data:
                            media.data.append(image)
            else:
                media = item_b.media

                if item_a.media.data:
                    for image in item_a.media.data:
                        if image not in media.data:
                            media.data.append(image)

        elif isinstance(item_a.media, MultiframeImage):
            media = item_a.media
        else:
            media = item_b.media

        return media

    @staticmethod
    def _merge_anno(a: Iterable[Annotation], b: Iterable[Annotation]) -> List[Annotation]:
        return merge_annotations_equal(a, b)

    @staticmethod
    def merge_categories(sources: Iterable[IDataset]) -> CategoriesInfo:
        return merge_categories(sources)

    @staticmethod
    def merge_media_types(sources: Iterable[IDataset]) -> Type[MediaElement]:
        if sources:
            media_type = sources[0].media_type()
            for s in sources:
                if not issubclass(s.media_type(), media_type) or not issubclass(
                    media_type, s.media_type()
                ):
                    # Symmetric comparision is needed in the case of subclasses:
                    # eg. Image and ByteImage
                    raise MediaTypeError("Datasets have different media types")
            return media_type

        return None


class _KeypointsMatcher(dm.ops.PointsMatcher):
    def distance(self, a: dm.Points, b: dm.Points) -> float:
        a_bbox = self.instance_map[id(a)][1]
        b_bbox = self.instance_map[id(b)][1]
        if dm.ops.bbox_iou(a_bbox, b_bbox) <= 0:
            return 0

        bbox = dm.ops.mean_bbox([a_bbox, b_bbox])
        return OKS(
            a,
            b,
            sigma=self.sigma,
            bbox=bbox,
            visibility_a=[v == dm.Points.Visibility.visible for v in a.visibility],
            visibility_b=[v == dm.Points.Visibility.visible for v in b.visibility],
        )


def _to_rle(ann: dm.Annotation, *, img_h: int, img_w: int):
    from pycocotools import mask as mask_utils

    if ann.type == dm.AnnotationType.polygon:
        return mask_utils.frPyObjects([ann.points], img_h, img_w)
    elif isinstance(ann, dm.RleMask):
        return [ann.rle]
    elif ann.type == dm.AnnotationType.mask:
        return [mask_utils.encode(ann.image)]
    else:
        assert False


def segment_iou(
    a: dm.Annotation,
    b: dm.Annotation,
    *,
    img_h: Union[int, None] = None,
    img_w: Union[int, None] = None,
) -> float:
    """
    Generic IoU computation with masks and polygons.
    Returns -1 if no intersection, [0; 1] otherwise
    """
    # Comparing to the dm version, this fixes the comparison for segments,
    # as the images size are required for correct decoding.
    # Boxes are not included, because they are not needed

    from pycocotools import mask as mask_utils

    is_bbox = AnnotationType.bbox in [a.type, b.type]

    if not is_bbox:
        assert img_h is not None and img_w is not None
        a = _to_rle(a, img_h=img_h, img_w=img_w)
        b = _to_rle(b, img_h=img_h, img_w=img_w)
    else:
        a = [list(a.get_bbox())]
        b = [list(b.get_bbox())]

    # Note that mask_utils.iou expects (dt, gt). Check this if the 3rd param is True
    return float(mask_utils.iou(b, a, [0]))


@attrs
class IntersectMerge(MergingStrategy):
    @attrs(repr_ns="IntersectMerge", kw_only=True)
    class Conf:
        pairwise_dist = attrib(converter=float, default=0.5)
        sigma = attrib(converter=float, factory=float)

        output_conf_thresh = attrib(converter=float, default=0)
        quorum = attrib(converter=int, default=0)
        ignored_attributes = attrib(converter=set, factory=set)

        def _groups_converter(value):
            result = []
            for group in value:
                rg = set()
                for label in group:
                    optional = label.endswith("?")
                    name = label if not optional else label[:-1]
                    rg.add((name, optional))
                result.append(rg)
            return result

        groups = attrib(converter=_groups_converter, factory=list)
        close_distance = attrib(converter=float, default=0.75)

    conf = attrib(converter=ensure_cls(Conf), factory=Conf)

    # Error trackers:
    errors = attrib(factory=list, init=False)

    def add_item_error(self, error, *args, **kwargs):
        self.errors.append(error(self._item_id, *args, **kwargs))

    # Indexes:
    _dataset_map = attrib(init=False)  # id(dataset) -> (dataset, index)
    _item_map = attrib(init=False)  # id(item) -> (item, id(dataset))
    _ann_map = attrib(init=False)  # id(ann) -> (ann, id(item))
    _item_id = attrib(init=False)
    _item = attrib(init=False)
    _dataset_mean_consensus_score = attrib(init=False)  # id(dataset) -> mean consensus score: float

    # Misc.
    _categories = attrib(init=False)  # merged categories

    def __call__(self, datasets):
        self._categories = self._merge_categories([d.categories() for d in datasets])
        merged = Dataset(
            categories=self._categories,
            media_type=ExactMerge.merge_media_types(datasets),
        )

        self._check_groups_definition()

        item_matches, item_map = self.match_items(datasets)
        self._item_map = item_map
        self._dataset_mean_consensus_score = {id(d): [] for d in datasets}
        self._dataset_map = {id(d): (d, i) for i, d in enumerate(datasets)}
        self._ann_map = {}

        for item_id, items in item_matches.items():
            self._item_id = item_id

            if len(items) < len(datasets):
                missing_sources = set(id(s) for s in datasets) - set(items)
                missing_sources = [self._dataset_map[s][1] for s in missing_sources]
                self.add_item_error(NoMatchingItemError, sources=missing_sources)
            merged.put(self.merge_items(items))

        # now we have conensus score for all annotations in
        for dataset_id in self._dataset_mean_consensus_score:
            self._dataset_mean_consensus_score[dataset_id] = np.mean(
                self._dataset_mean_consensus_score[dataset_id]
            )

        return merged

    def get_ann_source(self, ann_id):
        return self._item_map[self._ann_map[ann_id][1]][1]

    def merge_items(self, items):
        self._item = next(iter(items.values()))

        # self._ann_map = {}  # id(annotation) -> (annotation, id(frame/item))
        sources = []  # [annotation of frame 0, frame 1, ...]
        for item in items.values():
            self._ann_map.update({id(a): (a, id(item)) for a in item.annotations})
            sources.append(item.annotations)
        log.debug(
            "Merging item %s: source annotations %s" % (self._item_id, list(map(len, sources)))
        )

        annotations = self.merge_annotations(sources)

        annotations = [
            a for a in annotations if self.conf.output_conf_thresh <= a.attributes.get("score", 1)
        ]

        return self._item.wrap(annotations=annotations)

    def merge_annotations(self, sources):
        self._make_mergers(sources)

        clusters = self._match_annotations(sources)

        joined_clusters = sum(clusters.values(), [])
        group_map = self._find_cluster_groups(joined_clusters)

        annotations = []
        for t, clusters in clusters.items():
            for cluster in clusters:
                self._check_cluster_sources(cluster)

            merged_clusters = self._merge_clusters(t, clusters)

            for merged_ann, cluster in zip(merged_clusters, clusters):
                attributes = self._find_cluster_attrs(cluster, merged_ann)
                attributes = {
                    k: v for k, v in attributes.items() if k not in self.conf.ignored_attributes
                }
                attributes.update(merged_ann.attributes)
                merged_ann.attributes = attributes

                new_group_id = find(enumerate(group_map), lambda e: id(cluster) in e[1][0])
                if new_group_id is None:
                    new_group_id = 0
                else:
                    new_group_id = new_group_id[0] + 1
                merged_ann.group = new_group_id

            if self.conf.close_distance:
                self._check_annotation_distance(t, merged_clusters)

            annotations += merged_clusters

        if self.conf.groups:
            self._check_groups(annotations)

        return annotations

    @staticmethod
    def match_items(datasets):
        item_ids = set((item.id, item.subset) for d in datasets for item in d)

        item_map = {}  # id(item) -> (item, id(dataset))

        matches = OrderedDict()
        for item_id, item_subset in sorted(item_ids, key=lambda e: e[0]):
            items = {}
            for d in datasets:
                item = d.get(item_id, subset=item_subset)
                if item:
                    items[id(d)] = item
                    item_map[id(item)] = (item, id(d))
            matches[(item_id, item_subset)] = items

        return matches, item_map

    def _merge_label_categories(self, sources):
        same = True
        common = None
        for src_categories in sources:
            src_cat = src_categories.get(AnnotationType.label)
            if common is None:
                common = src_cat
            elif common != src_cat:
                same = False
                break

        if same:
            return common

        dst_cat = LabelCategories()
        for src_id, src_categories in enumerate(sources):
            src_cat = src_categories.get(AnnotationType.label)
            if src_cat is None:
                continue

            for src_label in src_cat.items:
                dst_label = dst_cat.find(src_label.name, src_label.parent)[1]
                if dst_label is not None:
                    if dst_label != src_label:
                        if (
                            src_label.parent
                            and dst_label.parent
                            and src_label.parent != dst_label.parent
                        ):
                            raise ConflictingCategoriesError(
                                "Can't merge label category %s (from #%s): "
                                "parent label conflict: %s vs. %s"
                                % (
                                    src_label.name,
                                    src_id,
                                    src_label.parent,
                                    dst_label.parent,
                                ),
                                sources=list(range(src_id)),
                            )
                        dst_label.parent = dst_label.parent or src_label.parent
                        dst_label.attributes |= src_label.attributes
                    else:
                        pass
                else:
                    dst_cat.add(src_label.name, src_label.parent, src_label.attributes)

        return dst_cat

    def _merge_point_categories(self, sources, label_cat):
        dst_point_cat = PointsCategories()

        for src_id, src_categories in enumerate(sources):
            src_label_cat = src_categories.get(AnnotationType.label)
            src_point_cat = src_categories.get(AnnotationType.points)
            if src_label_cat is None or src_point_cat is None:
                continue

            for src_label_id, src_cat in src_point_cat.items.items():
                src_label = src_label_cat.items[src_label_id].name
                src_parent_label = src_label_cat.items[src_label_id].parent
                dst_label_id = label_cat.find(src_label, src_parent_label)[0]
                dst_cat = dst_point_cat.items.get(dst_label_id)
                if dst_cat is not None:
                    if dst_cat != src_cat:
                        raise ConflictingCategoriesError(
                            "Can't merge point category for label "
                            "%s (from #%s): %s vs. %s" % (src_label, src_id, src_cat, dst_cat),
                            sources=list(range(src_id)),
                        )
                    else:
                        pass
                else:
                    dst_point_cat.add(dst_label_id, src_cat.labels, src_cat.joints)

        if len(dst_point_cat.items) == 0:
            return None

        return dst_point_cat

    def _merge_mask_categories(self, sources, label_cat):
        dst_mask_cat = MaskCategories()

        for src_id, src_categories in enumerate(sources):
            src_label_cat = src_categories.get(AnnotationType.label)
            src_mask_cat = src_categories.get(AnnotationType.mask)
            if src_label_cat is None or src_mask_cat is None:
                continue

            for src_label_id, src_cat in src_mask_cat.colormap.items():
                src_label = src_label_cat.items[src_label_id].name
                src_parent_label = src_label_cat.items[src_label_id].parent
                dst_label_id = label_cat.find(src_label, src_parent_label)[0]
                dst_cat = dst_mask_cat.colormap.get(dst_label_id)
                if dst_cat is not None:
                    if dst_cat != src_cat:
                        raise ConflictingCategoriesError(
                            "Can't merge mask category for label "
                            "%s (from #%s): %s vs. %s" % (src_label, src_id, src_cat, dst_cat),
                            sources=list(range(src_id)),
                        )
                    else:
                        pass
                else:
                    dst_mask_cat.colormap[dst_label_id] = src_cat

        if len(dst_mask_cat.colormap) == 0:
            return None

        return dst_mask_cat

    def _merge_categories(self, sources):
        dst_categories = {}

        label_cat = self._merge_label_categories(sources)
        if label_cat is None:
            label_cat = LabelCategories()
        dst_categories[AnnotationType.label] = label_cat

        points_cat = self._merge_point_categories(sources, label_cat)
        if points_cat is not None:
            dst_categories[AnnotationType.points] = points_cat

        mask_cat = self._merge_mask_categories(sources, label_cat)
        if mask_cat is not None:
            dst_categories[AnnotationType.mask] = mask_cat

        return dst_categories

    def _match_annotations(self, sources):
        all_by_type = {}  # annotation type -> [[annotations from frame 0], [frame 1]]
        for s in sources:
            src_by_type = {}
            for a in s:
                src_by_type.setdefault(a.type, []).append(a)
            for k, v in src_by_type.items():
                all_by_type.setdefault(k, []).append(v)

        clusters = {}
        for k, v in all_by_type.items():
            clusters.setdefault(k, []).extend(self._match_ann_type(k, v))

        return clusters

    def _make_mergers(self, sources):
        def _make(c, **kwargs):
            kwargs.update(attr.asdict(self.conf))
            fields = attr.fields_dict(c)
            return c(**{k: v for k, v in kwargs.items() if k in fields}, context=self)

        def _for_type(t, **kwargs):
            if t is AnnotationType.label:
                return _make(LabelMerger, **kwargs)
            elif t is AnnotationType.bbox:
                return _make(BboxMerger, **kwargs)
            elif t is AnnotationType.mask:
                return _make(MaskMerger, **kwargs)
            elif t is AnnotationType.polygon or AnnotationType.mask:
                return _make(PolygonMerger, **kwargs)
            elif t is AnnotationType.polyline:
                return _make(LineMerger, **kwargs)
            elif t is AnnotationType.points:
                return _make(PointsMerger, **kwargs)
            elif t is AnnotationType.skeleton:
                return _make(SkeletonMerger, **kwargs)
            # else:
            # pass
            # raise NotImplementedError("Type %s is not supported" % t)

        instance_map = {}
        for s in sources:
            s_instances = find_instances(s)
            for inst in s_instances:
                inst_bbox = max_bbox(
                    [
                        a
                        for a in inst
                        if a.type
                        in {
                            AnnotationType.polygon,
                            AnnotationType.mask,
                            AnnotationType.bbox,
                        }
                    ]
                )
                for ann in inst:
                    instance_map[id(ann)] = [inst, inst_bbox]

        self._mergers = {
            t: _for_type(t, instance_map=instance_map, categories=self._categories)
            for t in AnnotationType
        }

    def _match_ann_type(self, t, sources):
        return self._mergers[t].match_annotations(sources)

    def _merge_clusters(self, t, clusters):
        return self._mergers[t].merge_clusters(clusters)

    @staticmethod
    def _find_cluster_groups(clusters):
        cluster_groups = []
        visited = set()
        for a_idx, cluster_a in enumerate(clusters):
            if a_idx in visited:
                continue
            visited.add(a_idx)

            cluster_group = {id(cluster_a)}

            # find segment groups in the cluster group
            a_groups = set(ann.group for ann in cluster_a)
            for cluster_b in clusters[a_idx + 1 :]:
                b_groups = set(ann.group for ann in cluster_b)
                if a_groups & b_groups:
                    a_groups |= b_groups

            # now we know all the segment groups in this cluster group
            # so we can find adjacent clusters
            for b_idx, cluster_b in enumerate(clusters[a_idx + 1 :]):
                b_idx = a_idx + 1 + b_idx
                b_groups = set(ann.group for ann in cluster_b)
                if a_groups & b_groups:
                    cluster_group.add(id(cluster_b))
                    visited.add(b_idx)

            if a_groups == {0}:
                continue  # skip annotations without a group
            cluster_groups.append((cluster_group, a_groups))
        return cluster_groups

    def _find_cluster_attrs(self, cluster, ann):
        quorum = self.conf.quorum or 0

        # TODO: when attribute types are implemented, add linear
        # interpolation for contiguous values

        attr_votes = {}  # name -> { value: score , ... }
        for s in cluster:
            for name, value in s.attributes.items():
                votes = attr_votes.get(name, {})
                votes[value] = 1 + votes.get(value, 0)
                attr_votes[name] = votes

        attributes = {}
        for name, votes in attr_votes.items():
            winner, count = max(votes.items(), key=lambda e: e[1])
            if count < quorum:
                if sum(votes.values()) < quorum:
                    # blame provokers
                    missing_sources = set(
                        self.get_ann_source(id(a))
                        for a in cluster
                        if s.attributes.get(name) == winner
                    )
                else:
                    # blame outliers
                    missing_sources = set(
                        self.get_ann_source(id(a))
                        for a in cluster
                        if s.attributes.get(name) != winner
                    )
                missing_sources = [self._dataset_map[s][1] for s in missing_sources]
                self.add_item_error(
                    FailedAttrVotingError, name, votes, ann, sources=missing_sources
                )
                continue
            attributes[name] = winner

        return attributes

    def _check_cluster_sources(self, cluster):
        if len(cluster) == len(self._dataset_map):
            return

        def _has_item(s):
            item = self._dataset_map[s][0].get(*self._item_id)
            if not item:
                return False
            if len(item.annotations) == 0:
                return False
            return True

        missing_sources = set(self._dataset_map) - set(self.get_ann_source(id(a)) for a in cluster)
        missing_sources = [self._dataset_map[s][1] for s in missing_sources if _has_item(s)]
        if missing_sources:
            self.add_item_error(NoMatchingAnnError, cluster[0], sources=missing_sources)

    def _check_annotation_distance(self, t, annotations):
        for a_idx, a_ann in enumerate(annotations):
            for b_ann in annotations[a_idx + 1 :]:
                d = self._mergers[t].distance(a_ann, b_ann)
                if self.conf.close_distance < d:
                    self.add_item_error(AnnotationsTooCloseError, a_ann, b_ann, d)

    def _check_groups(self, annotations):
        check_groups = []
        for check_group_raw in self.conf.groups:
            check_group = set(l[0] for l in check_group_raw)
            optional = set(l[0] for l in check_group_raw if l[1])
            check_groups.append((check_group, optional))

        def _check_group(group_labels, group):
            for check_group, optional in check_groups:
                common = check_group & group_labels
                real_miss = check_group - common - optional
                extra = group_labels - check_group
                if common and (extra or real_miss):
                    self.add_item_error(WrongGroupError, group_labels, check_group, group)
                    break

        groups = find_instances(annotations)
        for group in groups:
            group_labels = set()
            for ann in group:
                if not hasattr(ann, "label"):
                    continue
                label = self._get_label_name(ann.label)

                if ann.group:
                    group_labels.add(label)
                else:
                    _check_group({label}, [ann])

            if not group_labels:
                continue
            _check_group(group_labels, group)

    def _get_label_name(self, label_id):
        if label_id is None:
            return None
        return self._categories[AnnotationType.label].items[label_id].name

    def _get_label_id(self, label, parent=""):
        if label is not None:
            return self._categories[AnnotationType.label].find(label, parent)[0]
        return None

    def _get_src_label_name(self, ann, label_id):
        if label_id is None:
            return None
        item_id = self._ann_map[id(ann)][1]
        dataset_id = self._item_map[item_id][1]
        return (
            self._dataset_map[dataset_id][0].categories()[AnnotationType.label].items[label_id].name
        )

    def _get_any_label_name(self, ann, label_id):
        if label_id is None:
            return None
        try:
            return self._get_src_label_name(ann, label_id)
        except KeyError:
            return self._get_label_name(label_id)

    def _check_groups_definition(self):
        for group in self.conf.groups:
            for label, _ in group:
                _, entry = self._categories[AnnotationType.label].find(label)
                if entry is None:
                    raise ValueError(
                        "Datasets do not contain "
                        "label '%s', available labels %s"
                        % (
                            label,
                            [i.name for i in self._categories[AnnotationType.label].items],
                        )
                    )


@attrs(kw_only=True)
class AnnotationMatcher:
    _context: Optional[IntersectMerge] = attrib(default=None)

    def match_annotations(self, sources):
        raise NotImplementedError()


@attrs
class LabelMatcher(AnnotationMatcher):
    def distance(self, a, b):
        a_label = self._context._get_any_label_name(a, a.label)
        b_label = self._context._get_any_label_name(b, b.label)
        return a_label == b_label

    def match_annotations(self, sources):
        return [sum(sources, [])]


@attrs(kw_only=True)
class _ShapeMatcher(AnnotationMatcher):
    pairwise_dist = attrib(converter=float, default=0.9)
    cluster_dist = attrib(converter=float, default=-1.0)
    return_distances = False
    categories = attrib(converter=dict, default={})
    distance_index = attrib(converter=dict, default={})

    def _instance_bbox(
        self, instance_anns: Sequence[dm.Annotation]
    ) -> Tuple[float, float, float, float]:
        return dm.ops.max_bbox(
            a.get_bbox() if isinstance(a, dm.Skeleton) else a
            for a in instance_anns
            if hasattr(a, "get_bbox") and not a.attributes.get("outside", False)
        )

    def distance(a, b):
        return segment_iou(a, b)

    def label_matcher(self, a, b):
        a_label = self._context._get_any_label_name(a, a.label)
        b_label = self._context._get_any_label_name(b, b.label)
        return a_label == b_label

    @classmethod
    def _make_memoizing_distance(cls, distance_function: Callable[[Any, Any], float]):
        distances = {}
        notfound = object()

        def memoizing_distance(a, b):
            if isinstance(a, int) and isinstance(b, int):
                key = (a, b)
            else:
                key = (id(a), id(b))

            dist = distances.get(key, notfound)

            if dist is notfound:
                dist = distance_function(a, b)
                distances[key] = dist

            return dist

        return memoizing_distance, distances

    @staticmethod
    def _get_ann_type(t, item: dm.Annotation) -> Sequence[dm.Annotation]:
        return [a for a in item if a.type == t and not a.attributes.get("outside", False)]

    def _match_segments(
        self,
        t,
        item_a,
        item_b,
        *,
        distance: Callable = distance,
        label_matcher: Callable = None,
        a_objs: Optional[Sequence[dm.Annotation]] = None,
        b_objs: Optional[Sequence[dm.Annotation]] = None,
        dist_thresh: Optional[float] = None,
    ):
        if label_matcher is None:
            label_matcher = self.label_matcher
        if dist_thresh is None:
            dist_thresh = self.pairwise_dist
        if a_objs is None:
            a_objs = self._get_ann_type(t, item_a)
        if b_objs is None:
            b_objs = self._get_ann_type(t, item_b)

        if self.return_distances:
            distance, distances = self._make_memoizing_distance(distance)

        if not a_objs and not b_objs:
            distances = {}
            returned_values = [], [], [], []
        else:
            extra_args = {}
            if label_matcher:
                extra_args["label_matcher"] = label_matcher

            returned_values = match_segments(
                a_objs,
                b_objs,
                distance=distance,
                dist_thresh=dist_thresh if dist_thresh is not None else self.iou_threshold,
                **extra_args,
            )

        if self.return_distances:
            returned_values = returned_values + (distances,)

        return returned_values

    def match_annotations_two_sources(self, a, b):
        pass

    def match_annotations(self, sources):
        distance = self.distance
        pairwise_dist = self.pairwise_dist
        cluster_dist = self.cluster_dist

        if cluster_dist < 0:
            cluster_dist = pairwise_dist

        id_segm = {id(a): (a, id(s)) for s in sources for a in s}

        def _is_close_enough(cluster, extra_id):
            # check if whole cluster IoU will not be broken
            # when this segment is added
            b = id_segm[extra_id][0]
            for a_id in cluster:
                a = id_segm[a_id][0]
                if distance(a, b) < cluster_dist:
                    return False
            return True

        def _has_same_source(cluster, extra_id):
            b = id_segm[extra_id][1]
            for a_id in cluster:
                a = id_segm[a_id][1]
                if a == b:
                    return True
            return False

        # match segments in sources, pairwise
        adjacent = {i: [] for i in id_segm}  # id(sgm) -> [id(adj_sgm1), ...]
        for a_idx, src_a in enumerate(sources):
            # matches further sources of same frame for matching annotations
            for src_b in sources[a_idx + 1 :]:
                # an annotation can be adjacent to multiple annotations
                if self.return_distances:
                    matches, _, _, _, _ = self.match_annotations_two_sources(
                        src_a,
                        src_b,
                    )
                else:
                    matches, _, _, _ = self.match_annotations_two_sources(
                        src_a,
                        src_b,
                    )
                for a, b in matches:
                    adjacent[id(a)].append(id(b))

        # join all segments into matching clusters
        clusters = []
        visited = set()
        for cluster_idx in adjacent:
            if cluster_idx in visited:
                continue

            cluster = set()
            to_visit = {cluster_idx}
            while to_visit:
                c = to_visit.pop()
                cluster.add(c)
                visited.add(c)

                for i in adjacent[c]:
                    if i in visited:
                        # if that annotation is already in another cluster
                        continue
                    if 0 < cluster_dist and not _is_close_enough(cluster, i):
                        # if positive cluster_dist and this annotation isn't close enough with other annotations in cluster
                        continue
                    if _has_same_source(cluster, i):
                        # if both the annotation are belong to the same frame in same consensus job
                        continue

                    to_visit.add(
                        i
                    )  # check whether annotations matching this element in cluster can be added in this cluster

            clusters.append([id_segm[i][0] for i in cluster])

        return clusters


@attrs
class BboxMatcher(_ShapeMatcher):
    def distance(self, a, b):
        def _to_polygon(bbox_ann: dm.Bbox):
            points = bbox_ann.as_polygon()
            angle = bbox_ann.attributes.get("rotation", 0) / 180 * math.pi

            if angle:
                points = np.reshape(points, (-1, 2))
                center = (points[0] + points[2]) / 2
                rel_points = points - center
                cos = np.cos(angle)
                sin = np.sin(angle)
                rotation_matrix = ((cos, sin), (-sin, cos))
                points = np.matmul(rel_points, rotation_matrix) + center
                points = points.flatten()

            return dm.Polygon(points)

        def _bbox_iou(a: dm.Bbox, b: dm.Bbox, *, img_w: int, img_h: int) -> float:
            if a.attributes.get("rotation", 0) == b.attributes.get("rotation", 0):
                return dm.ops.bbox_iou(a, b)
            else:
                return segment_iou(_to_polygon(a), _to_polygon(b), img_h=img_h, img_w=img_w)

        dataitem_id = self._context._ann_map[id(a)][1]
        img_h, img_w = self._context._item_map[dataitem_id][0].image.size
        return _bbox_iou(a, b, img_h=img_h, img_w=img_w)

    def match_annotations_two_sources(self, a, b):
        return self._match_segments(
            dm.AnnotationType.bbox,
            a,
            b,
            distance=self.distance,
        )


@attrs
class PolygonMatcher(_ShapeMatcher):
    def distance(self, item_a, item_b):
        from pycocotools import mask as mask_utils

        def _get_segment(item):
            dataitem_id = self._context._ann_map[id(item)][1]
            img_h, img_w = self._context._item_map[dataitem_id][0].image.size
            object_rle_groups = [_to_rle(item, img_h=img_h, img_w=img_w)]
            rle = mask_utils.merge(list(itertools.chain.from_iterable(object_rle_groups)))
            return rle

        a_segm = _get_segment(item_a)
        b_segm = _get_segment(item_b)
        return float(mask_utils.iou([b_segm], [a_segm], [0])[0])

    def match_annotations_two_sources(self, item_a, item_b):
        def _get_segmentations(item):
            return self._get_ann_type(dm.AnnotationType.polygon, item) + self._get_ann_type(
                dm.AnnotationType.mask, item
            )

        dataitem_id = self._context._ann_map[id(item_a[0])][1]
        img_h, img_w = self._context._item_map[dataitem_id][0].image.size

        def _find_instances(annotations):
            # Group instance annotations by label.
            # Annotations with the same label and group will be merged,
            # and considered a single object in comparison
            instances = []
            instance_map = {}  # ann id -> instance id
            for ann_group in dm.ops.find_instances(annotations):
                ann_group = sorted(ann_group, key=lambda a: a.label)
                for _, label_group in itertools.groupby(ann_group, key=lambda a: a.label):
                    label_group = list(label_group)
                    instance_id = len(instances)
                    instances.append(label_group)
                    for ann in label_group:
                        instance_map[id(ann)] = instance_id

            return instances, instance_map

        def _get_compiled_mask(
            anns: Sequence[dm.Annotation], *, instance_ids: Dict[int, int]
        ) -> dm.CompiledMask:
            if not anns:
                return None

            from pycocotools import mask as mask_utils

            object_rle_groups = [_to_rle(ann, img_h=img_h, img_w=img_w) for ann in anns]
            object_rles = [mask_utils.merge(g) for g in object_rle_groups]
            object_masks = mask_utils.decode(object_rles)

            return dm.CompiledMask.from_instance_masks(
                # need to increment labels and instance ids by 1 to avoid confusion with background
                instance_masks=(
                    dm.Mask(image=object_masks[:, :, i], z_order=ann.z_order, label=ann.label + 1)
                    for i, ann in enumerate(anns)
                ),
                instance_ids=(iid + 1 for iid in instance_ids),
            )

        a_instances, a_instance_map = _find_instances(_get_segmentations(item_a))
        b_instances, b_instance_map = _find_instances(_get_segmentations(item_b))

        # if self.panoptic_comparison:
        #     a_compiled_mask = _get_compiled_mask(
        #         list(itertools.chain.from_iterable(a_instances)),
        #         instance_ids=[
        #             a_instance_map[id(ann)] for ann in itertools.chain.from_iterable(a_instances)
        #         ],
        #     )
        #     b_compiled_mask = _get_compiled_mask(
        #         list(itertools.chain.from_iterable(b_instances)),
        #         instance_ids=[
        #             b_instance_map[id(ann)] for ann in itertools.chain.from_iterable(b_instances)
        #         ],
        #     )
        # else:
        a_compiled_mask = None
        b_compiled_mask = None

        segment_cache = {}

        def _get_segment(
            obj_id: int, *, compiled_mask: Optional[dm.CompiledMask] = None, instances
        ):
            key = (id(instances), obj_id)
            rle = segment_cache.get(key)

            if rle is None:
                from pycocotools import mask as mask_utils

                if compiled_mask is not None:
                    mask = compiled_mask.extract(obj_id + 1)

                    rle = mask_utils.encode(mask)
                else:
                    # Create merged RLE for the instance shapes
                    object_anns = instances[obj_id]
                    object_rle_groups = [
                        _to_rle(ann, img_h=img_h, img_w=img_w) for ann in object_anns
                    ]
                    rle = mask_utils.merge(list(itertools.chain.from_iterable(object_rle_groups)))

                segment_cache[key] = rle

            return rle

        def _segment_comparator(a_inst_id: int, b_inst_id: int) -> float:
            a_segm = _get_segment(a_inst_id, compiled_mask=a_compiled_mask, instances=a_instances)
            b_segm = _get_segment(b_inst_id, compiled_mask=b_compiled_mask, instances=b_instances)

            from pycocotools import mask as mask_utils

            return float(mask_utils.iou([b_segm], [a_segm], [0])[0])

        def _label_matcher(a_inst_id: int, b_inst_id: int) -> bool:
            # labels are the same in the instance annotations
            # instances are required to have the same labels in all shapes
            a = a_instances[a_inst_id][0]
            b = b_instances[b_inst_id][0]
            return a.label == b.label

        results = self._match_segments(
            dm.AnnotationType.polygon,
            item_a,
            item_b,
            a_objs=range(len(a_instances)),
            b_objs=range(len(b_instances)),
            distance=_segment_comparator,
            label_matcher=_label_matcher,
        )

        # restore results for original annotations
        matched, mismatched, a_extra, b_extra = results[:4]
        if self.return_distances:
            distances = results[4]

        # i_x ~ instance idx in _x
        # ia_x ~ instance annotation in _x
        matched = [
            (ia_a, ia_b)
            for (i_a, i_b) in matched
            for (ia_a, ia_b) in itertools.product(a_instances[i_a], b_instances[i_b])
        ]
        mismatched = [
            (ia_a, ia_b)
            for (i_a, i_b) in mismatched
            for (ia_a, ia_b) in itertools.product(a_instances[i_a], b_instances[i_b])
        ]
        a_extra = [ia_a for i_a in a_extra for ia_a in a_instances[i_a]]
        b_extra = [ia_b for i_b in b_extra for ia_b in b_instances[i_b]]

        if self.return_distances:
            for i_a, i_b in list(distances.keys()):
                dist = distances.pop((i_a, i_b))

                for ia_a, ia_b in itertools.product(a_instances[i_a], b_instances[i_b]):
                    distances[(id(ia_a), id(ia_b))] = dist

        returned_values = (matched, mismatched, a_extra, b_extra)

        if self.return_distances:
            returned_values = returned_values + (distances,)

        return returned_values


@attrs
class MaskMatcher(_ShapeMatcher):
    pass


@attrs(kw_only=True)
class PointsMatcher(_ShapeMatcher):
    sigma: Optional[list] = attrib(default=None)
    instance_map = attrib(converter=dict)

    def distance(self, a, b):
        for source_anns in [a.annotations, b.annotations]:
            source_instances = dm.ops.find_instances(source_anns)
            for instance_group in source_instances:
                instance_bbox = self._instance_bbox(instance_group)

                for ann in instance_group:
                    if ann.type == dm.AnnotationType.points:
                        self.instance_map[id(ann)] = [instance_group, instance_bbox]

        dataitem_id = self._context._ann_map[id(a)][1]
        img_h, img_w = self._context._item_map[dataitem_id][0].image.size
        a_bbox = self.instance_map[id(a)][1]
        b_bbox = self.instance_map[id(b)][1]
        a_area = a_bbox[2] * a_bbox[3]
        b_area = b_bbox[2] * b_bbox[3]

        if a_area == 0 and b_area == 0:
            # Simple case: singular points without bbox
            # match them in the image space
            return OKS(a, b, sigma=self.sigma, scale=img_h * img_w)

        else:
            # Complex case: multiple points, grouped points, points with a bbox
            # Try to align points and then return the metric
            # match them in their bbox space

            if dm.ops.bbox_iou(a_bbox, b_bbox) <= 0:
                return 0

            bbox = dm.ops.mean_bbox([a_bbox, b_bbox])
            scale = bbox[2] * bbox[3]

            a_points = np.reshape(a.points, (-1, 2))
            b_points = np.reshape(b.points, (-1, 2))

            matches, mismatches, a_extra, b_extra = match_segments(
                range(len(a_points)),
                range(len(b_points)),
                distance=lambda ai, bi: OKS(
                    dm.Points(a_points[ai]),
                    dm.Points(b_points[bi]),
                    sigma=self.sigma,
                    scale=scale,
                ),
                dist_thresh=self.iou_threshold,
                label_matcher=lambda ai, bi: True,
            )

            # the exact array is determined by the label matcher
            # all the points will have the same match status,
            # because there is only 1 shared label for all the points
            matched_points = matches + mismatches

            a_sorting_indices = [ai for ai, _ in matched_points]
            a_points = a_points[a_sorting_indices]

            b_sorting_indices = [bi for _, bi in matched_points]
            b_points = b_points[b_sorting_indices]

            # Compute OKS for 2 groups of points, matching points aligned
            dists = np.linalg.norm(a_points - b_points, axis=1)
            return np.sum(np.exp(-(dists**2) / (2 * scale * (2 * self.sigma) ** 2))) / (
                len(matched_points) + len(a_extra) + len(b_extra)
            )

    def match_annotations_two_sources(self, item_a, item_b):
        a_points = self._get_ann_type(dm.AnnotationType.points, item_a)
        b_points = self._get_ann_type(dm.AnnotationType.points, item_b)

        return self._match_segments(
            dm.AnnotationType.points,
            item_a,
            item_b,
            a_objs=a_points,
            b_objs=b_points,
            distance=self.distance,
        )


class SkeletonMatcher(_ShapeMatcher):
    return_distances = True
    sigma: float = 0.1
    instance_map = {}
    skeleton_map = {}
    _skeleton_info = {}
    distances = {}

    def distance(self, a, b):
        matcher = _KeypointsMatcher(instance_map=self.instance_map, sigma=self.sigma)
        if isinstance(a, dm.Skeleton) and isinstance(b, dm.Skeleton):
            if a == b:
                return 1
            elif (id(b), id(a)) in self.distances:
                return self.distances[(id(b), id(a))]
            else:
                return self.distances[(id(a), id(b))]

        return matcher.distance(a, b)

    def _get_skeleton_info(self, skeleton_label_id: int):
        label_cat = cast(dm.LabelCategories, self.categories[dm.AnnotationType.label])
        skeleton_info = self._skeleton_info.get(skeleton_label_id)

        if skeleton_info is None:
            skeleton_label_name = label_cat[skeleton_label_id].name

            # Build a sorted list of sublabels to arrange skeleton points during comparison
            skeleton_info = sorted(
                idx for idx, label in enumerate(label_cat) if label.parent == skeleton_label_name
            )
            self._skeleton_info[skeleton_label_id] = skeleton_info

        return skeleton_info

    def match_annotations_two_sources(self, a_skeletons, b_skeletons):
        if not a_skeletons and not b_skeletons:
            return [], [], [], []

        # Convert skeletons to point lists for comparison
        # This is required to compute correct per-instance distance
        # It is assumed that labels are the same in the datasets
        skeleton_infos = {}
        points_map = {}
        a_points = []
        b_points = []
        for source, source_points in [(a_skeletons, a_points), (b_skeletons, b_points)]:
            for skeleton in source:
                skeleton_info = skeleton_infos.setdefault(
                    skeleton.label, self._get_skeleton_info(skeleton.label)
                )

                # Merge skeleton points into a single list
                # The list is ordered by skeleton_info
                skeleton_points = [
                    next((p for p in skeleton.elements if p.label == sublabel), None)
                    for sublabel in skeleton_info
                ]

                # Build a single Points object for further comparisons
                merged_points = dm.Points()
                merged_points.points = np.ravel(
                    [p.points if p else [0, 0] for p in skeleton_points]
                )
                merged_points.visibility = np.ravel(
                    [p.visibility if p else [dm.Points.Visibility.absent] for p in skeleton_points]
                )
                merged_points.label = skeleton.label
                # no per-point attributes currently in CVAT

                if all(v == dm.Points.Visibility.absent for v in merged_points.visibility):
                    # The whole skeleton is outside, exclude it
                    self.skeleton_map[id(skeleton)] = None
                    continue

                points_map[id(merged_points)] = skeleton
                self.skeleton_map[id(skeleton)] = merged_points
                source_points.append(merged_points)

        for source in [a_skeletons, b_skeletons]:
            for instance_group in dm.ops.find_instances(source):
                instance_bbox = self._instance_bbox(instance_group)

                instance_group = [
                    self.skeleton_map[id(a)] if isinstance(a, dm.Skeleton) else a
                    for a in instance_group
                    if not isinstance(a, dm.Skeleton) or self.skeleton_map[id(a)] is not None
                ]
                for ann in instance_group:
                    self.instance_map[id(ann)] = [instance_group, instance_bbox]

        results = self._match_segments(
            dm.AnnotationType.points,
            a_skeletons,
            b_skeletons,
            a_objs=a_points,
            b_objs=b_points,
            distance=self.distance,
        )

        matched, mismatched, a_extra, b_extra = results[:4]
        if self.return_distances:
            distances = results[4]

        matched = [(points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in matched]
        mismatched = [(points_map[id(p_a)], points_map[id(p_b)]) for (p_a, p_b) in mismatched]
        a_extra = [points_map[id(p_a)] for p_a in a_extra]
        b_extra = [points_map[id(p_b)] for p_b in b_extra]

        # Map points back to skeletons
        if self.return_distances:
            for p_a_id, p_b_id in list(distances.keys()):
                dist = distances.pop((p_a_id, p_b_id))
                distances[(id(points_map[p_a_id]), id(points_map[p_b_id]))] = dist

        self.distances.update(distances)
        returned_values = (matched, mismatched, a_extra, b_extra)

        if self.return_distances:
            returned_values = returned_values + (distances,)

        return returned_values


@attrs
class LineMatcher(_ShapeMatcher):
    EPSILON = 1e-7
    torso_r: float = 0.01
    oriented: bool = True
    scale: float = None

    def distance(self, a: dm.PolyLine, b: dm.PolyLine) -> float:
        # Check distances of the very coarse estimates for the curves
        def _get_bbox_circle(ann: dm.PolyLine):
            xs = ann.points[0::2]
            ys = ann.points[1::2]
            x0 = min(xs)
            x1 = max(xs)
            y0 = min(ys)
            y1 = max(ys)
            return (x0 + x1) / 2, (y0 + y1) / 2, ((x1 - x0) ** 2 + (y1 - y0) ** 2) / 4

        a_center_x, a_center_y, a_r2 = _get_bbox_circle(a)
        b_center_x, b_center_y, b_r2 = _get_bbox_circle(b)
        sigma6_2 = self.scale * (6 * self.torso_r) ** 2
        if (
            (b_center_x - a_center_x) ** 2 + (b_center_y - a_center_y) ** 2
        ) > b_r2 + a_r2 + sigma6_2:
            return 0

        # Approximate lines to the same number of points for pointwise comparison
        a, b = self.approximate_points(
            np.array(a.points).reshape((-1, 2)), np.array(b.points).reshape((-1, 2))
        )

        # Compare the direct and, optionally, the reverse variants
        similarities = []
        candidates = [b]
        if not self.oriented:
            candidates.append(b[::-1])

        for candidate_b in candidates:
            similarities.append(self._compare_lines(a, candidate_b))

        return max(similarities)

    def _compare_lines(self, a: np.ndarray, b: np.ndarray) -> float:
        dists = np.linalg.norm(a - b, axis=1)

        scale = self.scale
        if scale is None:
            segment_dists = np.linalg.norm(a[1:] - a[:-1], axis=1)
            scale = np.sum(segment_dists) ** 2

        # Compute Gaussian for approximated lines similarly to OKS
        return sum(np.exp(-(dists**2) / (2 * scale * (2 * self.torso_r) ** 2))) / len(a)

    @classmethod
    def approximate_points(cls, a: np.ndarray, b: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Creates 2 polylines with the same numbers of points,
        the points are placed on the original lines with the same step.
        The step for each point is determined as minimal to the next original
        point on one of the curves.
        A simpler, but slower version could be just approximate each curve to
        some big number of points. The advantage of this algo is that it keeps
        corners and original points untouched, while adding intermediate points.
        """
        a_segment_count = len(a) - 1
        b_segment_count = len(b) - 1

        a_segment_lengths = np.linalg.norm(a[1:] - a[:-1], axis=1)
        a_segment_end_dists = [0]
        for l in a_segment_lengths:
            a_segment_end_dists.append(a_segment_end_dists[-1] + l)
        a_segment_end_dists.pop(0)
        a_segment_end_dists.append(a_segment_end_dists[-1])  # duplicate for simpler code

        b_segment_lengths = np.linalg.norm(b[1:] - b[:-1], axis=1)
        b_segment_end_dists = [0]
        for l in b_segment_lengths:
            b_segment_end_dists.append(b_segment_end_dists[-1] + l)
        b_segment_end_dists.pop(0)
        b_segment_end_dists.append(b_segment_end_dists[-1])  # duplicate for simpler code

        a_length = a_segment_end_dists[-1]
        b_length = b_segment_end_dists[-1]

        # lines can have lesser number of points in some cases
        max_points_count = len(a) + len(b) - 1
        a_new_points = np.zeros((max_points_count, 2))
        b_new_points = np.zeros((max_points_count, 2))
        a_new_points[0] = a[0]
        b_new_points[0] = b[0]

        a_segment_idx = 0
        b_segment_idx = 0
        while a_segment_idx < a_segment_count or b_segment_idx < b_segment_count:
            next_point_idx = a_segment_idx + b_segment_idx + 1

            a_segment_end_pos = a_segment_end_dists[a_segment_idx] / (a_length or 1)
            b_segment_end_pos = b_segment_end_dists[b_segment_idx] / (b_length or 1)
            if a_segment_idx < a_segment_count and a_segment_end_pos <= b_segment_end_pos:
                if b_segment_idx < b_segment_count:
                    # advance b in the current segment to the relative position in a
                    q = (b_segment_end_pos - a_segment_end_pos) * (
                        b_length / (b_segment_lengths[b_segment_idx] or 1)
                    )
                    if abs(q) <= cls.EPSILON:
                        b_new_points[next_point_idx] = b[1 + b_segment_idx]
                    else:
                        b_new_points[next_point_idx] = b[b_segment_idx] * q + b[
                            1 + b_segment_idx
                        ] * (1 - q)
                elif b_segment_idx == b_segment_count:
                    b_new_points[next_point_idx] = b[b_segment_idx]

                # advance a to the end of the current segment
                a_segment_idx += 1
                a_new_points[next_point_idx] = a[a_segment_idx]

            elif b_segment_idx < b_segment_count:
                if a_segment_idx < a_segment_count:
                    # advance a in the current segment to the relative position in b
                    q = (a_segment_end_pos - b_segment_end_pos) * (
                        a_length / (a_segment_lengths[a_segment_idx] or 1)
                    )
                    if abs(q) <= cls.EPSILON:
                        a_new_points[next_point_idx] = a[1 + a_segment_idx]
                    else:
                        a_new_points[next_point_idx] = a[a_segment_idx] * q + a[
                            1 + a_segment_idx
                        ] * (1 - q)
                elif a_segment_idx == a_segment_count:
                    a_new_points[next_point_idx] = a[a_segment_idx]

                # advance b to the end of the current segment
                b_segment_idx += 1
                b_new_points[next_point_idx] = b[b_segment_idx]

            else:
                assert False

        # truncate the final values
        if next_point_idx < max_points_count:
            a_new_points = a_new_points[:next_point_idx]
            b_new_points = b_new_points[:next_point_idx]

        return a_new_points, b_new_points

    def match_annotations_two_sources(self, item_a, item_b):
        return self._match_segments(
            dm.AnnotationType.polyline, item_a, item_b, distance=self.distance
        )


@attrs(kw_only=True)
class LabelMerger(LabelMatcher):
    quorum = attrib(converter=int, default=0)

    def merge_clusters(self, clusters):
        assert len(clusters) <= 1
        if len(clusters) == 0:
            return []

        votes = {}  # label -> score
        for ann in clusters[0]:
            label = self._context._get_src_label_name(ann, ann.label)
            votes[label] = 1 + votes.get(label, 0)

        merged = []
        for label, count in votes.items():
            if count < self.quorum:
                sources = set(
                    self.get_ann_source(id(a))
                    for a in clusters[0]
                    if label not in [self._context._get_src_label_name(l, l.label) for l in a]
                )
                sources = [self._context._dataset_map[s][1] for s in sources]
                self._context.add_item_error(FailedLabelVotingError, votes, sources=sources)
                continue

            merged.append(
                Label(
                    self._context._get_label_id(label),
                    attributes={"score": count / len(self._context._dataset_map)},
                )
            )

        return merged


@attrs(kw_only=True)
class _ShapeMerger(_ShapeMatcher):
    quorum = attrib(converter=int, default=0)

    def merge_clusters(self, clusters):
        return list(filter(lambda x: x is not None, map(self.merge_cluster, clusters)))

    def find_cluster_label(self, cluster):
        votes = {}
        for s in cluster:
            label = self._context._get_src_label_name(s, s.label)
            state = votes.setdefault(label, [0, 0])
            state[0] += s.attributes.get("score", 1.0)
            state[1] += 1

        label, (score, count) = max(votes.items(), key=lambda e: e[1][0])
        if count < self.quorum:
            self._context.add_item_error(FailedLabelVotingError, votes)
            label = None
        score = score / len(self._context._dataset_map)
        label = self._context._get_label_id(label)
        return label, score

    def _merge_cluster_shape_mean_box_nearest(self, cluster):
        mbbox = Bbox(*mean_bbox(cluster))
        a = cluster[0]
        dataitem_id = self._context._ann_map[id(a)][1]
        img_h, img_w = self._context._item_map[dataitem_id][0].image.size
        dist = list(segment_iou(mbbox, s, img_h=img_h, img_w=img_w) for s in cluster)
        nearest_pos, _ = max(enumerate(dist), key=lambda e: e[1])
        return cluster[nearest_pos]

    def merge_cluster_shape(self, cluster):
        shape = self._merge_cluster_shape_mean_box_nearest(cluster)
        distance, _ = self._make_memoizing_distance(self.distance)
        for ann in cluster:
            dataset_id = self._context._item_map[self._context._ann_map[id(ann)][1]][1]
            self._context._dataset_mean_consensus_score.setdefault(dataset_id, []).append(
                max(0, distance(ann, shape))
            )
        shape_score = sum(max(0, distance(shape, s)) for s in cluster) / len(cluster)
        return shape, shape_score

    def merge_cluster(self, cluster):
        label, label_score = self.find_cluster_label(cluster)

        # when the merged annotation is rejected due to quorum constraint
        if label is None:
            return None

        shape, shape_score = self.merge_cluster_shape(cluster)
        shape.z_order = max(cluster, key=lambda a: a.z_order).z_order
        shape.label = label
        shape.attributes["score"] = label_score * shape_score if label is not None else shape_score

        return shape


@attrs
class BboxMerger(_ShapeMerger, BboxMatcher):
    pass


@attrs
class PolygonMerger(_ShapeMerger, PolygonMatcher):
    pass


@attrs
class MaskMerger(_ShapeMerger, MaskMatcher):
    pass


@attrs
class PointsMerger(_ShapeMerger, PointsMatcher):
    pass


@attrs
class LineMerger(_ShapeMerger, LineMatcher):
    pass


class SkeletonMerger(_ShapeMerger, SkeletonMatcher):
    def _merge_cluster_shape_nearest(self, cluster):
        dist = {}
        for idx, skeleton1 in enumerate(cluster):
            id_skeleton1 = id(skeleton1)
            skeleton_distance = 0
            for skeleton2 in cluster:
                id_skeleton2 = id(skeleton2)
                if (id_skeleton1, id_skeleton2) in self.distances:
                    skeleton_distance += self.distances[(id_skeleton1, id_skeleton2)]
                elif (id_skeleton2, id_skeleton1) in self.distances:
                    skeleton_distance += self.distances[(id_skeleton2, id_skeleton1)]
                else:
                    skeleton_distance += 1

            dist[idx] = skeleton_distance / len(cluster)

        return cluster[min(dist, key=dist.get)]

    def merge_cluster_shape(self, cluster):
        shape = self._merge_cluster_shape_nearest(cluster)
        shape_score = sum(max(0, self.distance(shape, s)) for s in cluster) / len(cluster)
        return shape, shape_score

    # def __init__(self, categories=None):
    #     _ShapeMerger.__init__(self)
    #     SkeletonMatcher.__init__(self, categories)


def match_segments(
    a_segms,
    b_segms,
    distance=dm.ops.segment_iou,
    dist_thresh=1.0,
    label_matcher=lambda a, b: a.label == b.label,
):
    assert callable(distance), distance
    assert callable(label_matcher), label_matcher

    max_anns = max(len(a_segms), len(b_segms))
    distances = np.array(
        [
            [
                1 - distance(a, b) if a is not None and b is not None else 1
                for b, _ in itertools.zip_longest(b_segms, range(max_anns), fillvalue=None)
            ]
            for a, _ in itertools.zip_longest(a_segms, range(max_anns), fillvalue=None)
        ]
    )
    distances[~np.isfinite(distances)] = 1
    distances[distances > 1 - dist_thresh] = 1

    if a_segms and b_segms:
        a_matches, b_matches = linear_sum_assignment(distances)
    else:
        a_matches = []
        b_matches = []

    # matches: boxes we succeeded to match completely
    # mispred: boxes we succeeded to match, having label mismatch
    matches = []
    mispred = []
    # *_umatched: boxes of (*) we failed to match
    a_unmatched = []
    b_unmatched = []

    for a_idx, b_idx in zip(a_matches, b_matches):
        dist = distances[a_idx, b_idx]
        if dist > 1 - dist_thresh or dist == 1:
            if a_idx < len(a_segms):
                a_unmatched.append(a_segms[a_idx])
            if b_idx < len(b_segms):
                b_unmatched.append(b_segms[b_idx])
        else:
            a_ann = a_segms[a_idx]
            b_ann = b_segms[b_idx]
            if label_matcher(a_ann, b_ann):
                matches.append((a_ann, b_ann))
            else:
                mispred.append((a_ann, b_ann))

    if not len(a_matches) and not len(b_matches):
        a_unmatched = list(a_segms)
        b_unmatched = list(b_segms)

    return matches, mispred, a_unmatched, b_unmatched
