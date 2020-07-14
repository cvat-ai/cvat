# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import numpy as np
from model_loader import ModelLoader
from pixel_link_mobilenet_v2 import PixelLinkDecoder

class ModelHandler:
    def __init__(self, labels):
        base_dir = os.environ.get("MODEL_PATH",
            "/opt/nuclio/open_model_zoo/intel/text-detection-0004/FP32")
        model_xml = os.path.join(base_dir, "text-detection-0004.xml")
        model_bin = os.path.join(base_dir, "text-detection-0004.bin")
        self.model = ModelLoader(model_xml, model_bin)
        self.labels = labels

    def infer(self, image, pixel_threshold, link_threshold):
        output_layer = self.model.infer(image)

        results = []
        obj_class = 1
        pcd = PixelLinkDecoder(pixel_threshold, link_threshold)

        pcd.decode(image.height, image.width, output_layer)
        for box in pcd.bboxes:
            results.append({
                "confidence": None,
                "label": self.labels.get(obj_class, "unknown"),
                "points": box.ravel().tolist(),
                "type": "polygon",
            })

        return results