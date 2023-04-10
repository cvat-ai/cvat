# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
from datetime import datetime
from enum import Enum
import json
import sys
from typing import List
from attrs import asdict, define, field

import datumaro as dm


class AnnotationConflictType(str, Enum):
    MISSING_ANNOTATION = 'missing_annotation'
    EXTRA_ANNOTATION = 'extra_annotation'
    MISMATCHING_ANNOTATION = 'mismatching_annotation'

    def __str__(self) -> str:
        return self.value


@define(kw_only=True)
class AnnotationId:
    # TODO: think if uuids can be provided
    type: str
    id: int

    def to_dict(self) -> dict:
        return asdict(self)


@define(kw_only=True)
class AnnotationConflict:
    frame_id: int
    type: AnnotationConflictType
    annotation_ids: List[AnnotationId] = field(factory=list)
    message: str

    def to_dict(self) -> dict:
        return asdict(self)


@define(kw_only=True)
class AnnotationConflictsReport:
    job_id: int
    job_last_updated: datetime
    gt_job_last_updated: datetime
    conflicts: List[AnnotationConflict]

    def to_dict(self) -> dict:
        return asdict(self)


class _DistanceComparator(dm.ops.DistanceComparator):
    def match_annotations(self, item_a, item_b):
        return {t: self._match_ann_type(t, item_a, item_b) for t in dm.AnnotationType}

    def _match_ann_type(self, t, *args):
        # pylint: disable=no-value-for-parameter
        if t == dm.AnnotationType.label:
            return self.match_labels(*args)
        elif t == dm.AnnotationType.bbox:
            return self.match_boxes(*args)
        elif t == dm.AnnotationType.polygon:
            return self.match_polygons(*args)
        elif t == dm.AnnotationType.mask:
            return self.match_masks(*args)
        elif t == dm.AnnotationType.points:
            return self.match_points(*args)
        elif t == dm.AnnotationType.polyline:
            return self.match_lines(*args)
        # pylint: enable=no-value-for-parameter
        else:
            return None

class DatasetComparator:
    def __init__(self,
        this_dataset: dm.Dataset,
        gt_dataset: dm.Dataset
    ) -> None:
        self._this_dataset = this_dataset
        self._gt_dataset = gt_dataset
        self._comparator = _DistanceComparator()

    def _dm_ann_to_ann_id(self, ann: dm.Annotation, item: dm.DatasetItem, dataset: dm.Dataset):
        if dataset is self._this_dataset:
            source = 'this'
        else:
            source = 'gt'

        ann_idx = item.annotations.index(ann)

        return AnnotationId(type=source, id=ann_idx)

    def find_gt_conflicts(self) -> List[AnnotationConflict]:
        this_job_dataset = self._this_dataset
        gt_job_dataset = self._gt_dataset

        conflicts = []
        for gt_item in gt_job_dataset:
            this_item = this_job_dataset.get(gt_item.id)
            if not this_item:
                continue # we need to compare only intersecting frames

            frame_id = this_item.id
            frame_results = self._comparator.match_annotations(gt_item, this_item)

            conflicts.extend(self._generate_frame_annotation_conflicts(
                frame_id, frame_results, this_item, gt_item
            ))

        return conflicts

    def _generate_frame_annotation_conflicts(
        self, frame_id: int, frame_results, this_item, gt_item
    ) -> List[AnnotationConflict]:
        conflicts = []

        merged_results = [[], [], [], []]
        for shape_type in [
            dm.AnnotationType.bbox, dm.AnnotationType.mask,
            dm.AnnotationType.points, dm.AnnotationType.polygon, dm.AnnotationType.polyline
        ]:
            for merged_field, field in zip(merged_results, frame_results[shape_type]):
                merged_field.extend(field)

        _, mispred, gt_unmatched, this_unmatched = merged_results

        for unmatched_ann in gt_unmatched:
            conflicts.append(AnnotationConflict(
                frame_id=frame_id,
                type=AnnotationConflictType.MISSING_ANNOTATION,
                data={
                    'annotation_ids': [
                        self._dm_ann_to_ann_id(unmatched_ann, gt_item, self._gt_dataset)
                    ]
                },
            ))

        for unmatched_ann in this_unmatched:
            conflicts.append(AnnotationConflict(
                frame_id=frame_id,
                type=AnnotationConflictType.EXTRA_ANNOTATION,
                data={
                    'annotation_ids': [
                        self._dm_ann_to_ann_id(unmatched_ann, this_item, self._this_dataset)
                    ]
                },
            ))

        for gt_ann, this_ann in mispred:
            conflicts.append(AnnotationConflict(
                frame_id=frame_id,
                type=AnnotationConflictType.MISMATCHING_ANNOTATION,
                data={
                    'annotation_ids': [
                        self._dm_ann_to_ann_id(this_ann, this_item, self._this_dataset),
                        self._dm_ann_to_ann_id(gt_ann, gt_item, self._gt_dataset),
                        ],
                    'kind': 'mismatching_label',
                    'value1': gt_ann.label,
                    'value2': this_ann.label,
                },
            ))

        # TODO: Need to check for mismatching attributes
        # for gt_ann, this_ann in matches:
        #
        #     conflicts.append(AnnotationConflict(
        #         frame_id=gt_job_data_provider.dm_item_id_to_frame_id(error.item_id),
        #         type=AnnotationConflictType.MISMATCHING_ANNOTATION,
        #         data={
        #             'kind': 'mismatching_shape_attribute',
        #             'attribute': error.key,
        #             'value1': error.a,
        #             'value2': error.b,
        #         },
        #         message=str(error)
        #     ))

        return conflicts

def main(args=None):
    parser = argparse.ArgumentParser()
    args = parser.parse_args(args)

    this_dataset = dm.Dataset.import_from(args.this_dataset)
    other_dataset = dm.Dataset.import_from(args.gt_dataset)

    conflicts = DatasetComparator(this_dataset, other_dataset).find_gt_conflicts()

    with open(args.output_file, 'w') as f:
        json.dump(conflicts, f)

    return 0

if __name__ == '__main__':
    sys.exit(main())