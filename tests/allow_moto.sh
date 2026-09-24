# Same as allow_webhooks_receiver.sh, but for moto.
moto_ip_addr="$(getent hosts moto | head -1 | awk '{ print $1 }')"
export SMOKESCREEN_OPTS="$SMOKESCREEN_OPTS --allow-address=\"$moto_ip_addr\""
