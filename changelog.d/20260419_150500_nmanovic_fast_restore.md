### Fixed

- Local Python test runs now reset PostgreSQL, Redis, and CVAT data faster by replacing shell-based restore helpers with persistent client restores and cached data-copy preparation, which also reduces state leakage from background jobs between tests.
