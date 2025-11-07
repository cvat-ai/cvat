# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import drf_spectacular.generators
import drf_spectacular.views


class SchemaGenerator(drf_spectacular.generators.SchemaGenerator):
    _global_cache: dict[tuple[type[drf_spectacular.generators.SchemaGenerator]], dict] = {}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def get_schema(self, request=None, public=False):
        if public:
            schema = self._global_cache.get(type(self))

            if schema is None:
                # TODO: investigate dependency on request if caching is enabled
                # need to make it request-agnostic
                schema = super().get_schema(request, public)
                self._global_cache[type(self)] = schema
        else:
            schema = super().get_schema(request, public)

        return schema


# TODO: integrate with drf_spectacular views
