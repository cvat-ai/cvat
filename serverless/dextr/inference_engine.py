# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from openvino.inference_engine import IENetwork, IEPlugin, IECore, get_version

import subprocess
import os
import platform

_IE_PLUGINS_PATH = os.getenv("IE_PLUGINS_PATH", None)


def _check_instruction(instruction):
    return instruction == str.strip(
        subprocess.check_output(
            'lscpu | grep -o "{}" | head -1'.format(instruction), shell=True
        ).decode('utf-8')
    )


def make_plugin_or_core():
    version = get_version()
    use_core_openvino = False
    try:
        major, minor, reference = [int(x) for x in version.split('.')]
        if major >= 2 and minor >= 1 and reference >= 37988:
            use_core_openvino = True
    except Exception:
        pass

    if use_core_openvino:
        ie = IECore()
        return ie

    if _IE_PLUGINS_PATH is None:
        raise OSError('Inference engine plugin path env not found in the system.')

    plugin = IEPlugin(device='CPU', plugin_dirs=[_IE_PLUGINS_PATH])
    if (_check_instruction('avx2')):
        plugin.add_cpu_extension(os.path.join(_IE_PLUGINS_PATH, 'libcpu_extension_avx2.so'))
    elif (_check_instruction('sse4')):
        plugin.add_cpu_extension(os.path.join(_IE_PLUGINS_PATH, 'libcpu_extension_sse4.so'))
    elif platform.system() == 'Darwin':
        plugin.add_cpu_extension(os.path.join(_IE_PLUGINS_PATH, 'libcpu_extension.dylib'))
    else:
        raise Exception('Inference engine requires a support of avx2 or sse4.')

    return plugin


def make_network(model, weights):
    return IENetwork(model = model, weights = weights)
