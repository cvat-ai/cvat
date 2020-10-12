# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import cv2
import numpy as np
from skimage.measure import approximate_polygon, find_contours
from model_loader import ModelLoader

class ModelHandler:
    def __init__(self, labels):
        base_dir = os.path.abspath(os.environ.get("MODEL_PATH",
            "/opt/nuclio/open_model_zoo/intel/semantic-segmentation-adas-0001/FP32"))
        model_xml = os.path.join(base_dir, "semantic-segmentation-adas-0001.xml")
        model_bin = os.path.join(base_dir, "semantic-segmentation-adas-0001.bin")
        self.model = ModelLoader(model_xml, model_bin)
        self.labels = labels

    def infer(self, image, threshold):
        output_layer = self.model.infer(image)

        results = []
        mask = output_layer[0, 0, :, :]
        width, height = mask.shape

        for i in range(len(self.labels)):
            mask_by_label = np.zeros((width, height), dtype=np.uint8)

            mask_by_label = ((mask == float(i)) * 255).astype(np.float32)
            mask_by_label = cv2.resize(mask_by_label,
                dsize=(image.width, image.height),
                interpolation=cv2.INTER_CUBIC)

            contours = find_contours(mask_by_label, 0.8)

            for contour in contours:
                contour = np.flip(contour, axis=1)
                contour = approximate_polygon(contour, tolerance=2.5)
                if len(contour) < 3:
                    continue

                results.append({
                    "confidence": None,
                    "label": self.labels.get(i, "unknown"),
                    "points": contour.ravel().tolist(),
                    "type": "polygon",
                })

        return results