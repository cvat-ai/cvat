# Copyright (C) 2023 Intel Corporation
#
# SPDX-License-Identifier: MIT

import requests
import requests.utils

from cvat import __version__

_CVAT_USER_AGENT = f"CVAT/{__version__} {requests.utils.default_user_agent()}"

def make_requests_session() -> requests.Session:
    session = requests.Session()
    session.headers['User-Agent'] = _CVAT_USER_AGENT
    return session
