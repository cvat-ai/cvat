# Allow the test S3 server through Smokescreen's SSRF protection.
#
# CVAT sources this init script in the server and import/export/chunk workers.
# Moto runs on a private Docker network, so resolve its address and allow it
# explicitly. This lets cloud storage tests use the proxy without disabling
# its protection for other internal addresses.
moto_ip_addr="$(getent hosts moto | head -1 | awk '{ print $1 }')"
export SMOKESCREEN_OPTS="$SMOKESCREEN_OPTS --allow-address=\"$moto_ip_addr\""
