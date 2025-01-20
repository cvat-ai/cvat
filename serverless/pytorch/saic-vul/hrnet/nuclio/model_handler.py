# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import torch
import numpy as np
import cv2
import os

from isegm.inference import utils
from isegm.inference.predictors import get_predictor
from isegm.inference.clicker import Clicker, Click

class ModelHandler:
    def __init__(self):
        torch.backends.cudnn.deterministic = True
        base_dir = os.path.abspath(os.environ.get("MODEL_PATH", "/opt/nuclio/hrnet"))
        model_path = os.path.join(base_dir)

        self.net = None
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'

        checkpoint_path = utils.find_checkpoint(model_path, "coco_lvis_h18_itermask.pth")
        self.net = utils.load_is_model(checkpoint_path, self.device)

    def handle(self, image, pos_points, neg_points, threshold):
        image_nd = np.array(image)

        clicker = Clicker()
        for x, y in pos_points:
            click = Click(is_positive=True, coords=(y, x))
            clicker.add_click(click)

        for x, y in neg_points:
            click = Click(is_positive=False, coords=(y, x))
            clicker.add_click(click)

        predictor = get_predictor(self.net, 'NoBRS', device=self.device, prob_thresh=0.49)
        predictor.set_input_image(image_nd)

        object_prob = predictor.get_prediction(clicker)
        if self.device == 'cuda':
            torch.cuda.empty_cache()
        mask = object_prob > threshold
        mask = np.array(mask, dtype=np.uint8)
        cv2.normalize(mask, mask, 0, 255, cv2.NORM_MINMAX)

        return mask
