# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import cv2
import numpy as np
from model_loader import ModelLoader
from skimage.measure import approximate_polygon, find_contours


MASK_THRESHOLD = 0.5

# Ref: https://software.intel.com/en-us/forums/computer-vision/topic/804895
def segm_postprocess(box: list, raw_cls_mask, im_h, im_w):
    ymin, xmin, ymax, xmax = box

    width = int(abs(xmax - xmin))
    height = int(abs(ymax - ymin))

    result = np.zeros((im_h, im_w), dtype=np.uint8)
    resized_mask = cv2.resize(raw_cls_mask, dsize=(height, width), interpolation=cv2.INTER_CUBIC)

    # extract the ROI of the image
    ymin = int(round(ymin))
    xmin = int(round(xmin))
    ymax = ymin + height
    xmax = xmin + width
    result[xmin:xmax, ymin:ymax] = (resized_mask>MASK_THRESHOLD).astype(np.uint8) * 255

    return result

class ModelHandler:
    def __init__(self, labels):
        base_dir = os.path.abspath(os.environ.get("MODEL_PATH",
            "/opt/nuclio/open_model_zoo/public/mask_rcnn_inception_resnet_v2_atrous_coco/FP32"))
        model_xml = os.path.join(base_dir, "mask_rcnn_inception_resnet_v2_atrous_coco.xml")
        model_bin = os.path.join(base_dir, "mask_rcnn_inception_resnet_v2_atrous_coco.bin")
        self.model = ModelLoader(model_xml, model_bin)
        self.labels = labels

    def infer(self, image, threshold):
        output_layer = self.model.infer(image)

        results = []
        masks = output_layer['masks']
        boxes = output_layer['reshape_do_2d']

        for index, box in enumerate(boxes):
            obj_class = int(box[1])
            obj_value = box[2]
            obj_label = self.labels.get(obj_class, "unknown")
            if obj_value >= threshold:
                xtl = box[3] * image.width
                ytl = box[4] * image.height
                xbr = box[5] * image.width
                ybr = box[6] * image.height
                mask = masks[index][obj_class - 1]

                mask = segm_postprocess((xtl, ytl, xbr, ybr),
                    mask, image.height, image.width)

                contours = find_contours(mask, MASK_THRESHOLD)
                contour = contours[0]
                contour = np.flip(contour, axis=1)
                contour = approximate_polygon(contour, tolerance=2.5)
                if len(contour) < 3:
                    continue

                results.append({
                    "confidence": str(obj_value),
                    "label": obj_label,
                    "points": contour.ravel().tolist(),
                    "type": "polygon",
                })

        return results