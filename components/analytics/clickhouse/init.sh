#!/bin/bash

CLICKHOUSE_DB="${CLICKHOUSE_DB:-cvat}";
CLICKHOUSE_USER="${CLICKHOUSE_USER:-user}";
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-password}";

cat <<EOT > /etc/clickhouse-server/users.d/user.xml
<yandex>
  <!-- Docs: <https://clickhouse.tech/docs/en/operations/settings/settings_users/> -->
  <users>
    <${CLICKHOUSE_USER}>
      <profile>default</profile>
      <networks>
        <ip>::/0</ip>
      </networks>
      <password>${CLICKHOUSE_PASSWORD}</password>
      <quota>default</quota>
    </${CLICKHOUSE_USER}>
  </users>
</yandex>
EOT
sleep 3

clickhouse-client --query "CREATE DATABASE IF NOT EXISTS ${CLICKHOUSE_DB}";

echo "
CREATE TABLE IF NOT EXISTS ${CLICKHOUSE_DB}.events
(
    \`scope\` String NOT NULL,
    \`obj_name\` String NULL,
    \`obj_id\` UInt64 NULL,
    \`obj_val\` String NULL,
    \`source\` String NOT NULL,
    \`timestamp\` DateTime64(3, 'Etc/UTC') NOT NULL,
    \`count\` UInt16 NULL,
    \`duration\` UInt32 DEFAULT toUInt32(0),
    \`project_id\` UInt64 NULL,
    \`task_id\` UInt64 NULL,
    \`job_id\` UInt64 NULL,
    \`user_id\` UInt64 NULL,
    \`user_name\` String NULL,
    \`user_email\` String NULL,
    \`org_id\` UInt64 NULL,
    \`org_slug\` String NULL,
    \`payload\` String NULL
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp)
SETTINGS index_granularity = 8192
;" | clickhouse-client
