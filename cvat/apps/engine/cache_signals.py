# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.dispatch import Signal

cache_item_created_signal = Signal()
cache_item_read_signal = Signal()
