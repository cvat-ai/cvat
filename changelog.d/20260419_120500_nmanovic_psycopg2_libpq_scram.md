### Fixed

- Updated `psycopg2-binary` to avoid local macOS test startup failures caused by older bundled libpq versions, including `SCRAM authentication requires libpq version 10 or above` when connecting to PostgreSQL.
