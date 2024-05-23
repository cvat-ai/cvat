# Copyright (C) 2019-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.components.annotation import AnnotationType
from datumaro.components.dataset import Dataset
from datumaro.components.extractor import ItemTransform
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import (GetCVATDataExtractor, detect_dataset,
    find_dataset_root, match_dm_item)
from cvat.apps.dataset_manager.util import make_zip_archive

from .transformations import MaskToPolygonTransformation, RotatedBoxesToPolygons
from .registry import dm_env, exporter, importer


class KeepTracks(ItemTransform):
    def transform_item(self, item):
        return item.wrap(annotations=[a for a in item.annotations
            if 'track_id' in a.attributes])

def _import_to_task(dataset, instance_data):
    tracks = {}
    label_cat = dataset.categories()[AnnotationType.label]

    root_hint = find_dataset_root(dataset, instance_data)

    shift = 0
    for item in dataset:
        frame_number = instance_data.abs_frame_id(
            match_dm_item(item, instance_data, root_hint=root_hint))

        track_ids = set()

        for ann in item.annotations:
            if ann.type != AnnotationType.polygon:
                continue

            track_id = ann.attributes['track_id']
            group_id = track_id

            if track_id in track_ids:
                # use negative id for tracks with the same id on the same frame
                shift -= 1
                track_id = shift
            else:
                track_ids.add(track_id)

            shape = instance_data.TrackedShape(
                type='polygon',
                points=ann.points,
                occluded=ann.attributes.get('occluded') is True,
                outside=False,
                keyframe=True,
                z_order=ann.z_order,
                frame=frame_number,
                attributes=[],
                source='manual',
                group=group_id
            )

            # build trajectories as lists of shapes in track dict
            if track_id not in tracks:
                tracks[track_id] = instance_data.Track(
                    label_cat.items[ann.label].name, 0, 'manual', [])
            tracks[track_id].shapes.append(shape)

    for track in tracks.values():
        track.shapes.sort(key=lambda t: t.frame)

        # insert outside=True in skips between the frames track is visible
        prev_shape_idx = 0
        prev_shape = track.shapes[0]
        for shape in track.shapes[1:]:
            has_skip = instance_data.frame_step < shape.frame - prev_shape.frame
            if has_skip and not prev_shape.outside:
                prev_shape = prev_shape._replace(outside=True,
                        frame=prev_shape.frame + instance_data.frame_step)
                prev_shape_idx += 1
                track.shapes.insert(prev_shape_idx, prev_shape)
            prev_shape = shape
            prev_shape_idx += 1

        # Append a shape with outside=True to finish the track
        last_shape = track.shapes[-1]
        if last_shape.frame + instance_data.frame_step <= \
                int(instance_data.meta[instance_data.META_FIELD]['stop_frame']):
            track.shapes.append(last_shape._replace(outside=True,
                frame=last_shape.frame + instance_data.frame_step)
            )
        instance_data.add_track(track)

@exporter(name='MOTS PNG', ext='ZIP', version='1.0')
def _export(dst_file, temp_dir, instance_data, save_images=False):
    with GetCVATDataExtractor(instance_data, include_images=save_images) as extractor:
        dataset = Dataset.from_extractors(extractor, env=dm_env)
        dataset.transform(KeepTracks) # can only export tracks
        dataset.transform(RotatedBoxesToPolygons)
        dataset.transform('polygons_to_masks')
        dataset.transform('boxes_to_masks')
        dataset.transform('merge_instance_segments')

        dataset.export(temp_dir, 'mots_png', save_images=save_images)

    make_zip_archive(temp_dir, dst_file)

@importer(name='MOTS PNG', ext='ZIP', version='1.0')
def _import(src_file, temp_dir, instance_data, load_data_callback=None, **kwargs):
    Archive(src_file.name).extractall(temp_dir)

    detect_dataset(temp_dir, format_name='mots', importer=dm_env.importers.get('mots'))
    dataset = Dataset.import_from(temp_dir, 'mots', env=dm_env)
    dataset = MaskToPolygonTransformation.convert_dataset(dataset, **kwargs)
    if load_data_callback is not None:
        load_data_callback(dataset, instance_data)

    # Dirty way to determine instance type to avoid circular dependency
    if hasattr(instance_data, '_db_project'):
        for sub_dataset, task_data in instance_data.split_dataset(dataset):
            _import_to_task(sub_dataset, task_data)
    else:
        _import_to_task(dataset, instance_data)

