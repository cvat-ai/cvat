
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

from collections import OrderedDict
from copy import deepcopy
import hashlib
import logging as log

import attr
import cv2
import numpy as np
from attr import attrib, attrs
from unittest import TestCase

from datumaro.components.cli_plugin import CliPlugin
from datumaro.components.extractor import (AnnotationType, Bbox, Label,
    LabelCategories, PointsCategories, MaskCategories)
from datumaro.components.project import Dataset
from datumaro.util import find, filter_dict
from datumaro.util.attrs_util import ensure_cls, default_if_none
from datumaro.util.annotation_util import (segment_iou, bbox_iou,
    mean_bbox, OKS, find_instances, max_bbox, smooth_line)

def get_ann_type(anns, t):
    return [a for a in anns if a.type == t]

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
    for source in sources:
        categories.update(source)
    for source in sources:
        for cat_type, source_cat in source.items():
            if not categories[cat_type] == source_cat:
                raise NotImplementedError(
                    "Merging of datasets with different categories is "
                    "only allowed in 'merge' command.")
    return categories

class MergingStrategy(CliPlugin):
    @classmethod
    def merge(cls, sources, **options):
        instance = cls(**options)
        return instance(sources)

    def __init__(self, **options):
        super().__init__(**options)
        self.__dict__['_sources'] = None

    def __call__(self, sources):
        raise NotImplementedError()


@attrs
class DatasetError:
    item_id = attrib()

@attrs
class QualityError(DatasetError):
    pass

@attrs
class TooCloseError(QualityError):
    a = attrib()
    b = attrib()
    distance = attrib()

    def __str__(self):
        return "Item %s: annotations are too close: %s, %s, distance = %s" % \
            (self.item_id, self.a, self.b, self.distance)

@attrs
class WrongGroupError(QualityError):
    found = attrib(converter=set)
    expected = attrib(converter=set)
    group = attrib(converter=list)

    def __str__(self):
        return "Item %s: annotation group has wrong labels: " \
            "found %s, expected %s, group %s" % \
            (self.item_id, self.found, self.expected, self.group)

@attrs
class MergeError(DatasetError):
    sources = attrib(converter=set)

@attrs
class NoMatchingAnnError(MergeError):
    ann = attrib()

    def __str__(self):
        return "Item %s: can't find matching annotation " \
            "in sources %s, annotation is %s" % \
            (self.item_id, self.sources, self.ann)

@attrs
class NoMatchingItemError(MergeError):
    def __str__(self):
        return "Item %s: can't find matching item in sources %s" % \
            (self.item_id, self.sources)

@attrs
class FailedLabelVotingError(MergeError):
    votes = attrib()
    ann = attrib(default=None)

    def __str__(self):
        return "Item %s: label voting failed%s, votes %s, sources %s" % \
            (self.item_id, 'for ann %s' % self.ann if self.ann else '',
            self.votes, self.sources)

@attrs
class FailedAttrVotingError(MergeError):
    attr = attrib()
    votes = attrib()
    ann = attrib()

    def __str__(self):
        return "Item %s: attribute voting failed " \
            "for ann %s, votes %s, sources %s" % \
            (self.item_id, self.ann, self.votes, self.sources)

