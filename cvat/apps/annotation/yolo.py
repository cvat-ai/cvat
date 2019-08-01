format_spec = {
    "name": "YOLO",
    "dumpers": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "1.0",
            "handler": "dump"
        },
    ],
    "loaders": [
        {
            "display_name": "{name} {format}",
            "format": "ZIP",
            "version": "1.0",
            "handler": "load"
        },
    ],
}

def get_filename(path):
    import os
    return os.path.splitext(os.path.basename(path))[0]

def load(file_object, annotations):
    from pyunpack import Archive
    import os
    from tempfile import TemporaryDirectory

    def get_filename(path):
        import os
        return os.path.splitext(os.path.basename(path))[0]

    def convert_from_yolo(img_size, box):
        def clamp(value, _min, _max):
            return max(min(_max, value), _min)
        xtl = clamp(img_size[0] * (box[0] - box[2] / 2), 0, img_size[0])
        ytl = clamp(img_size[1] * (box[1] - box[3] / 2), 0, img_size[1])
        xbr = clamp(img_size[0] * (box[0] + box[2] / 2), 0, img_size[0])
        ybr = clamp(img_size[1] * (box[1] + box[3] / 2), 0, img_size[1])

        return [xtl, ytl, xbr, ybr]

    def parse_yolo_obj(img_size, obj):
        label_id, x, y, w, h = obj.split(' ')
        return int(label_id), convert_from_yolo(img_size, (float(x), float(y), float(w), float(h)))

    def match_frame(frame_info, filename):
        import re
        # try to match by filename
        yolo_filename = get_filename(filename)
        for frame_number, info in frame_info.items():
            cvat_filename = get_filename(info['path'])
            if cvat_filename == yolo_filename:
                return frame_number

        # try to extract frame number from filename
        possible_numbers = re.findall(r'\d+', filename)
        if possible_numbers and len(possible_numbers) == 1:
            return int(possible_numbers[0])

        raise Exception('Cannot match filename or determinate framenumber for {} filename'.format(filename))

    def parse_yolo_file(annotation_file, labels_mapping):
        with open(annotation_file, "r") as fp:
            line = fp.readline()
            while line:
                frame_number = match_frame(annotations.frame_info, annotation_file)
                frame_info = annotations.frame_info[frame_number]
                label_id, points = parse_yolo_obj((frame_info['width'], frame_info['height']), line)
                annotations.add_shape(annotations.LabeledShape(
                    type='rectangle',
                    frame=frame_number,
                    label=labels_mapping[label_id],
                    points=points,
                    occluded=False,
                    attributes=[],
                ))
                line = fp.readline()

    archive_file = file_object if isinstance(file_object, str) else getattr(file_object, 'name')
    labels_mapping = {idx: label[1]["name"] for idx, label in enumerate(annotations.meta['task']['labels'])}
    with TemporaryDirectory() as tmp_dir:
        Archive(archive_file).extractall(tmp_dir)

        for dirpath, dirnames, filenames in os.walk(tmp_dir):
            for file in filenames:
                if '.txt' == os.path.splitext(file)[1]:
                    parse_yolo_file(os.path.join(dirpath, file), labels_mapping)


def dump(file_object, annotations):
    import os
    from zipfile import ZipFile
    from tempfile import TemporaryDirectory

    def convert_to_yolo(img_size, box):
        x = (box[0] + box[2]) / 2 / img_size[0]
        y = (box[1] + box[3]) / 2 / img_size[1]
        w = (box[2] - box[0]) / img_size[0]
        h = (box[3] - box[1]) / img_size[1]

        return x, y, w, h

    labels_ids = {label[1]["name"]: idx for idx, label in enumerate(annotations.meta['task']['labels'])}

    with TemporaryDirectory() as out_dir:
        with ZipFile(file_object, 'w') as output_zip:
            for frame_annotation in annotations.group_by_frame():
                image_name = frame_annotation.name
                annotation_name = "{}.txt".format(get_filename(image_name))
                width = frame_annotation.width
                height = frame_annotation.height

                yolo_annotation = ""
                for shape in frame_annotation.labeled_shapes:
                    if shape.type != "rectangle":
                        continue

                    label = shape.label
                    yolo_bb = convert_to_yolo((width, height), shape.points)
                    yolo_bb = " ".join("{:.6f}".format(p) for p in yolo_bb)
                    yolo_annotation += "{} {}\n".format(labels_ids[label], yolo_bb)

                output_zip.writestr(annotation_name, yolo_annotation)
