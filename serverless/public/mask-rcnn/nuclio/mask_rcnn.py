
# Copyright (C) 2018-2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import numpy as np
import sys
import skimage.io
from skimage.measure import find_contours, approximate_polygon

class MASKRCNN:
    def get_labels_by_name(self):
        return { "BG": 0, "person": 1, "bicycle": 2, "car": 3,
        "motorcycle": 4, "airplane": 5, "bus": 6, "train": 7, "truck": 8,
        "boat": 9, "traffic_light": 10, "fire_hydrant": 11, "stop_sign": 12,
        "parking_meter": 13, "bench": 14, "bird": 15, "cat": 16, "dog": 17,
        "horse": 18, "sheep": 19, "cow": 20, "elephant": 21, "bear": 22,
        "zebra": 23, "giraffe": 24, "backpack": 25, "umbrella": 26,
        "handbag": 27, "tie": 28, "suitcase": 29, "frisbee": 30, "skis": 31,
        "snowboard": 32, "sports_ball": 33, "kite": 34, "baseball_bat": 35,
        "baseball_glove": 36, "skateboard": 37, "surfboard": 38,
        "tennis_racket": 39, "bottle": 40, "wine_glass": 41, "cup": 42,
        "fork": 43, "knife": 44, "spoon": 45, "bowl": 46, "banana": 47,
        "apple": 48, "sandwich": 49, "orange": 50, "broccoli": 51,
        "carrot": 52, "hot_dog": 53, "pizza": 54, "donut": 55, "cake": 56,
        "chair": 57, "couch": 58, "potted_plant": 59, "bed": 60,
        "dining_table": 61, "toilet": 62, "tv": 63, "laptop": 64, "mouse": 65,
        "remote": 66, "keyboard": 67, "cell_phone": 68, "microwave": 69,
        "oven": 70, "toaster": 71, "sink": 72, "refrigerator": 73, "book": 74,
        "clock": 75, "vase": 76, "scissors": 77, "teddy_bear": 78,
        "hair_drier": 79, "toothbrush": 80 }

    def get_labels_by_id(self):
        return {v:k for k,v in self.get_labels_by_id().items()}

    @staticmethod
    def _convert_to_segmentation(mask):
        contours = find_contours(mask, 0.5)
        # only one contour exist in our case
        contour = contours[0]
        contour = np.flip(contour, axis=1)
        # Approximate the contour and reduce the number of points
        contour = approximate_polygon(contour, tolerance=2.5)
        segmentation = contour.ravel().tolist()
        return segmentation

    def __init__(self):
        # Root directory of the project
        ROOT_DIR = os.environ.get('MASK_RCNN_PATH', '/opt/nuclio/MASKRCNN')
        # Import Mask RCNN
        sys.path.append(ROOT_DIR)  # To find local version of the library
        import mrcnn.model as modellib

        # Import COCO config
        sys.path.append(os.path.join(ROOT_DIR, "samples/coco/"))  # To find local version
        import coco

        # Directory to save logs and trained model
        MODEL_DIR = os.path.join(ROOT_DIR, "logs")

        # Local path to trained weights file
        COCO_MODEL_PATH = os.path.join(ROOT_DIR, "mask_rcnn_coco.h5")
        if COCO_MODEL_PATH is None:
            raise OSError('Model path env not found in the system.')

        ## CONFIGURATION

        class InferenceConfig(coco.CocoConfig):
            # Set batch size to 1 since we'll be running inference on
            # one image at a time. Batch size = GPU_COUNT * IMAGES_PER_GPU
            GPU_COUNT = 1
            IMAGES_PER_GPU = 1

        # Print config details
        config = InferenceConfig()
        config.display()

        ## CREATE MODEL AND LOAD TRAINED WEIGHTS

        # Create model object in inference mode.
        self.model = modellib.MaskRCNN(mode="inference", model_dir=MODEL_DIR, config=config)
        # Load weights trained on MS-COCO
        self.model.load_weights(COCO_MODEL_PATH, by_name=True)

    def run(self, image, threshold=0.5):
        ## RUN OBJECT DETECTION
        results = {}

        # for multiple image detection, "batch size" must be equal to number of images
        r = self.model.detect([image], verbose=1)

        r = r[0]

        # "r['rois'][index]" gives bounding box around the object
        for index, class_id in enumerate(r['class_ids']):
            if r['scores'][index] >= threshold:
                mask = r['masks'][:,:,index].astype(np.uint8)
                segmentation = _convert_to_segmentation(mask)
                if class_id not in results:
                    results[class_id] = []
                results[class_id].append(segmentation)

        return results

