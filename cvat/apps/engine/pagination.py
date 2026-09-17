# Copyright (C) 2019-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination

from cvat.apps.engine.types import ExtendedRequest


class CustomPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    page_size_query_description = "Number of results to return per page."
    max_page_size = 500

    def get_page_size(self, request: ExtendedRequest) -> int:
        if request.query_params.get(self.page_size_query_param) == "all":
            raise ValidationError(
                {
                    self.page_size_query_param: (
                        "The 'all' value is no longer supported. "
                        f"Use an integer up to {self.max_page_size} and follow the 'next' link."
                    )
                }
            )

        return super().get_page_size(request)
