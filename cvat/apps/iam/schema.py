# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import re
from drf_spectacular.openapi import AutoSchema
from drf_spectacular.extensions import OpenApiFilterExtension, OpenApiAuthenticationExtension
from drf_spectacular.plumbing import build_parameter_type
from drf_spectacular.utils import OpenApiParameter

# https://drf-spectacular.readthedocs.io/en/latest/customization.html?highlight=OpenApiFilterExtension#step-5-extensions
class OrganizationFilterExtension(OpenApiFilterExtension):
    """Describe OrganizationFilterBackend filter"""

    target_class = 'cvat.apps.iam.filters.OrganizationFilterBackend'
    priority = 1

    def get_schema_operation_parameters(self, auto_schema, *args, **kwargs):
        """Describe query parameters"""
        return [
            build_parameter_type(
                name=self.target.organization_slug,
                required=False,
                location=OpenApiParameter.QUERY,
                description=self.target.organization_slug_description,
                schema={'type': 'string'},
            ),
            build_parameter_type(
                name=self.target.organization_id,
                required=False,
                location=OpenApiParameter.QUERY,
                description=self.target.organization_id_description,
                schema={'type': 'string'},
            )
        ]

class SignatureAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'cvat.apps.iam.authentication.SignatureAuthentication'
    name = 'SignatureAuthentication'  # name used in the schema

    def get_security_definition(self, auto_schema):
        return {
            'type': 'apiKey',
            'in': 'query',
            'name': 'sign',
        }

class CustomAutoSchema(AutoSchema):
    # https://github.com/tfranzel/drf-spectacular/issues/111
    # Adds organization context parameters to all endpoints

    def get_override_parameters(self):
        return [
            OpenApiParameter(
                name='org',
                type=str,
                required=False,
                location=OpenApiParameter.QUERY,
                description="Organization unique slug",
            ),
            OpenApiParameter(
                name='org_id',
                type=int,
                required=False,
                location=OpenApiParameter.QUERY,
                description="Organization identifier",
            ),
            OpenApiParameter(
                name='X-Organization',
                type=str,
                required=False,
                location=OpenApiParameter.HEADER
            ),
        ]

    def get_operation_id(self):
        tokenized_path = self._tokenize_path()
        # replace dashes as they can be problematic later in code generation
        tokenized_path = [t.replace('-', '_') for t in tokenized_path]

        if self.method == 'GET' and self._is_list_view():
            action = 'list'
        else:
            action = self.method_mapping[self.method.lower()]

        if not tokenized_path:
            tokenized_path.append('root')

        if re.search(r'<drf_format_suffix\w*:\w+>', self.path_regex):
            tokenized_path.append('formatted')

        return '_'.join([tokenized_path[0]] + [action] + tokenized_path[1:])
