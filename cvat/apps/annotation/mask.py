# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

format_spec = {
    "name": "MASK",
    "dumpers": [
        {
            "display_name": "{name} (by class) {format} {version}",
            "format": "ZIP",
            "version": "1.0",
            "handler": "dump_by_class"
        },
        {
            "display_name": "{name} (by instance) {format} {version}",
            "format": "ZIP",
            "version": "1.0",
            "handler": "dump_by_instance"
        },
    ],
    "loaders": [
    ],
}

MASK_BY_CLASS = 0
MASK_BY_INSTANCE = 1

def convert_box_to_polygon(shape):
        xtl = shape.points[0]
        ytl = shape.points[1]
        xbr = shape.points[2]
        ybr = shape.points[3]

        return [xtl, ytl, xbr, ytl, xbr, ybr, xtl, ybr]

def create_mask_colorizer(annotations, colorize_type):
    import numpy as np
    from collections import OrderedDict

    class MaskColorizer:

        def __init__(self, annotations, colorize_type):

            if colorize_type == MASK_BY_CLASS:
                self.colors = self.gen_class_mask_colors(annotations)
            elif colorize_type == MASK_BY_INSTANCE:
                self.colors = self.gen_instance_mask_colors()

        def generate_pascal_colormap(self, size=256):
            # RGB format, (0, 0, 0) used for background
            colormap = np.zeros((size, 3), dtype=int)
            ind = np.arange(size, dtype=int)

            for shift in reversed(range(8)):
                for channel in range(3):
                    colormap[:, channel] |= ((ind >> channel) & 1) << shift
                ind >>= 3

            return colormap

        def gen_class_mask_colors(self, annotations):
            colormap = self.generate_pascal_colormap()
            labels = [label[1]["name"] for label in annotations.meta["task"]["labels"] if label[1]["name"] != 'background']
            labels.insert(0, 'background')
            label_colors = OrderedDict((label, colormap[idx]) for idx, label in enumerate(labels))

            return label_colors

        def gen_instance_mask_colors(self):
            colormap = self.generate_pascal_colormap()
            instance_colors = OrderedDict((idx, colormap[idx]) for idx in range(len(colormap)))

            return instance_colors

    return MaskColorizer(annotations, colorize_type)

def dump_by_class(file_object, annotations):
    from zipfile import ZipFile, ZIP_STORED
    import numpy as np
    import os
    from pycocotools import mask as maskUtils
    import matplotlib.image
    import io

    colorizer = create_mask_colorizer(annotations, colorize_type=MASK_BY_CLASS)

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
            buf_class_mask = io.BytesIO()
            for shape_index, shape in enumerate(shapes):
                points = shape.points if shape.type != 'rectangle' else convert_box_to_polygon(shape)
                rles = maskUtils.frPyObjects([points], height, width)
                rle = maskUtils.merge(rles)
                mask = maskUtils.decode(rle)
                idx = (mask > 0)
                # get corresponding color for each class
                label_color = colorizer.colors[shape.label] / 255
                img_class_mask[idx] = label_color

            # write class mask into SegmentationClass
            matplotlib.image.imsave(buf_class_mask, img_class_mask, format='png')
            output_zip.writestr(os.path.join("SegmentationClass", annotation_name), buf_class_mask.getvalue())
        # Store color map for each class
        labels = '\n'.join('{}:{}'.format(label, ','.join(str(i) for i in color)) for label, color in colorizer.colors.items())
        output_zip.writestr('colormap.txt', labels)

def dump_by_instance(file_object, annotations):
    from zipfile import ZipFile, ZIP_STORED
    import numpy as np
    import os
    from pycocotools import mask as maskUtils
    import matplotlib.image
    import io

    colorizer = create_mask_colorizer(annotations, colorize_type=MASK_BY_INSTANCE)

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
            img_instance_mask = np.zeros((height, width, 3))
            buf_instance_mask = io.BytesIO()
            for shape_index, shape in enumerate(shapes):
                points = shape.points if shape.type != 'rectangle' else convert_box_to_polygon(shape)
                rles = maskUtils.frPyObjects([points], height, width)
                rle = maskUtils.merge(rles)
                mask = maskUtils.decode(rle)
                idx = (mask > 0)
                # get corresponding instance color for each shape
                instance_color = colorizer.colors[shape_index+1] / 255
                img_instance_mask[idx] = instance_color

            # write instance mask into SegmentationObject
            matplotlib.image.imsave(buf_instance_mask, img_instance_mask, format='png')
            output_zip.writestr(os.path.join("SegmentationObject", annotation_name), buf_instance_mask.getvalue())
        # Store color map for each class
        labels = '\n'.join('{}:{}'.format(label, ','.join(str(i) for i in color)) for label, color in colorizer.colors.items())
        output_zip.writestr('colormap.txt', labels)
