# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import csv
import io
import itertools
import os
import os.path as osp
import time
import zipfile
from collections.abc import Callable, Iterable
from contextlib import closing
from datetime import timedelta
from pathlib import Path

import datumaro.util
from rest_framework.serializers import ValidationError

from cvat.apps.dataset_manager.bindings import (
    CommonData,
    CvatImportError,
    ProjectData,
    get_defaulted_subset,
)
from cvat.apps.dataset_manager.formats.registry import exporter, importer
from cvat.apps.dataset_manager.util import make_zip_archive
from cvat.apps.engine.models import DimensionType, SourceType
from cvat.apps.engine.utils import take_by


class AudioTsvLayout:
    ANNOTATION_DIR = "annotations"


@exporter(
    name="Generic TSV",
    version="1.0",
    ext="TSV",
    # FIXME: display_name="Generic TSV 1.0 (plain)", changes API key for the format
    dimension=DimensionType.DIM_1D,
)
def _export_plain(
    dst_file: io.IOBase,
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
                (sample_filename_per_task[interval.task_id], interval)
            )
        intervals = itertools.chain.from_iterable(intervals_per_subset.values())
    elif isinstance(instance_data, CommonData):
        sample_filename = instance_data.db_data.audio.path
        intervals = ((sample_filename, interval) for interval in instance_data.iterate_intervals())
    else:
        assert False, f"Unexpected instance_data type '{type(instance_data)}'"

    write_tsv(dst_file, field_names=field_names, intervals=intervals)


@exporter(name="Generic TSV", version="2.0", ext="ZIP", dimension=DimensionType.DIM_1D)
def _export(
    dst_file: io.IOBase,
    temp_dir: str,
    instance_data: CommonData | ProjectData,
    save_images: bool = False,
) -> None:
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

    # TODO: refactor ProjectData and CommonData to return the same structures
    if isinstance(instance_data, ProjectData):
        export_project_v2(dst_file, temp_dir, instance_data, field_names=field_names)
    elif isinstance(instance_data, CommonData):
        export_task_v2(dst_file, temp_dir, instance_data, field_names=field_names)
    else:
        assert False, f"Unexpected instance_data type '{type(instance_data)}'"


def export_task_v2(
    dst_file: io.IOBase, temp_dir: str, instance_data: CommonData, *, field_names: list[str]
) -> None:
    annotations_dir = osp.join(temp_dir, AudioTsvLayout.ANNOTATION_DIR)
    os.makedirs(annotations_dir, exist_ok=True)

    subset_name = get_defaulted_subset(instance_data._db_subset, {})
    with open(osp.join(annotations_dir, f"{subset_name}.tsv"), "wb") as output_file:
        sample_filename = instance_data.db_data.audio.path
        write_tsv(
            output_file,
            field_names=field_names,
            intervals=(
                (sample_filename, interval) for interval in instance_data.iterate_intervals()
            ),
        )

    make_zip_archive(temp_dir, dst_file)


def export_project_v2(
    dst_file: io.IOBase, temp_dir: str, instance_data: ProjectData, *, field_names: list[str]
) -> None:
    sample_filename_per_task = {task.id: task.data.audio.path for task in instance_data.tasks}

    intervals_per_subset = {}
    for interval in instance_data.iterate_intervals():
        intervals_per_subset.setdefault(interval.subset, []).append(
            (sample_filename_per_task[interval.task_id], interval)
        )

    annotations_dir = osp.join(temp_dir, AudioTsvLayout.ANNOTATION_DIR)
    os.makedirs(annotations_dir, exist_ok=True)

    subset_map = {}
    for subset_name in instance_data.subsets:
        subset_output_name = subset_map.setdefault(
            subset_name, get_defaulted_subset(subset_name, subset_map)
        )
        with open(osp.join(annotations_dir, f"{subset_output_name}.tsv"), "wb") as subset_file:
            write_tsv(
                subset_file,
                field_names=field_names,
                intervals=intervals_per_subset[subset_name],
            )

    make_zip_archive(temp_dir, dst_file)


