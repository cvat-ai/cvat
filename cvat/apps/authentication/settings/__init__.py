
# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum

class AUTH_GROUP(Enum):
    ADMINS = 'admins'
    USERS = 'users'
    ANNOTATORS = 'annotators'
    OBSERVERS = 'observers'

    def __str__(self):
        return self.value
