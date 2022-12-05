# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.exceptions import ValidationError

class CVATValidationError(ValidationError):
    def __str__(self):
        if isinstance(self.detail, list):
            return '\n'.join([str(detail) for detail in self.detail])
        return super().__str__()
