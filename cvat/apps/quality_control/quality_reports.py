# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import itertools
from collections import Counter
from collections.abc import Hashable
from contextlib import suppress
from copy import deepcopy
from functools import cached_property

import datumaro as dm
import numpy as np
from datumaro.util import dump_json
from django.db import transaction
from django.db.models import OuterRef, Subquery, prefetch_related_objects

from cvat.apps.dataset_manager.bindings import (
    CommonData,
    CvatToDmAnnotationConverter,
    GetCVATDataExtractor,
    JobData,
    match_dm_item,
)
from cvat.apps.dataset_manager.formats.registry import dm_env
from cvat.apps.dataset_manager.task import JobAnnotation
from cvat.apps.engine import serializers as engine_serializers
from cvat.apps.engine.filters import JsonLogicFilter
from cvat.apps.engine.frame_provider import TaskFrameProvider
from cvat.apps.engine.model_utils import bulk_create
from cvat.apps.engine.models import (
    Image,
    Job,
    JobType,
    Project,
    StageChoice,
    StateChoice,
    Task,
    User,
    ValidationMode,
)
from cvat.apps.engine.utils import take_by
from cvat.apps.quality_control import models
from cvat.apps.quality_control.annotation_matching import Comparator, LineMatcher
from cvat.apps.quality_control.comparison_report import (
    AnnotationConflict,
    AnnotationId,
    ComparisonParameters,
    ComparisonReport,
    ComparisonReportAnnotationComponentsSummary,
    ComparisonReportAnnotationLabelSummary,
    ComparisonReportAnnotationShapeSummary,
    ComparisonReportAnnotationsSummary,
    ComparisonReportFrameSummary,
    ComparisonReportJobStats,
    ComparisonReportSummary,
    ComparisonReportTaskStats,
    ConfusionMatrix,
)
from cvat.apps.quality_control.models import (
    AnnotationConflictSeverity,
    AnnotationConflictType,
    AnnotationType,
)
from cvat.apps.quality_control.utils import array_safe_divide


class _MemoizingAnnotationConverterFactory:
    def __init__(self):
        self._annotation_mapping = {}  # dm annotation -> cvat annotation

    def remember_conversion(self, cvat_ann, dm_anns):
        for dm_ann in dm_anns:
            self._annotation_mapping[self._make_key(dm_ann)] = cvat_ann

    def _make_key(self, dm_ann: dm.Annotation) -> Hashable:
        return id(dm_ann)

    def get_source_ann(self, dm_ann: dm.Annotation) -> CommonData.Tag | CommonData.LabeledShape:
        "Retrieve the original CVAT annotation for a Datumaro annotation"
        return self._annotation_mapping[self._make_key(dm_ann)]

    def clear(self):
        self._annotation_mapping.clear()

    def __call__(self, *args, **kwargs) -> list[dm.Annotation]:
        converter = _MemoizingAnnotationConverter(*args, factory=self, **kwargs)
        return converter.convert()


