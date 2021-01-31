# Copyright (C) 2020-2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import numpy as np
import sys
from skimage.measure import find_contours, approximate_polygon
import tensorflow as tf
MASK_RCNN_DIR = os.path.abspath(os.environ.get('MASK_RCNN_DIR'))
if MASK_RCNN_DIR:
    sys.path.append(MASK_RCNN_DIR)  # To find local version of the library
from mrcnn import model as modellib
from mrcnn.config import Config


class ModelLoader:
    def __init__(self, labels):
        COCO_MODEL_PATH = os.path.join(MASK_RCNN_DIR, "mask_rcnn_coco.h5")
        if COCO_MODEL_PATH is None:
            raise OSError('Model path env not found in the system.')

        class InferenceConfig(Config):
            NAME = "coco"
            NUM_CLASSES = 1 + 80  # COCO has 80 classes
            GPU_COUNT = 1
            IMAGES_PER_GPU = 1

        # Limit gpu memory to 30% to allow for other nuclio gpu functions. Increase fraction as you like
        import keras.backend.tensorflow_backend as ktf
        def get_session(gpu_fraction=0.333):
            gpu_options = tf.GPUOptions(
            per_process_gpu_memory_fraction=gpu_fraction,
            allow_growth=True)
            return tf.Session(config=tf.ConfigProto(gpu_options=gpu_options))

        ktf.set_session(get_session())
        # Print config details
        self.config = InferenceConfig()
        self.config.display()

        self.model = modellib.MaskRCNN(mode="inference",
            config=self.config, model_dir=MASK_RCNN_DIR)
        self.model.load_weights(COCO_MODEL_PATH, by_name=True)
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