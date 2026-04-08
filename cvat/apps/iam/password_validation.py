# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.core.exceptions import ValidationError

DEFAULT_MIN_PASSWORD_LENGTH = 8
DEFAULT_MAX_PASSWORD_LENGTH = 256


class MaximumLengthPasswordValidator:
    def __init__(self, max_length: int = DEFAULT_MAX_PASSWORD_LENGTH) -> None:
        self.max_length = max_length

    def get_error_message(self) -> str:
        return f"Password must be {self.max_length} characters or fewer."

    def validate(self, password: str, user=None) -> None:
        if len(password) > self.max_length:
            raise ValidationError(
                self.get_error_message(),
                code="password_too_long",
                params={"max_length": self.max_length},
            )

    def get_help_text(self) -> str:
        return f"Your password must be {self.max_length} characters or fewer."
