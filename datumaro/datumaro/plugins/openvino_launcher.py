
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

# pylint: disable=exec-used

import cv2
import numpy as np
import os
import os.path as osp
import platform
import subprocess

from openvino.inference_engine import IENetwork, IEPlugin

from datumaro.components.launcher import Launcher


class InterpreterScript:
    def __init__(self, path):
        with open(path, 'r') as f:
            script = f.read()

        context = {}
        exec(script, context, context)

        process_outputs = context['process_outputs']
        assert callable(process_outputs)
        self.__dict__['process_outputs'] = process_outputs

        get_categories = context.get('get_categories')
        assert callable(get_categories) or get_categories is None
        self.__dict__['get_categories'] = get_categories

    @staticmethod
    def get_categories():
        return None

    @staticmethod
    def process_outputs(inputs, outputs):
        return []

class OpenVinoLauncher(Launcher):
    _DEFAULT_IE_PLUGINS_PATH = "/opt/intel/openvino_2019.1.144/deployment_tools/inference_engine/lib/intel64"
    _IE_PLUGINS_PATH = os.getenv("IE_PLUGINS_PATH", _DEFAULT_IE_PLUGINS_PATH)

    @staticmethod
    def _check_instruction_set(instruction):
        return instruction == str.strip(
            # Let's ignore a warning from bandit about using shell=True.
            # In this case it isn't a security issue and we use some
            # shell features like pipes.
            subprocess.check_output(
                'lscpu | grep -o "{}" | head -1'.format(instruction),
                shell=True).decode('utf-8') # nosec
        )

    @staticmethod
    def make_plugin(device='cpu', plugins_path=_IE_PLUGINS_PATH):
        if plugins_path is None or not osp.isdir(plugins_path):
            raise Exception('Inference engine plugins directory "%s" not found' % \
                (plugins_path))

        plugin = IEPlugin(device='CPU', plugin_dirs=[plugins_path])
        if (OpenVinoLauncher._check_instruction_set('avx2')):
            plugin.add_cpu_extension(os.path.join(plugins_path,
                'libcpu_extension_avx2.so'))
        elif (OpenVinoLauncher._check_instruction_set('sse4')):
            plugin.add_cpu_extension(os.path.join(plugins_path,
                'libcpu_extension_sse4.so'))
        elif platform.system() == 'Darwin':
            plugin.add_cpu_extension(os.path.join(plugins_path,
                'libcpu_extension.dylib'))
        else:
            raise Exception('Inference engine requires support of avx2 or sse4')

        return plugin

    @staticmethod
    def make_network(model, weights):
        return IENetwork.from_ir(model=model, weights=weights)

    def __init__(self, description, weights, interpretation_script,
            plugins_path=None, model_dir=None, **kwargs):
        if model_dir is None:
            model_dir = ''
        if not osp.isfile(description):
            description = osp.join(model_dir, description)
        if not osp.isfile(description):
            raise Exception('Failed to open model description file "%s"' % \
                (description))

        if not osp.isfile(weights):
            weights = osp.join(model_dir, weights)
        if not osp.isfile(weights):
            raise Exception('Failed to open model weights file "%s"' % \
                (weights))

        if not osp.isfile(interpretation_script):
            interpretation_script = \
                osp.join(model_dir, interpretation_script)
        if not osp.isfile(interpretation_script):
            raise Exception('Failed to open model interpretation script file "%s"' % \
                (interpretation_script))

        self._interpreter_script = InterpreterScript(interpretation_script)

        if plugins_path is None:
            plugins_path = OpenVinoLauncher._IE_PLUGINS_PATH

        plugin = OpenVinoLauncher.make_plugin(plugins_path=plugins_path)
        network = OpenVinoLauncher.make_network(description, weights)
        self._network = network
        self._plugin = plugin
        self._load_executable_net()

    def _load_executable_net(self, batch_size=1):
        network = self._network
        plugin = self._plugin

        supported_layers = plugin.get_supported_layers(network)
        not_supported_layers = [l for l in network.layers.keys() if l not in supported_layers]
        if len(not_supported_layers) != 0:
            raise Exception('Following layers are not supported by the plugin'
                ' for the specified device {}:\n {}'. format( \
                plugin.device, ", ".join(not_supported_layers)))

        iter_inputs = iter(network.inputs)
        self._input_blob_name = next(iter_inputs)
        self._output_blob_name = next(iter(network.outputs))

        # NOTE: handling for the inclusion of `image_info` in OpenVino2019
        self._require_image_info = 'image_info' in network.inputs
        if self._input_blob_name == 'image_info':
            self._input_blob_name = next(iter_inputs)

        input_type = network.inputs[self._input_blob_name]
        self._input_layout = input_type if isinstance(input_type, list) else input_type.shape

        self._input_layout[0] = batch_size
        network.reshape({self._input_blob_name: self._input_layout})
        self._batch_size = batch_size

        self._net = plugin.load(network=network, num_requests=1)

    def infer(self, inputs):
        assert len(inputs.shape) == 4, \
            "Expected an input image in (N, H, W, C) format, got %s" % \
                (inputs.shape)
        assert inputs.shape[3] == 3, \
            "Expected BGR input"

        n, c, h, w = self._input_layout
        if inputs.shape[1:3] != (h, w):
            resized_inputs = np.empty((n, h, w, c), dtype=inputs.dtype)
            for inp, resized_input in zip(inputs, resized_inputs):
                cv2.resize(inp, (w, h), resized_input)
            inputs = resized_inputs
        inputs = inputs.transpose((0, 3, 1, 2)) # NHWC to NCHW
        inputs = {self._input_blob_name: inputs}
        if self._require_image_info:
            info = np.zeros([1, 3])
            info[0, 0] = h
            info[0, 1] = w
            info[0, 2] = 1.0 # scale
            inputs['image_info'] = info

        results = self._net.infer(inputs)
        if len(results) == 1:
            return results[self._output_blob_name]
        else:
            return results

    def launch(self, inputs):
        batch_size = len(inputs)
        if self._batch_size < batch_size:
            self._load_executable_net(batch_size)

        outputs = self.infer(inputs)
        results = self.process_outputs(inputs, outputs)
        return results

    def get_categories(self):
        return self._interpreter_script.get_categories()

    def process_outputs(self, inputs, outputs):
        return self._interpreter_script.process_outputs(inputs, outputs)

    def preferred_input_size(self):
        _, _, h, w = self._input_layout
        return (h, w)
