
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from cvat.apps.auto_annotation.inference_engine import make_plugin_or_core, make_network

import os
import cv2
import PIL
import numpy as np

_IE_CPU_EXTENSION = os.getenv("IE_CPU_EXTENSION", "libcpu_extension_avx2.so")
_IE_PLUGINS_PATH = os.getenv("IE_PLUGINS_PATH", None)

_DEXTR_MODEL_DIR = os.getenv("DEXTR_MODEL_DIR", None)
_DEXTR_PADDING = 50
_DEXTR_TRESHOLD = 0.9
_DEXTR_SIZE = 512

class DEXTR_HANDLER:
    def __init__(self):
        self._plugin = None
        self._network = None
        self._exec_network = None
        self._input_blob = None
        self._output_blob = None
        if not _DEXTR_MODEL_DIR:
            raise Exception("DEXTR_MODEL_DIR is not defined")


    def handle(self, im_path, points):
        # Lazy initialization
        if not self._plugin:
            self._plugin = make_plugin_or_core()
            self._network = make_network(os.path.join(_DEXTR_MODEL_DIR, 'dextr.xml'),
                os.path.join(_DEXTR_MODEL_DIR, 'dextr.bin'))
            self._input_blob = next(iter(self._network.inputs))
            self._output_blob = next(iter(self._network.outputs))
            if getattr(self._plugin, 'load_network', False):
                self._exec_network = self._plugin.load_network(self._network, 'CPU')
            else:
                self._exec_network = self._plugin.load(network=self._network)

        image = PIL.Image.open(im_path)
        numpy_image = np.array(image)
        points = np.asarray([[int(p["x"]), int(p["y"])] for p in points], dtype=int)
        bounding_box = (
            max(min(points[:, 0]) - _DEXTR_PADDING, 0),
            max(min(points[:, 1]) - _DEXTR_PADDING, 0),
            min(max(points[:, 0]) + _DEXTR_PADDING, numpy_image.shape[1] - 1),
            min(max(points[:, 1]) + _DEXTR_PADDING, numpy_image.shape[0] - 1)
        )

        # Prepare an image
        numpy_cropped = np.array(image.crop(bounding_box))
        resized = cv2.resize(numpy_cropped, (_DEXTR_SIZE, _DEXTR_SIZE),
            interpolation = cv2.INTER_CUBIC).astype(np.float32)

        # Make a heatmap
        points = points - [min(points[:, 0]), min(points[:, 1])] + [_DEXTR_PADDING, _DEXTR_PADDING]
        points = (points * [_DEXTR_SIZE / numpy_cropped.shape[1], _DEXTR_SIZE / numpy_cropped.shape[0]]).astype(int)
        heatmap = np.zeros(shape=resized.shape[:2], dtype=np.float64)
        for point in points:
            gaussian_x_axis = np.arange(0, _DEXTR_SIZE, 1, float) - point[0]
            gaussian_y_axis = np.arange(0, _DEXTR_SIZE, 1, float)[:, np.newaxis] - point[1]
            gaussian = np.exp(-4 * np.log(2) * ((gaussian_x_axis ** 2 + gaussian_y_axis ** 2) / 100)).astype(np.float64)
            heatmap = np.maximum(heatmap, gaussian)
        cv2.normalize(heatmap,  heatmap, 0, 255, cv2.NORM_MINMAX)

        # Concat an image and a heatmap
        input_dextr = np.concatenate((resized, heatmap[:, :, np.newaxis].astype(resized.dtype)), axis=2)
        input_dextr = input_dextr.transpose((2,0,1))

        pred = self._exec_network.infer(inputs={self._input_blob: input_dextr[np.newaxis, ...]})[self._output_blob][0, 0, :, :]
        pred = cv2.resize(pred, tuple(reversed(numpy_cropped.shape[:2])), interpolation = cv2.INTER_CUBIC)
        result = np.zeros(numpy_image.shape[:2])
        result[bounding_box[1]:bounding_box[1] + pred.shape[0], bounding_box[0]:bounding_box[0] + pred.shape[1]] = pred > _DEXTR_TRESHOLD

        # Convert a mask to a polygon
        result = np.array(result, dtype=np.uint8)
        cv2.normalize(result,result,0,255,cv2.NORM_MINMAX)
        contours = None
        if int(cv2.__version__.split('.')[0]) > 3:
            contours = cv2.findContours(result, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)[0]
        else:
            contours = cv2.findContours(result, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_KCOS)[1]

        contours = max(contours, key=lambda arr: arr.size)
        if contours.shape.count(1):
            contours = np.squeeze(contours)
        if contours.size < 3 * 2:
            raise Exception('Less then three point have been detected. Can not build a polygon.')

        result = ""
        for point in contours:
            result += "{},{} ".format(int(point[0]), int(point[1]))
        result = result[:-1]

        return result

    def __del__(self):
        if self._exec_network:
            del self._exec_network
        if self._network:
            del self._network
        if self._plugin:
            del self._plugin
