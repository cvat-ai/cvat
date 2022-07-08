# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import sys
from rest_framework.pagination import PageNumberPagination

class CustomPagination(PageNumberPagination):
    page_size_query_param = "page_size"

    def get_page_size(self, request):
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

    def get_schema_operation_parameters(self, view):
        parameters = super().get_schema_operation_parameters(view)

        page_size_param_schema = next(
            filter(
                lambda s: s['name'] == self.page_size_query_param,
                parameters),
            None)
        assert page_size_param_schema is not None
        page_size_param_schema['schema'] = {
            'title': 'PageSize',
            'oneOf': [
                { 'type': 'integer', 'title': 'PageSizeNumber' },
                { 'type': 'string', 'enum': ["all"], 'title': 'PageSizeAll' },
            ]
        }

        return parameters