class _MemoizingAnnotationConverter(CvatToDmAnnotationConverter):
    def __init__(self, *args, factory: _MemoizingAnnotationConverterFactory, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._factory = factory

    def _convert_tag(self, tag):
        converted = list(super()._convert_tag(tag))
        for dm_ann in converted:
            dm_ann.id = tag.id

        self._factory.remember_conversion(tag, converted)
        return converted

    def _convert_shape(self, shape, *, index):
        converted = list(super()._convert_shape(shape, index=index))
        for dm_ann in converted:
            dm_ann.id = shape.id

        self._factory.remember_conversion(shape, converted)
        return converted


class JobDataProvider:
    @classmethod
    def add_prefetch_info(cls, queryset):
        return JobAnnotation.add_prefetch_info(queryset)

    @transaction.atomic
    def __init__(self, job_id: int, *, queryset=None, included_frames=None) -> None:
        self.job_id = job_id
        self.job_annotation = JobAnnotation(job_id, queryset=queryset)
        self.job_annotation.init_from_db()
        self.job_data = JobData(
            annotation_ir=self.job_annotation.ir_data,
            db_job=self.job_annotation.db_job,
            use_server_track_ids=True,
            included_frames=included_frames,
        )

        self._annotation_memo = _MemoizingAnnotationConverterFactory()

    @cached_property
    def dm_dataset(self):
        extractor = GetCVATDataExtractor(self.job_data, convert_annotations=self._annotation_memo)
        return dm.Dataset.from_extractors(extractor, env=dm_env)

    def dm_item_id_to_frame_id(self, item: dm.DatasetItem) -> int:
        return match_dm_item(item, self.job_data)

    def dm_ann_to_ann_id(self, ann: dm.Annotation) -> AnnotationId:
        source_ann = self._annotation_memo.get_source_ann(ann)
        if "track_id" in ann.attributes:
            source_ann_id = source_ann.track_id
            ann_type = AnnotationType.TRACK
            shape_type = source_ann.type
        else:
            if isinstance(source_ann, CommonData.LabeledShape):
                ann_type = AnnotationType.SHAPE
                shape_type = source_ann.type
            elif isinstance(source_ann, CommonData.Tag):
                ann_type = AnnotationType.TAG
                shape_type = None
            else:
                assert False

            source_ann_id = source_ann.id

        return AnnotationId(
            obj_id=source_ann_id, type=ann_type, shape_type=shape_type, job_id=self.job_id
        )


class DatasetComparator:
    DEFAULT_SETTINGS = ComparisonParameters()

    def __init__(
        self,
        ds_data_provider: JobDataProvider,
        gt_data_provider: JobDataProvider,
        *,
        settings: ComparisonParameters | None = None,
    ) -> None:
        if settings is None:
            settings = self.DEFAULT_SETTINGS
        self.settings = settings

        self._ds_data_provider = ds_data_provider
        self._gt_data_provider = gt_data_provider
        self._ds_dataset = self._ds_data_provider.dm_dataset
        self._gt_dataset = self._gt_data_provider.dm_dataset

        self._frame_results: dict[int, ComparisonReportFrameSummary] = {}

        self.comparator = Comparator(self._gt_dataset.categories(), settings=settings)

    def _dm_item_to_frame_id(self, item: dm.DatasetItem, dataset: dm.Dataset) -> int:
        if dataset is self._ds_dataset:
            source_data_provider = self._ds_data_provider
        elif dataset is self._gt_dataset:
            source_data_provider = self._gt_data_provider
        else:
            assert False

        return source_data_provider.dm_item_id_to_frame_id(item)

    def _dm_ann_to_ann_id(self, ann: dm.Annotation, dataset: dm.Dataset):
        if dataset is self._ds_dataset:
            source_data_provider = self._ds_data_provider
        elif dataset is self._gt_dataset:
            source_data_provider = self._gt_data_provider
        else:
            assert False

        return source_data_provider.dm_ann_to_ann_id(ann)

    def _get_total_frames(self) -> int:
        return len(self._ds_data_provider.job_data)

    def _find_gt_conflicts(self):
        ds_job_dataset = self._ds_dataset
        gt_job_dataset = self._gt_dataset

        for gt_item in gt_job_dataset:
            ds_item = ds_job_dataset.get(id=gt_item.id, subset=gt_item.subset)
            if not ds_item:
                continue  # we need to compare only intersecting frames

            self._process_frame(ds_item, gt_item)

    def _process_frame(
        self, ds_item: dm.DatasetItem, gt_item: dm.DatasetItem
    ) -> list[AnnotationConflict]:
        frame_id = self._dm_item_to_frame_id(ds_item, self._ds_dataset)

        frame_results = self.comparator.match_annotations(gt_item, ds_item)
        self._frame_results.setdefault(frame_id, {})

        self._generate_frame_annotation_conflicts(
            frame_id, frame_results, gt_item=gt_item, ds_item=ds_item
        )

    def _generate_frame_annotation_conflicts(
        self, frame_id: str, frame_results, *, gt_item: dm.DatasetItem, ds_item: dm.DatasetItem
    ) -> list[AnnotationConflict]:
        conflicts = []

        matches, mismatches, gt_unmatched, ds_unmatched, _ = frame_results["all_ann_types"]
        (
            shape_matches,
            shape_mismatches,
            shape_gt_unmatched,
            shape_ds_unmatched,
            shape_pairwise_distances,
        ) = frame_results["all_shape_ann_types"]

        def _get_similarity(gt_ann: dm.Annotation, ds_ann: dm.Annotation) -> float | None:
            return self.comparator.get_distance(shape_pairwise_distances, gt_ann, ds_ann)

        _matched_shapes = set(
            id(shape)
            for shape_pair in itertools.chain(shape_matches, shape_mismatches)
            for shape in shape_pair
        )

        def _find_closest_unmatched_shape(shape: dm.Annotation):
            this_shape_id = id(shape)

            this_shape_distances = []

            for (gt_shape_id, ds_shape_id), dist in shape_pairwise_distances.items():
                if gt_shape_id == this_shape_id:
                    other_shape_id = ds_shape_id
                elif ds_shape_id == this_shape_id:
                    other_shape_id = gt_shape_id
                else:
                    continue

                this_shape_distances.append((other_shape_id, dist))

            matched_ann, distance = max(this_shape_distances, key=lambda v: v[1], default=(None, 0))
            return matched_ann, distance

        for gt_ann, ds_ann in itertools.chain(matches, mismatches):
            similarity = _get_similarity(gt_ann, ds_ann)
            if similarity and similarity < self.settings.low_overlap_threshold:
                conflicts.append(
                    AnnotationConflict(
                        frame_id=frame_id,
                        type=AnnotationConflictType.LOW_OVERLAP,
                        annotation_ids=[
                            self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                            self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                        ],
                    )
                )

        for unmatched_ann in gt_unmatched:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.MISSING_ANNOTATION,
                    annotation_ids=[self._dm_ann_to_ann_id(unmatched_ann, self._gt_dataset)],
                )
            )

        for unmatched_ann in ds_unmatched:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.EXTRA_ANNOTATION,
                    annotation_ids=[self._dm_ann_to_ann_id(unmatched_ann, self._ds_dataset)],
                )
            )

        for gt_ann, ds_ann in mismatches:
            conflicts.append(
                AnnotationConflict(
                    frame_id=frame_id,
                    type=AnnotationConflictType.MISMATCHING_LABEL,
                    annotation_ids=[
                        self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                        self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                    ],
                )
            )

        resulting_distances = [
            _get_similarity(shape_gt_ann, shape_ds_ann)
            for shape_gt_ann, shape_ds_ann in itertools.chain(shape_matches, shape_mismatches)
        ]

        for shape_unmatched_ann in itertools.chain(shape_gt_unmatched, shape_ds_unmatched):
            shape_matched_ann_id, similarity = _find_closest_unmatched_shape(shape_unmatched_ann)
            if shape_matched_ann_id is not None:
                _matched_shapes.add(shape_matched_ann_id)
            resulting_distances.append(similarity)

        resulting_distances = [
            sim if sim is not None and (sim >= 0) else 0 for sim in resulting_distances
        ]

        mean_iou = np.mean(resulting_distances) if resulting_distances else 0

        if (
            self.settings.compare_line_orientation
            and dm.AnnotationType.polyline in self.comparator.included_ann_types
        ):
            # Check line directions
            line_matcher = LineMatcher(
                torso_r=self.settings.line_thickness,
                oriented=True,
                scale=np.prod(gt_item.media_as(dm.Image).size),
            )

            for gt_ann, ds_ann in itertools.chain(matches, mismatches):
                if gt_ann.type != ds_ann.type or gt_ann.type != dm.AnnotationType.polyline:
                    continue

                non_oriented_distance = _get_similarity(gt_ann, ds_ann)
                oriented_distance = line_matcher.distance(gt_ann, ds_ann)

                # need to filter computation errors from line approximation
                # and (almost) orientation-independent cases
                if (
                    non_oriented_distance - oriented_distance
                    > self.settings.line_orientation_threshold
                ):
                    conflicts.append(
                        AnnotationConflict(
                            frame_id=frame_id,
                            type=AnnotationConflictType.MISMATCHING_DIRECTION,
                            annotation_ids=[
                                self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                                self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                            ],
                        )
                    )

        if self.settings.check_covered_annotations:
            ds_covered_anns = self.comparator.find_covered(ds_item)

            for ds_ann in ds_covered_anns:
                conflicts.append(
                    AnnotationConflict(
                        frame_id=frame_id,
                        type=AnnotationConflictType.COVERED_ANNOTATION,
                        annotation_ids=[
                            self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                        ],
                    )
                )

        if self.settings.compare_attributes:
            for gt_ann, ds_ann in matches:
                attribute_results = self.comparator.match_attrs(gt_ann, ds_ann)
                if any(attribute_results[1:]):
                    conflicts.append(
                        AnnotationConflict(
                            frame_id=frame_id,
                            type=AnnotationConflictType.MISMATCHING_ATTRIBUTES,
                            annotation_ids=[
                                self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                                self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                            ],
                        )
                    )

        if self.settings.compare_groups:
            gt_groups, gt_group_map = self.comparator.find_groups(gt_item)
            ds_groups, ds_group_map = self.comparator.find_groups(ds_item)
            shape_matched_objects = shape_matches + shape_mismatches
            ds_to_gt_groups = self.comparator.match_groups(
                gt_groups, ds_groups, shape_matched_objects
            )

            for gt_ann, ds_ann in shape_matched_objects:
                gt_group = gt_groups.get(gt_group_map[id(gt_ann)], [gt_ann])
                ds_group = ds_groups.get(ds_group_map[id(ds_ann)], [ds_ann])
                ds_gt_group = ds_to_gt_groups.get(ds_group_map[id(ds_ann)], None)

                if (
                    # Check ungrouped objects
                    (len(gt_group) == 1 and len(ds_group) != 1)
                    or
                    # Check grouped objects
                    ds_gt_group != gt_group_map[id(gt_ann)]
                ):
                    conflicts.append(
                        AnnotationConflict(
                            frame_id=frame_id,
                            type=AnnotationConflictType.MISMATCHING_GROUPS,
                            annotation_ids=[
                                self._dm_ann_to_ann_id(ds_ann, self._ds_dataset),
                                self._dm_ann_to_ann_id(gt_ann, self._gt_dataset),
                            ],
                        )
                    )

        valid_shapes_count = len(shape_matches) + len(shape_mismatches)
        missing_shapes_count = len(shape_gt_unmatched)
        extra_shapes_count = len(shape_ds_unmatched)
        total_shapes_count = (
            len(shape_matches)
            + len(shape_mismatches)
            + len(shape_gt_unmatched)
            + len(shape_ds_unmatched)
        )
        ds_shapes_count = len(shape_matches) + len(shape_mismatches) + len(shape_ds_unmatched)
        gt_shapes_count = len(shape_matches) + len(shape_mismatches) + len(shape_gt_unmatched)

        valid_labels_count = len(matches)
        invalid_labels_count = len(mismatches)
        total_labels_count = valid_labels_count + invalid_labels_count

        confusion_matrix_labels, confusion_matrix, label_id_map = self._make_zero_confusion_matrix()
        for gt_ann, ds_ann in itertools.chain(
            # fully matched annotations - shape, label, attributes
            matches,
            mismatches,
            zip(itertools.repeat(None), ds_unmatched),
            zip(gt_unmatched, itertools.repeat(None)),
        ):
            ds_label_idx = label_id_map[ds_ann.label] if ds_ann else self._UNMATCHED_IDX
            gt_label_idx = label_id_map[gt_ann.label] if gt_ann else self._UNMATCHED_IDX
            confusion_matrix[ds_label_idx, gt_label_idx] += 1

        if self.settings.empty_is_annotated:
            # Add virtual annotations for empty frames
            if not gt_item.annotations and not ds_item.annotations:
                valid_labels_count = 1
                total_labels_count = 1

                valid_shapes_count = 1
                total_shapes_count = 1

            if not ds_item.annotations:
                ds_shapes_count = 1

            if not gt_item.annotations:
                gt_shapes_count = 1

        self._frame_results[frame_id] = ComparisonReportFrameSummary(
            annotations=self._generate_frame_annotations_summary(
                confusion_matrix, confusion_matrix_labels
            ),
            annotation_components=ComparisonReportAnnotationComponentsSummary(
                shape=ComparisonReportAnnotationShapeSummary(
                    valid_count=valid_shapes_count,
                    missing_count=missing_shapes_count,
                    extra_count=extra_shapes_count,
                    total_count=total_shapes_count,
                    ds_count=ds_shapes_count,
                    gt_count=gt_shapes_count,
                    mean_iou=mean_iou,
                ),
                label=ComparisonReportAnnotationLabelSummary(
                    valid_count=valid_labels_count,
                    invalid_count=invalid_labels_count,
                    total_count=total_labels_count,
                ),
            ),
            conflicts=conflicts,
        )

        return conflicts

    # row/column index in the confusion matrix corresponding to unmatched annotations
    _UNMATCHED_IDX = -1

    def _make_zero_confusion_matrix(self) -> tuple[list[str], np.ndarray, dict[int, int]]:
        label_id_idx_map = {}
        label_names = []
        for label_id, label in enumerate(self._gt_dataset.categories()[dm.AnnotationType.label]):
            if not label.parent:
                label_id_idx_map[label_id] = len(label_names)
                label_names.append(label.name)

        label_names.append("unmatched")

        num_labels = len(label_names)
        confusion_matrix = np.zeros((num_labels, num_labels), dtype=int)

        return label_names, confusion_matrix, label_id_idx_map

    def _compute_annotations_summary(
        self, confusion_matrix: np.ndarray, confusion_matrix_labels: list[str]
    ) -> ComparisonReportAnnotationsSummary:
        matched_ann_counts = np.diag(confusion_matrix)
        ds_ann_counts = np.sum(confusion_matrix, axis=1)
        gt_ann_counts = np.sum(confusion_matrix, axis=0)
        total_annotations_count = np.sum(confusion_matrix)

        label_jaccard_indices = array_safe_divide(
            matched_ann_counts, ds_ann_counts + gt_ann_counts - matched_ann_counts
        )
        label_precisions = array_safe_divide(matched_ann_counts, ds_ann_counts)
        label_recalls = array_safe_divide(matched_ann_counts, gt_ann_counts)
        label_accuracies = (
            total_annotations_count  # TP + TN + FP + FN
            - (ds_ann_counts - matched_ann_counts)  # - FP
            - (gt_ann_counts - matched_ann_counts)  # - FN
            # ... = TP + TN
        ) / (total_annotations_count or 1)

        valid_annotations_count = np.sum(matched_ann_counts)
        missing_annotations_count = np.sum(confusion_matrix[self._UNMATCHED_IDX, :])
        extra_annotations_count = np.sum(confusion_matrix[:, self._UNMATCHED_IDX])
        ds_annotations_count = np.sum(ds_ann_counts[: self._UNMATCHED_IDX])
        gt_annotations_count = np.sum(gt_ann_counts[: self._UNMATCHED_IDX])

        return ComparisonReportAnnotationsSummary(
            valid_count=valid_annotations_count,
            missing_count=missing_annotations_count,
            extra_count=extra_annotations_count,
            total_count=total_annotations_count,
            ds_count=ds_annotations_count,
            gt_count=gt_annotations_count,
            confusion_matrix=ConfusionMatrix(
                labels=confusion_matrix_labels,
                rows=confusion_matrix,
                precision=label_precisions,
                recall=label_recalls,
                accuracy=label_accuracies,
                jaccard_index=label_jaccard_indices,
            ),
        )

    def _generate_frame_annotations_summary(
        self, confusion_matrix: np.ndarray, confusion_matrix_labels: list[str]
    ) -> ComparisonReportAnnotationsSummary:
        summary = self._compute_annotations_summary(confusion_matrix, confusion_matrix_labels)

        if self.settings.empty_is_annotated:
            # Add virtual annotations for empty frames
            if not summary.total_count:
                summary.valid_count = 1
                summary.total_count = 1

            if not summary.ds_count:
                summary.ds_count = 1

            if not summary.gt_count:
                summary.gt_count = 1

        return summary

    def _generate_dataset_annotations_summary(
        self, frame_summaries: dict[int, ComparisonReportFrameSummary]
    ) -> tuple[ComparisonReportAnnotationsSummary, ComparisonReportAnnotationComponentsSummary]:
        # accumulate stats
        annotation_components = ComparisonReportAnnotationComponentsSummary(
            shape=ComparisonReportAnnotationShapeSummary(
                valid_count=0,
                missing_count=0,
                extra_count=0,
                total_count=0,
                ds_count=0,
                gt_count=0,
                mean_iou=0,
            ),
            label=ComparisonReportAnnotationLabelSummary(
                valid_count=0,
                invalid_count=0,
                total_count=0,
            ),
        )
        mean_ious = []
        empty_gt_frames = set()
        empty_ds_frames = set()
        confusion_matrix_labels, confusion_matrix, _ = self._make_zero_confusion_matrix()

        for frame_id, frame_result in frame_summaries.items():
            confusion_matrix += frame_result.annotations.confusion_matrix.rows

            if self.settings.empty_is_annotated and not np.any(
                frame_result.annotations.confusion_matrix.rows[
                    np.triu_indices_from(frame_result.annotations.confusion_matrix.rows)
                ]
            ):
                empty_ds_frames.add(frame_id)

            if self.settings.empty_is_annotated and not np.any(
                frame_result.annotations.confusion_matrix.rows[
                    np.tril_indices_from(frame_result.annotations.confusion_matrix.rows)
                ]
            ):
                empty_gt_frames.add(frame_id)

            if annotation_components is None:
                annotation_components = deepcopy(frame_result.annotation_components)
            else:
                annotation_components.accumulate(frame_result.annotation_components)

            mean_ious.append(frame_result.annotation_components.shape.mean_iou)

        annotation_summary = self._compute_annotations_summary(
            confusion_matrix, confusion_matrix_labels
        )

        if self.settings.empty_is_annotated:
            # Add virtual annotations for empty frames,
            # they are not included in the confusion matrix
            annotation_summary.valid_count += len(empty_ds_frames & empty_gt_frames)
            annotation_summary.total_count += len(empty_ds_frames | empty_gt_frames)
            annotation_summary.ds_count += len(empty_ds_frames)
            annotation_summary.gt_count += len(empty_gt_frames)

        # Cannot be computed in accumulate()
        annotation_components.shape.mean_iou = np.mean(mean_ious or [])

        return annotation_summary, annotation_components

    def generate_report(self) -> ComparisonReport:
        self._find_gt_conflicts()

        intersection_frames = []
        conflicts = []
        for frame_id, frame_result in self._frame_results.items():
            intersection_frames.append(frame_id)
            conflicts += frame_result.conflicts

        annotation_summary, annotations_component_summary = (
            self._generate_dataset_annotations_summary(self._frame_results)
        )

        conflicts_by_severity = Counter(c.severity for c in conflicts)
        return ComparisonReport(
            parameters=self.settings,
            comparison_summary=ComparisonReportSummary(
                frames=intersection_frames,
                total_frames=self._get_total_frames(),
                conflict_count=len(conflicts),
                warning_count=conflicts_by_severity.get(AnnotationConflictSeverity.WARNING, 0),
                error_count=conflicts_by_severity.get(AnnotationConflictSeverity.ERROR, 0),
                conflicts_by_type=Counter(c.type for c in conflicts),
                annotations=annotation_summary,
                annotation_components=annotations_component_summary,
                tasks=None,
                jobs=None,
            ),
            frame_results=self._frame_results,
        )


