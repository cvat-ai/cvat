# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import importlib
from typing import Any

from cvat.apps.engine.types import ExtendedRequest

from . import models


def serialize_api_token(api_token: models.ApiToken) -> dict[str, Any]:
    return {"api_token_id": api_token.id}


def patch_symbol(module_name: str, symbol_name: str, replacement: Any):
    module = importlib.import_module(module_name)
    assert hasattr(module, symbol_name)
    setattr(module, symbol_name, replacement)


def patch_events():
    from cvat.apps.events.handlers import get_request as get_request
    from cvat.apps.events.handlers import request_info as original_request_info

    def patched_request_info(*args, **kwargs):
        request_info = original_request_info(*args, **kwargs)

        if args:
            instance = args[0]
        else:
            instance = kwargs.get("instance")

        request: ExtendedRequest = get_request(instance)
        api_token = getattr(request, "auth", None)
        if isinstance(api_token, models.ApiToken):
            request_info.update(serialize_api_token(api_token))

        return request_info

    patch_symbol("cvat.apps.events.handlers", "request_info", patched_request_info)
