<!--
 Copyright (C) CVAT.ai Corporation

 SPDX-License-Identifier: MIT
-->

# Clickhouse DB migrations

This directory contains migrations for the Clickhouse DB used by CVAT.

## Implementation details

The Clickhouse documentation explains options to customize DB loading here:
<https://clickhouse.com/docs/install/docker#how-to-extend-image>
In the default Docker image, Clickhouse only runs these files if the DB is not initialized.
This is not the desired behavior for us, because it doesn't allow us to add new migrations
added after the DB is initialized. Instead, we run the migrations on each start using a custom
script. Therefore **make sure the migrations can be safely called multiple times**
on an existing DB.

The directory contains scripts for the Clickhouse instance:
- `init.py`: initializes the DB and applies required migrations

## Adding a migration

To add a migration, create a new `migration_NNN_<custom name>` function in the `init.py` script
and add it to the list of migrations.

Recommendations on the migrations:
- **Make sure the migrations can be safely called multiple times**
  and do not fail on repeated calls on the initialized DB.
  Typically, this can be achieved by using "IF NOT EXISTS" at some point.
- Avoid heavy data migrations as much as possible. In most cases, changing only the table
  columns should be enough and you won't need a data migration.

As follows from the recommendations above, the current implementation is limited
to simple migrations only.
