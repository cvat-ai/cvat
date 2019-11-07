
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import inspect
import os
import os.path as osp
import shutil


def current_function_name(depth=1):
    return inspect.getouterframes(inspect.currentframe())[depth].function

class FileRemover:
    def __init__(self, path, is_dir=False, ignore_errors=False):
        self.path = path
        self.is_dir = is_dir
        self.ignore_errors = ignore_errors

    def __enter__(self):
        return self

    def __exit__(self, type=None, value=None, traceback=None):
        if self.is_dir:
            shutil.rmtree(self.path, ignore_errors=self.ignore_errors)
        else:
            os.remove(self.path)

class TestDir(FileRemover):
    def __init__(self, path=None, ignore_errors=False):
        if path is None:
            path = osp.abspath('temp_%s' % current_function_name(2))

        os.makedirs(path, exist_ok=ignore_errors)

        super().__init__(path, is_dir=True, ignore_errors=ignore_errors)