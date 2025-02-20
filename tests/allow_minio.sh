# Same as allow_webhooks_receiver.sh, but for minio.
minio_ip_addr="$(getent hosts minio | head -1 | awk '{ print $1 }')"
export SMOKESCREEN_OPTS="$SMOKESCREEN_OPTS --allow-address=\"$minio_ip_addr\""
