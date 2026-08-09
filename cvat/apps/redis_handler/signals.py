# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.dispatch import Signal

request_succeeded = Signal()
request_failed = Signal()
