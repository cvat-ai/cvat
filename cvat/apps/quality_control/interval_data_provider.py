# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from collections.abc import Iterator, Mapping, Sequence
from datetime import timedelta
from functools import cached_property
from types import MappingProxyType
from typing import Any

from attrs import define
from rest_framework.exceptions import ValidationError

from cvat.apps.dataset_manager import data_model as cdm
from cvat.apps.dataset_manager.bindings import convert_attribute_value
from cvat.apps.engine.models import DimensionType, Job, SegmentType, Task
from cvat.apps.quality_control.attribute_comparison import CVAT_ATTRIBUTE_SPEC_IDS_ATTR
from cvat.apps.quality_control.data_providers import JobDataProvider


def validate_audio_quality_scope(task: Task, jobs: Sequence[Job] | None = None) -> None:
    if task.dimension != DimensionType.DIM_1D:
        return
    data = task.data
    layout = getattr(data, "validation_layout", None)
    if data.deleted_frames or (layout and layout.disabled_frames) or data.get_frame_step() != 1:
        raise ValidationError("Audio quality requires the whole recording without excluded times")
    if jobs is None:
        segments = task.segment_set.all()
    else:
        segments = (job.segment for job in jobs)
    for segment in segments:
        if (
            segment.type != SegmentType.RANGE
            or segment.start_frame != 0
            or segment.stop_frame != data.size - 1
        ):
            raise ValidationError(
                "Audio quality requires full-recording RANGE jobs and Ground Truth"
            )


@define(frozen=True)
class IntervalAnnotation(cdm.Interval):
    id: int
    label: int
    attributes: Mapping[str, Any]
    reference: cdm.AnnotationReference
    source: str | None
    group: int
    score: float
    start: int
    stop: int | None


@define(frozen=True)
class RecordingSample(cdm.Sample):
    id: str
    subset: str
    annotations: tuple[IntervalAnnotation, ...]
    frame_id: None = None


@define(frozen=True)
class IntervalDataset(cdm.Dataset):
    label_catalog: cdm.LabelCatalog
    sample: RecordingSample

    def __iter__(self) -> Iterator[RecordingSample]:
        yield self.sample

    def __len__(self) -> int:
        return 1

    def get(self, item_id: str, *, subset: str) -> RecordingSample | None:
        return self.sample if (item_id, subset) == (self.sample.id, self.sample.subset) else None


class IntervalJobDataProvider(JobDataProvider):
    @property
    def total_samples(self) -> int:
        return 1

    @cached_property
    def recording_range(self) -> tuple[int, int]:
        return (
            self.job_data.abs_frame_id(self.job_data.rel_range.start),
            self.job_data.abs_interval_stop(self.job_data.rel_range.stop),
        )

    @cached_property
    def dataset(self) -> IntervalDataset:
        catalog = self._load_label_catalog()
        label_indices = {label.name: index for index, label in enumerate(catalog.labels)}

        def milliseconds(value):
            if value is None:
                return None
            return value // timedelta(milliseconds=1)

        annotations = []
        for interval in self.job_data.iterate_intervals():
            label_index = label_indices[interval.label]
            label = catalog.labels[label_index]
            values = {attr.name: attr.value for attr in interval.attributes}
            attributes = {
                spec.name: convert_attribute_value(
                    values.get(spec.name, spec.default_value), spec.input_type
                )
                for spec in label.attributes
            }
            attributes[CVAT_ATTRIBUTE_SPEC_IDS_ATTR] = {
                spec.name: spec.id for spec in label.attributes
            }
            annotations.append(
                IntervalAnnotation(
                    id=interval.id,
                    label=label_index,
                    attributes=MappingProxyType(attributes),
                    reference=cdm.AnnotationReference(
                        obj_id=interval.id,
                        job_id=self.job_id,
                        type=cdm.AnnotationReferenceType.INTERVAL,
                    ),
                    source=interval.source,
                    group=interval.group,
                    score=interval.score,
                    start=milliseconds(interval.start),
                    stop=milliseconds(interval.stop),
                )
            )
        return IntervalDataset(
            catalog,
            RecordingSample(
                id=str(self.job_data.db_instance.segment.task_id),
                subset="",
                annotations=tuple(annotations),
            ),
        )

    def close(self) -> None:
        self.__dict__.pop("dataset", None)
        self.__dict__.pop("recording_range", None)
