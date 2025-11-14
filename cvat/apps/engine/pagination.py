# Copyright (C) 2019-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import sys

from attr.converters import to_bool
from rest_framework.pagination import PageNumberPagination

from cvat.apps.engine.types import ExtendedRequest


class CustomPagination(PageNumberPagination):
    require_count_query_param = "count_required"
    page_size_query_param = "page_size"

    def get_page_size(self, request: ExtendedRequest):
        page_size = 0
        try:
            value = request.query_params[self.page_size_query_param]
            if value == "all":
                page_size = sys.maxsize
            else:
                page_size = int(value)
        except (KeyError, ValueError):
            pass

        return page_size if page_size > 0 else self.page_size

    def is_count_required(self, request: ExtendedRequest) -> bool:
        return to_bool(request.query_params.get(self.require_count_query_param, True))

    def get_schema_operation_parameters(self, view):
        parameters = super().get_schema_operation_parameters(view)
        parameters.append(
            {
                "name": self.require_count_query_param,
                "required": False,
                "in": "query",
                "description": "Enable or disable precise count reporting. Enabled by default",
                "schema": {
                    "type": "integer",
                },
            }
        )
        return parameters
