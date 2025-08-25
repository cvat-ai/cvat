<!--
 Copyright (C) CVAT.ai Corporation

 SPDX-License-Identifier: MIT
-->

# Clickhouse DB migrations

This directory contains migrations for the Clickhouse DB used by CVAT.

## Implementation details

The directory contains initialization scripts for the Clickhouse instance.
Only the main script `init.sh` is an executable shell script. The migration files
are also shell scripts inside, but they have the `.cmf` extension, which stands
for "clickhouse migration file". We use a custom extension to avoid automatic execution
of these files by Clickhouse.

The Clickhouse documentation explains options to customize DB loading here:
<https://clickhouse.com/docs/install/docker#how-to-extend-image>
In the default Docker image, Clickhouse only runs these files if the DB is not initialized.
This is not the desired behavior for us, so we run the migrations on each start in a separate
initialization job. Therefore **make sure the migrations can be safely called multiple times**
on an existing DB.

## Adding a migration

To add a migration, create a new `NNN-<custom name>.cmf` file in this directory.

Recommendations on the migrations:
- **Make sure the migrations can be safely called multiple times**
  and do not fail on repeated calls on the initialized DB.
  Typically, this can be achieved by using "IF NOT EXISTS" at some point.
- Avoid heavy data migrations as much as possible. In most cases, changing only the table
  columns should be enough and you won't need a data migration.

As follows from the recommendations above, the current implementation is limited
to simple migrations only.
