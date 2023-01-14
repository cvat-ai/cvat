# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from django.http import HttpResponse
from rest_framework.exceptions import ValidationError, ErrorDetail
from rest_framework.views import exception_handler

from cvat.apps.engine.utils import parse_exception_message

class CVATValidationError(ValidationError):
    def __str__(self):
        def _handle_list(list_):
            return [str(detail) for detail in list_] if len(list_) > 1 else str(list_[0])

        details = None
        if not isinstance(self.detail, (list, dict)):
            return super().__str__()
        elif isinstance(self.detail, list):
            details = _handle_list(self.detail)
        elif isinstance(self.detail, dict):
            # common case
            if len(self.detail.keys()) == 1 and self.detail.get('non_field_errors', None):
                return _handle_list(self.detail['non_field_errors'])
            details = dict()
            for key, value in self.detail.items():
                if isinstance(value, ErrorDetail) or not isinstance(value, (list, tuple)):
                    details[key] = str(value)
                else:
                    details[key] = [str(v) for v in value]
        return f"{details}"

def extended_exception_handler(exc, context):
    if isinstance(exc, ValidationError):
        status_code = exc.status_code
        parsed_msg = parse_exception_message(str(exc))
        try:
            parsed_msg = json.loads(parsed_msg)
        except json.decoder.JSONDecodeError:
            pass

        exc = CVATValidationError(parsed_msg)
        return HttpResponse(str(exc), status=status_code)

    # Call REST framework's default exception handler
    response = exception_handler(exc, context)

    return response
