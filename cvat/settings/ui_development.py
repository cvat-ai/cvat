# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

# Local-only settings for running the backend from the production image while
# testing the UI from a separate frontend dev server.
from .production import *  # pylint: disable=wildcard-import,unused-wildcard-import

UI_SCHEME = os.environ.get("CVAT_UI_SCHEME", "http")
UI_HOST = os.environ.get("CVAT_UI_HOST", "localhost")
UI_PORT = os.environ.get("CVAT_UI_PORT", "3000")

UI_URL = "{}://{}".format(UI_SCHEME, UI_HOST)
if UI_PORT and UI_PORT != "80":
    UI_URL += ":{}".format(UI_PORT)

CSRF_TRUSTED_ORIGINS = [UI_URL]
CORS_ORIGIN_WHITELIST = [UI_URL]
CORS_ALLOW_CREDENTIALS = True
