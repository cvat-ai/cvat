# Copyright (C) 2019-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination

from cvat.apps.engine.types import ExtendedRequest


class CustomPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    page_size_query_description = "Number of results to return per page."
    max_page_size = settings.REST_FRAMEWORK_MAX_PAGE_SIZE

    def _raise_validation_error(self, value: str) -> None:
        raise ValidationError(
            {self.page_size_query_param: f"Expected a positive integer, got '{value}'"}
        )

    def get_page_size(self, request: ExtendedRequest) -> int:
        value = request.query_params.get(self.page_size_query_param)
        if value is None:
            return self.page_size

        try:
            page_size = int(value)
        except ValueError:
            self._raise_validation_error(value)

        if page_size <= 0:
            self._raise_validation_error(value)

        return min(page_size, self.max_page_size)
