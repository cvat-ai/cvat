# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from model_loader import ModelLoader

class ModelHandler:
    def __init__(self, labels):
        base_dir = os.path.abspath(os.environ.get("MODEL_PATH",
            "/opt/nuclio/open_model_zoo/public/faster_rcnn_inception_resnet_v2_atrous_coco/FP32"))
        model_xml = os.path.join(base_dir, "faster_rcnn_inception_resnet_v2_atrous_coco.xml")
        model_bin = os.path.join(base_dir, "faster_rcnn_inception_resnet_v2_atrous_coco.bin")
        self.model = ModelLoader(model_xml, model_bin)
        self.labels = labels

    def infer(self, image, threshold):
        output_layer = self.model.infer(image)

        results = []
        prediction = output_layer[0][0]
        for obj in prediction:
            obj_class = int(obj[1])
            obj_value = obj[2]
            obj_label = self.labels.get(obj_class, "unknown")
            if obj_value >= threshold:
                xtl = obj[3] * image.width
                ytl = obj[4] * image.height
                xbr = obj[5] * image.width
                ybr = obj[6] * image.height

                results.append({
                    "confidence": str(obj_value),
                    "label": obj_label,
                    "points": [xtl, ytl, xbr, ybr],
                    "type": "rectangle",
                })

        return results
