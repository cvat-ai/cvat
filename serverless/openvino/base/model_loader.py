# Copyright (C) 2020-2022 Intel Corporation
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

        # Initialize input blobs
        self._input_info_name = None
        for blob_name in network.input_info:
            if len(network.input_info[blob_name].tensor_desc.dims) == 4:
                self._input_blob_name = blob_name
                self._input_layout = network.input_info[blob_name].tensor_desc.dims
            elif len(network.input_info[blob_name].tensor_desc.dims) == 2:
                self._input_info_name = blob_name
            else:
                raise RuntimeError(
                    "Unsupported {}D input layer '{}'. Only 2D and 4D input layers are supported"
                    .format(len(network.input_info[blob_name].tensor_desc.dims), blob_name))

        # Initialize output blob
        self._output_blob_name = next(iter(network.outputs))

        # Load network
        self._net = ie_core.load_network(network, "CPU", num_requests=2)

    def _prepare_inputs(self, image, preprocessing):
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
        return inputs

    def infer(self, image, preprocessing=True):
        inputs = self._prepare_inputs(image, preprocessing)
        results = self._net.infer(inputs)
        if len(results) == 1:
            return results[self._output_blob_name].copy()
        else:
            return results.copy()

    def async_infer(self, image, preprocessing=True, request_id=0):
        inputs = self._prepare_inputs(image, preprocessing)
        return self._net.start_async(request_id=request_id, inputs=inputs)

    def input_size(self):
        return self._input_layout[2:]

    @property
    def network(self):
        return self._network
