# Copyright (C) 2018-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import numpy as np
import sys
from skimage.measure import find_contours, approximate_polygon
from pathlib import Path
import tensorflow as tf
MASK_RCNN_DIR = '/opt/nuclio/Mask_RCNN'
sys.path.append(MASK_RCNN_DIR)  # To find local version of the library
from mrcnn import model as modellib
from mrcnn.config import Config

class ModelLoader:

    def __init__(self, labels):
        COCO_MODEL_PATH = Path("/opt/nuclio/Mask_RCNN/mask_rcnn_coco.h5")
        if not COCO_MODEL_PATH.exists():
            raise OSError('Model not found in the system.')

        class InferenceConfig(Config):
            # Give the configuration a recognizable name
            NAME = "coco"

            # Number of classes (including background)
            NUM_CLASSES = 1 + 80  # COCO has 80 classes

            # Set batch size to 1 since we'll be running inference on
            # one image at a time. Batch size = GPU_COUNT * IMAGES_PER_GPU
            GPU_COUNT = 1
            IMAGES_PER_GPU = 1

        # Print config details
        self.config = InferenceConfig()
        self.config.display()

        self.model = modellib.MaskRCNN(mode="inference",
                                       config=self.config, model_dir=MASK_RCNN_DIR)
        self.model.load_weights(str(COCO_MODEL_PATH), by_name=True)
        self.labels = labels

    def infer(self, image, threshold):
        output = self.model.detect([image], verbose=1)[0]

        results = []
        MASK_THRESHOLD = 0.5
        for i in range(len(output["rois"])):
            score = output["scores"][i]
            class_id = output["class_ids"][i]
            mask = output["masks"][:, :, i]
            if score >= threshold:
                mask = mask.astype(np.uint8)
                contours = find_contours(mask, MASK_THRESHOLD)
                # only one contour exist in our case
                contour = contours[0]
                contour = np.flip(contour, axis=1)
                # Approximate the contour and reduce the number of points
                contour = approximate_polygon(contour, tolerance=2.5)
                if len(contour) < 6:
                    continue
                label = self.labels[class_id]

                results.append({
                    "confidence": str(score),
                    "label": label,
                    "points": contour.ravel().tolist(),
                    "type": "polygon",
                })

        return results
