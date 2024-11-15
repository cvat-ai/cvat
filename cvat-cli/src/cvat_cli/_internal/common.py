# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import getpass
import logging
import os
import sys
from http.client import HTTPConnection

from cvat_sdk.core.client import Client, Config

from ..version import VERSION
from .utils import popattr


def get_auth(s):
    """Parse USER[:PASS] strings and prompt for password if none was
    supplied."""
    user, _, password = s.partition(":")
    password = password or os.environ.get("PASS") or getpass.getpass()
    return user, password


def configure_common_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--version", action="version", version=VERSION)
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="Allows to disable SSL certificate check",
    )

    parser.add_argument(
        "--auth",
        type=get_auth,
        metavar="USER:[PASS]",
        default=getpass.getuser(),
        help="""defaults to the current user and supports the PASS
                environment variable or password prompt
                (default user: %(default)s).""",
    )
    parser.add_argument(
        "--server-host", type=str, default="localhost", help="host (default: %(default)s)"
    )
    parser.add_argument(
        "--server-port",
        type=int,
        default=None,
        help="port (default: 80 for http and 443 for https connections)",
    )
    parser.add_argument(
        "--organization",
        "--org",
        metavar="SLUG",
        help="""short name (slug) of the organization
                to use when listing or creating resources;
                set to blank string to use the personal workspace
                (default: list all accessible objects, create in personal workspace)""",
    )
    parser.add_argument(
        "--debug",
        action="store_const",
        dest="loglevel",
        const=logging.DEBUG,
        default=logging.INFO,
        help="show debug output",
    )


def configure_logger(logger: logging.Logger, parsed_args: argparse.Namespace) -> None:
    level = popattr(parsed_args, "loglevel")
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S", style="%"
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(level)
    if level <= logging.DEBUG:
        HTTPConnection.debuglevel = 1


def build_client(parsed_args: argparse.Namespace, logger: logging.Logger) -> Client:
    config = Config(verify_ssl=not popattr(parsed_args, "insecure"))

    url = popattr(parsed_args, "server_host")
    if server_port := popattr(parsed_args, "server_port"):
        url += f":{server_port}"

    client = Client(
        url=url,
        logger=logger,
        config=config,
        check_server_version=False,  # version is checked after auth to support versions < 2.3
    )

    client.login(popattr(parsed_args, "auth"))
    client.check_server_version(fail_if_unsupported=False)

    client.organization_slug = popattr(parsed_args, "organization")

    return client
