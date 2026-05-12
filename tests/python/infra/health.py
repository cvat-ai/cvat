# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
from http import HTTPStatus
from time import monotonic, sleep

import requests

from infra.config import RuntimeInfraConfig
from shared.utils.config import ADMIN_PASS, ADMIN_USER

logger = logging.getLogger(__name__)


def wait_for_services(timeout_seconds: int = 300) -> None:
    REQUEST_TIMEOUT_SECONDS = 5
    POLL_INTERVAL_SECONDS = 1
    url = RuntimeInfraConfig.get_server_url("api/server/health/", format="json")
    logger.debug("wait_for_services start url=%s timeout=%ss", url, timeout_seconds)
    deadline = monotonic() + timeout_seconds
    attempt = 0
    while monotonic() < deadline:
        remaining_seconds = deadline - monotonic()
        logger.debug("waiting for the server to load ... (%s)", attempt)
        try:
            response = requests.get(
                url,
                timeout=min(REQUEST_TIMEOUT_SECONDS, remaining_seconds),
            )
            logger.debug(
                "wait_for_services attempt=%s url=%s status=%s content_type=%s",
                attempt,
                url,
                response.status_code,
                response.headers.get("Content-Type"),
            )
            if response.status_code == HTTPStatus.OK:
                logger.debug("the server has finished loading! attempt=%s url=%s", attempt, url)
                return

            try:
                statuses = response.json()
                logger.debug("server status: \n%s", statuses)
            except Exception as ex:
                logger.debug(
                    "server health returned non-JSON payload (status=%s, content-type=%s): %s",
                    response.status_code,
                    response.headers.get("Content-Type"),
                    ex,
                )
        except Exception as ex:
            logger.debug("an error occurred during the server status checking: %s", ex)

        attempt += 1
        remaining_seconds = deadline - monotonic()
        if remaining_seconds > 0:
            sleep(min(POLL_INTERVAL_SECONDS, remaining_seconds))

    logger.debug("wait_for_services timeout url=%s timeout=%ss", url, timeout_seconds)
    raise Exception(
        f"Failed to reach the server during {timeout_seconds} seconds. "
        "Please check the configuration."
    )


def wait_for_auth_login_ready() -> None:
    TIMEOUT_SECONDS = 180
    REQUEST_TIMEOUT_SECONDS = 5
    POLL_INTERVAL_SECONDS = 1
    login_url = RuntimeInfraConfig.get_server_url("api/auth/login")
    payload = {"username": ADMIN_USER, "password": ADMIN_PASS}
    deadline = monotonic() + TIMEOUT_SECONDS
    attempt = 0
    while monotonic() < deadline:
        remaining_seconds = deadline - monotonic()
        logger.debug("waiting for login endpoint to become ready ... (%s)", attempt)
        try:
            response = requests.post(
                login_url,
                json=payload,
                timeout=min(REQUEST_TIMEOUT_SECONDS, remaining_seconds),
            )
            logger.debug("login readiness status: %s", response.status_code)
            # Any non-5xx response indicates endpoint is reachable and backend responds.
            if response.status_code < HTTPStatus.INTERNAL_SERVER_ERROR:
                return
        except Exception as ex:
            logger.debug("an error occurred during login readiness checking: %s", ex)

        attempt += 1
        remaining_seconds = deadline - monotonic()
        if remaining_seconds > 0:
            sleep(min(POLL_INTERVAL_SECONDS, remaining_seconds))

    raise Exception(
        "Failed to get a stable response from /api/auth/login during " f"{TIMEOUT_SECONDS} seconds."
    )
