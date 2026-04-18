### Fixed

- Python tests now restore PostgreSQL and Redis state much faster by reusing persistent client connections for DB/template restores and Redis cleanup instead of spawning one-shot shell commands for every restore.
