# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import csv
import io
import time
from contextlib import closing
from datetime import timedelta

import datumaro.util
from rest_framework.serializers import ValidationError

from cvat.apps.dataset_manager.bindings import CommonData
from cvat.apps.dataset_manager.formats.registry import exporter, importer
from cvat.apps.engine.models import DimensionType, SourceType
from cvat.apps.engine.utils import take_by


@exporter(name="Generic TSV", version="1.0", ext="TSV", dimension=DimensionType.DIM_1D)
def _export(dst_file, temp_dir, instance_data: CommonData, save_images=False):
    if save_images:
        raise ValidationError("Media export as dataset is not supported for audio tasks")

    field_names = ["id", "filename", "start", "stop", "label", "source", "score"]

    # TODO: refactor instance data to provide better access to this
    attr_names = set()
    for label_attrs in instance_data._attribute_mapping_merged.values():
        for attr_name in label_attrs.values():
            attr_names.add(attr_name)

    attr_names = sorted(attr_names)
    field_names += attr_names

    sample_filename = instance_data.db_data.audio.path

    file_writer = io.TextIOWrapper(dst_file)
    with closing(file_writer):
        csv_writer = csv.DictWriter(file_writer, delimiter="\t", fieldnames=field_names)
        csv_writer.writeheader()

        for interval in instance_data.iterate_intervals():
            row_dict = {
                "id": interval.id,
                "filename": sample_filename,
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
def _import(src_file, temp_dir, instance_data: CommonData, load_data_callback=None, **kwargs):
    if load_data_callback is not None:
        raise ValidationError("Media import from dataset is not supported for audio tasks")

    file_reader = io.TextIOWrapper(src_file)
    field_names = None
    for lines_batch in take_by(file_reader, chunk_size=1000):
        csv_reader = csv.DictReader(lines_batch, delimiter="\t", fieldnames=field_names)
        if field_names is None:
            field_names = csv_reader.fieldnames

        for row in csv_reader:
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
