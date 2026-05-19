# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Iterable, Sequence
from typing import TypeAlias, TypeVar

from django.conf import settings
from django.db import models

_T = TypeVar("_T")


class Undefined:
    pass


MaybeUndefined: TypeAlias = _T | Undefined
"""
Can be used to annotate dynamic class members that may be undefined in the object.
Such fields should typically be accessed via hasattr() and getattr().

Common use cases:
- the reverse side of one-to-one relationship
- extra annotations from a model queryset
"""


_ModelT = TypeVar("_ModelT", bound=models.Model)
_unspecified = object()


def bulk_create(
    db_model: type[_ModelT],
    objs: Iterable[_ModelT],
    *,
    batch_size: int | None = _unspecified,
    ignore_conflicts: bool = False,
    update_conflicts: bool | None = False,
    update_fields: Sequence[str] | None = None,
    unique_fields: Sequence[str] | None = None,
) -> list[_ModelT]:
    """
    Like Django's Model.objects.bulk_create(), but applies the default batch size configured by
    the DEFAULT_DB_BULK_CREATE_BATCH_SIZE setting.
    """

    if batch_size is _unspecified:
        batch_size = settings.DEFAULT_DB_BULK_CREATE_BATCH_SIZE

    if not objs:
        return []

    return db_model.objects.bulk_create(
        objs,
        batch_size=batch_size,
        ignore_conflicts=ignore_conflicts,
        update_conflicts=update_conflicts,
        update_fields=update_fields,
        unique_fields=unique_fields,
    )


def is_prefetched(queryset: models.QuerySet, field: str) -> bool:
    "Checks if a field is being prefetched in the queryset"
    return field in queryset._prefetch_related_lookups


def is_field_cached(instance: models.Model, field: str) -> bool:
    "Checks if a field is cached in the model instance"
    return field in instance._state.fields_cache


_QuerysetT = TypeVar("_QuerysetT", bound=models.QuerySet)


def add_prefetch_fields(queryset: _QuerysetT, fields: Sequence[str]) -> _QuerysetT:
    for field in fields:
        if not is_prefetched(queryset, field):
            queryset = queryset.prefetch_related(field)

    return queryset


def get_cached(queryset: _QuerysetT, pk: int) -> _ModelT:
    """
    Like regular queryset.get(), but checks for the cached values first
    instead of just making a request.
    """

    # Read more about caching insights:
    # https://www.mattduck.com/2021-01-django-orm-result-cache.html
    # The field is initialized on accessing the query results, eg. on iteration
    if getattr(queryset, "_result_cache"):
        result = next((obj for obj in queryset if obj.pk == pk), None)
    else:
        result = None

    if result is None:
        result = queryset.get(id=pk)

    return result
