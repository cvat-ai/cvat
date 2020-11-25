# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import torch
import numpy as np
from torchvision import transforms
import cv2
import os

from isegm.inference.predictors import get_predictor
from isegm.inference.utils import load_deeplab_is_model, load_hrnet_is_model
from isegm.inference.clicker import Clicker, Click

def convert_mask_to_polygon(mask):
    mask = np.array(mask, dtype=np.uint8)
    cv2.normalize(mask, mask, 0, 255, cv2.NORM_MINMAX)
    contours = None
    if int(cv2.__version__.split('.')[0]) > 3:
        contours = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)[0]
    else:
        contours = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)[1]

    contours = max(contours, key=lambda arr: arr.size)
    if contours.shape.count(1):
        contours = np.squeeze(contours)
    if contours.size < 3 * 2:
        raise Exception('Less then three point have been detected. Can not build a polygon.')

    polygon = []
    for point in contours:
        polygon.append([int(point[0]), int(point[1])])

    return polygon

class ModelHandler:
    def __init__(self):
        torch.backends.cudnn.deterministic = True
        base_dir = os.path.abspath(os.environ.get("MODEL_PATH", "/opt/nuclio/fbrs"))
        model_path = os.path.join(base_dir, "resnet101_dh256_sbd.pth")
        state_dict = torch.load(model_path, map_location='cpu')

        self.net = None
        backbone = 'auto'
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        for k in state_dict.keys():
            if 'feature_extractor.stage2.0.branches' in k:
                self.net = load_hrnet_is_model(state_dict, self.device, backbone)
                break

        if self.net is None:
            self.net = load_deeplab_is_model(state_dict, self.device, backbone)
        self.net.to(self.device)

    def handle(self, image, pos_points, neg_points, threshold):
        input_transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize([.485, .456, .406], [.229, .224, .225])
        ])

        image_nd = input_transform(image).to(self.device)

        clicker = Clicker()
        for x, y in pos_points:
            click = Click(is_positive=True, coords=(y, x))
            clicker.add_click(click)

        for x, y in neg_points:
            click = Click(is_positive=False, coords=(y, x))
            clicker.add_click(click)

        predictor_params = {
            'brs_mode': 'f-BRS-B',
            'brs_opt_func_params': {'min_iou_diff': 0.001},
            'lbfgs_params': {'maxfun': 20},
            'predictor_params': {'max_size': 800, 'net_clicks_limit': 8},
            'prob_thresh': threshold,
            'zoom_in_params': {'expansion_ratio': 1.4, 'skip_clicks': 1, 'target_size': 480}}
        predictor = get_predictor(self.net, device=self.device,
            **predictor_params)
        predictor.set_input_image(image_nd)

        object_prob = predictor.get_prediction(clicker)
        if self.device == 'cuda':
            torch.cuda.empty_cache()
        object_mask = object_prob > threshold
        polygon = convert_mask_to_polygon(object_mask)

        return polygon


