
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import json
import cv2
import os
import subprocess

from openvino.inference_engine import IENetwork, IEPlugin

class ModelLoader():
    def __init__(self, model, weights):
        self._model = model
        self._weights = weights

        IE_PLUGINS_PATH = os.getenv("IE_PLUGINS_PATH")
        if not IE_PLUGINS_PATH:
            raise OSError("Inference engine plugin path env not found in the system.")

        plugin = IEPlugin(device="CPU", plugin_dirs=[IE_PLUGINS_PATH])
        if (self._check_instruction("avx2")):
            plugin.add_cpu_extension(os.path.join(IE_PLUGINS_PATH, "libcpu_extension_avx2.so"))
        elif (self._check_instruction("sse4")):
            plugin.add_cpu_extension(os.path.join(IE_PLUGINS_PATH, "libcpu_extension_sse4.so"))
        else:
            raise Exception("Inference engine requires a support of avx2 or sse4.")

        network = IENetwork.from_ir(model=self._model, weights=self._weights)
        supported_layers = plugin.get_supported_layers(network)
        not_supported_layers = [l for l in network.layers.keys() if l not in supported_layers]
        if len(not_supported_layers) != 0:
            raise Exception("Following layers are not supported by the plugin for specified device {}:\n {}".
                      format(plugin.device, ", ".join(not_supported_layers)))

        self._input_blob_name = next(iter(network.inputs))
        self._output_blob_name = next(iter(network.outputs))

        self._net = plugin.load(network=network, num_requests=2)
        input_type = network.inputs[self._input_blob_name]
        self._input_layout = input_type if isinstance(input_type, list) else input_type.shape

    def infer(self, image):
        _, _, h, w = self._input_layout
        in_frame = image if image.shape[:-1] == (h, w) else cv2.resize(image, (w, h))
        in_frame = in_frame.transpose((2, 0, 1))  # Change data layout from HWC to CHW
        return self._net.infer(inputs={self._input_blob_name: in_frame})[self._output_blob_name].copy()

    @staticmethod
    def _check_instruction(instruction):
        return instruction == str.strip(
            subprocess.check_output(
                "lscpu | grep -o \"{}\" | head -1".format(instruction), shell=True
            ).decode("utf-8"))

def load_label_map(labels_path):
        with open(labels_path, "r") as f:
            return json.load(f)["label_map"]