class QualitySettingsManager:
    def get_project_settings(self, project: Project) -> models.QualitySettings:
        return project.quality_settings

    def get_task_settings(self, task: Task, *, inherit: bool = True) -> models.QualitySettings:
        quality_settings = task.quality_settings

        if inherit and quality_settings.inherit and task.project:
            quality_settings = self.get_project_settings(task.project)

        return quality_settings


_DEFAULT_FETCH_CHUNK_SIZE = 1000


class TaskQualityCalculator:
    # JSON filter lookups
    JOB_FILTER_LOOKUPS = {
        "id": "id",
        "type": "type",
        "state": "state",
        "stage": "stage",
        "assignee": "assignee__username",
        "task_id": "segment__task__id",
        "task_name": "segment__task__name",
    }

    def compute_report(self, task: Task | int) -> models.QualityReport | None:
        with transaction.atomic():
            # Preload all the required data for computations.
            # Ideally, we would lock the task to fetch all the data and produce
            # consistent report. However, data fetching can also take long time.
            # For this reason, we don't guarantee absolute consistency.
            if isinstance(task, int):
                task = Task.objects.select_related("data").get(id=task)

            # The GT job could have been removed or marked incomplete during scheduling,
            # so we need to check it
            gt_job_id = (
                Job.objects.filter(
                    segment__task=task,
                    type=JobType.GROUND_TRUTH,
                    state=StateChoice.COMPLETED,
                    stage=StageChoice.ACCEPTANCE,
                )
                .values_list("id", flat=True)
                .first()
            )
            if not gt_job_id:
                return None

            quality_params = self.get_quality_params(task)

            all_job_ids: set[int] = set(
                Job.objects.filter(segment__task=task)
                .exclude(type=JobType.GROUND_TRUTH)
                .values_list("id", flat=True)
            )

            job_filter = JsonLogicFilter()
            if job_filter_rules := job_filter.parse_query(
                quality_params.job_filter or "[]", raise_on_empty=False
            ):
                job_queryset = job_filter.apply_filter(
                    Job.objects,
                    parsed_rules=job_filter_rules,
                    lookup_fields=self.JOB_FILTER_LOOKUPS,
                )
                filtered_job_ids: set[int] = set(
                    job_id
                    for ids_chunk in take_by(all_job_ids, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE)
                    for job_id in job_queryset.filter(id__in=ids_chunk).values_list("id", flat=True)
                )
            else:
                filtered_job_ids = set(all_job_ids)

            # TODO: Probably, can be optimized to this:
            # - task updated (the gt job, frame set or labels changed) -> everything is computed
            # - job updated -> job report is computed
            #   old reports can be reused in this case

            # Try to use a shared queryset to minimize DB requests
            job_queryset = Job.objects.select_related("segment").filter(segment__task=task)

            # Add prefetch data to the shared queryset
            # All the jobs / segments share the same task, so we can load it just once.
            # We reuse the same object for better memory use (OOM is possible otherwise).
            # Perform manual "join", since django can't do this.
            gt_job = JobDataProvider.add_prefetch_info(job_queryset).get(id=gt_job_id)

            jobs: dict[int, Job] = [j for j in job_queryset if j.id in filtered_job_ids]
            for job in job_queryset:
                job.segment.task = gt_job.segment.task  # put the prefetched object

            gt_job_data_provider = JobDataProvider(gt_job.id, queryset=job_queryset)
            active_validation_frames = gt_job_data_provider.job_data.get_included_frames()

            validation_layout = task.data.validation_layout
            if validation_layout.mode == ValidationMode.GT_POOL:
                task_frame_provider = TaskFrameProvider(task)
                active_validation_frames = set(
                    task_frame_provider.get_rel_frame_number(abs_frame)
                    for abs_frame, abs_real_frame in (
                        Image.objects.filter(data=task.data, is_placeholder=True)
                        .values_list("frame", "real_frame")
                        .iterator(chunk_size=_DEFAULT_FETCH_CHUNK_SIZE)
                    )
                    if task_frame_provider.get_rel_frame_number(abs_real_frame)
                    in active_validation_frames
                )

            job_data_providers = {
                job.id: JobDataProvider(
                    job.id,
                    queryset=job_queryset,
                    included_frames=active_validation_frames,
                )
                for job in jobs
            }

        job_comparison_reports: dict[int, ComparisonReport] = {}
        for job in jobs:
            if job.id not in filtered_job_ids:
                continue

            job_data_provider = job_data_providers[job.id]
            comparator = DatasetComparator(
                job_data_provider,
                gt_job_data_provider,
                settings=quality_params,
            )
            job_comparison_reports[job.id] = comparator.generate_report()

            # Release resources
            del job_data_provider.dm_dataset

        task_comparison_report = self._compute_task_report(
            job_comparison_reports,
            quality_params,
            all_job_ids=all_job_ids,
        )

        with transaction.atomic():
            job_quality_reports = {}
            for job in jobs:
                job_comparison_report = job_comparison_reports[job.id]
                job_report = dict(
                    job=job,
                    target_last_updated=job.updated_date,
                    gt_last_updated=gt_job.updated_date,
                    assignee_id=job.assignee_id,
                    assignee_last_updated=job.assignee_updated_date,
                    data=job_comparison_report.to_json(),
                    conflicts=[c.to_dict() for c in job_comparison_report.conflicts],
                )

                job_quality_reports[job.id] = job_report

            task_report = self._save_reports(
                task_report=dict(
                    task=task,
                    target_last_updated=task.updated_date,
                    gt_last_updated=gt_job.updated_date,
                    assignee_id=task.assignee_id,
                    assignee_last_updated=task.assignee_updated_date,
                    data=task_comparison_report.to_json(),
                    conflicts=[],  # the task doesn't have own conflicts
                ),
                job_reports=list(job_quality_reports.values()),
            )

        return task_report

    def _compute_task_report(
        self,
        job_reports: dict[int, ComparisonReport],
        comparison_parameters: ComparisonParameters,
        *,
        all_job_ids: set[int],
    ) -> ComparisonReport:
        # Accumulate job stats
        job_stats = ComparisonReportJobStats.create_empty()
        job_stats.all.update(all_job_ids)
        job_stats.excluded.update(all_job_ids - job_reports.keys())
        job_stats.not_checkable.update(
            jid for jid, r in job_reports.items() if not r.comparison_summary.frame_count
        )

        # The task dataset can be different from any jobs' dataset because of frame overlaps
        # between jobs, from which annotations are merged to get the task annotations.
        # Thus, a separate report could be computed for the task. Instead, here we only
        # compute the combined summary of the job reports.
        # It's possible that overlapped frames checked more than once, ignore extra checks
        # in this statistics and results.
        task_validated_frames = set()
        task_validation_frames_count = 0  # in included and non-checkable jobs
        task_total_frames = 0  # in included and non-checkable jobs
        task_conflicts: list[AnnotationConflict] = []
        task_annotations_summary = ComparisonReportAnnotationsSummary.create_empty()
        task_ann_components_summary = ComparisonReportAnnotationComponentsSummary.create_empty()
        task_mean_shape_ious = []
        task_frame_results: dict[int, ComparisonReportFrameSummary] = {}
        task_frame_results_counts = {}
        for r in job_reports.values():
            task_validated_frames.update(r.comparison_summary.frames)
            task_validation_frames_count += r.comparison_summary.frame_count
            task_total_frames += r.comparison_summary.total_frames
            task_conflicts.extend(r.conflicts)

            task_annotations_summary.accumulate(r.comparison_summary.annotations)
            task_ann_components_summary.accumulate(r.comparison_summary.annotation_components)
            task_mean_shape_ious.append(task_ann_components_summary.shape.mean_iou)

            for frame_id, job_frame_result in r.frame_results.items():
                task_frame_result = task_frame_results.get(frame_id)
                frame_results_count = task_frame_results_counts.get(frame_id, 0)

                if task_frame_result is None:
                    task_frame_result = deepcopy(job_frame_result)
                else:
                    task_frame_result.conflicts += job_frame_result.conflicts

                    task_frame_result.annotations.accumulate(job_frame_result.annotations)
                    task_frame_result.annotation_components.accumulate(
                        job_frame_result.annotation_components
                    )

                    task_frame_result.annotation_components.shape.mean_iou = (
                        task_frame_result.annotation_components.shape.mean_iou * frame_results_count
                        + job_frame_result.annotation_components.shape.mean_iou
                    ) / (frame_results_count + 1)

                task_frame_results_counts[frame_id] = 1 + frame_results_count
                task_frame_results[frame_id] = task_frame_result

        task_ann_components_summary.shape.mean_iou = np.mean(task_mean_shape_ious or [])

        conflicts_by_severity = Counter(c.severity for c in task_conflicts)
        task_report_data = ComparisonReport(
            parameters=comparison_parameters,
            comparison_summary=ComparisonReportSummary(
                frame_count=task_validation_frames_count,
                total_frames=task_total_frames,
                frames=sorted(task_validated_frames),
                conflict_count=len(task_conflicts),
                warning_count=conflicts_by_severity.get(AnnotationConflictSeverity.WARNING, 0),
                error_count=conflicts_by_severity.get(AnnotationConflictSeverity.ERROR, 0),
                conflicts_by_type=Counter(c.type for c in task_conflicts),
                annotations=task_annotations_summary,
                annotation_components=task_ann_components_summary,
                tasks=None,
                jobs=job_stats,
            ),
            frame_results=task_frame_results,
        )

        return task_report_data

    def _save_reports(self, *, task_report: dict, job_reports: list[dict]) -> models.QualityReport:
        db_task_report = models.QualityReport(
            task=task_report["task"],
            target_last_updated=task_report["target_last_updated"],
            gt_last_updated=task_report["gt_last_updated"],
            assignee_id=task_report["assignee_id"],
            assignee_last_updated=task_report["assignee_last_updated"],
            data=task_report["data"],
        )
        db_task_report.save()

        db_job_reports = []
        for job_report in job_reports:
            db_job_report = models.QualityReport(
                job=job_report["job"],
                target_last_updated=job_report["target_last_updated"],
                gt_last_updated=job_report["gt_last_updated"],
                assignee_id=job_report["assignee_id"],
                assignee_last_updated=job_report["assignee_last_updated"],
                data=job_report["data"],
            )
            db_job_reports.append(db_job_report)

        db_job_reports = bulk_create(models.QualityReport, db_job_reports)
        db_task_report.children.add(*db_job_reports)

        db_conflicts = []
        db_report_iter = itertools.chain([db_task_report], db_job_reports)
        report_iter = itertools.chain([task_report], job_reports)
        for report, db_report in zip(report_iter, db_report_iter):
            for conflict in report["conflicts"]:
                db_conflict = models.AnnotationConflict(
                    report=db_report,
                    type=conflict["type"],
                    frame=conflict["frame_id"],
                    severity=conflict["severity"],
                )
                db_conflicts.append(db_conflict)

        db_conflicts = bulk_create(models.AnnotationConflict, db_conflicts)

        db_ann_ids = []
        db_conflicts_iter = iter(db_conflicts)
        for report in itertools.chain([task_report], job_reports):
            for conflict, db_conflict in zip(report["conflicts"], db_conflicts_iter):
                for ann_id in conflict["annotation_ids"]:
                    db_ann_id = models.AnnotationId(
                        conflict=db_conflict,
                        job_id=ann_id["job_id"],
                        obj_id=ann_id["obj_id"],
                        type=ann_id["type"],
                        shape_type=ann_id["shape_type"],
                    )
                    db_ann_ids.append(db_ann_id)

        bulk_create(models.AnnotationId, db_ann_ids)

        return db_task_report

    def get_quality_params(self, task: Task) -> ComparisonParameters:
        quality_settings_manager = QualitySettingsManager()
        task_own_settings = quality_settings_manager.get_task_settings(task, inherit=False)
        task_effective_settings = quality_settings_manager.get_task_settings(task)
        return ComparisonParameters.from_settings(
            task_effective_settings, inherited=task_own_settings.id != task_effective_settings.id
        )