def write_tsv(
    dst_file: io.BufferedIOBase,
    *,
    field_names: list[str],
    intervals: Iterable[tuple[str, CommonData.LabeledInterval | ProjectData.LabeledInterval]],
):
    file_writer = io.TextIOWrapper(dst_file)
    with closing(file_writer):
        csv_writer = csv.DictWriter(file_writer, delimiter="\t", fieldnames=field_names)
        csv_writer.writeheader()

        for sample_filename, interval in intervals:
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


@importer(name="Generic TSV", version="1.0", ext="TSV, ZIP", dimension=DimensionType.DIM_1D)
def _import(
    src_file, temp_dir, instance_data: CommonData | ProjectData, load_data_callback=None, **kwargs
):
    if load_data_callback is not None:
        raise ValidationError("Media import from dataset is not supported for audio tasks")

    if isinstance(instance_data, ProjectData):
        instance_data_for_filename = {
            (task_data.db_data.audio.path, task_data._db_subset): task_data
            for task_data in instance_data.all_task_data
        }
        known_subsets = {subset for _, subset in instance_data_for_filename}

        # TODO: Potentially, allow importing without explicit subset if filenames are unique
        get_instance_data_for_filename = instance_data_for_filename.get
    elif isinstance(instance_data, CommonData):

        def get_instance_data_for_filename(key: tuple[str, str]) -> CommonData:
            filename, _ = key

            if instance_data.db_data.audio.path != filename:
                raise KeyError

            return instance_data

        known_subsets = {}

    else:
        assert False, f"Unexpected instance_data type '{type(instance_data)}'"

    is_zip = zipfile.is_zipfile(src_file)
    src_file.seek(0)

    if is_zip:
        zipfile.ZipFile(src_file).extractall(temp_dir)

        for filename in Path(temp_dir, AudioTsvLayout.ANNOTATION_DIR).glob("*.tsv"):
            with filename.open("rb") as tsv_file:
                subset_hint = filename.stem
                if subset_hint in known_subsets:

                    def instance_data_getter(key) -> ProjectData:
                        try:
                            return get_instance_data_for_filename(key)
                        except KeyError:
                            return get_instance_data_for_filename((key[0], subset_hint, *key[1:]))

                else:
                    instance_data_getter = get_instance_data_for_filename

                import_tsv(tsv_file, instance_data_for_filename=instance_data_getter)
    else:
        import_tsv(src_file, instance_data_for_filename=get_instance_data_for_filename)


def import_tsv(
    src_file: io.TextIOBase,
    *,
    instance_data_for_filename: Callable[[tuple[str, str]], CommonData | ProjectData],
) -> None:
    file_reader = io.TextIOWrapper(src_file)
    field_names = None
    for lines_batch in take_by(file_reader, chunk_size=1000):
        csv_reader = csv.DictReader(lines_batch, delimiter="\t", fieldnames=field_names)
        if field_names is None:
            field_names = csv_reader.fieldnames

        for row_number, row in enumerate(csv_reader):
            try:
                row_filename = row.pop("filename", None)
                if not row_filename:
                    raise CvatImportError("Missing filename")

                row_subset = row.pop("subset", None)

                try:
                    output_instance_data = instance_data_for_filename((row_filename, row_subset))
                except KeyError as e:
                    raise CvatImportError(f"Unknown filename '{row_filename}'") from e

                interval = CommonData.LabeledInterval(
                    start=parse_time(row.pop("start")),
                    stop=parse_time(row.pop("stop")),
                    label=row.pop("label"),
                    group=datumaro.util.cast(row.pop("group", 0), int, default=0),
                    source=SourceType.FILE,
                    score=datumaro.util.cast(row.pop("score", 1), float, default=1),
                    attributes=[CommonData.Attribute(name=k, value=v) for k, v in row.items()],
                )

                output_instance_data.add_interval(interval)
            except Exception as e:
                raise CvatImportError("Can't import interval #{}: {}".format(row_number, e)) from e
