# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "TFRecord",
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
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "1.0",
            "handler": "load"
        },
    ],
}

def dump(file_object, annotations):
    import tensorflow as tf
    import os
    import string
    from zipfile import ZipFile
    import codecs
    from tempfile import TemporaryDirectory
    from collections import OrderedDict

    # we need it to filter out non-ASCII characters otherwise
    # trainning will crash
    printable = set(string.printable)

    def int64_feature(value):
        return tf.train.Feature(int64_list=tf.train.Int64List(value=[value]))

    def int64_list_feature(value):
        return tf.train.Feature(int64_list=tf.train.Int64List(value=value))

    def bytes_feature(value):
        return tf.train.Feature(bytes_list=tf.train.BytesList(value=[value]))

    def bytes_list_feature(value):
        return tf.train.Feature(bytes_list=tf.train.BytesList(value=value))

    def float_list_feature(value):
        return tf.train.Feature(float_list=tf.train.FloatList(value=value))

    # Defining the main conversion function
    def create_tf_example(img_id, img_size, image_name, boxes, label_ids):
        # Process one image data per run
        height = img_size[0]
        width = img_size[1]

        xmins = [] # List of normalized left x coordinates in bounding box (1 per box)
        xmaxs = [] # List of normalized right x coordinates in bounding box
                    # (1 per box)
        ymins = [] # List of normalized top y coordinates in bounding box (1 per box)
        ymaxs = [] # List of normalized bottom y coordinates in bounding box
                    # (1 per box)
        classes_text = [] # List of string class name of bounding box (1 per box)
        classes = [] # List of integer class id of bounding box (1 per box)

        # Loop oer the boxes and fill the above fields
        for box in boxes:
            # filter out non-ASCII characters
            box_name = ''.join(filter(lambda x: x in printable, box.label))

            xmins.append(box.points[0] / width)
            xmaxs.append(box.points[2] / width)
            ymins.append(box.points[1] / height)
            ymaxs.append(box.points[3] / height)
            classes_text.append(box_name.encode('utf8'))
            classes.append(label_ids[box.label])

        tf_example = tf.train.Example(features=tf.train.Features(feature={
            'image/height': int64_feature(height),
            'image/width': int64_feature(width),
            'image/filename': bytes_feature(image_name.encode('utf8')),
            'image/source_id': int64_feature(img_id),
            'image/object/bbox/xmin': float_list_feature(xmins),
            'image/object/bbox/xmax': float_list_feature(xmaxs),
            'image/object/bbox/ymin': float_list_feature(ymins),
            'image/object/bbox/ymax': float_list_feature(ymaxs),
            'image/object/class/text': bytes_list_feature(classes_text),
            'image/object/class/label': int64_list_feature(classes),
        }))
        return tf_example

    # Create the label map file
    label_ids = OrderedDict((label[1]["name"], idx) for idx, label in enumerate(annotations.meta["task"]["labels"]))
    with TemporaryDirectory() as out_dir:
        labelmap_file = 'label_map.pbtxt'
        with codecs.open(os.path.join(out_dir, labelmap_file), 'w', encoding='utf8') as f:
            for label, idx in label_ids.items():
                f.write(u'item {\n')
                f.write(u'\tid: {}\n'.format(idx))
                f.write(u"\tname: '{}'\n".format(label))
                f.write(u'}\n\n')

        annotation_file = '{}.tfrecord'.format(annotations.meta['task']['name'])
        with tf.io.TFRecordWriter(os.path.join(out_dir, annotation_file)) as writer:
            for frame_annotation in annotations.group_by_frame():
                boxes = [shape for shape in frame_annotation.labeled_shapes if shape.type == 'rectangle']
                if not boxes:
                    continue
                tf_example = create_tf_example(
                    img_id=frame_annotation.frame,
                    img_size=(frame_annotation.height, frame_annotation.width),
                    image_name=frame_annotation.name,
                    boxes=boxes,
                    label_ids=label_ids,
                )
                writer.write(tf_example.SerializeToString())

        with ZipFile(file_object, 'w') as output_zip:
            output_zip.write(filename=os.path.join(out_dir, labelmap_file), arcname=labelmap_file)
            output_zip.write(filename=os.path.join(out_dir, annotation_file), arcname=annotation_file)

def load(file_object, annotations):
    from pyunpack import Archive
    from tempfile import TemporaryDirectory
    import os
    import tensorflow as tf
    from glob import glob
    import numpy as np

    tf.enable_eager_execution()

    def parse_tfrecord_file(filenames):
        def clamp(value, _min, _max):
            return max(min(_max, value), _min)

        dataset = tf.data.TFRecordDataset(filenames)
        image_feature_description = {
            'image/filename': tf.io.FixedLenFeature([], tf.string),
            'image/source_id': tf.io.FixedLenFeature([], tf.int64),
            'image/height': tf.io.FixedLenFeature([], tf.int64),
            'image/width': tf.io.FixedLenFeature([], tf.int64),
            # Object boxes and classes.
            'image/object/bbox/xmin': tf.io.VarLenFeature(tf.float32),
            'image/object/bbox/xmax': tf.io.VarLenFeature(tf.float32),
            'image/object/bbox/ymin': tf.io.VarLenFeature(tf.float32),
            'image/object/bbox/ymax': tf.io.VarLenFeature(tf.float32),
            'image/object/class/label': tf.io.VarLenFeature(tf.int64),
            'image/object/class/text': tf.io.VarLenFeature(tf.string),
        }

        for record in dataset:
            parsed_record = tf.io.parse_single_example(record, image_feature_description)
            frame_number = tf.cast(parsed_record['image/source_id'], tf.int64).numpy().item()
            frame_height = tf.cast(parsed_record['image/height'], tf.int64).numpy().item()
            frame_width = tf.cast(parsed_record['image/width'], tf.int64).numpy().item()
            xmins = tf.sparse.to_dense(parsed_record['image/object/bbox/xmin']).numpy()
            ymins = tf.sparse.to_dense(parsed_record['image/object/bbox/ymin']).numpy()
            xmaxs = tf.sparse.to_dense(parsed_record['image/object/bbox/xmax']).numpy()
            ymaxs = tf.sparse.to_dense(parsed_record['image/object/bbox/ymax']).numpy()
            labels = tf.sparse.to_dense(parsed_record['image/object/class/text'], default_value='').numpy()
            for shape in np.dstack((labels, xmins, ymins, xmaxs, ymaxs))[0]:
                annotations.add_shape(annotations.LabeledShape(
                    type='rectangle',
                    frame=frame_number,
                    label=shape[0].decode("utf-8"),
                    points=[
                        clamp(shape[1] * frame_width, 0, frame_width),
                        clamp(shape[2] * frame_height, 0, frame_height),
                        clamp(shape[3] * frame_width, 0, frame_width),
                        clamp(shape[4] * frame_height, 0, frame_height),
                    ],
                    occluded=False,
                    attributes=[],
                ))

    archive_file = getattr(file_object, 'name')
    with TemporaryDirectory() as tmp_dir:
        Archive(archive_file).extractall(tmp_dir)
        filenames = glob(os.path.join(tmp_dir, '*.tfrecord'))
        parse_tfrecord_file(filenames)
