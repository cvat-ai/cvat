
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

from datumaro.util.lazy_import import lazy_import

from unittest import TestCase


test_global_lazy_import_module = lazy_import('___unknown_lib')

class LazyImportTest(TestCase):
    def test_local_lazy_import(self):
        unknown_lib = lazy_import('___unknown_lib')

        success = False
        try:
            unknown_lib.member
        except ModuleNotFoundError:
            success = True

        self.assertTrue(success)

    def test_not_found_error_message(self):
        error_message = 'hello'
        unknown_lib = lazy_import('___unknown_lib', error_message)

        success = False
        try:
            unknown_lib.member
        except ModuleNotFoundError as e:
            if error_message in str(e):
                success = True

        self.assertTrue(success)

    def test_global_lazy_import(self):
        success = False
        try:
            if test_global_lazy_import_module.member:
                print('qq')
        except ModuleNotFoundError:
            success = True

        self.assertTrue(success)
