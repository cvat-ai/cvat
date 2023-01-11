# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings
from django.utils.module_loading import import_string
from rest_framework.exceptions import PermissionDenied

class DefaultLimitsReachedException(PermissionDenied):
    default_personal_detail = "You've reached the maximum number of {}. Contact the administrator to extend the limits."
    default_org_detail = "You've reached the maximum number of {}. Contact the administrator to extend the limits for `{}` organization."

    def __init__(self, reasons, iam_context):
        if not reasons or not isinstance(reasons, list):
            super().__init__(reasons)

        msg = self.default_personal_detail
        if iam_context["organization"] is not None:
            msg = self.default_org_detail
            msg = msg.format(', '.join(reasons), iam_context["organization"].slug)
        else:
            msg = msg.format(', '.join(reasons))

        super().__init__(msg)

class ExceptionFactory:
    @classmethod
    def get_base_exception(cls):
        dotted_path = getattr(settings, "IAM_BASE_EXCEPTION", None)

        if dotted_path is None:
            return DefaultLimitsReachedException

        return import_string(dotted_path)

LimitsReachedException = ExceptionFactory.get_base_exception()
