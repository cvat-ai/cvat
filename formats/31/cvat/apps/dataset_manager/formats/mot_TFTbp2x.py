# SPDX-License-Identifier: MIT
format_spec = {
    "name": "MOT",
    "dumpers": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "1.1",
            "handler": "dump"
        },
    ],
    "loaders": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "1.1",
            "handler": "load",
        }
    ],
}


from datumaro.plugins.mot_format import \
    MotSeqGtConverter as _MotConverter
class CvatMotConverter(_MotConverter):
    NAME = 'cvat_mot'

def dump(file_object, annotations):
    from cvat.apps.dataset_manager.bindings import CvatAnnotationsExtractor
    from cvat.apps.dataset_manager.util import make_zip_archive
    from tempfile import TemporaryDirectory

    extractor = CvatAnnotationsExtractor('', annotations)
    converter = CvatMotConverter()
    with TemporaryDirectory() as temp_dir:
        converter(extractor, save_dir=temp_dir)
        make_zip_archive(temp_dir, file_object)


def load(file_object, annotations):
    from pyunpack import Archive
    from tempfile import TemporaryDirectory
    from datumaro.plugins.mot_format import MotSeqImporter
    import datumaro.components.extractor as datumaro
    from cvat.apps.dataset_manager.bindings import match_frame

    archive_file = file_object if isinstance(file_object, str) else getattr(file_object, "name")
    with TemporaryDirectory() as tmp_dir:
        Archive(archive_file).extractall(tmp_dir)

        tracks = {}

        dm_dataset = MotSeqImporter()(tmp_dir).make_dataset()
        label_cat = dm_dataset.categories()[datumaro.AnnotationType.label]

        for item in dm_dataset:
            frame_id = match_frame(item, annotations)

            for ann in item.annotations:
                if ann.type != datumaro.AnnotationType.bbox:
                    continue

                track_id = ann.attributes.get('track_id')
                if track_id is None:
                    continue

                shape = annotations.TrackedShape(
                    type='rectangle',
                    points=ann.points,
                    occluded=ann.attributes.get('occluded') == True,
                    outside=False,
                    keyframe=False,
                    z_order=ann.z_order,
                    frame=frame_id,
                    attributes=[],
                )

                # build trajectories as lists of shapes in track dict
                if track_id not in tracks:
                    tracks[track_id] = annotations.Track(
                        label_cat.items[ann.label].name, 0, [])
                tracks[track_id].shapes.append(shape)

        for track in tracks.values():
            # MOT annotations do not require frames to be ordered
            track.shapes.sort(key=lambda t: t.frame)
            # Set outside=True for the last shape in a track to finish the track
            track.shapes[-1] = track.shapes[-1]._replace(outside=True)
            annotations.add_track(track)
