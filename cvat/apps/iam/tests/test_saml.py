# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib

from django.test import SimpleTestCase


# The lxml and xmlsec wheels bundle libxml2 independently. Importing python3-saml ensures
# that their bundled versions are compatible and prevents SAML failures at runtime.
class SamlDependenciesTestCase(SimpleTestCase):
    def test_saml_dependencies_are_compatible(self):
        saml_auth = importlib.import_module("onelogin.saml2.auth")

        self.assertTrue(hasattr(saml_auth, "OneLogin_Saml2_Auth"))
