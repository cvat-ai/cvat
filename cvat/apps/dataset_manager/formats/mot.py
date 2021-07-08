# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from tempfile import TemporaryDirectory

import datumaro.components.extractor as datumaro
from datumaro.components.dataset import Dataset
from pyunpack import Archive

from cvat.apps.dataset_manager.bindings import CvatTaskDataExtractor
from cvat.apps.dataset_manager.util import make_zip_archive

from .registry import dm_env, exporter, importer


@exporter(name='MOT', ext='ZIP', version='1.1')
def _export(dst_file, task_data, save_images=False):
    dataset = Dataset.from_extractors(CvatTaskDataExtractor(
        task_data, include_images=save_images), env=dm_env)
    with TemporaryDirectory() as temp_dir:
        dataset.export(temp_dir, 'mot_seq_gt', save_images=save_images)

        make_zip_archive(temp_dir, dst_file)

@importer(name='MOT', ext='ZIP', version='1.1')
def _import(src_file, task_data):
    with TemporaryDirectory() as tmp_dir:
        Archive(src_file.name).extractall(tmp_dir)

        dataset = Dataset.import_from(tmp_dir, 'mot_seq', env=dm_env)

        tracks = {}
        label_cat = dataset.categories()[datumaro.AnnotationType.label]

        for item in dataset:
            frame_number = int(item.id) - 1 # NOTE: MOT frames start from 1
            frame_number = task_data.abs_frame_id(frame_number)

            for ann in item.annotations:
                if ann.type != datumaro.AnnotationType.bbox:
                    continue

                track_id = ann.attributes.get('track_id')
                if track_id is None:
                    # Extension. Import regular boxes:
                    task_data.add_shape(task_data.LabeledShape(
                        type='rectangle',
                        label=label_cat.items[ann.label].name,
                        points=ann.points,
                        occluded=ann.attributes.get('occluded') == True,
                        z_order=ann.z_order,
                        group=0,
                        frame=frame_number,
                        attributes=[],
                        source='manual',
                    ))
                    continue

                shape = task_data.TrackedShape(
                    type='rectangle',
                    points=ann.points,
                    occluded=ann.attributes.get('occluded') == True,
                    outside=False,
                    keyframe=True,
                    z_order=ann.z_order,
                    frame=frame_number,
                    attributes=[],
                    source='manual',
                )

                # build trajectories as lists of shapes in track dict
                if track_id not in tracks:
                    tracks[track_id] = task_data.Track(
                        label_cat.items[ann.label].name, 0, 'manual', [])
                tracks[track_id].shapes.append(shape)

        for track in tracks.values():
            # MOT annotations do not require frames to be ordered
            track.shapes.sort(key=lambda t: t.frame)

            # insert outside=True in skips between the frames track is visible
            prev_shape_idx = 0
            prev_shape = track.shapes[0]
            for shape in track.shapes[1:]:
                has_skip = task_data.frame_step < shape.frame - prev_shape.frame
                if has_skip and not prev_shape.outside:
                    prev_shape = prev_shape._replace(outside=True,
                            frame=prev_shape.frame + task_data.frame_step)
                    prev_shape_idx += 1
                    track.shapes.insert(prev_shape_idx, prev_shape)
                prev_shape = shape
                prev_shape_idx += 1

            # Append a shape with outside=True to finish the track
            last_shape = track.shapes[-1]
            if last_shape.frame + task_data.frame_step <= \
                    int(task_data.meta['task']['stop_frame']):
                track.shapes.append(last_shape._replace(outside=True,
                    frame=last_shape.frame + task_data.frame_step)
                )
            task_data.add_track(track)
