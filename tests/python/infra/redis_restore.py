# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from redis import Redis

_REDIS_INMEM_KEEP_KEYS = (
    "rq:worker:",
    "rq:workers",
    "rq:scheduler_instance:",
    "rq:queues:",
    "cvat:applied_migrations",
    "cvat:applied_migration:",
)


class RedisStateRestorer:
    """
    Restore Redis state using persistent client connections.

    The legacy shell helpers spawn `redis-cli` for every restore. This keeps the same
    state-reset semantics while moving local restores to direct client operations.
    """

    def __init__(
        self,
        *,
        host: str,
        inmem_port: int,
        ondisk_port: int,
        inmem_password: str | None = None,
        ondisk_password: str | None = None,
    ) -> None:
        self._inmem_db0 = Redis(
            host=host,
            port=inmem_port,
            db=0,
            password=inmem_password,
            decode_responses=True,
        )
        self._inmem_db1 = Redis(
            host=host,
            port=inmem_port,
            db=1,
            password=inmem_password,
            decode_responses=True,
        )
        self._ondisk = Redis(
            host=host,
            port=ondisk_port,
            db=0,
            password=ondisk_password,
            decode_responses=True,
        )

        self._inmem_db0.ping()
        self._inmem_db1.ping()
        self._ondisk.ping()

    @staticmethod
    def _should_keep_inmem_key(key: str) -> bool:
        return any(marker in key for marker in _REDIS_INMEM_KEEP_KEYS)

    def restore_inmem(self) -> None:
        keys_to_delete: list[str] = []
        cursor = 0
        while True:
            cursor, keys = self._inmem_db0.scan(cursor=cursor, count=1000)
            for key in keys:
                if not self._should_keep_inmem_key(key):
                    keys_to_delete.append(key)

            if len(keys_to_delete) >= 1000:
                self._inmem_db0.delete(*keys_to_delete)
                keys_to_delete.clear()

            if cursor == 0:
                break

        if keys_to_delete:
            self._inmem_db0.delete(*keys_to_delete)

        self._inmem_db1.flushdb()

    def restore_ondisk(self) -> None:
        self._ondisk.flushall()

    @property
    def inmem_db0(self) -> Redis:
        return self._inmem_db0

    def close(self) -> None:
        self._inmem_db0.close()
        self._inmem_db1.close()
        self._ondisk.close()