class ProjectQualityCalculator:
    def is_task_report_relevant(self, quality_report: models.QualityReport) -> bool:
        assert quality_report.target == models.QualityReportTarget.TASK

        task = quality_report.task
        quality_settings = QualitySettingsManager().get_task_settings(task)

        return (quality_report.target_last_updated >= task.updated_date) and (
            quality_report.target_last_updated >= quality_settings.updated_date
        )

    def compute_report(self, project: Project | int) -> models.QualityReport:
        with transaction.atomic():
            # Preload the required data for computations.
            # Ideally, we would lock the task to fetch all the data and produce
            # consistent report. However, data fetching can also take long time.
            # For this reason, we don't guarantee absolute consistency.
            if isinstance(project, int):
                project = Project.objects.get(id=project)

            project_quality_params = self.get_quality_params(project)

            # Tasks could be added or removed in the project after initial report fetching
            # Fix working the set of tasks by requesting ids first.
            all_task_ids: set[int] = set(
                Task.objects.filter(project=project).values_list("id", flat=True)
            )

            configured_task_ids: set[int] = set(
                task_id
                for ids_chunk in take_by(all_task_ids, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE)
                for task_id in Job.objects.filter(
                    type=JobType.GROUND_TRUTH,
                    stage=StageChoice.ACCEPTANCE,
                    state=StateChoice.COMPLETED,
                    segment__task__in=ids_chunk,
                ).values_list("segment__task__id", flat=True)
            )

            # Prefetch in batches
            configured_tasks = {}
            for ids_batch in take_by(configured_task_ids, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE):
                tasks_batch = (
                    project.tasks.filter(id__in=ids_batch)
                    .annotate(
                        latest_quality_report_id=Subquery(
                            models.QualityReport.objects.filter(
                                created_date__isnull=False,
                                task_id=OuterRef("id"),
                            )
                            .order_by("-created_date")
                            .values("id")[:1]
                        )
                    )
                    .all()
                )
                configured_tasks.update((t.id, t) for t in tasks_batch)

                prefetch_related_objects(tasks_batch, "quality_settings")

        latest_quality_report_ids = set(
            t.latest_quality_report_id for t in configured_tasks.values()
        )
        latest_quality_reports = {
            r.id: r
            for ids_chunk in take_by(
                latest_quality_report_ids, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE
            )
            for r in models.QualityReport.objects.filter(id__in=ids_chunk)
        }

        task_quality_reports: dict[int, models.QualityReport] = {}
        for task in configured_tasks.values():
            latest_task_quality_report_id = getattr(task, "latest_quality_report_id", None)
            latest_task_quality_report = latest_quality_reports.get(latest_task_quality_report_id)
            if not latest_task_quality_report:
                continue

            latest_task_quality_report.task = task  # put the prefetched object
            if not self.is_task_report_relevant(latest_task_quality_report):
                continue

            task_quality_reports[task.id] = latest_task_quality_report

        # Compute required task reports
        # This loop can take long time, maybe use RQ dependencies for each task instead
        tasks_without_reports = configured_tasks.keys() - task_quality_reports.keys()
        for ids_batch in take_by(tasks_without_reports, chunk_size=_DEFAULT_FETCH_CHUNK_SIZE):
            tasks_batch = [configured_tasks[task_id] for task_id in ids_batch]

            prefetch_related_objects(
                tasks_batch,
                "data",
                "data__validation_layout",
            )

            for task in tasks_batch:
                if task.id in task_quality_reports:
                    continue

                # Tasks could have been deleted during report computations, ignore them.
                # Tasks could be moved between projects. It can't be
                # reliably checked and it is quite rare, so we ignore it.
                with suppress(Task.DoesNotExist):
                    task_report_calculator = TaskQualityCalculator()
                    task_report = task_report_calculator.compute_report(task)
                    if task_report:
                        task_quality_reports[task.id] = task_report

        task_comparison_reports: dict[int, ComparisonReport] = {
            task_id: ComparisonReport.from_json(r.get_report_data())
            for task_id, r in task_quality_reports.items()
        }

        project_comparison_report = self._compute_project_report(
            task_reports=task_comparison_reports,
            quality_params=project_quality_params,
            all_task_ids=all_task_ids,
        )

        with transaction.atomic():
            project_report = self._save_report(
                models.QualityReport(
                    project=project,
                    target_last_updated=project.updated_date,
                    gt_last_updated=None,
                    data=project_comparison_report.to_json(),
                    # project reports don't include conflicts
                ),
                child_reports=[
                    r for r in task_quality_reports.values() if r.task.id in task_comparison_reports
                ],
            )

        return project_report

    def _compute_project_report(
        self,
        task_reports: dict[int, ComparisonReport],
        *,
        quality_params: ComparisonParameters,
        all_task_ids: set[int],
    ) -> ComparisonReport:
        # Aggregate nested reports. It's possible that there are no child reports,
        # but we still need to return a meaningful report.

        # Compute task stats
        task_stats = ComparisonReportTaskStats.create_empty()
        task_stats.all.update(all_task_ids)
        task_stats.not_configured.update(all_task_ids - task_reports.keys())
        task_stats.custom.update(
            tid for tid, r in task_reports.items() if not r.parameters.inherited
        )
        task_stats.excluded.update(
            task_stats.all
            - task_stats.not_configured
            - task_stats.custom
            - (
                task_reports.keys()
                - {
                    # Consider tasks excluded if no jobs were included
                    task_id
                    for task_id, r in task_reports.items()
                    if not r.comparison_summary.jobs.included_count
                }
            )
        )

        included_tasks: set[int] = (
            task_reports.keys()
            - task_stats.custom
            - task_stats.not_configured
            - task_stats.excluded
        )

        # Accumulate job stats
        job_stats = ComparisonReportJobStats.create_empty()
        for task_id in included_tasks:
            task_report_summary = task_reports[task_id].comparison_summary
            if not task_report_summary.jobs:
                continue

            job_stats.all.update(task_report_summary.jobs.all)
            job_stats.excluded.update(task_report_summary.jobs.excluded)
            job_stats.not_checkable.update(task_report_summary.jobs.not_checkable)

        total_frames = 0
        total_validated_frames = 0
        project_annotations_summary = ComparisonReportAnnotationsSummary.create_empty()
        project_ann_components_summary = ComparisonReportAnnotationComponentsSummary.create_empty()
        project_conflicts: list[AnnotationConflict] = []
        for task_id, r in task_reports.items():
            if task_id not in included_tasks:
                continue

            total_frames += r.comparison_summary.total_frames
            total_validated_frames += r.comparison_summary.frame_count

            # Compute the combined weighted summary of the task reports.
            # Task summary counts are extrapolated to the whole task size
            # This way, we get averages for the whole project (micro average)
            weight = 1 / (r.comparison_summary.frame_share or 1)
            project_annotations_summary.accumulate(r.comparison_summary.annotations, weight=weight)
            project_ann_components_summary.accumulate(
                r.comparison_summary.annotation_components, weight=weight
            )
            project_conflicts.extend(r.conflicts)

        conflicts_by_severity = Counter(c.severity for c in project_conflicts)
        project_report_data = ComparisonReport(
            parameters=quality_params,
            comparison_summary=ComparisonReportSummary(
                total_frames=total_frames,
                frame_count=total_validated_frames,
                frames=None,  # project reports do not provide this info
                conflict_count=len(project_conflicts),
                warning_count=conflicts_by_severity.get(AnnotationConflictSeverity.WARNING, 0),
                error_count=conflicts_by_severity.get(AnnotationConflictSeverity.ERROR, 0),
                conflicts_by_type=Counter(c.type for c in project_conflicts),
                annotations=project_annotations_summary,
                annotation_components=project_ann_components_summary,
                tasks=task_stats,
                jobs=job_stats,
            ),
            frame_results=None,  # this is too detailed for a project report
        )

        return project_report_data

    def _save_report(
        self, project_report: models.QualityReport, child_reports: list[models.QualityReport]
    ) -> models.QualityReport:
        project_report.save()
        project_report.children.add(*child_reports)

        return project_report

    def get_quality_params(self, project: Project) -> ComparisonParameters:
        quality_settings = QualitySettingsManager().get_project_settings(project)
        return ComparisonParameters.from_settings(quality_settings, inherited=False)


