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
    from zipfile import ZipFile
    import numpy as np
    import os
    from pycocotools import mask as maskUtils
    import matplotlib.image
    import io
    from collections import OrderedDict

    # RGB format, (0, 0, 0) used for background
    def genearte_pascal_colormap(size=256):
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

    colormap = genearte_pascal_colormap()
    labels = [label[1]["name"] for label in annotations.meta["task"]["labels"] if label[1]["name"] != 'background']
    labels.insert(0, 'background')
    label_colors = OrderedDict((label, colormap[idx]) for idx, label in enumerate(labels))

    with ZipFile(file_object, "w") as output_zip:
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
            img = np.zeros((height, width, 3))
            buf = io.BytesIO()
            for shape in shapes:
                points = shape.points if shape.type != 'rectangle' else convert_box_to_polygon(shape.points)
                rles = maskUtils.frPyObjects([points], height, width)
                rle = maskUtils.merge(rles)
                mask = maskUtils.decode(rle)
                color = label_colors[shape.label] / 255
                idx = (mask > 0)
                img[idx] = color

            matplotlib.image.imsave(buf, img, format='png')
            output_zip.writestr(annotation_name, buf.getvalue())
        labels = '\n'.join('{}:{}'.format(label, ','.join(str(i) for i in color)) for label, color in label_colors.items())
        output_zip.writestr('colormap.txt', labels)
