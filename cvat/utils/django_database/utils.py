import logging
from collections.abc import Iterable, Sequence
from typing import Any, TypeVar

from django.conf import settings
from django.db import DatabaseError, connection
from django.db.models import Manager, Model, QuerySet
from psycopg2 import Error as PsycopgError
from psycopg2 import sql

_ModelT = TypeVar("_ModelT", bound=Model)
_QuerysetT = TypeVar("_QuerysetT", bound=QuerySet)
_unspecified = object()

_logger = logging.getLogger(__name__)


def get_or_404(
    queryset: type[_ModelT] | QuerySet[_ModelT] | Manager[_ModelT],
    pk: Any,
) -> _ModelT:
    """
    A simpler version of django.shortcuts.get_object_or_404()
    Produces a better error message.
    """

    if hasattr(queryset, "_default_manager"):
        queryset = queryset._default_manager.all()

    model_type = queryset.model

    try:
        return queryset.get(pk=pk)
    except model_type.DoesNotExist as ex:
        from rest_framework.exceptions import NotFound

        readable_model_name = queryset.model._meta.verbose_name.capitalize()
        raise NotFound(f"{readable_model_name} {pk} does not exist") from ex


def find_psycopg_cause(
    exc: DatabaseError,
) -> PsycopgError | None:
    """Return the deepest underlying psycopg exception from a Django database error."""

    seen: set[int] = set()

    def find_deepest(current: BaseException) -> PsycopgError | None:
        if id(current) in seen:
            return None

        seen.add(id(current))

        nested_causes = [
            nested for nested in (current.__cause__, current.__context__) if nested is not None
        ]

        for nested in nested_causes:
            nested_psycopg_cause = find_deepest(nested)
            if nested_psycopg_cause is not None:
                return nested_psycopg_cause

        if isinstance(current, PsycopgError):
            return current

        return None

    return find_deepest(exc)


def set_local_lock_timeout(timeout_seconds: int | None = None) -> None:
    if not connection.in_atomic_block:
        raise RuntimeError("set_local_lock_timeout must be called inside a transaction")

    match connection.vendor:
        case "postgresql":
            with connection.cursor() as cursor:
                cursor.execute(
                    "SET LOCAL lock_timeout = %s;",
                    [
                        (
                            timeout_seconds
                            if timeout_seconds is not None
                            else settings.CVAT_POSTGRES_TRANSACTION_LOCK_TIMEOUT_SECONDS
                        )
                        * 1000
                    ],
                )
        case "sqlite":
            # NOTE @aleksei: SQLite-backed tests cannot emulate PostgreSQL lock_timeout.
            _logger.warning("Skipping PostgreSQL lock_timeout on %s backend", connection.vendor)
            return
        case _:
            raise NotImplementedError(
                f"set_local_lock_timeout is not implemented for {connection.vendor} backend"
            )


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


def is_prefetched(queryset: QuerySet, field: str) -> bool:
    "Checks if a field is being prefetched in the queryset"
    return field in queryset._prefetch_related_lookups


def is_field_cached(instance: Model, field: str) -> bool:
    "Checks if a field is cached in the model instance"
    return field in instance._state.fields_cache


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


def get_object_by_id_for_share(model: type[_ModelT], object_id: int) -> _ModelT:
    match connection.vendor:
        case "postgresql":
            query = sql.SQL("SELECT id FROM {table_name} WHERE id = %s FOR SHARE").format(
                table_name=sql.Identifier(model._meta.db_table),
            )

            with connection.cursor() as cursor:
                cursor.execute(query, [object_id])

            return model.objects.get(pk=object_id)
        case "sqlite":
            # NOTE @aleksei: SQLite-backed tests cannot emulate PostgreSQL FOR SHARE locks.
            _logger.warning("Falling back to unlocked %s.objects.get()", model.__name__)
            return model.objects.get(pk=object_id)
        case _:
            raise NotImplementedError(
                f"get_object_by_id_for_share is not implemented for {connection.vendor} backend"
            )
