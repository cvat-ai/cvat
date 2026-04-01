# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
from http import HTTPStatus
from time import sleep

from infra.config import RuntimeInfraConfig
from shared.utils.config import ADMIN_PASS, ADMIN_USER

logger = logging.getLogger(__name__)


def _append_health_trace(message: str) -> None:
    try:
        trace_path = RuntimeInfraConfig.get_run_dir() / "health-trace.log"
        trace_path.parent.mkdir(parents=True, exist_ok=True)
        with open(trace_path, "a") as f:
            f.write(message.rstrip() + "\n")
    except Exception:
        logger.debug("Failed to append health trace", exc_info=True)


def wait_for_services(num_secs: int = 300) -> None:
    import requests

    url = RuntimeInfraConfig.get_server_url("api/server/health/", format="json")
    _append_health_trace(f"wait_for_services start url={url} timeout={num_secs}s")
    for i in range(num_secs):
        logger.debug("waiting for the server to load ... (%s)", i)
        try:
            response = requests.get(url, timeout=5)
            _append_health_trace(
                f"wait_for_services iter={i} url={url} status={response.status_code} "
                f"content_type={response.headers.get('Content-Type')}"
            )
            if response.status_code == HTTPStatus.OK:
                logger.debug("the server has finished loading!")
                _append_health_trace(f"wait_for_services success iter={i} url={url}")
                return

            try:
                statuses = response.json()
                logger.debug("server status: \n%s", statuses)
                _append_health_trace(f"wait_for_services iter={i} json={statuses}")
            except Exception as ex:
                logger.debug(
                    "server health returned non-JSON payload (status=%s, content-type=%s): %s",
                    response.status_code,
                    response.headers.get("Content-Type"),
                    ex,
                )
                _append_health_trace(
                    "wait_for_services "
                    f"iter={i} non_json status={response.status_code} "
                    f"content_type={response.headers.get('Content-Type')} error={ex!r}"
                )
        except Exception as ex:
            logger.debug("an error occurred during the server status checking: %s", ex)
            _append_health_trace(f"wait_for_services iter={i} exception={ex!r}")

        sleep(1)

    _append_health_trace(f"wait_for_services timeout url={url} timeout={num_secs}s")
    raise Exception(f"Failed to reach the server during {num_secs} seconds. Please check the configuration.")


def wait_for_auth_login_ready(num_secs: int = 180) -> None:
    import requests

    login_url = RuntimeInfraConfig.get_server_url("api/auth/login")
    payload = {"username": ADMIN_USER, "password": ADMIN_PASS}
    for i in range(num_secs):
        logger.debug("waiting for login endpoint to become ready ... (%s)", i)
        try:
            response = requests.post(login_url, json=payload, timeout=5)
            logger.debug("login readiness status: %s", response.status_code)
            # Any non-5xx response indicates endpoint is reachable and backend responds.
            if response.status_code < HTTPStatus.INTERNAL_SERVER_ERROR:
                return
        except Exception as ex:
            logger.debug("an error occurred during login readiness checking: %s", ex)

        sleep(1)

    raise Exception(
        f"Failed to get a stable response from /api/auth/login during {num_secs} seconds."
    )
