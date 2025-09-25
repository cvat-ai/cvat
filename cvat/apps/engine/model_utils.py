# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from collections.abc import Generator, Iterable
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


def _is_terminal_q(term: models.Q | Any) -> bool:
    return not isinstance(term, models.Q)


def _is_simple_term_q(term: models.Q | Any) -> bool:
    return _is_terminal_q(term) or (
        term.connector in (models.Q.AND, models.Q.OR)
        and all(_is_terminal_q(c) for c in term.children)
    )


def _to_dnf_q(q: models.Q) -> models.Q:
    # Expand all ORs nested in ANDs in the expression
    checked_stack = []
    unchecked_stack = [q]
    while unchecked_stack:
        current_term = unchecked_stack.pop()

        if _is_terminal_q(current_term) or _is_simple_term_q(current_term):
            checked_stack.append(current_term)
            continue

        if current_term.connector not in (models.Q.AND, models.Q.OR):
            raise NotImplementedError(f"unexpected term '{current_term}'")

        checked_stack_offset = 1 + len(current_term.children)
        if (
            len(checked_stack) >= checked_stack_offset
            and checked_stack[-checked_stack_offset] == current_term
        ):
            # We've already checked all the children of the current term to have no nested ORs.
            # Need to check if we have a direct nested OR in the current term
            # and expand it if needed (one at a time).

            current_args = checked_stack[-checked_stack_offset + 1 :]

            # Remove the current args from the checked stack
            for _ in range(len(current_args)):
                checked_stack.pop()

            nested_or = next(
                (c for c in current_args if isinstance(c, models.Q) and c.connector == models.Q.OR),
                None,
            )
            if nested_or:
                checked_stack.pop()  # remove the current term, it will be replaced

                other_args = [c for c in current_args if c is not nested_or]
                if current_term.connector == models.Q.AND:
                    # Expand ORs nested in the current AND,
                    # replace the current AND with an OR
                    # e.g. (a AND (b OR c OR d)) -> (a AND b) OR (a AND c) OR (a AND d)
                    updated_term = models.Q(
                        *[
                            models.Q(*([c] + other_args), _connector=models.Q.AND)
                            for c in nested_or.children
                        ],
                        _connector=models.Q.OR,
                    )

                elif current_term.connector == models.Q.OR:
                    # Simplify, expand ORs nested in the current OR
                    updated_term = models.Q(
                        *(other_args + nested_or.children), _connector=models.Q.OR
                    )

                    # Optimization: don't need to check the children subtrees again
                    # still need to check for other direct nested ORs
                    checked_stack.append(updated_term)
                    checked_stack.extend(updated_term.children)

                # Check what we've got now on the next iteration,
                # we may have other nested ORs in the current term
                unchecked_stack.append(updated_term)
            else:
                pass  # the current term is on the top of the checked stack
        else:
            # We haven't checked this term to be a DNF, so check it
            unchecked_stack.append(current_term)
            unchecked_stack.extend(current_term.children[::-1])

            # Save the current term to be able to locate the beginning of the args
            checked_stack.append(current_term)

    if len(checked_stack) == 1 and (term := checked_stack[0]) and not _is_terminal_q(term):
        dnf_q = checked_stack[0]
    else:
        dnf_q = models.Q(*checked_stack, _connector=models.Q.OR)

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


class NonConvertibleQuery(Exception):
    pass


def q_from_where(queryset: _QuerysetT) -> models.Q:
    from django.utils import tree
    from django.db.models.sql import where

    def _traverse_query_where(queryset: _QuerysetT) -> Generator[tree.Node, None, None]:
        # Returns Where expression elements in the postfix expression order:
        # Where(a, b(c(d, e), f), g) ->
        # g, f, e, d, c, b, a, Where

        query_stack = [(queryset.query.where, False)]
        while query_stack:
            node, is_visited = query_stack.pop()

            if is_visited:
                yield node
            else:
                query_stack.append((node, True))
                for node_arg in node.children[::-1]:
                    query_stack.append((node_arg, False))

    def _as_simple_q(term: tree.Node, args: Sequence[models.Q | Any] = None) -> models.Q:
        if term.connector in (where.AND, where.OR):
            q_connector_for_node = {
                where.AND: models.Q.AND,
                where.OR: models.Q.OR,
            }
            assert len(term.children) == len(args)
            q = models.Q(*args, _connector=q_connector_for_node[term.connector])
        else:
            raise NonConvertibleQuery(term)

        if term.negated:
            q = ~q

        return q

    q_stack = []
    for term in _traverse_query_where(queryset):
        if isinstance(term, tree.Node):
            q_args_count = len(term.children)
            q_args = q_stack[-q_args_count::-1]
            q_stack.append(_as_simple_q(term, q_args))
        else:
            q_stack.append(term) # A terminal

    assert len(q_stack) == 1
    return q_stack[0]


class RecordingQuerySet(models.QuerySet):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.calls = []

    def filter(self, *args, **kwargs):
        self.calls.append(("filter", args, kwargs))
        return super().filter(*args, **kwargs)

    def exclude(self, *args, **kwargs):
        self.calls.append(("exclude", args, kwargs))
        return super().exclude(*args, **kwargs)
