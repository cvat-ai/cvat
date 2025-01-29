# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import datetime

MAX_EVENT_DURATION = datetime.timedelta(seconds=100)
WORKING_TIME_RESOLUTION = datetime.timedelta(milliseconds=1)
WORKING_TIME_SCOPE = "send:working_time"
COMPRESSED_EVENT_SCOPES = frozenset(("change:frame",))
