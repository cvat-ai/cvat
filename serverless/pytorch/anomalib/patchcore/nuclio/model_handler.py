# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT


import torch

from anomalib.data import PredictDataset
from anomalib.engine import Engine
from anomalib.models import Patchcore
import torch
import cv2 as cv
from PIL import Image
import numpy as np

import os
os.environ["CUDA_VISIBLE_DEVICES"] = "0"


def to_cvat_mask(box: list, mask):
    xtl, ytl, xbr, ybr = box
    flattened = mask[ytl:ybr + 1, xtl:xbr + 1].flat[:].tolist()
    flattened.extend([xtl, ytl, xbr, ybr])
    return flattened


class ModelHandler:
    def __init__(self):
        # Setup device
        self.model = Patchcore()
        self.engine = Engine()
        self.ckpt_path = "model.ckpt"

    def resize_mask(self, mask, image):
        target_size = image.size
        return cv.resize(mask, target_size, interpolation=cv.INTER_NEAREST)

    def infer(self, image):

        images = [image]

        dataset = PredictDataset(
            images=images,
        )

        predictions = self.engine.predict(
            model= self.model,
            dataset = dataset,
            ckpt_path = self.ckpt_path,
        )

        if predictions is not None:
            for prediction in predictions:
                pred_mask_dense = prediction.pred_mask.to_dense()  # Image-level anomaly mask
                pred_mask_binary = pred_mask_dense.to(torch.uint8).squeeze(0)
                pred_mask_numpy = pred_mask_binary.cpu().numpy()
                resized_mask = self.resize_mask(pred_mask_numpy, image)

        contours, _  = cv.findContours(resized_mask, cv.RETR_EXTERNAL,
                cv.CHAIN_APPROX_SIMPLE)

        results = []
        for contour in contours:
            contour = np.flip(contour, axis=1)
            if len(contour) < 3:
                continue

            x_min = max(0, int(np.min(contour[:,:,0])))
            x_max = max(0, int(np.max(contour[:,:,0])))
            y_min = max(0, int(np.min(contour[:,:,1])))
            y_max = max(0, int(np.max(contour[:,:,1])))

            box = (x_min, y_min, x_max, y_max)

            cvat_mask = to_cvat_mask(box, resized_mask)

            results.append({
                "confidence": None,
                "label": "anomaly",
                "points": contour.ravel().tolist(),
                "mask": cvat_mask,
                "type": "mask",
            })

        print('So far so good! Results obtained.')

        return results

# os.chdir("/home/ssilva/Documents/cvat/serverless/pytorch/anomalib/patchcore/nuclio/")
# model_handler = ModelHandler()
# image = Image.open("debug_images/000.png")
# result = model_handler.infer(image)
