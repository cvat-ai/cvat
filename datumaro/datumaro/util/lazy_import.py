
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import importlib
import types


class LazyImporter(types.ModuleType):
  def __init__(self, name, error_message=None):
    super().__init__(name)

    self._error_message = error_message

  def _load(self):
    module = importlib.import_module(self.__name__)
    self.__dict__.update(module.__dict__)

    return module

  def __dir__(self):
    try:
        module = self._load()
        return dir(module)
    except ModuleNotFoundError as e:
        if self._error_message:
            raise ModuleNotFoundError("%s. %s" % (e, self._error_message))
        else:
            raise

  def __getattr__(self, item):
    try:
        module = self._load()
        return getattr(module, item)
    except ModuleNotFoundError as e:
        if self._error_message:
            raise ModuleNotFoundError("%s. %s" % (e, self._error_message))
        else:
            raise

def lazy_import(name, error_message=None):
    return LazyImporter(name, error_message)
