# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os
import sys
import textwrap
from argparse import ArgumentParser

import clickhouse_connect
import clickhouse_connect.driver.client

CLICKHOUSE_HOST_ENV_VAR = "CLICKHOUSE_HOST"
CLICKHOUSE_PORT_ENV_VAR = "CLICKHOUSE_PORT"
CLICKHOUSE_DB_ENV_VAR = "CLICKHOUSE_DB"
CLICKHOUSE_USER_ENV_VAR = "CLICKHOUSE_USER"
CLICKHOUSE_PASSWORD_ENV_VAR = "CLICKHOUSE_PASSWORD"


def clear_db(client: clickhouse_connect.driver.client.Client):
    client.query(f"DROP TABLE IF EXISTS {client.database}.events;")


def migration_000_initial(client: clickhouse_connect.driver.client.Client):
    client.query(f"CREATE DATABASE IF NOT EXISTS {client.database};")

    client.query(
        textwrap.dedent(
            """\
        CREATE TABLE IF NOT EXISTS events
        (
            `scope` String NOT NULL,
            `obj_name` String NULL,
            `obj_id` UInt64 NULL,
            `obj_val` String NULL,
            `source` String NOT NULL,
            `timestamp` DateTime64(3, 'Etc/UTC') NOT NULL,
            `count` UInt16 NULL,
            `duration` UInt32 DEFAULT toUInt32(0),
            `project_id` UInt64 NULL,
            `task_id` UInt64 NULL,
            `job_id` UInt64 NULL,
            `user_id` UInt64 NULL,
            `user_name` String NULL,
            `user_email` String NULL,
            `org_id` UInt64 NULL,
            `org_slug` String NULL,
            `payload` String NULL
        )
        ENGINE = MergeTree
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (timestamp)
        SETTINGS index_granularity = 8192;
        """
        )
    )


migrations = [
    migration_000_initial,
]


def main(args: list[str] | None = None) -> int:
    parser = ArgumentParser(description="Initializes the DB and applies migrations")
    parser.add_argument("--host", help=f"Server host (env: {CLICKHOUSE_HOST_ENV_VAR})")
    parser.add_argument("--port", help=f"Server port (env: {CLICKHOUSE_PORT_ENV_VAR})")
    parser.add_argument("--db", help=f"Database name (env: {CLICKHOUSE_DB_ENV_VAR})")
    parser.add_argument("--user", help=f"Username (env: {CLICKHOUSE_USER_ENV_VAR})")
    parser.add_argument("--password", help=f"Password (env: {CLICKHOUSE_PASSWORD_ENV_VAR})")
    parser.add_argument(
        "--clear", action="store_true", help="Clear the existing DB and initialize a new one"
    )
    parsed_args = parser.parse_args(args)

    with clickhouse_connect.get_client(
        host=parsed_args.host or os.getenv(CLICKHOUSE_HOST_ENV_VAR),
        port=parsed_args.port or os.getenv(CLICKHOUSE_PORT_ENV_VAR),
        database=parsed_args.db or os.getenv(CLICKHOUSE_DB_ENV_VAR),
        username=parsed_args.user or os.getenv(CLICKHOUSE_USER_ENV_VAR),
        password=parsed_args.password or os.getenv(CLICKHOUSE_PASSWORD_ENV_VAR),
    ) as client:
        if parsed_args.clear:
            print("Clearing the DB")
            clear_db(client)
            print("done")

        for migration_func in migrations:
            print("Applying migration", migration_func.__name__)
            migration_func(client)
            print("done")

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
