# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import allure
import pytest


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_setup(item):
    """Label all REST API tests with layer=api to distinguish them from UI tests in Allure TestOps."""
    item.add_marker(allure.label("layer", "api"))
    yield
