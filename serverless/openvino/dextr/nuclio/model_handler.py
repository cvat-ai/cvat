# Copyright (C) 2018-2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

import cv2
import numpy as np
import os
from model_loader import ModelLoader

class ModelHandler:
    def __init__(self):
        base_dir = os.path.abspath(os.environ.get("MODEL_PATH", "/opt/nuclio"))
        model_xml = os.path.join(base_dir, "dextr.xml")
        model_bin = os.path.join(base_dir, "dextr.bin")
        self.model = ModelLoader(model_xml, model_bin)

    # Input:
    #   image: PIL image
    #   points: [[x1,y1], [x2,y2], [x3,y3], [x4,y4], ...]
    # Output:
    #   polygon: [[x1,y1], [x2,y2], [x3,y3], [x4,y4], ...]
    def handle(self, image, points):
        DEXTR_PADDING = 50
        DEXTR_TRESHOLD = 0.8
        DEXTR_SIZE = 512

        numpy_image = np.array(image)
        points = np.asarray(points, dtype=int)
        bounding_box = (
            max(min(points[:, 0]) - DEXTR_PADDING, 0),
            max(min(points[:, 1]) - DEXTR_PADDING, 0),
            min(max(points[:, 0]) + DEXTR_PADDING, numpy_image.shape[1] - 1),
            min(max(points[:, 1]) + DEXTR_PADDING, numpy_image.shape[0] - 1)
        )

        # Prepare an image
        numpy_cropped = np.array(image.crop(bounding_box))
        resized = cv2.resize(numpy_cropped, (DEXTR_SIZE, DEXTR_SIZE),
            interpolation = cv2.INTER_CUBIC).astype(np.float32)
        if len(resized.shape) == 2: # support grayscale images
            resized = cv2.cvtColor(resized, cv2.COLOR_GRAY2RGB)
        elif resized.shape[2] == 4: # remove alpha channel
            resized = resized[:, :, :3]

        # Make a heatmap
        points = points - [bounding_box[0], bounding_box[1]]
        points = (points * [DEXTR_SIZE / numpy_cropped.shape[1], DEXTR_SIZE / numpy_cropped.shape[0]]).astype(int)
        heatmap = np.zeros(shape=resized.shape[:2], dtype=np.float64)
        for point in points:
            gaussian_x_axis = np.arange(0, DEXTR_SIZE, 1, float) - point[0]
            gaussian_y_axis = np.arange(0, DEXTR_SIZE, 1, float)[:, np.newaxis] - point[1]
            gaussian = np.exp(-4 * np.log(2) * ((gaussian_x_axis ** 2 + gaussian_y_axis ** 2) / 100)).astype(np.float64)
            heatmap = np.maximum(heatmap, gaussian)
        cv2.normalize(heatmap, heatmap, 0, 255, cv2.NORM_MINMAX)

        # Concat an image and a heatmap
        input_dextr = np.concatenate((resized, heatmap[:, :, np.newaxis].astype(resized.dtype)), axis=2)
        input_dextr = input_dextr.transpose((2,0,1))

        pred = self.model.infer(input_dextr[np.newaxis, ...], False)[0, 0, :, :]
        pred = (pred > DEXTR_TRESHOLD).astype(np.uint8)
        pred = cv2.resize(pred, tuple(reversed(numpy_cropped.shape[:2])), interpolation = cv2.INTER_NEAREST)
        result = np.zeros(numpy_image.shape[:2]).astype(np.uint8)
        result[bounding_box[1]:bounding_box[1] + pred.shape[0], bounding_box[0]:bounding_box[0] + pred.shape[1]] = pred

        # Convert a mask to a polygon
        contours = None
        if int(cv2.__version__.split('.')[0]) > 3:
            contours = cv2.findContours(result, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]
        else:
            contours = cv2.findContours(result, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[1]

        contours = max(contours, key=lambda arr: arr.size)
        if contours.shape.count(1):
            contours = np.squeeze(contours)
        if contours.size < 3 * 2:
            raise Exception('Less then three point have been detected. Can not build a polygon.')

        result = []
        for point in contours:
            result.append([int(point[0]), int(point[1])])

        return result
