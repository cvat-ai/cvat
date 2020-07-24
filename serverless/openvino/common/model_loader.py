
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import cv2
import numpy as np
from openvino.inference_engine import IECore

class ModelLoader:
    def __init__(self, model, weights):
        ie_core = IECore()
        network = ie_core.read_network(model, weights)
        self._network = network

        # Check compatibility
        supported_layers = ie_core.query_network(network, "CPU")
        not_supported_layers = [l for l in network.layers.keys() if l not in supported_layers]
        if len(not_supported_layers) != 0:
            raise Exception(
                "Following layers are not supported by the plugin for specified device {}:\n {}"
                .format(ie_core.device, ", ".join(not_supported_layers)))

        # Initialize input blobs
        self._input_info_name = None
        for blob_name in network.inputs:
            if len(network.inputs[blob_name].shape) == 4:
                self._input_blob_name = blob_name
            elif len(network.inputs[blob_name].shape) == 2:
                self._input_info_name = blob_name
            else:
                raise RuntimeError(
                    "Unsupported {}D input layer '{}'. Only 2D and 4D input layers are supported"
                    .format(len(network.inputs[blob_name].shape), blob_name))

        # Initialize output blob
        self._output_blob_name = next(iter(network.outputs))

        # Load network
        self._net = ie_core.load_network(network, "CPU", num_requests=2)
        input_type = network.inputs[self._input_blob_name]
        self._input_layout = input_type if isinstance(input_type, list) else input_type.shape

    def infer(self, image, preprocessing=True):
        image = np.array(image)
        _, _, h, w = self._input_layout
        if preprocessing:
            image = image if image.shape[:-1] == (h, w) else cv2.resize(image, (w, h))
            if len(image.shape) < 3: # grayscale image
                image = image[:, :, np.newaxis]
            else:
                if image.shape[2] == 4: # the image has alpha channel
                    image = image[:, :, :3]

            image = image.transpose((2, 0, 1))  # Change data layout from HWC to CHW

        inputs = {self._input_blob_name: image}
        if self._input_info_name:
            inputs[self._input_info_name] = [h, w, 1]

        results = self._net.infer(inputs)
        if len(results) == 1:
            return results[self._output_blob_name].copy()
        else:
            return results.copy()

    def input_size(self):
        return self._input_layout[2:]

    @property
    def layers(self):
        return self._network.layers