@attrs
class IntersectMerge(MergingStrategy):
    @attrs(repr_ns='IntersectMerge', kw_only=True)
    class Conf:
        pairwise_dist = attrib(converter=float, default=0.5)
        sigma = attrib(converter=list, factory=list)

        output_conf_thresh = attrib(converter=float, default=0)
        quorum = attrib(converter=int, default=0)
        ignored_attributes = attrib(converter=set, factory=set)

        def _groups_conveter(value):
            result = []
            for group in value:
                rg = set()
                for label in group:
                    optional = label.endswith('?')
                    name = label if not optional else label[:-1]
                    rg.add((name, optional))
                result.append(rg)
            return result
        groups = attrib(converter=_groups_conveter, factory=list)
        close_distance = attrib(converter=float, default=0.75)
    conf = attrib(converter=ensure_cls(Conf), factory=Conf)

    # Error trackers:
    errors = attrib(factory=list, init=False)
    def add_item_error(self, error, *args, **kwargs):
        self.errors.append(error(self._item_id, *args, **kwargs))

    # Indexes:
    _dataset_map = attrib(init=False) # id(dataset) -> (dataset, index)
    _item_map = attrib(init=False) # id(item) -> (item, id(dataset))
    _ann_map = attrib(init=False) # id(ann) -> (ann, id(item))
    _item_id = attrib(init=False)
    _item = attrib(init=False)

    # Misc.
    _categories = attrib(init=False) # merged categories

    def __call__(self, datasets):
        self._categories = self._merge_categories(
            [d.categories() for d in datasets])
        merged = Dataset(categories=self._categories)

        self._check_groups_definition()

        item_matches, item_map = self.match_items(datasets)
        self._item_map = item_map
        self._dataset_map = { id(d): (d, i) for i, d in enumerate(datasets) }

        for item_id, items in item_matches.items():
            self._item_id = item_id

            if len(items) < len(datasets):
                missing_sources = set(id(s) for s in datasets) - set(items)
                missing_sources = [self._dataset_map[s][1]
                    for s in missing_sources]
                self.add_item_error(NoMatchingItemError, missing_sources)
            merged.put(self.merge_items(items))

        return merged

    def get_ann_source(self, ann_id):
        return self._item_map[self._ann_map[ann_id][1]][1]

    def merge_items(self, items):
        self._item = next(iter(items.values()))

        self._ann_map = {}
        sources = []
        for item in items.values():
            self._ann_map.update({ id(a): (a, id(item))
                for a in item.annotations })
            sources.append(item.annotations)
        log.debug("Merging item %s: source annotations %s" % \
            (self._item_id, list(map(len, sources))))

        annotations = self.merge_annotations(sources)

        annotations = [a for a in annotations
            if self.conf.output_conf_thresh <= a.attributes.get('score', 1)]

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
                attributes = { k: v for k, v in attributes.items()
                    if k not in self.conf.ignored_attributes }
                attributes.update(merged_ann.attributes)
                merged_ann.attributes = attributes

                new_group_id = find(enumerate(group_map),
                    lambda e: id(cluster) in e[1][0])
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

        item_map = {} # id(item) -> (item, id(dataset))

        matches = OrderedDict()
        for (item_id, item_subset) in sorted(item_ids, key=lambda e: e[0]):
            items = {}
            for d in datasets:
                try:
                    item = d.get(item_id, subset=item_subset)
                    items[id(d)] = item
                    item_map[id(item)] = (item, id(d))
                except KeyError:
                    pass
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
                dst_label = dst_cat.find(src_label.name)[1]
                if dst_label is not None:
                    if dst_label != src_label:
                        if src_label.parent and dst_label.parent and \
                                src_label.parent != dst_label.parent:
                            raise ValueError("Can't merge label category "
                                "%s (from #%s): "
                                "parent label conflict: %s vs. %s" % \
                                (src_label.name, src_id,
                                 src_label.parent, dst_label.parent)
                            )
                        dst_label.parent = dst_label.parent or src_label.parent
                        dst_label.attributes |= src_label.attributes
                    else:
                        pass
                else:
                    dst_cat.add(src_label.name,
                        src_label.parent, src_label.attributes)

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
                dst_label_id = label_cat.find(src_label)[0]
                dst_cat = dst_point_cat.items.get(dst_label_id)
                if dst_cat is not None:
                    if dst_cat != src_cat:
                        raise ValueError("Can't merge point category for label "
                            "%s (from #%s): %s vs. %s" % \
                            (src_label, src_id, src_cat, dst_cat)
                        )
                    else:
                        pass
                else:
                    dst_point_cat.add(dst_label_id,
                        src_cat.labels, src_cat.joints)

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
                dst_label_id = label_cat.find(src_label)[0]
                dst_cat = dst_mask_cat.colormap.get(dst_label_id)
                if dst_cat is not None:
                    if dst_cat != src_cat:
                        raise ValueError("Can't merge mask category for label "
                            "%s (from #%s): %s vs. %s" % \
                            (src_label, src_id, src_cat, dst_cat)
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
            return dst_categories

        dst_categories[AnnotationType.label] = label_cat

        points_cat = self._merge_point_categories(sources, label_cat)
        if points_cat is not None:
            dst_categories[AnnotationType.points] = points_cat

        mask_cat = self._merge_mask_categories(sources, label_cat)
        if mask_cat is not None:
            dst_categories[AnnotationType.mask] = mask_cat

        return dst_categories

    def _match_annotations(self, sources):
        all_by_type = {}
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
            return c(**{ k: v for k, v in kwargs.items() if k in fields },
                context=self)

        def _for_type(t, **kwargs):
            if t is AnnotationType.label:
                return _make(LabelMerger, **kwargs)
            elif t is AnnotationType.bbox:
                return _make(BboxMerger, **kwargs)
            elif t is AnnotationType.mask:
                return _make(MaskMerger, **kwargs)
            elif t is AnnotationType.polygon:
                return _make(PolygonMerger, **kwargs)
            elif t is AnnotationType.polyline:
                return _make(LineMerger, **kwargs)
            elif t is AnnotationType.points:
                return _make(PointsMerger, **kwargs)
            elif t is AnnotationType.caption:
                return _make(CaptionsMerger, **kwargs)
            else:
                raise NotImplementedError("Type %s is not supported" % t)

        instance_map = {}
        for s in sources:
            s_instances = find_instances(s)
            for inst in s_instances:
                inst_bbox = max_bbox([a for a in inst if a.type in
                    {AnnotationType.polygon,
                     AnnotationType.mask, AnnotationType.bbox}
                ])
                for ann in inst:
                    instance_map[id(ann)] = [inst, inst_bbox]

        self._mergers = { t: _for_type(t, instance_map=instance_map)
            for t in AnnotationType }

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

            cluster_group = { id(cluster_a) }

            # find segment groups in the cluster group
            a_groups = set(ann.group for ann in cluster_a)
            for cluster_b in clusters[a_idx+1 :]:
                b_groups = set(ann.group for ann in cluster_b)
                if a_groups & b_groups:
                    a_groups |= b_groups

            # now we know all the segment groups in this cluster group
            # so we can find adjacent clusters
            for b_idx, cluster_b in enumerate(clusters[a_idx+1 :]):
                b_idx = a_idx + 1 + b_idx
                b_groups = set(ann.group for ann in cluster_b)
                if a_groups & b_groups:
                    cluster_group.add( id(cluster_b) )
                    visited.add(b_idx)

            if a_groups == {0}:
                continue # skip annotations without a group
            cluster_groups.append( (cluster_group, a_groups) )
        return cluster_groups

    def _find_cluster_attrs(self, cluster, ann):
        quorum = self.conf.quorum or 0

        # TODO: when attribute types are implemented, add linear
        # interpolation for contiguous values

        attr_votes = {} # name -> { value: score , ... }
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
                        self.get_ann_source(id(a)) for a in cluster
                        if s.attributes.get(name) == winner)
                else:
                    # blame outliers
                    missing_sources = set(
                        self.get_ann_source(id(a)) for a in cluster
                        if s.attributes.get(name) != winner)
                missing_sources = [self._dataset_map[s][1]
                    for s in missing_sources]
                self.add_item_error(FailedAttrVotingError,
                    missing_sources, name, votes, ann)
                continue
            attributes[name] = winner

        return attributes

    def _check_cluster_sources(self, cluster):
        if len(cluster) == len(self._dataset_map):
            return

        def _has_item(s):
            try:
                item =self._dataset_map[s][0].get(*self._item_id)
                if len(item.annotations) == 0:
                    return False
                return True
            except KeyError:
                return False

        missing_sources = set(self._dataset_map) - \
            set(self.get_ann_source(id(a)) for a in cluster)
        missing_sources = [self._dataset_map[s][1] for s in missing_sources
            if _has_item(s)]
        if missing_sources:
            self.add_item_error(NoMatchingAnnError, missing_sources, cluster[0])

    def _check_annotation_distance(self, t, annotations):
        for a_idx, a_ann in enumerate(annotations):
            for b_ann in annotations[a_idx+1:]:
                d = self._mergers[t].distance(a_ann, b_ann)
                if self.conf.close_distance < d:
                    self.add_item_error(TooCloseError, a_ann, b_ann, d)

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
                    self.add_item_error(WrongGroupError, group_labels,
                        check_group, group)
                    break

        groups = find_instances(annotations)
        for group in groups:
            group_labels = set()
            for ann in group:
                if not hasattr(ann, 'label'):
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

    def _get_label_id(self, label):
        return self._categories[AnnotationType.label].find(label)[0]

    def _get_src_label_name(self, ann, label_id):
        if label_id is None:
            return None
        item_id = self._ann_map[id(ann)][1]
        dataset_id = self._item_map[item_id][1]
        return self._dataset_map[dataset_id][0] \
            .categories()[AnnotationType.label].items[label_id].name

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
                    raise ValueError("Datasets do not contain "
                        "label '%s', available labels %s" % \
                        (label, [i.name for i in
                            self._categories[AnnotationType.label].items])
                    )

