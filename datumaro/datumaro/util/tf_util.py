
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT


def check_import():
    # Workaround for checking import availability:
    # Official TF builds include AVX instructions. Once we try to import,
    # the program crashes. We raise an exception instead.

    import subprocess
    import sys

    from .os_util import check_instruction_set

    result = subprocess.run([sys.executable, '-c', 'import tensorflow'],
        timeout=60,
        universal_newlines=True, # use text mode for output stream
        stdout=subprocess.PIPE, stderr=subprocess.PIPE) # capture output

    if result.returncode != 0:
        message = result.stderr
        if not message:
            message = "Can't import tensorflow. " \
                "Test process exit code: %s." % result.returncode
            if not check_instruction_set('avx'):
                # The process has probably crashed for AVX unavalability
                message += " This is likely because your CPU does not " \
                    "support AVX instructions, " \
                    "which are required for tensorflow."

        raise ImportError(message)

def import_tf(check=True):
    import sys

    not_found = object()
    tf = sys.modules.get('tensorflow', not_found)
    if tf is None:
        import tensorflow as tf # emit default error
    elif tf is not not_found:
        return tf

    # Reduce output noise, https://stackoverflow.com/questions/38073432/how-to-suppress-verbose-tensorflow-logging
    import os
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

    if check:
        try:
            check_import()
        except Exception:
            sys.modules['tensorflow'] = None # prevent further import
            raise

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
