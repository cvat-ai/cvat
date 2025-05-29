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


def _is_terminal(term: models.Q | Any) -> bool:
    return not isinstance(term, models.Q)


def _is_simple_term(term: models.Q | Any) -> bool:
    return _is_terminal(term) or (
        term.connector in (models.Q.AND, models.Q.OR)
        and all(_is_terminal(c) for c in term.children)
    )


def _to_dnf_q(q: models.Q) -> models.Q:
    # Expand all ORs nested in ANDs in the expression
    current_args = []
    q_stack = [q]
    while q_stack:
        current_term = q_stack.pop()

        if _is_terminal(current_term):
            current_args.append(current_term)
        else:
            if current_term.connector not in (models.Q.AND, models.Q.OR):
                raise NotImplementedError(f"unexpected term '{current_term}'")

            if len(current_args) == len(current_term.children):
                nested_or = next(
                    (
                        c
                        for c in current_args
                        if isinstance(c, models.Q) and c.connector == models.Q.OR
                    ),
                    None,
                )
                if nested_or:
                    other_args = [c for c in current_args if c is not nested_or]
                    if current_term.connector == models.Q.AND:
                        # expand ORs nested in the current AND,
                        # replace the current AND
                        q_stack.append(
                            models.Q(
                                [
                                    models.Q(*(other_args + [c]), _connector=models.Q.AND)
                                    for c in nested_or.children
                                ],
                                _connector=models.Q.OR,
                            )
                        )

                        # check what we've got now on the next iteration
                        current_args = []

                    elif current_term.connector == models.Q.OR:
                        # simplify, expand ORs nested in the current OR
                        current_args = other_args + nested_or.children
                        q_stack.append(models.Q(*current_args, _connector=models.Q.OR))
                else:
                    current_args = [models.Q(*current_args, _connector=current_term.connector)]

            # elif _is_simple_term(current_term):
            #     current_args.append(current_term)
            else:
                # Go deeper into the tree and check the children to have nested ORs
                q_stack.append(current_term)
                q_stack.extend(current_term.children)

    if len(current_args) == 1 and (term := current_args[0]) and not _is_terminal(term):
        dnf_q = current_args[0]
    else:
        dnf_q = models.Q(*current_args, _connector=models.Q.OR)

    return dnf_q


def filter_with_union(queryset: _QuerysetT, q_expr: models.Q) -> _QuerysetT:
    """
    Applies a Q-expression filter with ORs into a query with UNIONs.
    This is needed to avoid the ORs in the queryset filter,
    because they result in bad performance in Postgres.
    """

    q_expr_dnf = _to_dnf_q(q_expr)

    if not isinstance(q_expr_dnf, models.Q) or (
        q_expr_dnf.connector == models.Q.AND
        or q_expr_dnf.connector == models.Q.OR
        and len(q_expr_dnf.children) == 1
    ):
        # A trivial case, can use this expr directly
        queryset = queryset.filter(q_expr_dnf)
    else:
        qs2 = queryset.filter(q_expr_dnf.children[0])
        qs2 = qs2.union(*[queryset.filter(term) for term in q_expr_dnf.children[1:]])

        queryset = qs2

    return queryset