@attrs(kw_only=True)
class AnnotationMatcher:
    _context = attrib(type=IntersectMerge, default=None)

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

    def match_annotations(self, sources):
        distance = self.distance
        label_matcher = self.label_matcher
        pairwise_dist = self.pairwise_dist
        cluster_dist = self.cluster_dist

        if cluster_dist < 0: cluster_dist = pairwise_dist

        id_segm = { id(a): (a, id(s)) for s in sources for a in s }

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
        adjacent = { i: [] for i in id_segm } # id(sgm) -> [id(adj_sgm1), ...]
        for a_idx, src_a in enumerate(sources):
            for src_b in sources[a_idx+1 :]:
                matches, _, _, _ = match_segments(src_a, src_b,
                    dist_thresh=pairwise_dist,
                    distance=distance, label_matcher=label_matcher)
                for a, b in matches:
                    adjacent[id(a)].append(id(b))

        # join all segments into matching clusters
        clusters = []
        visited = set()
        for cluster_idx in adjacent:
            if cluster_idx in visited:
                continue

            cluster = set()
            to_visit = { cluster_idx }
            while to_visit:
                c = to_visit.pop()
                cluster.add(c)
                visited.add(c)

                for i in adjacent[c]:
                    if i in visited:
                        continue
                    if 0 < cluster_dist and not _is_close_enough(cluster, i):
                        continue
                    if _has_same_source(cluster, i):
                        continue

                    to_visit.add(i)

            clusters.append([id_segm[i][0] for i in cluster])

        return clusters

    @staticmethod
    def distance(a, b):
        return segment_iou(a, b)

    def label_matcher(self, a, b):
        a_label = self._context._get_any_label_name(a, a.label)
        b_label = self._context._get_any_label_name(b, b.label)
        return a_label == b_label

