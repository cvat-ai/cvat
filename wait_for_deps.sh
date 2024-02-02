#!/bin/sh

# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

# This is a wrapper script for running backend services. It waits for services
# the backend depends on to start before executing the backend itself.

# Ideally, the check that all DB migrations have completed should also be here,
# but it's too resource-intensive to execute for every worker we might be running
# in a container. Instead, it's in backend_entrypoint.sh.

~/wait-for-it.sh "${CVAT_POSTGRES_HOST}:${CVAT_POSTGRES_PORT:-5432}" -t 0
~/wait-for-it.sh "${CVAT_REDIS_INMEM_HOST}:${CVAT_REDIS_INMEM_PORT}" -t 0
~/wait-for-it.sh "${CVAT_REDIS_ONDISK_HOST}:${CVAT_REDIS_ONDISK_PORT}" -t 0

exec "$@"
