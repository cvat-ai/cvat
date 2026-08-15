# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Authenticate a client.

Recommended: a Personal Access Token (PAT) or a saved profile. Username/password
is a deprecated fallback.
"""

from cvat_sdk import Client, make_client
from cvat_sdk.core.auth import AuthStore, make_client_from_profile


def whoami(client: Client) -> str:
    """Return the username of the authenticated user (a quick auth check)."""
    me = client.users.retrieve_current_user()
    return me.username


def client_from_token(host: str, token: str) -> Client:
    """RECOMMENDED. Authenticate with a Personal Access Token.

    Create a token in the CVAT UI: Profile -> Security.
    """
    return make_client(host, access_token=token)


def client_from_profile(name: str | None = None) -> Client:
    """Authenticate from a persistent profile, so no secret lives in the code.

    Create the profile once on the CLI:

    cvat-cli --server-host https://app.cvat.ai profile create --name app --set-default

    Then reuse it here. Pass ``name`` to pick a specific profile, or leave it as
    ``None`` to use the default.
    """
    store = AuthStore()
    if name is not None:
        profile = store.get_profile(name)
    else:
        # get_default_profile() returns a (name, entry) tuple; take the entry.
        default = store.get_default_profile()
        profile = default[1] if default else None
    if profile is None:
        raise RuntimeError(
            "No matching CVAT profile found. Create one with:\n"
            "    cvat-cli --server-host https://app.cvat.ai profile create --name app --set-default"
        )
    return make_client_from_profile(profile)


def client_from_password(host: str, username: str, password: str) -> Client:
    """DEPRECATED fallback. Prefer ``client_from_token`` or ``client_from_profile``.

    Username/password sign-in is kept only for local/dev servers and will be
    removed in a future release.
    """
    return make_client(host, credentials=(username, password))


if __name__ == "__main__":
    from examples._auth import open_client

    with open_client() as client:
        username = whoami(client)
        print("Authenticated as", username)
