#!/bin/bash

psql -h 0.0.0.0 -p 15432 -U root -d cvat < query_images.sql > queried_images.list
sed -i '1,2d' queried_images.list
sed -i '$d' queried_images.list
sed -i '$d' queried_images.list
sed -i 's/^[ \t]*//g' queried_images.list

MERGE_DIR=./test_dir/
rm -Rf ${MERGE_DIR}
mkdir ${MERGE_DIR}
cat queried_images.list | xargs cp -t ${MERGE_DIR}

python3 ../../utils/cli-rockrobo/cli.py \
--auth admin:rockrobo123 \
--server-host 192.168.50.153 \
--server-port 8080 \
create test-merge1 \
--labels ./labels.json \
--overlap 0 \
--segment_size 100 \
--assignee 6 \
local ${MERGE_DIR}
