# Allow the test S3 server through Smokescreen's SSRF protection.
export SMOKESCREEN_OPTS="${SMOKESCREEN_OPTS:-} --unsafe-ip-filter-bypassed-domain=moto"
