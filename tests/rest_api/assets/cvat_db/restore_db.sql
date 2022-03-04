SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'cvat' AND pid <> pg_backend_pid();

DROP DATABASE cvat;

CREATE DATABASE cvat WITH TEMPLATE test_db;