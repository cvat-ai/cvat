# SPDX-License-Identifier: MIT
format_spec = {
    "name": "MOT",
    "dumpers": [
        {
            "display_name": "{name} {format} {version}",
            "format": "CSV",
            "version": "1.0",
            "handler": "dump"
        },
    ],
    "loaders": [
        {
            "display_name": "{name} {format} {version}",
            "format": "CSV",
            "version": "1.0",
            "handler": "load",
        }
    ],
}


MOT = [
    "frame_id",
    "track_id",
    "xtl",
    "ytl",
    "width",
    "height",
    "confidence",
    "class_id",
    "visibility"
]


def dump(file_object, annotations):
    """ Export track shapes in MOT CSV format. Due to limitations of the MOT
    format, this process only supports rectangular interpolation mode
    annotations.
    """
    import csv
    import io

    # csv requires a text buffer
    with io.TextIOWrapper(file_object, encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=MOT)
        for i, track in enumerate(annotations.tracks):
            for shape in track.shapes:
                # MOT doesn't support polygons or 'outside' property
                if shape.type != 'rectangle':
                    continue
                writer.writerow({
                    "frame_id": shape.frame,
                    "track_id": i,
                    "xtl": shape.points[0],
                    "ytl": shape.points[1],
                    "width": shape.points[2] - shape.points[0],
                    "height": shape.points[3] - shape.points[1],
                    "confidence": 1,
                    "class_id": track.label,
                    "visibility": 1 - int(shape.occluded)
                })


def load(file_object, annotations):
    """ Read MOT CSV format and convert objects to annotated tracks.
    """
    import csv
    import io
    tracks = {}
    # csv requires a text buffer
    with io.TextIOWrapper(file_object, encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file, fieldnames=MOT)
        for row in reader:
            # create one shape per row
            xtl = float(row["xtl"])
            ytl = float(row["ytl"])
            xbr = xtl + float(row["width"])
            ybr = ytl + float(row["height"])
            shape = annotations.TrackedShape(
                type="rectangle",
                points=[xtl, ytl, xbr, ybr],
                occluded=float(row["visibility"]) == 0,
                outside=False,
                keyframe=False,
                z_order=0,
                frame=int(row["frame_id"]),
                attributes=[],
            )
            # build trajectories as lists of shapes in track dict
            track_id = int(row["track_id"])
            if track_id not in tracks:
                tracks[track_id] = annotations.Track(row["class_id"], track_id, [])
            tracks[track_id].shapes.append(shape)
        for track in tracks.values():
            # Set outside=True for the last shape since MOT has no support
            # for this flag
            last = annotations.TrackedShape(
                type=track.shapes[-1].type,
                points=track.shapes[-1].points,
                occluded=track.shapes[-1].occluded,
                outside=True,
                keyframe=track.shapes[-1].keyframe,
                z_order=track.shapes[-1].z_order,
                frame=track.shapes[-1].frame,
                attributes=track.shapes[-1].attributes,
            )
            track.shapes[-1] = last
            annotations.add_track(track)
