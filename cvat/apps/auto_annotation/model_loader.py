
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import cv2
import json

class BlobParamaters():
    def __init__(self, scalefactor, input_size, mean, swapRB, crop):
        self.scalefactor = scalefactor
        self.input_size = input_size
        self.mean = mean
        self.swapRB = swapRB
        self.crop = crop

class ModelLoader():
    def __init__(self, path_to_model, blob_params):
        self.path_to_model = path_to_model
        self.blob_params = blob_params

    def load(self):
        self.net = cv2.dnn.readNet(*self.path_to_model)
        self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_DEFAULT)

    def setInput(self, images):
        blob = cv2.dnn.blobFromImages(images,
            self.blob_params.scalefactor,
            self.blob_params.input_size,
            self.blob_params.mean,
            self.blob_params.swapRB,
            self.blob_params.crop)

        self.net.setInput(blob)

    def forward(self):
        return self.net.forward()

def read_model_config(config_path):
        with open(config_path, 'r') as f:
            return json.load(f)

def get_blob_props(config):
    blob_params = config['blob_params']
    return BlobParamaters(
        scalefactor=blob_params['scalefactor'] if 'scalefactor' in blob_params else 1.0,
        input_size=(blob_params['height'], blob_params['width']) if 'height' in blob_params and 'width' in blob_params else (),
        mean=tuple(float(v) for v in blob_params['mean'].split(',')) if 'mean' in blob_params else tuple(),
        swapRB=blob_params['swapRB'] if 'swapRB' in blob_params else False,
        crop=blob_params['crop'] if 'crop' in blob_params else False,
    )

def get_model_label_map(config):
    return config['label_map']