def prepare_report_for_downloading(db_report: models.QualityReport, *, host: str) -> str:
    # Decorate the report for better usability and readability:
    # - add conflicting annotation links like:
    # <host>/tasks/62/jobs/82?frame=250&type=shape&serverID=33741
    # - convert some fractions to percents
    # - add common report info

    project_id = None
    task_id = None
    job_id = None
    jobs_to_tasks: dict[int, int] = {}
    if db_report.project:
        project_id = db_report.project.id

        jobs = Job.objects.filter(segment__task__project__id=project_id).all()
        jobs_to_tasks.update((j.id, j.segment.task.id) for j in jobs)
    elif db_report.task:
        project_id = getattr(db_report.task.project, "id", None)
        task_id = db_report.task.id

        jobs = Job.objects.filter(segment__task__id=task_id).all()
        jobs_to_tasks.update((j.id, task_id) for j in jobs)
    elif db_report.job:
        project_id = getattr(db_report.get_task().project, "id", None)
        task_id = db_report.get_task().id
        job_id = db_report.job.id

        jobs_to_tasks[db_report.job.id] = task_id
        jobs_to_tasks[db_report.get_task().gt_job.id] = task_id
    else:
        assert False

    # Add ids for the hierarchy objects, don't add empty ids
    def _serialize_assignee(assignee: User | None) -> dict | None:
        if not db_report.assignee:
            return None

        reported_keys = ["id", "username", "first_name", "last_name"]
        assert set(reported_keys).issubset(engine_serializers.BasicUserSerializer.Meta.fields)
        # check that only safe fields are reported

        return {k: getattr(assignee, k) for k in reported_keys}

    serialized_data = dict(
        id=db_report.id,
        **dict(job_id=db_report.job.id) if job_id else {},
        **dict(task_id=task_id) if task_id else {},
        **dict(project_id=project_id) if project_id else {},
        **dict(parent_id=db_report.parent.id) if db_report.parent else {},
        created_date=str(db_report.created_date),
        target_last_updated=str(db_report.target_last_updated),
        **dict(gt_last_updated=str(db_report.gt_last_updated)) if db_report.gt_last_updated else {},
        assignee=_serialize_assignee(db_report.assignee),
    )

    comparison_report = ComparisonReport.from_json(db_report.get_report_data())
    serialized_data.update(comparison_report.to_dict())

    if db_report.project:
        # project reports should not have per-frame statistics, it's too detailed for this level
        serialized_data["comparison_summary"].pop("frames")
        serialized_data.pop("frame_results")
    else:
        for frame_result in serialized_data["frame_results"].values():
            for conflict in frame_result["conflicts"]:
                for ann_id in conflict["annotation_ids"]:
                    task_id = jobs_to_tasks[ann_id["job_id"]]
                    ann_id["url"] = (
                        f"{host}tasks/{task_id}/jobs/{ann_id['job_id']}"
                        f"?frame={conflict['frame_id']}"
                        f"&type={ann_id['type']}"
                        f"&serverID={ann_id['obj_id']}"
                    )

        # String keys are needed for json dumping
        serialized_data["frame_results"] = {
            str(k): v for k, v in serialized_data["frame_results"].items()
        }

    if task_stats := serialized_data["comparison_summary"].get("tasks", {}):
        for k in ("all", "custom", "not_configured", "excluded"):
            task_stats[k] = sorted(task_stats[k])

    if job_stats := serialized_data["comparison_summary"].get("jobs", {}):
        for k in ("all", "excluded", "not_checkable"):
            job_stats[k] = sorted(job_stats[k])

    # Add the percent representation for better human readability
    serialized_data["comparison_summary"]["frame_share_percent"] = (
        serialized_data["comparison_summary"]["frame_share"] * 100
    )

    return dump_json(serialized_data, indent=True, append_newline=True).decode()
