# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import pytest

from infra.debug import DEBUG_SERVICE_TO_CONTAINER


def parse_debug_services(value: str | None) -> list[str]:
    if not value:
        return []

    services: list[str] = []
    for entry in (item.strip() for item in value.split(",") if item.strip()):
        if entry in {"all", "*"}:
            services.extend(DEBUG_SERVICE_TO_CONTAINER.keys())
            continue
        if entry == "workers":
            services.extend(
                service_name
                for service_name in DEBUG_SERVICE_TO_CONTAINER
                if service_name != "server"
            )
            continue
        services.append(entry)

    invalid = sorted(set(services) - set(DEBUG_SERVICE_TO_CONTAINER))
    if invalid:
        raise pytest.UsageError(
            f"Unknown debug service(s): {', '.join(invalid)}. "
            "Allowed: " + ", ".join(DEBUG_SERVICE_TO_CONTAINER.keys()) + ", workers, all"
        )

    return list(dict.fromkeys(services))
