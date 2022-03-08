restore="SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'cvat' AND pid <> pg_backend_pid();\
DROP DATABASE IF EXISTS $2;\
CREATE DATABASE $2 WITH TEMPLATE $1;"

echo $restore | psql -U root -d postgres