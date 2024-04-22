# We want to exclude webhooks_receiver from SSRF protection,
# so that the server can access it.
# --allow-address doesn't allow hostnames, so we have to resolve
# the IP address ourselves.
webhooks_ip_addr="$(getent hosts webhooks | head -1 | awk '{ print $1 }')"
export SMOKESCREEN_OPTS="$SMOKESCREEN_OPTS --allow-address=\"$webhooks_ip_addr\""
