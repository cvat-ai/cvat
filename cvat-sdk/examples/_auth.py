# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

"""Shared helper: build an authenticated client from environment variables.

Used only by the ``__main__`` demo blocks in the example modules. The example
functions themselves take an already-authenticated ``client`` argument so they
can be reused (and tested in CI) against any client.
"""

import os

from cvat_sdk import Client, make_client


def open_client() -> Client:
    """Return a Client authenticated with a Personal Access Token from the environment.

    Requires ``CVAT_HOST`` (e.g. ``https://app.cvat.ai``) and ``CVAT_ACCESS_TOKEN``.
    """
    return make_client(
        os.environ["CVAT_HOST"],
        access_token=os.environ["CVAT_ACCESS_TOKEN"],
    )
