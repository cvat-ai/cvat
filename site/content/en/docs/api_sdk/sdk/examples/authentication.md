---
title: 'Authenticate a client'
linkTitle: 'Authentication'
weight: 1
description: 'Turn a host plus a credential into an authenticated SDK client'
---

Turn a host plus a credential into a `Client`.

_Prerequisites:_ a running CVAT server and a credential. Prefer a Personal Access Token (Profile ->
Security) or a saved CLI profile.

```python
from cvat_sdk import Client, make_client
from cvat_sdk.core.auth import AuthStore, make_client_from_profile


def whoami(client: Client) -> str:
    """Return the username of the authenticated user (a quick auth check)."""
    me = client.users.retrieve_current_user()
    print("Authenticated as", me.username)
    return me.username


def client_from_token(host: str, token: str) -> Client:
    """RECOMMENDED. Authenticate with a Personal Access Token."""
    return make_client(host, access_token=token)


def client_from_profile(name: str | None = None) -> Client:
    """Authenticate from a persistent profile, so no secret lives in the code."""
    store = AuthStore()
    if name is not None:
        profile = store.get_profile(name)
    else:
        # get_default_profile() returns a (name, entry) tuple; take the entry.
        default = store.get_default_profile()
        profile = default[1] if default else None
    if profile is None:
        raise RuntimeError("No matching CVAT profile found.")
    return make_client_from_profile(profile)


def client_from_password(host: str, username: str, password: str) -> Client:
    """DEPRECATED fallback. Prefer client_from_token or client_from_profile."""
    return make_client(host, credentials=(username, password))
```

_Notes:_

- Create a profile once on the CLI, then reuse it with no secret in your code:
  `cvat-cli --server-host https://app.cvat.ai profile create --name app --set-default`.
- Username/password sign-in (`client_from_password`) is a **deprecated** fallback for local/dev
  servers only and will be removed in a future release.
- Full module:
  [`authentication.py`](https://github.com/cvat-ai/cvat/tree/develop/cvat-sdk/examples/authentication.py).
