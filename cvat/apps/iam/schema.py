# Copyright (C) 2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

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