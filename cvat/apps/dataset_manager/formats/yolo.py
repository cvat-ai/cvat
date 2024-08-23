# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import os.path as osp
from glob import glob

from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (
    GetCVATDataExtractor,
    detect_dataset,
    import_dm_annotations,
    match_dm_item,
    find_dataset_root,
)
from cvat.apps.dataset_manager.util import make_zip_archive
from datumaro.components.annotation import AnnotationType
from datumaro.components.extractor import DatasetItem
from datumaro.components.project import Dataset

from .registry import dm_env, exporter, importer


def _export_common(dst_file, temp_dir, instance_data, format_name, *, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, format_name, save_images=save_images)

    make_zip_archive(temp_dir, dst_file)


@exporter(name='YOLO', ext='ZIP', version='1.1')
def _export_yolo(*args, **kwargs):
    _export_common(*args, format_name='yolo', **kwargs)


def _import_common(
    src_file,
    temp_dir,
    instance_data,
    format_name,
    *,
    load_data_callback=None,
    import_kwargs=None,
    **kwargs
):
    Archive(src_file.name).extractall(temp_dir)

    image_info = {}
    extractor = dm_env.extractors.get(format_name)
    frames = [extractor.name_from_path(osp.relpath(p, temp_dir))
        for p in glob(osp.join(temp_dir, '**', '*.txt'), recursive=True)]
    root_hint = find_dataset_root(
        [DatasetItem(id=frame) for frame in frames], instance_data)
    for frame in frames:
        frame_info = None
        try:
            frame_id = match_dm_item(DatasetItem(id=frame), instance_data,
                root_hint=root_hint)
            frame_info = instance_data.frame_info[frame_id]
        except Exception: # nosec
            pass
        if frame_info is not None:
            image_info[frame] = (frame_info["height"], frame_info["width"])

    detect_dataset(temp_dir, format_name=format_name, importer=dm_env.importers.get(format_name))
    dataset = Dataset.import_from(temp_dir, format_name,
        env=dm_env, image_info=image_info, **(import_kwargs or {}))
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)
    import_dm_annotations(dataset, instance_data)


@importer(name='YOLO', ext='ZIP', version='1.1')
def _import_yolo(*args, **kwargs):
    _import_common(*args, format_name="yolo", **kwargs)


@exporter(name='YOLOv8 Detection', ext='ZIP', version='1.0')
def _export_yolov8_detection(*args, **kwargs):
    _export_common(*args, format_name='yolov8_detection', **kwargs)


@exporter(name='YOLOv8 Oriented Bounding Boxes', ext='ZIP', version='1.0')
def _export_yolov8_oriented_boxes(*args, **kwargs):
    _export_common(*args, format_name='yolov8_oriented_boxes', **kwargs)


@exporter(name='YOLOv8 Segmentation', ext='ZIP', version='1.0')
def _export_yolov8_segmentation(dst_file, temp_dir, instance_data, *, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset = dataset.transform('masks_to_polygons')
        dataset.export(temp_dir, 'yolov8_segmentation', save_images=save_images)

    make_zip_archive(temp_dir, dst_file)


@exporter(name='YOLOv8 Pose', ext='ZIP', version='1.0')
def _export_yolov8_pose(*args, **kwargs):
    _export_common(*args, format_name='yolov8_pose', **kwargs)


@importer(name='YOLOv8 Detection', ext="ZIP", version="1.0")
def _import_yolov8_detection(*args, **kwargs):
    _import_common(*args, format_name="yolov8_detection", **kwargs)


@importer(name='YOLOv8 Segmentation', ext="ZIP", version="1.0")
def _import_yolov8_segmentation(*args, **kwargs):
    _import_common(*args, format_name="yolov8_segmentation", **kwargs)


@importer(name='YOLOv8 Oriented Bounding Boxes', ext="ZIP", version="1.0")
def _import_yolov8_oriented_boxes(*args, **kwargs):
    _import_common(*args, format_name="yolov8_oriented_boxes", **kwargs)


@importer(name='YOLOv8 Pose', ext="ZIP", version="1.0")
def _import_yolov8_pose(src_file, temp_dir, instance_data, **kwargs):
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
        format_name="yolov8_pose",
        import_kwargs=dict(skeleton_sub_labels=true_skeleton_point_labels),
        **kwargs
    )
