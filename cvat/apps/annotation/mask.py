# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "MASK",
    "dumpers": [
        {
            "display_name": "{name} {format} {version}",
            "format": "ZIP",
            "version": "1.0",
            "handler": "dump"
        },
    ],
    "loaders": [
    ],
}

def dump(file_object, annotations):
    from zipfile import ZipFile, ZIP_STORED
    import numpy as np
    import os
    from pycocotools import mask as maskUtils
    import matplotlib.image
    import io
    from collections import OrderedDict

    # RGB format, (0, 0, 0) used for background
    def generate_pascal_colormap(size=256):
        colormap = np.zeros((size, 3), dtype=int)
        ind = np.arange(size, dtype=int)

        for shift in reversed(range(8)):
            for channel in range(3):
                colormap[:, channel] |= ((ind >> channel) & 1) << shift
            ind >>= 3

        return colormap

    def convert_box_to_polygon(points):
        xtl = shape.points[0]
        ytl = shape.points[1]
        xbr = shape.points[2]
        ybr = shape.points[3]

        return [xtl, ytl, xbr, ytl, xbr, ybr, xtl, ybr]

    colormap = generate_pascal_colormap()
    labels = [label[1]["name"] for label in annotations.meta["task"]["labels"] if label[1]["name"] != 'background']
    labels.insert(0, 'background')
    label_colors = OrderedDict((label, colormap[idx]) for idx, label in enumerate(labels))
    instance_colors = OrderedDict((idx, colormap[idx]) for idx in range(len(colormap)))

    with ZipFile(file_object, "w", ZIP_STORED) as output_zip:
        for frame_annotation in annotations.group_by_frame():
            image_name = frame_annotation.name
            annotation_name = "{}.png".format(os.path.splitext(os.path.basename(image_name))[0])
            width = frame_annotation.width
            height = frame_annotation.height

            shapes = frame_annotation.labeled_shapes
            # convert to mask only rectangles and polygons
            shapes = [shape for shape in shapes if shape.type == 'rectangle' or shape.type == 'polygon']
            if not shapes:
                continue
            shapes = sorted(shapes, key=lambda x: int(x.z_order))
            img_class_mask = np.zeros((height, width, 3))
            img_instance_mask = np.zeros((height, width, 3))
            buf_class_mask = io.BytesIO()
            buf_instance_mask = io.BytesIO()
            for shape_index, shape in enumerate(shapes):
                points = shape.points if shape.type != 'rectangle' else convert_box_to_polygon(shape.points)
                rles = maskUtils.frPyObjects([points], height, width)
                rle = maskUtils.merge(rles)
                mask = maskUtils.decode(rle)
                idx = (mask > 0)
                # get corresponding color for each class
                label_color = label_colors[shape.label] / 255
                img_class_mask[idx] = label_color
                # get corresponding instance color for each shape
                instance_color = instance_colors[shape_index+1] / 255
                img_instance_mask[idx] = instance_color

            # write class mask into SegmentationClass
            matplotlib.image.imsave(buf_class_mask, img_class_mask, format='png')
            output_zip.writestr(os.path.join("SegmentationClass", annotation_name), buf_class_mask.getvalue())
            # write instance mask into SegmentationObject
            matplotlib.image.imsave(buf_instance_mask, img_instance_mask, format='png')
            output_zip.writestr(os.path.join("SegmentationObject", annotation_name), buf_instance_mask.getvalue())
        # Store color map for each class
        labels = '\n'.join('{}:{}'.format(label, ','.join(str(i) for i in color)) for label, color in label_colors.items())
        output_zip.writestr('class_colormap.txt', labels)
        labels = '\n'.join('{}:{}'.format(label, ','.join(str(i) for i in color)) for label, color in instance_colors.items())
        output_zip.writestr('instance_colormap.txt', labels)
