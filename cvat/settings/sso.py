# Copyright (C) CVDLINK fork
#
# SPDX-License-Identifier: MIT
#
# Settings overlay enabling Single Sign-On via an external authenticating
# reverse proxy (oauth2-proxy + Keycloak).
#
# Activate by setting `DJANGO_SETTINGS_MODULE=cvat.settings.sso` on the
# `cvat_server` and `cvat_worker_*` containers. The provided
# `docker-compose.sso.yml` does this automatically.
#
# How auth flows here:
#   1. The user hits CVAT through Traefik.
#   2. Traefik's `forwardAuth` middleware asks oauth2-proxy whether the
#      session cookie is valid; if not, the user is bounced through Keycloak.
#   3. On success, oauth2-proxy returns 200 plus `X-Auth-Request-Email`
#      / `X-Auth-Request-User` / `X-Auth-Request-Groups` headers, which
#      Traefik forwards to cvat_server.
#   4. `OIDCRemoteUserMiddleware` (in cvat.apps.iam.middleware) reads
#      `X-Auth-Request-Email` and hands it to Django's `RemoteUserBackend`,
#      which auto-creates the Django user and starts a session.

from cvat.settings.production import *  # noqa: F401,F403


# Insert the SSO middleware right after Django's AuthenticationMiddleware so
# session lookup happens first and RemoteUser only kicks in on the initial
# trusted request. Reference by string so the settings module doesn't import
# Django auth code before the app registry is ready.
_auth_idx = MIDDLEWARE.index(
    "django.contrib.auth.middleware.AuthenticationMiddleware"
)
MIDDLEWARE.insert(_auth_idx + 1, "cvat.apps.iam.middleware.OIDCRemoteUserMiddleware")

# Prepend RemoteUserBackend so trusted-header logins are recognized while
# keeping ModelBackend / allauth as fallbacks for token & basic auth.
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.RemoteUserBackend",
] + AUTHENTICATION_BACKENDS

# Trust X-Forwarded-* from Traefik so request.is_secure() / get_host() work
# correctly behind the proxy.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
