
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import json
import cv2
import os
import subprocess

from cvat.apps.auto_annotation.inference_engine import make_plugin, make_network
from cvat.apps.auto_annotation.import_modules import import_modules

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

        self._input_blob_names = network.inputs
        self._output_blob_name = next(iter(network.outputs))

        self._net = plugin.load(network=network, num_requests=2)

    def _preprocessing_helper(self, image, preprocessing_file, restricted, inputs):
        local_vars = {
            "image": image,
            "input_blob": self._input_blob_names,
            "inputs": inputs
            }

        source_code = open(preprocessing_file).read()
        if restricted:
            global_vars = {
                "__builtins__": {
                    "str": str,
                    "int": int,
                    "float": float,
                    "max": max,
                    "min": min,
                    "range": range,
                    },
                }
        else:
            global_vars = globals()
            imports = import_modules(source_code)
            global_vars.update(imports)

        exec(source_code, global_vars, local_vars)

    def infer(self, image, preprocessing_file=None, restricted=True):
        inputs = {}
        if not preprocessing_file:
            blob_name = list(self._input_blob_names.keys())[0]
            input_type = list(self._input_blob_names.values())[0]

            self._input_layout = input_type if isinstance(input_type, list) else input_type.shape
            _, _, h, w = self._input_layout
            in_frame = image if image.shape[:-1] == (h, w) else cv2.resize(image, (w, h))
            in_frame = in_frame.transpose((2, 0, 1))  # Change data layout from HWC to CHW
            inputs[blob_name] = in_frame
        else:
            self._preprocessing_helper(image, preprocessing_file, restricted, inputs)

        results = self._net.infer(inputs=inputs)
        if len(results) == 1:
            return results[self._output_blob_name].copy()
        else:
            return results.copy()


def load_label_map(labels_path):
        with open(labels_path, "r") as f:
            return json.load(f)["label_map"]
