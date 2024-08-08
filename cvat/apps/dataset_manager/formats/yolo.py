# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2023-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT
import defusedxml.ElementTree as ET
import os.path as osp
from glob import glob

from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (
    GetCVATDataExtractor,
    detect_dataset,
    import_dm_annotations,
    match_dm_item,
    find_dataset_root,
    TaskData,
    ProjectData,
)
from cvat.apps.dataset_manager.util import make_zip_archive
from datumaro.components.extractor import DatasetItem
from datumaro.components.project import Dataset

from .registry import dm_env, exporter, importer
from ...engine.models import LabelType


def _export_common(dst_file, temp_dir, instance_data, format_name, *, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.export(temp_dir, format_name, save_images=save_images)

    make_zip_archive(temp_dir, dst_file)


@exporter(name='YOLO', ext='ZIP', version='1.1')
def _export_yolo(dst_file, temp_dir, instance_data, save_images=False):
    _export_common(dst_file, temp_dir, instance_data, 'yolo', save_images=save_images)


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
def _import_yolo(src_file, temp_dir, instance_data, **kwargs):
    _import_common(
        src_file,
        temp_dir,
        instance_data,
        format_name="yolo",
        **kwargs
    )


@exporter(name='YOLOv8 Detection', ext='ZIP', version='1.0')
def _export_yolov8_detection(dst_file, temp_dir, instance_data, save_images=False):
    _export_common(dst_file, temp_dir, instance_data, 'yolov8', save_images=save_images)


@exporter(name='YOLOv8 Oriented Bounding Boxes', ext='ZIP', version='1.0')
def _export_yolov8_oriented_boxes(dst_file, temp_dir, instance_data, save_images=False):
    _export_common(dst_file, temp_dir, instance_data, 'yolov8_oriented_boxes', save_images=save_images)


@exporter(name='YOLOv8 Segmentation', ext='ZIP', version='1.0')
def _export_yolov8_segmentation(dst_file, temp_dir, instance_data, save_images=False):
    _export_common(dst_file, temp_dir, instance_data, 'yolov8_segmentation', save_images=save_images)


@exporter(name='YOLOv8 Pose', ext='ZIP', version='1.0')
def _export_yolov8_pose(dst_file, temp_dir, instance_data, save_images=False):
    _export_common(dst_file, temp_dir, instance_data, 'yolov8_pose', save_images=save_images)


@importer(name='YOLOv8 Detection', ext="ZIP", version="1.0")
def _import_yolov8_detection(src_file, temp_dir, instance_data, **kwargs):
    _import_common(
        src_file,
        temp_dir,
        instance_data,
        format_name="yolov8",
        **kwargs
    )


@importer(name='YOLOv8 Segmentation', ext="ZIP", version="1.0")
def _import_yolov8_segmentation(src_file, temp_dir, instance_data, **kwargs):
    _import_common(
        src_file,
        temp_dir,
        instance_data,
        format_name="yolov8_segmentation",
        **kwargs
    )


@importer(name='YOLOv8 Oriented Bounding Boxes', ext="ZIP", version="1.0")
def _import_yolov8_oriented_boxes(src_file, temp_dir, instance_data, **kwargs):
    _import_common(
        src_file,
        temp_dir,
        instance_data,
        format_name="yolov8_oriented_boxes",
        **kwargs
    )


@importer(name='YOLOv8 Pose', ext="ZIP", version="1.0")
def _import_yolov8_pose(src_file, temp_dir, instance_data, **kwargs):
    labels_meta = instance_data.meta[instance_data.META_FIELD]['labels']

    true_skeleton_point_labels = {
        skeleton_label["name"]: [
            el.attrib["data-label-name"]
            for el in ET.fromstring("<root>" + skeleton_label.get("svg", "") + "</root>")
            if el.tag == "circle"
        ]
        for _, skeleton_label in labels_meta
        if skeleton_label["type"] == str(LabelType.SKELETON)
    }
    _import_common(
        src_file,
        temp_dir,
        instance_data,
        format_name="yolov8_pose",
        import_kwargs=dict(skeleton_sub_labels=true_skeleton_point_labels),
        **kwargs
    )
