# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
import sys
from http.client import HTTPConnection
from types import SimpleNamespace
from typing import List

from cvat_sdk import exceptions
from cvat_sdk.core.client import Client, Config

from cvat_cli.cli import CLI
from cvat_cli.parser import get_action_args, make_cmdline_parser

logger = logging.getLogger(__name__)


def configure_logger(level):
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S", style="%"
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(level)
    if level <= logging.DEBUG:
        HTTPConnection.debuglevel = 1


def build_client(parsed_args: SimpleNamespace, logger: logging.Logger) -> Client:
    config = Config(verify_ssl=not parsed_args.insecure)

    url = parsed_args.server_host
    if parsed_args.server_port:
        url += f":{parsed_args.server_port}"

    return Client(
        url=url,
        logger=logger,
        config=config,
        check_server_version=False,  # version is checked after auth to support versions < 2.3
    )


def main(args: List[str] = None):
    actions = {
        "create": CLI.tasks_create,
        "delete": CLI.tasks_delete,
        "ls": CLI.tasks_list,
        "frames": CLI.tasks_frames,
        "dump": CLI.tasks_dump,
        "upload": CLI.tasks_upload,
        "export": CLI.tasks_export,
        "import": CLI.tasks_import,
    }
    parser = make_cmdline_parser()
    parsed_args = parser.parse_args(args)
    configure_logger(parsed_args.loglevel)

    with build_client(parsed_args, logger=logger) as client:
        action_args = get_action_args(parser, parsed_args)
        try:
            cli = CLI(client=client, credentials=parsed_args.auth)
            actions[parsed_args.action](cli, **vars(action_args))
        except exceptions.ApiException as e:
            logger.critical(e)
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
