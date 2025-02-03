# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Iterable
from typing import Any, Sequence, TypeVar, Union

from django.conf import settings
from django.db import models

_T = TypeVar("_T")


class Undefined:
    pass


MaybeUndefined = Union[_T, Undefined]
"""
The reverse side of one-to-one relationship.
May be undefined in the object, should be accessed via getattr().
"""


_ModelT = TypeVar("_ModelT", bound=models.Model)


def bulk_create(
    db_model: type[_ModelT],
    objs: Iterable[_ModelT],
    batch_size: int | None = ...,
    ignore_conflicts: bool = ...,
    update_conflicts: bool | None = ...,
    update_fields: Sequence[str] | None = ...,
    unique_fields: Sequence[str] | None = ...,
    *,
    flt_param: dict[str, Any] | None = None,
) -> list[_ModelT]:
    "Like Django's Model.objects.bulk_create(), but applies the default batch size"

    if batch_size is Ellipsis:
        batch_size = settings.DEFAULT_DB_BULK_CREATE_BATCH_SIZE

    kwargs = {}
    for k, v in {
        "ignore_conflicts": ignore_conflicts,
        "update_conflicts": update_conflicts,
        "update_fields": update_fields,
        "unique_fields": unique_fields,
    }.items():
        if v is not Ellipsis:
            kwargs[k] = v

    if not objs:
        return []

    flt_param = flt_param or {}

    if flt_param:
        if "postgresql" in settings.DATABASES["default"]["ENGINE"]:
            return db_model.objects.bulk_create(objs, batch_size=batch_size, **kwargs)
        else:
            # imitate RETURNING
            ids = list(db_model.objects.filter(**flt_param).values_list("id", flat=True))
            db_model.objects.bulk_create(objs, batch_size=batch_size, **kwargs)

            return list(db_model.objects.exclude(id__in=ids).filter(**flt_param))
    else:
        return db_model.objects.bulk_create(objs, batch_size=batch_size, **kwargs)


def is_prefetched(queryset: models.QuerySet, field: str) -> bool:
    "Checks if a field is being prefetched in the queryset"
    return field in queryset._prefetch_related_lookups


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
