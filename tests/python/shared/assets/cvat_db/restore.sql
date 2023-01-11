SELECT :'from' = 'cvat' AS fromcvat \gset

\if :fromcvat
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = 'cvat' AND pid <> pg_backend_pid();
\endif

DROP DATABASE IF EXISTS :to WITH (FORCE);

CREATE DATABASE :to WITH TEMPLATE :from;
