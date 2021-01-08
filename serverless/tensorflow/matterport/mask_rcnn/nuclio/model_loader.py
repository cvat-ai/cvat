# Copyright (C) 2018-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import numpy as np
import sys
from skimage.measure import find_contours, approximate_polygon

# workaround for tf.placeholder() is not compatible with eager execution
# https://github.com/tensorflow/tensorflow/issues/18165
import tensorflow as tf
tf.compat.v1.disable_eager_execution()
#import tensorflow.compat.v1 as tf
#   tf.disable_v2_behavior()

# The directory should contain a clone of
# https://github.com/matterport/Mask_RCNN repository and
# downloaded mask_rcnn_coco.h5 model.
MASK_RCNN_DIR = os.path.abspath(os.environ.get('MASK_RCNN_DIR'))
if MASK_RCNN_DIR:
    sys.path.append(MASK_RCNN_DIR)  # To find local version of the library
    sys.path.append(os.path.join(MASK_RCNN_DIR, 'samples/coco'))

from mrcnn import model as modellib
import coco

class ModelLoader:
    def __init__(self, labels):
        COCO_MODEL_PATH = os.path.join(MASK_RCNN_DIR, "mask_rcnn_coco.h5")
        if COCO_MODEL_PATH is None:
            raise OSError('Model path env not found in the system.')

        class InferenceConfig(coco.CocoConfig):
            # Set batch size to 1 since we'll be running inference on
            # one image at a time. Batch size = GPU_COUNT * IMAGES_PER_GPU
            GPU_COUNT = 1
            IMAGES_PER_GPU = 1

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
            mask = output["masks"][:,:,i]
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


