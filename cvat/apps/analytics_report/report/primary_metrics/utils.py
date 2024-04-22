# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import clickhouse_connect
from django.conf import settings


def make_clickhouse_query(query, parameters):
    clickhouse_settings = settings.CLICKHOUSE["events"]

    with clickhouse_connect.get_client(
        host=clickhouse_settings["HOST"],
        database=clickhouse_settings["NAME"],
        port=clickhouse_settings["PORT"],
        username=clickhouse_settings["USER"],
        password=clickhouse_settings["PASSWORD"],
    ) as client:
        result = client.query(query, parameters=parameters)

    return result
