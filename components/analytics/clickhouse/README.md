<!--
 Copyright (C) CVAT.ai Corporation

 SPDX-License-Identifier: MIT
-->

# Clickhouse DB migrations

This directory contains migrations for the Clickhouse DB used by CVAT.

## Implementation details

The Clickhouse documentation explains options to customize DB loading here:
<https://clickhouse.com/docs/install/docker#how-to-extend-image>

Migrations are mounted into the container into the `/docker-entrypoint-initdb.d` directory.
There, only the main script `init.sh` is an executable shell script. The migration files
are also shell scripts inside, but they have the `.cmf` extension, which stands
for "clickhouse migration file". We use a custom extension to avoid automatic execution
of these files by Clickhouse.

**Please note that Clickhouse only runs these files if the DB is not initialized.**

## Adding a migration

To add a migration, create a new `NNN-<custom name>.cmf` file in this directory.

Recommendations on the migrations:
- Avoid heavy data migrations as much as possible. In most cases changing only the table
  columns should be enough and you won't need a data migration.
- Typically the migration should include "IF NOT EXISTS" at some point to allow idempotency
  and avoid failing the migration on an existing DB.

If adding or removing columns, you might need to update the list of allowed fields in `vector.toml`.

## How to run

If you need to run migrations manually, use the following command:

```bash
docker exec -it cvat_clickhouse bash /docker-entrypoint-initdb.d/init.sh
```
