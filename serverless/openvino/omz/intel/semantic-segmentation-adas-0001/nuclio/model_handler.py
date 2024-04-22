# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

import cv2
import numpy as np
from model_loader import ModelLoader
from shared import to_cvat_mask


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
            mask_by_label = ((mask == float(i)) * 255).astype(np.uint8)
            mask_by_label = cv2.resize(mask_by_label,
                dsize=(image.width, image.height),
                interpolation=cv2.INTER_NEAREST)

            contours, _  = cv2.findContours(mask_by_label, cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_SIMPLE)

            for contour in contours:
                contour = np.flip(contour, axis=1)
                if len(contour) < 3:
                    continue

                x_min = max(0, int(np.min(contour[:,:,0])))
                x_max = max(0, int(np.max(contour[:,:,0])))
                y_min = max(0, int(np.min(contour[:,:,1])))
                y_max = max(0, int(np.max(contour[:,:,1])))

                cvat_mask = to_cvat_mask((x_min, y_min, x_max, y_max), mask_by_label)

                results.append({
                    "confidence": None,
                    "label": self.labels.get(i, "unknown"),
                    "points": contour.ravel().tolist(),
                    "mask": cvat_mask,
                    "type": "mask",
                })

        return results
