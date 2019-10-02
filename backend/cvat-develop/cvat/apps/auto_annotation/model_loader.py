
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import json
import cv2
import os
import subprocess
import numpy as np

from cvat.apps.auto_annotation.inference_engine import make_plugin, make_network

class ModelLoader():
    def __init__(self, model, weights):
        self._model = model
        self._weights = weights

        IE_PLUGINS_PATH = os.getenv("IE_PLUGINS_PATH")
        if not IE_PLUGINS_PATH:
            raise OSError("Inference engine plugin path env not found in the system.")

        plugin = make_plugin()
        network = make_network(self._model, self._weights)

        supported_layers = plugin.get_supported_layers(network)
        not_supported_layers = [l for l in network.layers.keys() if l not in supported_layers]
        if len(not_supported_layers) != 0:
            raise Exception("Following layers are not supported by the plugin for specified device {}:\n {}".
                      format(plugin.device, ", ".join(not_supported_layers)))

        iter_inputs = iter(network.inputs)
        self._input_blob_name = next(iter_inputs)
        self._output_blob_name = next(iter(network.outputs))

        self._require_image_info = False

        # NOTE: handeling for the inclusion of `image_info` in OpenVino2019
        if 'image_info' in network.inputs:
            self._require_image_info = True
        if self._input_blob_name == 'image_info':
            self._input_blob_name = next(iter_inputs)

        self._net = plugin.load(network=network, num_requests=2)
        input_type = network.inputs[self._input_blob_name]
        self._input_layout = input_type if isinstance(input_type, list) else input_type.shape

    def infer(self, image):
        _, _, h, w = self._input_layout
        in_frame = image if image.shape[:-1] == (h, w) else cv2.resize(image, (w, h))
        in_frame = in_frame.transpose((2, 0, 1))  # Change data layout from HWC to CHW
        inputs = {self._input_blob_name: in_frame}
        if self._require_image_info:
            info = np.zeros([1, 3])
            info[0, 0] = h
            info[0, 1] = w
            # frame number
            info[0, 2] = 1
            inputs['image_info'] = info

        results = self._net.infer(inputs)
        if len(results) == 1:
            return results[self._output_blob_name].copy()
        else:
            return results.copy()


def load_labelmap(labels_path):
    with open(labels_path, "r") as f:
        return json.load(f)["label_map"]
