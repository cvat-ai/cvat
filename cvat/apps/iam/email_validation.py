# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import inspect
from abc import ABC, abstractmethod

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils.module_loading import import_string


class IEmailValidator(ABC):
    @abstractmethod
    def validate(self, email: str) -> None:
        raise NotImplementedError


def get_email_validators() -> list[IEmailValidator]:
    validators = []

    for entry in settings.EMAIL_VALIDATORS:
        path = entry["NAME"]

        try:
            validator_class = import_string(path)
        except ImportError as ex:
            raise ImproperlyConfigured(f"EMAIL_VALIDATORS: cannot import {path!r}") from ex

        if not inspect.isclass(validator_class) or not issubclass(validator_class, IEmailValidator):
            raise ImproperlyConfigured(
                f"EMAIL_VALIDATORS: {path!r} must be an IEmailValidator subclass"
            )

        try:
            validators.append(validator_class(**entry.get("OPTIONS", {})))
        except TypeError as ex:
            raise ImproperlyConfigured(
                f"EMAIL_VALIDATORS: cannot instantiate {path!r}: {ex}"
            ) from ex

    return validators


def run_email_validators(email: str) -> None:
    for validator in get_email_validators():
        validator.validate(email=email)
