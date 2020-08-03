
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import logging as log
from copy import deepcopy

import cv2
import numpy as np

from datumaro.components.extractor import AnnotationType


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
