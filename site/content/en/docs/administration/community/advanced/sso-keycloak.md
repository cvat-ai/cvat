---
title: 'Keycloak SSO via oauth2-proxy'
linkTitle: 'Keycloak SSO'
weight: 41
description: 'Single Sign-On for self-hosted CVAT using Keycloak (OpenID Connect)'
---

> This page describes the **CVDLINK fork** of CVAT. The upstream
> `cvat-ai/cvat` distribution does not ship the SSO wiring documented here;
> the `auth_config.yml` flow shown on the upstream
> [SSO docs](https://docs.cvat.ai/docs/account_management/sso/) is part of
> CVAT Enterprise and is not present in the open-source codebase.

## What this enables

* Users authenticate to CVAT through your existing Keycloak realm using
  OpenID Connect.
* Django auto-provisions a CVAT user on first sign-in (mapped from the
  Keycloak email address).
* `cvat-cli`, `cvat-sdk`, webhooks and any other client using
  `Authorization: Token …` keep working — token requests bypass the OIDC
  middleware automatically.
* Health and basic-auth login endpoints stay reachable for liveness probes
  and CLI token issuance.

## Architecture

```
Browser ──► Traefik ──► oauth2-proxy ──► Keycloak
                │                         │
                │ ◄────── cookie set ─────┘
                ▼
            cvat_server (Django)
            └─ cvat.settings.sso
               └─ RemoteUserBackend reads X-Auth-Request-Email
```

* **oauth2-proxy** (new container) terminates OIDC with Keycloak.
* **Traefik forwardAuth** middleware checks every browser request against
  oauth2-proxy and forwards the authenticated identity to cvat_server as
  `X-Auth-Request-Email` / `X-Auth-Request-User` / `X-Auth-Request-Groups`.
* **`cvat/settings/sso.py`** plugs Django's `RemoteUserBackend` into the
  middleware chain so the trusted header creates / authenticates the user.

## Prerequisites

* CVAT deployed via the provided Docker Compose stack
  (`docker-compose.yml` + `docker-compose.https.yml`).
* A reachable Keycloak instance.
* DNS set up so `${CVAT_HOST}` resolves to the host running CVAT.
* TLS in front of CVAT (the `https` overlay or a corporate load balancer).
  OIDC cookies must travel over HTTPS in production.

## 1. Configure Keycloak

In your realm:

1. **Create a client.**
   * Client type: *OpenID Connect*.
   * Client ID: `cvat` (or whatever you'll set as `SSO_CLIENT_ID`).
   * Client authentication: **On** (confidential).
   * Authentication flow: enable *Standard flow*; disable *Direct access
     grants* unless you need the password grant.
2. **Set Valid Redirect URIs** to:
   ```
   https://<CVAT_HOST>/oauth2/callback
   ```
3. **Set Web origins** to `+` (echo the redirect URI origin).
4. **Capture credentials** — the *Credentials* tab gives you the client
   secret you'll put in `SSO_CLIENT_SECRET`.
5. *(Optional)* If you want Keycloak group / role names to flow through to
   CVAT, add a *Group Membership* mapper to the client with token claim
   name `groups`, full group path off, and "Add to ID token / Userinfo"
   enabled. The default claim name in `oauth2-proxy` is `groups`; override
   it via `SSO_GROUPS_CLAIM` if you use a different name.

## 2. Fill in `.env.sso`

```bash
cp .env.sso.example .env.sso
$EDITOR .env.sso
```

Generate a fresh cookie secret (32 bytes, base64):

```bash
openssl rand -base64 32 | tr -d '\n'
```

Required values:

| Variable                | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `CVAT_HOST`             | Public hostname users connect to.                    |
| `SSO_OIDC_ISSUER_URL`   | `https://<keycloak>/realms/<realm>`                  |
| `SSO_CLIENT_ID`         | Keycloak client ID.                                  |
| `SSO_CLIENT_SECRET`     | Keycloak client secret.                              |
| `SSO_COOKIE_SECRET`     | 32-byte base64 string for cookie signing.            |
| `SSO_REDIRECT_URL`      | `https://<CVAT_HOST>/oauth2/callback`                |

Optional values are documented inline in `.env.sso.example`.

## 3. Start the stack

```bash
docker compose --env-file .env.sso \
  -f docker-compose.yml \
  -f docker-compose.https.yml \
  -f docker-compose.sso.yml \
  up -d
```

The first browser hit on `https://${CVAT_HOST}/` will be redirected to
Keycloak. After sign-in you land back on CVAT, already logged in.

## 4. Promote a user to admin

`RemoteUserBackend` provisions everyone as a regular `user` in CVAT. Make
your account an admin by exec'ing into `cvat_server`:

```bash
docker compose exec cvat_server python manage.py shell -c "
from django.contrib.auth import get_user_model
u = get_user_model().objects.get(email='you@example.com')
u.is_staff = u.is_superuser = True
u.save()
u.groups.add(__import__('django.contrib.auth.models', fromlist=['Group']).Group.objects.get(name='admin'))
"
```

## CLI / SDK access

`cvat-cli` and `cvat-sdk` keep working because the Compose overlay defines
a higher-priority Traefik router (`cvat-api-token`) matching any `/api/*`
request that already carries an `Authorization` header (`Token`, `Basic`
or `Bearer`). Such requests are routed straight to cvat_server, skipping
oauth2-proxy.

Issue a token the usual way:

```bash
curl -X POST -d 'username=you&password=...' \
  https://${CVAT_HOST}/api/auth/login
```

Then use it in subsequent calls:

```bash
curl -H "Authorization: Token <key>" https://${CVAT_HOST}/api/jobs
```

## Caveats

* The CVAT in-app login form is shadowed by oauth2-proxy. Browser users
  always sign in through Keycloak; the `/auth/login` page is not reached
  unless they use a request flow that bypasses the proxy (e.g. CLI).
* No automatic Keycloak-group → CVAT-role mapping is wired up. Promote
  admins manually as shown above. (A signal handler reading
  `X-Auth-Request-Groups` is straightforward to add — see
  `cvat/apps/iam/signals.py` for the LDAP equivalent.)
* The OIDC cookie is signed locally by oauth2-proxy. Logging out of
  Keycloak does not immediately invalidate it — set a short
  `OAUTH2_PROXY_COOKIE_REFRESH` if that matters.

## Files added by this overlay

| Path                                         | Purpose                                  |
| -------------------------------------------- | ---------------------------------------- |
| `cvat/settings/sso.py`                       | Django settings overlay.                 |
| `docker-compose.sso.yml`                     | oauth2-proxy + Traefik forwardAuth wiring|
| `.env.sso.example`                           | Documented env-var template.             |
