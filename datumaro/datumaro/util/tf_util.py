
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

def import_tf():
    import sys

    tf = sys.modules.get('tensorflow', None)
    if tf is not None:
        return tf

    # Reduce output noise, https://stackoverflow.com/questions/38073432/how-to-suppress-verbose-tensorflow-logging
    import os
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

    import tensorflow as tf

    try:
        tf.get_logger().setLevel('WARNING')
    except AttributeError:
        pass
    try:
        tf.compat.v1.logging.set_verbosity(tf.compat.v1.logging.WARN)
    except AttributeError:
        pass

    # Enable eager execution in early versions to unlock dataset operations
    eager_enabled = False
    try:
        tf.compat.v1.enable_eager_execution()
        eager_enabled = True
    except AttributeError:
        pass
    try:
        if not eager_enabled:
            tf.enable_eager_execution()
    except AttributeError:
        pass

    return tf