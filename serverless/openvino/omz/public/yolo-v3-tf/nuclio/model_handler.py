# Copyright (C) 2020-2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from math import exp
from model_loader import ModelLoader

class YoloParams:
    # ------------------------------------------- Extracting layer parameters ------------------------------------------
    # Magic numbers are copied from yolo samples
    def __init__(self, param, side):
        self.num = 3 if 'num' not in param else int(param['num'])
        self.coords = 4 if 'coords' not in param else int(param['coords'])
        self.classes = 80 if 'classes' not in param else int(param['classes'])
        self.side = side
        self.anchors = [10.0, 13.0, 16.0, 30.0, 33.0, 23.0, 30.0, 61.0, 62.0, 45.0, 59.0, 119.0, 116.0, 90.0, 156.0,
                        198.0,
                        373.0, 326.0] if 'anchors' not in param else [float(a) for a in param['anchors'].split(',')]

        self.isYoloV3 = False

        if param.get('mask'):
            mask = [int(idx) for idx in param['mask'].split(',')]
            self.num = len(mask)

            maskedAnchors = []
            for idx in mask:
                maskedAnchors += [self.anchors[idx * 2], self.anchors[idx * 2 + 1]]
            self.anchors = maskedAnchors

            self.isYoloV3 = True # Weak way to determine but the only one.


def entry_index(side, coord, classes, location, entry):
    side_power_2 = side ** 2
    n = location // side_power_2
    loc = location % side_power_2
    return int(side_power_2 * (n * (coord + classes + 1) + entry) + loc)


def scale_bbox(x, y, h, w, class_id, confidence, h_scale, w_scale):
    xmin = int((x - w / 2) * w_scale)
    ymin = int((y - h / 2) * h_scale)
    xmax = int(xmin + w * w_scale)
    ymax = int(ymin + h * h_scale)
    return dict(xmin=xmin, xmax=xmax, ymin=ymin, ymax=ymax, class_id=class_id, confidence=confidence)


def parse_yolo_region(blob, resized_image_shape, original_im_shape, params, threshold):
    # ------------------------------------------ Validating output parameters ------------------------------------------
    _, _, out_blob_h, out_blob_w = blob.shape
    assert out_blob_w == out_blob_h, "Invalid size of output blob. It should be in NCHW layout and height should " \
                                     "be equal to width. Current height = {}, current width = {}" \
                                     "".format(out_blob_h, out_blob_w)

    # ------------------------------------------ Extracting layer parameters -------------------------------------------
    orig_im_h, orig_im_w = original_im_shape
    resized_image_h, resized_image_w = resized_image_shape
    objects = list()
    predictions = blob.flatten()
    side_square = params.side * params.side

    # ------------------------------------------- Parsing YOLO Region output -------------------------------------------
    for i in range(side_square):
        row = i // params.side
        col = i % params.side
        for n in range(params.num):
            obj_index = entry_index(params.side, params.coords, params.classes, n * side_square + i, params.coords)
            scale = predictions[obj_index]
            if scale < threshold:
                continue
            box_index = entry_index(params.side, params.coords, params.classes, n * side_square + i, 0)
            # Network produces location predictions in absolute coordinates of feature maps.
            # Scale it to relative coordinates.
            x = (col + predictions[box_index + 0 * side_square]) / params.side
            y = (row + predictions[box_index + 1 * side_square]) / params.side
            # Value for exp is very big number in some cases so following construction is using here
            try:
                w_exp = exp(predictions[box_index + 2 * side_square])
                h_exp = exp(predictions[box_index + 3 * side_square])
            except OverflowError:
                continue
            # Depends on topology we need to normalize sizes by feature maps (up to YOLOv3) or by input shape (YOLOv3)
            w = w_exp * params.anchors[2 * n] / (resized_image_w if params.isYoloV3 else params.side)
            h = h_exp * params.anchors[2 * n + 1] / (resized_image_h if params.isYoloV3 else params.side)
            for j in range(params.classes):
                class_index = entry_index(params.side, params.coords, params.classes, n * side_square + i,
                                          params.coords + 1 + j)
                confidence = scale * predictions[class_index]
                if confidence < threshold:
                    continue
                objects.append(scale_bbox(x=x, y=y, h=h, w=w, class_id=j, confidence=confidence,
                                          h_scale=orig_im_h, w_scale=orig_im_w))
    return objects


def intersection_over_union(box_1, box_2):
    width_of_overlap_area = min(box_1['xmax'], box_2['xmax']) - max(box_1['xmin'], box_2['xmin'])
    height_of_overlap_area = min(box_1['ymax'], box_2['ymax']) - max(box_1['ymin'], box_2['ymin'])
    if width_of_overlap_area < 0 or height_of_overlap_area < 0:
        area_of_overlap = 0
    else:
        area_of_overlap = width_of_overlap_area * height_of_overlap_area
    box_1_area = (box_1['ymax'] - box_1['ymin']) * (box_1['xmax'] - box_1['xmin'])
    box_2_area = (box_2['ymax'] - box_2['ymin']) * (box_2['xmax'] - box_2['xmin'])
    area_of_union = box_1_area + box_2_area - area_of_overlap
    if area_of_union == 0:
        return 0
    return area_of_overlap / area_of_union


class ModelHandler:
    def __init__(self, labels):
        base_dir = os.path.abspath(os.environ.get("MODEL_PATH",
            "/opt/nuclio/open_model_zoo/public/yolo-v3-tf/FP32"))
        model_xml = os.path.join(base_dir, "yolo-v3-tf.xml")
        model_bin = os.path.join(base_dir, "yolo-v3-tf.bin")
        self.model = ModelLoader(model_xml, model_bin)
        self.labels = labels

    def infer(self, image, threshold):
        output_layer = self.model.infer(image)

        # Collecting object detection results
        objects = []
        origin_im_size = (image.height, image.width)
        for layer_name, out_blob in output_layer.items():
            out_blob = out_blob.reshape(self.model.layers[self.model.layers[layer_name].parents[0]].shape)
            layer_params = YoloParams(self.model.layers[layer_name].params, out_blob.shape[2])
            objects += parse_yolo_region(out_blob, self.model.input_size(),
                origin_im_size, layer_params, threshold)

        # Filtering overlapping boxes (non-maximum suppression)
        IOU_THRESHOLD = 0.4
        objects = sorted(objects, key=lambda obj : obj['confidence'], reverse=True)
        for i, obj in enumerate(objects):
            if obj['confidence'] == 0:
                continue
            for j in range(i + 1, len(objects)):
                if intersection_over_union(obj, objects[j]) > IOU_THRESHOLD:
                    objects[j]['confidence'] = 0

        results = []
        for obj in objects:
            if obj['confidence'] >= threshold:
                xtl = max(obj['xmin'], 0)
                ytl = max(obj['ymin'], 0)
                xbr = min(obj['xmax'], image.width)
                ybr = min(obj['ymax'], image.height)
                obj_class = int(obj['class_id'])

                results.append({
                    "confidence": str(obj['confidence']),
                    "label": self.labels.get(obj_class, "unknown"),
                    "points": [xtl, ytl, xbr, ybr],
                    "type": "rectangle",
                })

        return results