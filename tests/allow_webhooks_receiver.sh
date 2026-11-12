# Allow the test webhook receiver through Smokescreen's SSRF protection.
export SMOKESCREEN_OPTS="${SMOKESCREEN_OPTS:-} --unsafe-ip-filter-bypassed-domain=webhooks.internal"
