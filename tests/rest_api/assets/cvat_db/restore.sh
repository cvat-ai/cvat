terminate="SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'cvat' AND pid <> pg_backend_pid();"
drop="DROP DATABASE IF EXISTS $2;"
create="CREATE DATABASE $2 WITH TEMPLATE $1;"

echo $terminate | psql -U root -d postgres
echo $drop | psql -U root -d postgres
echo $create | psql -U root -d postgres