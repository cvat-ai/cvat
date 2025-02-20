# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import os.path as osp
from glob import glob
from typing import Callable, Optional

from datumaro.components.annotation import AnnotationType
from datumaro.components.dataset_base import DatasetItem
from datumaro.components.project import Dataset
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (
    CommonData,
    GetCVATDataExtractor,
    ProjectData,
    detect_dataset,
    find_dataset_root,
    import_dm_annotations,
    match_dm_item,
)
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer
from .transformations import SetKeyframeForEveryTrackShape


def _export_common(
    dst_file: str,
    temp_dir: str,
    instance_data: ProjectData | CommonData,
    format_name: str,
    *,
    save_images: bool = False,
    **kwargs,
):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, format_name, save_images=save_images, **kwargs)

    make_zip_archive(temp_dir, dst_file)


@exporter(name="YOLO", ext="ZIP", version="1.1")
def _export_yolo(*args, **kwargs):
    _export_common(*args, format_name="yolo", **kwargs)


def _import_common(
    src_file,
    temp_dir: str,
    instance_data: ProjectData | CommonData,
    format_name: str,
    *,
    load_data_callback: Optional[Callable] = None,
    import_kwargs: dict | None = None,
    **kwargs,
):
    Archive(src_file.name).extractall(temp_dir)

    image_info = {}
    extractor = dm_env.extractors.get(format_name)
    frames = [
        extractor.name_from_path(osp.relpath(p, temp_dir))
        for p in glob(osp.join(temp_dir, "**", "*.txt"), recursive=True)
    ]
    root_hint = find_dataset_root([DatasetItem(id=frame) for frame in frames], instance_data)
    for frame in frames:
        frame_info = None
        try:
            frame_id = match_dm_item(DatasetItem(id=frame), instance_data, root_hint=root_hint)
            frame_info = instance_data.frame_info[frame_id]
        except Exception:  # nosec
            pass
        if frame_info is not None:
            image_info[frame] = (frame_info["height"], frame_info["width"])

    detect_dataset(temp_dir, format_name=format_name, importer=dm_env.importers.get(format_name))
    dataset = Dataset.import_from(
        temp_dir, format_name, env=dm_env, image_info=image_info, **(import_kwargs or {})
    )
    dataset = dataset.transform(SetKeyframeForEveryTrackShape)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)


@importer(name="YOLO", ext="ZIP", version="1.1")
def _import_yolo(*args, **kwargs):
    _import_common(*args, format_name="yolo", **kwargs)


@exporter(name="Ultralytics YOLO Detection", ext="ZIP", version="1.0")
def _export_yolo_ultralytics_detection(*args, **kwargs):
    _export_common(*args, format_name="yolo_ultralytics_detection", **kwargs)


@exporter(name="Ultralytics YOLO Detection Track", ext="ZIP", version="1.0")
def _export_yolo_ultralytics_detection_track(*args, **kwargs):
    _export_common(*args, format_name="yolo_ultralytics_detection", write_track_id=True, **kwargs)


@exporter(name="Ultralytics YOLO Oriented Bounding Boxes", ext="ZIP", version="1.0")
def _export_yolo_ultralytics_oriented_boxes(*args, **kwargs):
    _export_common(*args, format_name="yolo_ultralytics_oriented_boxes", **kwargs)


@exporter(name="Ultralytics YOLO Segmentation", ext="ZIP", version="1.0")
def _export_yolo_ultralytics_segmentation(dst_file, temp_dir, instance_data, *, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset = dataset.transform("masks_to_polygons")
        dataset.export(temp_dir, "yolo_ultralytics_segmentation", save_images=save_images)

    make_zip_archive(temp_dir, dst_file)


@exporter(name="Ultralytics YOLO Pose", ext="ZIP", version="1.0")
def _export_yolo_ultralytics_pose(*args, **kwargs):
    _export_common(*args, format_name="yolo_ultralytics_pose", **kwargs)


@exporter(name="Ultralytics YOLO Classification", ext="ZIP", version="1.0")
def _export_yolo_ultralytics_classification(*args, **kwargs):
    _export_common(*args, format_name="yolo_ultralytics_classification", **kwargs)


@importer(name="Ultralytics YOLO Detection", ext="ZIP", version="1.0")
def _import_yolo_ultralytics_detection(*args, **kwargs):
    _import_common(*args, format_name="yolo_ultralytics_detection", **kwargs)


@importer(name="Ultralytics YOLO Segmentation", ext="ZIP", version="1.0")
def _import_yolo_ultralytics_segmentation(*args, **kwargs):
    _import_common(*args, format_name="yolo_ultralytics_segmentation", **kwargs)


@importer(name="Ultralytics YOLO Oriented Bounding Boxes", ext="ZIP", version="1.0")
def _import_yolo_ultralytics_oriented_boxes(*args, **kwargs):
    _import_common(*args, format_name="yolo_ultralytics_oriented_boxes", **kwargs)


@importer(name="Ultralytics YOLO Pose", ext="ZIP", version="1.0")
def _import_yolo_ultralytics_pose(src_file, temp_dir, instance_data, **kwargs):
    with GetCVATDataExtractor(instance_data) as extractor:
        point_categories = extractor.categories().get(AnnotationType.points)
        label_categories = extractor.categories().get(AnnotationType.label)
        true_skeleton_point_labels = {
            label_categories[label_id].name: category.labels
            for label_id, category in point_categories.items.items()
        }
    _import_common(
        src_file,
        temp_dir,
        instance_data,
        format_name="yolo_ultralytics_pose",
        import_kwargs=dict(skeleton_sub_labels=true_skeleton_point_labels),
        **kwargs,
    )


@importer(name="Ultralytics YOLO Classification", ext="ZIP", version="1.0")
def _import_yolo_ultralytics_classification(*args, **kwargs):
    _import_common(*args, format_name="yolo_ultralytics_classification", **kwargs)
