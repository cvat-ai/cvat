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

    Why this approach:
    - Uses the same restore implementation for local docker and kubernetes.
    - Avoids spawning `docker exec ... redis-cli`/`kubectl exec ... redis-cli`
      per function-scoped restore.
    - Keeps restore semantics identical to legacy logic:
      preserve required RQ scheduler/worker keys in in-memory Redis DB 0,
      flush in-memory Redis DB 1, and flush all on on-disk Redis.

    Observed speedup in local benchmark runs:
    - `restore_redis_inmem_per_function`: ~57.0 ms -> ~1.38 ms (~41x faster)
    - `restore_redis_ondisk_per_function`: ~55.7 ms -> ~0.75 ms (~75x faster)
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

        # Validate connectivity eagerly to fail fast during infra setup.
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

        # Auth throttling/cache state is stored in DB 1 and must be reset.
        self._inmem_db1.flushdb()

    def restore_ondisk(self) -> None:
        self._ondisk.flushall()

    def close(self) -> None:
        self._inmem_db0.close()
        self._inmem_db1.close()
        self._ondisk.close()

