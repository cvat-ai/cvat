# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import re


class PsycopgDatabaseRestorer:
    """
    Restore PostgreSQL databases using one persistent psycopg connection.

    This replaces per-restore `docker exec ... psql` process startup with direct SQL
    over a single long-lived client connection. The implementation keeps the legacy
    restore semantics, but reduces repeated local restore overhead significantly.
    """

    _IDENT_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

    def __init__(
        self,
        *,
        host: str,
        port: int,
        user: str,
        postgres_db: str,
        password: str | None = None,
        connect_timeout_s: int = 5,
    ) -> None:
        import psycopg

        self._psycopg = psycopg
        self._conn = psycopg.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=postgres_db,
            connect_timeout=connect_timeout_s,
            autocommit=True,
        )
        self._cursor = self._conn.cursor()

    @classmethod
    def _validated_identifier(cls, name: str) -> str:
        if not cls._IDENT_PATTERN.fullmatch(name):
            raise ValueError(f"Unsupported PostgreSQL identifier: {name!r}")
        return name

    def restore_from_template(self, *, source_db: str, target_db: str) -> None:
        source = self._validated_identifier(source_db)
        target = self._validated_identifier(target_db)
        sql = self._psycopg.sql

        self._cursor.execute(
            "SELECT pg_terminate_backend(pg_stat_activity.pid) "
            "FROM pg_stat_activity "
            "WHERE pg_stat_activity.datname = %s "
            "AND pid <> pg_backend_pid()",
            (target,),
        )
        self._cursor.execute(
            sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(target))
        )
        self._cursor.execute(
            sql.SQL("CREATE DATABASE {} WITH TEMPLATE {}").format(
                sql.Identifier(target), sql.Identifier(source)
            )
        )

    def close(self) -> None:
        try:
            self._cursor.close()
        finally:
            self._conn.close()
