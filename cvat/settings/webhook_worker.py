# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import os

from psycopg_pool import ConnectionPool

from cvat.settings.production import *  # pylint: disable=wildcard-import

WEBHOOK_DB_POOL_MAX_SIZE = int(os.getenv("CVAT_DB_POOL_MAX_SIZE"))
WEBHOOK_DB_POOL_MAX_LIFETIME = 6 * 60 * 60  # 6 hours

DATABASES["default"]["OPTIONS"]["pool"] = {
    "min_size": 0,
    "max_size": WEBHOOK_DB_POOL_MAX_SIZE,
    "max_lifetime": WEBHOOK_DB_POOL_MAX_LIFETIME,
    "check": ConnectionPool.check_connection,
}
DATABASES["default"]["CONN_MAX_AGE"] = 0
DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True
