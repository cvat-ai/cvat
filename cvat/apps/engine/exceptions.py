# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.exceptions import ValidationError, ErrorDetail


class CVATValidationError(ValidationError):
    def __str__(self):
        if isinstance(self.detail, list):
            return '; '.join([str(detail) for detail in self.detail])
        elif isinstance(self.detail, dict):
            msg = ''
            for key, value in self.detail.items():
                if isinstance(value, ErrorDetail) or not isinstance(value, (list, tuple)):
                    msg = f'{msg} {key}: {value};'
                else:
                    msg = f'{msg} {key}: {[str(v) for v in value]};'
            return msg
        return super().__str__()
