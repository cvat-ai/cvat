# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import datumaro as dm
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import GetCVATDataExtractor, detect_dataset
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


def _import_to_task(dataset, instance_data):
    tracks = {}
    label_cat = dataset.categories()[dm.AnnotationType.label]

    for item in dataset:
        # NOTE: MOT frames start from 1
        # job has an offset, for task offset is 0
        frame_number = int(item.id) - 1 + instance_data.start
        frame_number = instance_data.abs_frame_id(frame_number)

        for ann in item.annotations:
            if ann.type != dm.AnnotationType.bbox:
                continue

            occluded = ann.attributes.pop("occluded", False) is True
            track_id = ann.attributes.pop("track_id", None)
            attributes = [
                instance_data.Attribute(name=n, value=str(v)) for n, v in ann.attributes.items()
            ]
            if track_id is None:
                # Extension. Import regular boxes:
                instance_data.add_shape(
                    instance_data.LabeledShape(
                        type="rectangle",
                        label=label_cat.items[ann.label].name,
                        points=ann.points,
                        occluded=occluded,
                        z_order=ann.z_order,
                        group=0,
                        frame=frame_number,
                        attributes=attributes,
                        source="manual",
                    )
                )
                continue

            shape = instance_data.TrackedShape(
                type="rectangle",
                points=ann.points,
                occluded=occluded,
                outside=False,
                keyframe=True,
                z_order=ann.z_order,
                frame=frame_number,
                attributes=attributes,
                source="manual",
            )

            # build trajectories as lists of shapes in track dict
            if track_id not in tracks:
                tracks[track_id] = instance_data.Track(
                    label_cat.items[ann.label].name, 0, "manual", []
                )
            tracks[track_id].shapes.append(shape)

    for track in tracks.values():
        # MOT annotations do not require frames to be ordered
        track.shapes.sort(key=lambda t: t.frame)

        # insert outside=True in skips between the frames track is visible
        prev_shape_idx = 0
        prev_shape = track.shapes[0]
        for shape in track.shapes[1:]:
            has_skip = instance_data.frame_step < shape.frame - prev_shape.frame
            if has_skip and not prev_shape.outside:
                prev_shape = prev_shape._replace(
                    outside=True, frame=prev_shape.frame + instance_data.frame_step
                )
                prev_shape_idx += 1
                track.shapes.insert(prev_shape_idx, prev_shape)
            prev_shape = shape
            prev_shape_idx += 1

        # Append a shape with outside=True to finish the track
        last_shape = track.shapes[-1]
        if last_shape.frame + instance_data.frame_step <= int(
            instance_data.meta[instance_data.META_FIELD]["stop_frame"]
        ):
            track.shapes.append(
                last_shape._replace(outside=True, frame=last_shape.frame + instance_data.frame_step)
            )
        instance_data.add_track(track)


@exporter(name="MOT", ext="ZIP", version="1.1")
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = dm.Dataset.from_extractors(extractor, env=dm_env)

        dataset.export(temp_dir, "mot_seq_gt", save_images=save_images)

    make_zip_archive(temp_dir, dst_file)


@importer(name="MOT", ext="ZIP", version="1.1")
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    detect_dataset(temp_dir, format_name="mot_seq", importer=dm_env.importers.get("mot_seq"))
    dataset = dm.Dataset.import_from(temp_dir, "mot_seq", env=dm_env)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)

    # Dirty way to determine instance type to avoid circular dependency
    if hasattr(instance_data, "_db_project"):
        for sub_dataset, task_data in instance_data.split_dataset(dataset):
            _import_to_task(sub_dataset, task_data)
    else:
        _import_to_task(dataset, instance_data)
