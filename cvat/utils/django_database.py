import logging
from functools import wraps
from typing import Callable, ParamSpec, TypeVar

from django.conf import settings
from django.db import DatabaseError, connection
from django.db.models import Model
from psycopg2 import Error as PsycopgError
from psycopg2 import sql

P = ParamSpec("P")
R = TypeVar("R")
_ModelT = TypeVar("_ModelT", bound=Model)
_logger = logging.getLogger(__name__)


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
    if connection.vendor != "postgresql":
        # NOTE @aleksei: SQLite-backed tests cannot emulate PostgreSQL lock_timeout.
        _logger.warning("Skipping PostgreSQL lock_timeout on %s backend", connection.vendor)
        return

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


def set_local_lock_timeout_decorator(
    timeout_seconds: int | None = None,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            set_local_lock_timeout(timeout_seconds=timeout_seconds)
            return func(*args, **kwargs)

        return wrapper

    return decorator


def get_object_by_id_for_share(model: type[_ModelT], object_id: int) -> _ModelT:
    if connection.vendor != "postgresql":
        # NOTE @aleksei: SQLite-backed tests cannot emulate PostgreSQL FOR SHARE locks.
        _logger.warning("Falling back to unlocked %s.objects.get()", model.__name__)
        return model.objects.get(pk=object_id)

    query = sql.SQL("SELECT id FROM {table_name} WHERE id = %s FOR SHARE").format(
        table_name=sql.Identifier(model._meta.db_table),
    )

    with connection.cursor() as cursor:
        cursor.execute(query, [object_id])

    return model.objects.get(pk=object_id)
