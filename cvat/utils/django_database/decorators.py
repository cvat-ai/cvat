# Copyright (C) 2023 Intel Corporation
#
# SPDX-License-Identifier: MIT
from functools import wraps
from typing import Callable, ParamSpec, TypeVar

from cvat.utils.django_database import utils as django_database_utils

P = ParamSpec("P")
R = TypeVar("R")


def set_local_lock_timeout(
    timeout_seconds: int | None = None,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            django_database_utils.set_local_lock_timeout(timeout_seconds=timeout_seconds)
            return func(*args, **kwargs)

        return wrapper

    return decorator
