# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import csv
import io
import itertools
import time
from collections.abc import Iterable
from contextlib import closing
from datetime import timedelta

import datumaro.util
from rest_framework.serializers import ValidationError

from cvat.apps.dataset_manager.bindings import (
    CommonData,
    CvatImportError,
    ProjectData,
    get_defaulted_subset,
)
from cvat.apps.dataset_manager.formats.registry import exporter, importer
from cvat.apps.engine.models import DimensionType, SourceType
from cvat.apps.engine.utils import take_by


@exporter(name="Generic TSV", version="1.0", ext="TSV", dimension=DimensionType.DIM_1D)
def _export(
    dst_file: io.BufferedIOBase,
    temp_dir: str,
    instance_data: CommonData | ProjectData,
    save_images: bool = False,
) -> None:
    if save_images:
        raise ValidationError("Media export as dataset is not supported for audio tasks")

    field_names = ["id", "filename", "subset", "start", "stop", "label", "source", "score"]

    # TODO: refactor instance data to provide better access to this
    attr_names = set()
    for label_attrs in instance_data._attribute_mapping_merged.values():
        for attr_name in label_attrs.values():
            attr_names.add(attr_name)

    attr_names = sorted(attr_names)
    field_names += attr_names

    # TODO: refactor ProjectData and CommonData to return the same structures
    if isinstance(instance_data, ProjectData):
        intervals_per_subset = {}
        sample_filename_per_task = {task.id: task.data.audio.path for task in instance_data.tasks}
        for interval in instance_data.iterate_intervals():
            intervals_per_subset.setdefault(interval.subset, []).append(
                (sample_filename_per_task[interval.task_id], interval.subset, interval)
            )
        intervals = itertools.chain.from_iterable(intervals_per_subset.values())
    elif isinstance(instance_data, CommonData):
        sample_filename = instance_data.db_data.audio.path
        sample_subset = instance_data.subset
        intervals = (
            (sample_filename, sample_subset, interval)
            for interval in instance_data.iterate_intervals()
        )
    else:
        assert False, f"Unexpected instance_data type '{type(instance_data)}'"

    write_tsv(dst_file, field_names=field_names, intervals=intervals)


def write_tsv(
    dst_file: io.BufferedIOBase,
    *,
    field_names: list[str],
    intervals: Iterable[tuple[str, str, CommonData.LabeledInterval | ProjectData.LabeledInterval]],
):
    file_writer = io.TextIOWrapper(dst_file)
    with closing(file_writer):
        csv_writer = csv.DictWriter(file_writer, delimiter="\t", fieldnames=field_names)
        csv_writer.writeheader()

        subset_map = {}
        for sample_filename, sample_subset, interval in intervals:
            sample_output_subset = subset_map.get(sample_subset)
            if sample_output_subset is None:
                sample_output_subset = subset_map.setdefault(
                    sample_subset, get_defaulted_subset(sample_subset, subset_map)
                )

            row_dict = {
                "id": interval.id,
                "filename": sample_filename,
                "subset": sample_output_subset,
                "start": interval.start,
                "stop": interval.stop,
                "label": interval.label,
                "source": interval.source,
                "score": interval.score,
            }
            for attr in interval.attributes:
                row_dict[attr.name] = attr.value

            csv_writer.writerow(row_dict)


def parse_time(v: str) -> timedelta | None:
    if v == "":
        return None

    for fmt_string in ("%H:%M:%S.%f", "%H:%M:%S"):
        try:
            parsed_time = time.strptime(v, fmt_string)
            if fmt_string.endswith(".%f"):
                # time.strptime drops sub-second precision, so recover it from the raw string.
                frac = v.split(".", maxsplit=1)[-1]
                microseconds = int(frac.ljust(6, "0")[:6])
            else:
                microseconds = 0
        except ValueError:
            continue
        else:
            return timedelta(
                hours=parsed_time.tm_hour,
                minutes=parsed_time.tm_min,
                seconds=parsed_time.tm_sec,
                microseconds=microseconds,
            )

    raise ValueError(f"Failed to parse timestamp '{v}'")


@importer(name="Generic TSV", version="1.0", ext="TSV", dimension=DimensionType.DIM_1D)
def _import(
    src_file: io.BufferedIOBase,
    temp_dir: str,
    instance_data: CommonData | ProjectData,
    load_data_callback=None,
    **kwargs,
):
    if load_data_callback is not None:
        raise ValidationError("Media import from dataset is not supported for audio tasks")

    assert isinstance(instance_data, CommonData), type(instance_data)

    file_reader = io.TextIOWrapper(src_file)
    field_names = None
    row_number = 1
    for lines_batch in take_by(file_reader, chunk_size=1000):
        csv_reader = csv.DictReader(lines_batch, delimiter="\t", fieldnames=field_names)
        if field_names is None:
            field_names = csv_reader.fieldnames

        for row in csv_reader:
            try:
                row_filename = row.pop("filename", None)
                if not row_filename:
                    raise CvatImportError("Missing filename")

                if row_filename != instance_data.db_data.audio.path:
                    raise CvatImportError(f"Unknown audio file '{row_filename}'")

                row.pop("subset", None)  # unused

                interval = CommonData.LabeledInterval(
                    start=parse_time(row.pop("start")),
                    stop=parse_time(row.pop("stop")),
                    label=row.pop("label"),
                    group=datumaro.util.cast(row.pop("group", 0), int, default=0),
                    source=SourceType.FILE,
                    score=datumaro.util.cast(row.pop("score", 1), float, default=1),
                    attributes=[CommonData.Attribute(name=k, value=v) for k, v in row.items()],
                )

                instance_data.add_interval(interval)

                row_number += 1
            except Exception as e:
                raise CvatImportError("Can't import interval #{}: {}".format(row_number, e)) from e