@attrs
class BboxMatcher(_ShapeMatcher):
    pass

@attrs
class PolygonMatcher(_ShapeMatcher):
    pass

@attrs
class MaskMatcher(_ShapeMatcher):
    pass

@attrs(kw_only=True)
class PointsMatcher(_ShapeMatcher):
    sigma = attrib(type=list, default=None)
    instance_map = attrib(converter=dict)

    def distance(self, a, b):
        a_bbox = self.instance_map[id(a)][1]
        b_bbox = self.instance_map[id(b)][1]
        if bbox_iou(a_bbox, b_bbox) <= 0:
            return 0
        bbox = mean_bbox([a_bbox, b_bbox])
        return OKS(a, b, sigma=self.sigma, bbox=bbox)

@attrs
class LineMatcher(_ShapeMatcher):
    @staticmethod
    def distance(a, b):
        a_bbox = a.get_bbox()
        b_bbox = b.get_bbox()
        bbox = max_bbox([a_bbox, b_bbox])
        area = bbox[2] * bbox[3]
        if not area:
            return 1

        # compute inter-line area, normalize by common bbox
        point_count = max(max(len(a.points) // 2, len(b.points) // 2), 5)
        a, sa = smooth_line(a.points, point_count)
        b, sb = smooth_line(b.points, point_count)
        dists = np.linalg.norm(a - b, axis=1)
        dists = (dists[:-1] + dists[1:]) * 0.5
        s = np.sum(dists) * 0.5 * (sa + sb) / area
        return abs(1 - s)

@attrs
class CaptionsMatcher(AnnotationMatcher):
    def match_annotations(self, sources):
        raise NotImplementedError()


@attrs(kw_only=True)
class AnnotationMerger:
    def merge_clusters(self, clusters):
        raise NotImplementedError()

@attrs(kw_only=True)
class LabelMerger(AnnotationMerger, LabelMatcher):
    quorum = attrib(converter=int, default=0)

    def merge_clusters(self, clusters):
        assert len(clusters) <= 1
        if len(clusters) == 0:
            return []

        votes = {} # label -> score
        for ann in clusters[0]:
            label = self._context._get_src_label_name(ann, ann.label)
            votes[label] = 1 + votes.get(label, 0)

        merged = []
        for label, count in votes.items():
            if count < self.quorum:
                sources = set(self.get_ann_source(id(a)) for a in clusters[0]
                    if label not in [self._context._get_src_label_name(l, l.label)
                        for l in a])
                sources = [self._context._dataset_map[s][1] for s in sources]
                self._context.add_item_error(FailedLabelVotingError,
                    sources, votes)
                continue

            merged.append(Label(self._context._get_label_id(label), attributes={
                'score': count / len(self._context._dataset_map)
            }))

        return merged

@attrs(kw_only=True)
class _ShapeMerger(AnnotationMerger, _ShapeMatcher):
    quorum = attrib(converter=int, default=0)

    def merge_clusters(self, clusters):
        merged = []
        for cluster in clusters:
            label, label_score = self.find_cluster_label(cluster)
            shape, shape_score = self.merge_cluster_shape(cluster)

            shape.z_order = max(cluster, key=lambda a: a.z_order).z_order
            shape.label = label
            shape.attributes['score'] = label_score * shape_score \
                if label is not None else shape_score

            merged.append(shape)

        return merged

    def find_cluster_label(self, cluster):
        votes = {}
        for s in cluster:
            label = self._context._get_src_label_name(s, s.label)
            state = votes.setdefault(label, [0, 0])
            state[0] += s.attributes.get('score', 1.0)
            state[1] += 1

        label, (score, count) = max(votes.items(), key=lambda e: e[1][0])
        if count < self.quorum:
            self._context.add_item_error(FailedLabelVotingError, votes)
            label = None
        score = score / len(self._context._dataset_map)
        label = self._context._get_label_id(label)
        return label, score

    @staticmethod
    def _merge_cluster_shape_mean_box_nearest(cluster):
        mbbox = Bbox(*mean_bbox(cluster))
        dist = (segment_iou(mbbox, s) for s in cluster)
        nearest_pos, _ = max(enumerate(dist), key=lambda e: e[1])
        return cluster[nearest_pos]

    def merge_cluster_shape(self, cluster):
        shape = self._merge_cluster_shape_mean_box_nearest(cluster)
        shape_score = sum(max(0, self.distance(shape, s))
            for s in cluster) / len(cluster)
        return shape, shape_score

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

@attrs
class CaptionsMerger(AnnotationMerger, CaptionsMatcher):
    pass

def match_segments(a_segms, b_segms, distance=segment_iou, dist_thresh=1.0,
        label_matcher=lambda a, b: a.label == b.label):
    assert callable(distance), distance
    assert callable(label_matcher), label_matcher

    a_segms.sort(key=lambda ann: 1 - ann.attributes.get('score', 1))
    b_segms.sort(key=lambda ann: 1 - ann.attributes.get('score', 1))

    # a_matches: indices of b_segms matched to a bboxes
    # b_matches: indices of a_segms matched to b bboxes
    a_matches = -np.ones(len(a_segms), dtype=int)
    b_matches = -np.ones(len(b_segms), dtype=int)

    distances = np.array([[distance(a, b) for b in b_segms] for a in a_segms])

    # matches: boxes we succeeded to match completely
    # mispred: boxes we succeeded to match, having label mismatch
    matches = []
    mispred = []

    for a_idx, a_segm in enumerate(a_segms):
        if len(b_segms) == 0:
            break
        matched_b = -1
        max_dist = -1
        b_indices = np.argsort([not label_matcher(a_segm, b_segm)
            for b_segm in b_segms],
            kind='stable') # prioritize those with same label, keep score order
        for b_idx in b_indices:
            if 0 <= b_matches[b_idx]: # assign a_segm with max conf
                continue
            d = distances[a_idx, b_idx]
            if d < dist_thresh or d <= max_dist:
                continue
            max_dist = d
            matched_b = b_idx

        if matched_b < 0:
            continue
        a_matches[a_idx] = matched_b
        b_matches[matched_b] = a_idx

        b_segm = b_segms[matched_b]

        if label_matcher(a_segm, b_segm):
            matches.append( (a_segm, b_segm) )
        else:
            mispred.append( (a_segm, b_segm) )

    # *_umatched: boxes of (*) we failed to match
    a_unmatched = [a_segms[i] for i, m in enumerate(a_matches) if m < 0]
    b_unmatched = [b_segms[i] for i, m in enumerate(b_matches) if m < 0]

    return matches, mispred, a_unmatched, b_unmatched

def mean_std(dataset):
    """
    Computes unbiased mean and std. dev. for dataset images, channel-wise.
    """
    # Use an online algorithm to:
    # - handle different image sizes
    # - avoid cancellation problem
    if len(dataset) == 0:
        return [0, 0, 0], [0, 0, 0]

    stats = np.empty((len(dataset), 2, 3), dtype=np.double)
    counts = np.empty(len(dataset), dtype=np.uint32)

    mean = lambda i, s: s[i][0]
    var = lambda i, s: s[i][1]

    for i, item in enumerate(dataset):
        counts[i] = np.prod(item.image.size)

        image = item.image.data
        if len(image.shape) == 2:
            image = image[:, :, np.newaxis]
        else:
            image = image[:, :, :3]
        # opencv is much faster than numpy here
        cv2.meanStdDev(image.astype(np.double) / 255,
            mean=mean(i, stats), stddev=var(i, stats))

    # make variance unbiased
    np.multiply(np.square(stats[:, 1]),
        (counts / (counts - 1))[:, np.newaxis],
        out=stats[:, 1])

    _, mean, var = StatsCounter().compute_stats(stats, counts, mean, var)
    return mean * 255, np.sqrt(var) * 255

class StatsCounter:
    # Implements online parallel computation of sample variance
    # https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Parallel_algorithm

    # Needed do avoid catastrophic cancellation in floating point computations
    @staticmethod
    def pairwise_stats(count_a, mean_a, var_a, count_b, mean_b, var_b):
        delta = mean_b - mean_a
        m_a = var_a * (count_a - 1)
        m_b = var_b * (count_b - 1)
        M2 = m_a + m_b + delta ** 2 * count_a * count_b / (count_a + count_b)
        return (
            count_a + count_b,
            mean_a * 0.5 + mean_b * 0.5,
            M2 / (count_a + count_b - 1)
        )

    # stats = float array of shape N, 2 * d, d = dimensions of values
    # count = integer array of shape N
    # mean_accessor = function(idx, stats) to retrieve element mean
    # variance_accessor = function(idx, stats) to retrieve element variance
    # Recursively computes total count, mean and variance, does O(log(N)) calls
    @staticmethod
    def compute_stats(stats, counts, mean_accessor, variance_accessor):
        m = mean_accessor
        v = variance_accessor
        n = len(stats)
        if n == 1:
            return counts[0], m(0, stats), v(0, stats)
        if n == 2:
            return __class__.pairwise_stats(
                counts[0], m(0, stats), v(0, stats),
                counts[1], m(1, stats), v(1, stats)
                )
        h = n // 2
        return __class__.pairwise_stats(
            *__class__.compute_stats(stats[:h], counts[:h], m, v),
            *__class__.compute_stats(stats[h:], counts[h:], m, v)
            )

def compute_image_statistics(dataset):
    stats = {
        'dataset': {},
        'subsets': {}
    }

    def _extractor_stats(extractor):
        available = True
        for item in extractor:
            if not (item.has_image and item.image.has_data):
                available = False
                log.warn("Item %s has no image. Image stats won't be computed",
                    item.id)
                break

        stats = {
            'images count': len(extractor),
        }

        if available:
            mean, std = mean_std(extractor)
            stats.update({
                'image mean': [float(n) for n in mean[::-1]],
                'image std': [float(n) for n in std[::-1]],
            })
        else:
            stats.update({
                'image mean': 'n/a',
                'image std': 'n/a',
            })
        return stats

    stats['dataset'].update(_extractor_stats(dataset))

    subsets = dataset.subsets() or [None]
    if subsets and 0 < len([s for s in subsets if s]):
        for subset_name in subsets:
            stats['subsets'][subset_name] = _extractor_stats(
                dataset.get_subset(subset_name))

    return stats

def compute_ann_statistics(dataset):
    labels = dataset.categories().get(AnnotationType.label)
    def get_label(ann):
        return labels.items[ann.label].name if ann.label is not None else None

    stats = {
        'images count': len(dataset),
        'annotations count': 0,
        'unannotated images count': 0,
        'unannotated images': [],
        'annotations by type': { t.name: {
            'count': 0,
        } for t in AnnotationType },
        'annotations': {},
    }
    by_type = stats['annotations by type']

    attr_template = {
        'count': 0,
        'values count': 0,
        'values present': set(),
        'distribution': {}, # value -> (count, total%)
    }
    label_stat = {
        'count': 0,
        'distribution': { l.name: [0, 0] for l in labels.items
        }, # label -> (count, total%)

        'attributes': {},
    }
    stats['annotations']['labels'] = label_stat
    segm_stat = {
        'avg. area': 0,
        'area distribution': [], # a histogram with 10 bins
        # (min, min+10%), ..., (min+90%, max) -> (count, total%)

        'pixel distribution': { l.name: [0, 0] for l in labels.items
        }, # label -> (count, total%)
    }
    stats['annotations']['segments'] = segm_stat
    segm_areas = []
    pixel_dist = segm_stat['pixel distribution']
    total_pixels = 0

    for item in dataset:
        if len(item.annotations) == 0:
            stats['unannotated images'].append(item.id)
            continue

        for ann in item.annotations:
            by_type[ann.type.name]['count'] += 1

            if not hasattr(ann, 'label') or ann.label is None:
                continue

            if ann.type in {AnnotationType.mask,
                    AnnotationType.polygon, AnnotationType.bbox}:
                area = ann.get_area()
                segm_areas.append(area)
                pixel_dist[get_label(ann)][0] += int(area)

            label_stat['count'] += 1
            label_stat['distribution'][get_label(ann)][0] += 1

            for name, value in ann.attributes.items():
                if name.lower() in { 'occluded', 'visibility', 'score',
                        'id', 'track_id' }:
                    continue
                attrs_stat = label_stat['attributes'].setdefault(name,
                    deepcopy(attr_template))
                attrs_stat['count'] += 1
                attrs_stat['values present'].add(str(value))
                attrs_stat['distribution'] \
                    .setdefault(str(value), [0, 0])[0] += 1

    stats['annotations count'] = sum(t['count'] for t in
        stats['annotations by type'].values())
    stats['unannotated images count'] = len(stats['unannotated images'])

    for label_info in label_stat['distribution'].values():
        label_info[1] = label_info[0] / label_stat['count']

    for label_attr in label_stat['attributes'].values():
        label_attr['values count'] = len(label_attr['values present'])
        label_attr['values present'] = sorted(label_attr['values present'])
        for attr_info in label_attr['distribution'].values():
            attr_info[1] = attr_info[0] / label_attr['count']

    # numpy.sum might be faster, but could overflow with large datasets.
    # Python's int can transparently mutate to be of indefinite precision (long)
    total_pixels = sum(int(a) for a in segm_areas)

    segm_stat['avg. area'] = total_pixels / (len(segm_areas) or 1.0)

    for label_info in segm_stat['pixel distribution'].values():
        label_info[1] = label_info[0] / total_pixels

    if len(segm_areas) != 0:
        hist, bins = np.histogram(segm_areas)
        segm_stat['area distribution'] = [{
            'min': float(bin_min), 'max': float(bin_max),
            'count': int(c), 'percent': int(c) / len(segm_areas)
        } for c, (bin_min, bin_max) in zip(hist, zip(bins[:-1], bins[1:]))]

    return stats

@attrs
class DistanceComparator:
    iou_threshold = attrib(converter=float, default=0.5)

    @staticmethod
    def match_datasets(a, b):
        a_items = set((item.id, item.subset) for item in a)
        b_items = set((item.id, item.subset) for item in b)

        matches = a_items & b_items
        a_unmatched = a_items - b_items
        b_unmatched = b_items - a_items
        return matches, a_unmatched, b_unmatched

    @staticmethod
    def match_classes(a, b):
        a_label_cat = a.categories().get(AnnotationType.label, LabelCategories())
        b_label_cat = b.categories().get(AnnotationType.label, LabelCategories())

        a_labels = set(c.name for c in a_label_cat)
        b_labels = set(c.name for c in b_label_cat)

        matches = a_labels & b_labels
        a_unmatched = a_labels - b_labels
        b_unmatched = b_labels - a_labels
        return matches, a_unmatched, b_unmatched

    def match_annotations(self, item_a, item_b):
        return { t: self._match_ann_type(t, item_a, item_b) }

    def _match_ann_type(self, t, *args):
        # pylint: disable=no-value-for-parameter
        if t == AnnotationType.label:
            return self.match_labels(*args)
        elif t == AnnotationType.bbox:
            return self.match_boxes(*args)
        elif t == AnnotationType.polygon:
            return self.match_polygons(*args)
        elif t == AnnotationType.mask:
            return self.match_masks(*args)
        elif t == AnnotationType.points:
            return self.match_points(*args)
        elif t == AnnotationType.polyline:
            return self.match_lines(*args)
        # pylint: enable=no-value-for-parameter
        else:
            raise NotImplementedError("Unexpected annotation type %s" % t)

    @staticmethod
    def _get_ann_type(t, item):
        return get_ann_type(item.annotations, t)

    def match_labels(self, item_a, item_b):
        a_labels = set(a.label for a in
            self._get_ann_type(AnnotationType.label, item_a))
        b_labels = set(a.label for a in
            self._get_ann_type(AnnotationType.label, item_b))

        matches = a_labels & b_labels
        a_unmatched = a_labels - b_labels
        b_unmatched = b_labels - a_labels
        return matches, a_unmatched, b_unmatched

    def _match_segments(self, t, item_a, item_b):
        a_boxes = self._get_ann_type(t, item_a)
        b_boxes = self._get_ann_type(t, item_b)
        return match_segments(a_boxes, b_boxes, dist_thresh=self.iou_threshold)

    def match_polygons(self, item_a, item_b):
        return self._match_segments(AnnotationType.polygon, item_a, item_b)

    def match_masks(self, item_a, item_b):
        return self._match_segments(AnnotationType.mask, item_a, item_b)

    def match_boxes(self, item_a, item_b):
        return self._match_segments(AnnotationType.bbox, item_a, item_b)

    def match_points(self, item_a, item_b):
        a_points = self._get_ann_type(AnnotationType.points, item_a)
        b_points = self._get_ann_type(AnnotationType.points, item_b)

        instance_map = {}
        for s in [item_a.annotations, item_b.annotations]:
            s_instances = find_instances(s)
            for inst in s_instances:
                inst_bbox = max_bbox(inst)
                for ann in inst:
                    instance_map[id(ann)] = [inst, inst_bbox]
        matcher = PointsMatcher(instance_map=instance_map)

        return match_segments(a_points, b_points,
            dist_thresh=self.iou_threshold, distance=matcher.distance)

    def match_lines(self, item_a, item_b):
        a_lines = self._get_ann_type(AnnotationType.polyline, item_a)
        b_lines = self._get_ann_type(AnnotationType.polyline, item_b)

        matcher = LineMatcher()

        return match_segments(a_lines, b_lines,
            dist_thresh=self.iou_threshold, distance=matcher.distance)

def match_items_by_id(a, b):
    a_items = set((item.id, item.subset) for item in a)
    b_items = set((item.id, item.subset) for item in b)

    matches = a_items & b_items
    matches = [([m], [m]) for m in matches]
    a_unmatched = a_items - b_items
    b_unmatched = b_items - a_items
    return matches, a_unmatched, b_unmatched

def match_items_by_image_hash(a, b):
    def _hash(item):
        if not item.image.has_data:
            log.warning("Image (%s, %s) has no image "
                "data, counted as unmatched", item.id, item.subset)
            return None
        return hashlib.md5(item.image.data.tobytes()).hexdigest()

    def _build_hashmap(source):
        d = {}
        for item in source:
            h = _hash(item)
            if h is None:
                h = str(id(item)) # anything unique
            d.setdefault(h, []).append((item.id, item.subset))
        return d

    a_hash = _build_hashmap(a)
    b_hash = _build_hashmap(b)

    a_items = set(a_hash)
    b_items = set(b_hash)

    matches = a_items & b_items
    a_unmatched = a_items - b_items
    b_unmatched = b_items - a_items

    matches = [(a_hash[h], b_hash[h]) for h in matches]
    a_unmatched = set(i for h in a_unmatched for i in a_hash[h])
    b_unmatched = set(i for h in b_unmatched for i in b_hash[h])

    return matches, a_unmatched, b_unmatched

@attrs
class ExactComparator:
    match_images = attrib(kw_only=True, type=bool, default=False)
    ignored_fields = attrib(kw_only=True,
        factory=set, validator=default_if_none(set))
    ignored_attrs = attrib(kw_only=True,
        factory=set, validator=default_if_none(set))
    ignored_item_attrs = attrib(kw_only=True,
        factory=set, validator=default_if_none(set))

    _test = attrib(init=False, type=TestCase)
    errors = attrib(init=False, type=list)

    def __attrs_post_init__(self):
        self._test = TestCase()
        self._test.maxDiff = None


    def _match_items(self, a, b):
        if self.match_images:
            return match_items_by_image_hash(a, b)
        else:
            return match_items_by_id(a, b)

    def _compare_categories(self, a, b):
        test = self._test
        errors = self.errors

        try:
            test.assertEqual(
                sorted(a, key=lambda t: t.value),
                sorted(b, key=lambda t: t.value)
            )
        except AssertionError as e:
            errors.append({'type': 'categories', 'message': str(e)})

        if AnnotationType.label in a:
            try:
                test.assertEqual(
                    a[AnnotationType.label].items,
                    b[AnnotationType.label].items,
                )
            except AssertionError as e:
                errors.append({'type': 'labels', 'message': str(e)})
        if AnnotationType.mask in a:
            try:
                test.assertEqual(
                    a[AnnotationType.mask].colormap,
                    b[AnnotationType.mask].colormap,
                )
            except AssertionError as e:
                errors.append({'type': 'colormap', 'message': str(e)})
        if AnnotationType.points in a:
            try:
                test.assertEqual(
                    a[AnnotationType.points].items,
                    b[AnnotationType.points].items,
                )
            except AssertionError as e:
                errors.append({'type': 'points', 'message': str(e)})

    def _compare_annotations(self, a, b):
        ignored_fields = self.ignored_fields
        ignored_attrs = self.ignored_attrs

        a_fields = { k: None for k in vars(a) if k in ignored_fields }
        b_fields = { k: None for k in vars(b) if k in ignored_fields }
        if 'attributes' not in ignored_fields:
            a_fields['attributes'] = filter_dict(a.attributes, ignored_attrs)
            b_fields['attributes'] = filter_dict(b.attributes, ignored_attrs)

        result = a.wrap(**a_fields) == b.wrap(**b_fields)

        return result

    def _compare_items(self, item_a, item_b):
        test = self._test

        a_id = (item_a.id, item_a.subset)
        b_id = (item_b.id, item_b.subset)

        matched = []
        unmatched = []
        errors = []

        try:
            test.assertEqual(
                filter_dict(item_a.attributes, self.ignored_item_attrs),
                filter_dict(item_b.attributes, self.ignored_item_attrs)
            )
        except AssertionError as e:
            errors.append({'type': 'item_attr',
                'a_item': a_id, 'b_item': b_id, 'message': str(e)})

        b_annotations = item_b.annotations[:]
        for ann_a in item_a.annotations:
            ann_b_candidates = [x for x in item_b.annotations
                if x.type == ann_a.type]

            ann_b = find(enumerate(self._compare_annotations(ann_a, x)
                for x in ann_b_candidates), lambda x: x[1])
            if ann_b is None:
                unmatched.append({
                    'item': a_id, 'source': 'a', 'ann': str(ann_a),
                })
                continue
            else:
                ann_b = ann_b_candidates[ann_b[0]]

            b_annotations.remove(ann_b) # avoid repeats
            matched.append({'a_item': a_id, 'b_item': b_id,
                'a': str(ann_a), 'b': str(ann_b)})

        for ann_b in b_annotations:
            unmatched.append({'item': b_id, 'source': 'b', 'ann': str(ann_b)})

        return matched, unmatched, errors

    def compare_datasets(self, a, b):
        self.errors = []
        errors = self.errors

        self._compare_categories(a.categories(), b.categories())

        matched = []
        unmatched = []

        matches, a_unmatched, b_unmatched = self._match_items(a, b)

        if a.categories().get(AnnotationType.label) != \
           b.categories().get(AnnotationType.label):
            return matched, unmatched, a_unmatched, b_unmatched, errors

        _dist = lambda s: len(s[1]) + len(s[2])
        for a_ids, b_ids in matches:
            # build distance matrix
            match_status = {} # (a_id, b_id): [matched, unmatched, errors]
            a_matches = { a_id: None for a_id in a_ids }
            b_matches = { b_id: None for b_id in b_ids }

            for a_id in a_ids:
                item_a = a.get(*a_id)
                candidates = {}

                for b_id in b_ids:
                    item_b = b.get(*b_id)

                    i_m, i_um, i_err = self._compare_items(item_a, item_b)
                    candidates[b_id] = [i_m, i_um, i_err]

                    if len(i_um) == 0:
                        a_matches[a_id] = b_id
                        b_matches[b_id] = a_id
                        matched.extend(i_m)
                        errors.extend(i_err)
                        break

                match_status[a_id] = candidates

            # assign
            for a_id in a_ids:
                if len(b_ids) == 0:
                    break

                # find the closest, ignore already assigned
                matched_b = a_matches[a_id]
                if matched_b is not None:
                    continue
                min_dist = -1
                for b_id in b_ids:
                    if b_matches[b_id] is not None:
                        continue
                    d = _dist(match_status[a_id][b_id])
                    if d < min_dist and 0 <= min_dist:
                        continue
                    min_dist = d
                    matched_b = b_id

                if matched_b is None:
                    continue
                a_matches[a_id] = matched_b
                b_matches[matched_b] = a_id

                m = match_status[a_id][matched_b]
                matched.extend(m[0])
                unmatched.extend(m[1])
                errors.extend(m[2])

            a_unmatched |= set(a_id for a_id, m in a_matches.items() if not m)
            b_unmatched |= set(b_id for b_id, m in b_matches.items() if not m)

        return matched, unmatched, a_unmatched, b_unmatched, errors