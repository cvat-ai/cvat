# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import logging
import sys
from http.client import HTTPConnection

from cvat_cli import CLI, make_cmdline_parser

from cvat_sdk import exceptions, make_client

log = logging.getLogger(__name__)


def config_log(level):
    log = logging.getLogger("core")
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S", style="%"
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    log.addHandler(handler)
    log.setLevel(level)
    if level <= logging.DEBUG:
        HTTPConnection.debuglevel = 1


def main():
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
    args = make_cmdline_parser.parse_args()
    config_log(args.loglevel)

    with make_client(args.server_host, port=args.server_port) as client:
        client.logger = log

        cli = CLI(client=client, credentials=args.auth)
        try:
            actions[args.action](cli, **args.__dict__)
        except exceptions.ApiException as e:
            log.critical(e)

    return 0


if __name__ == "__main__":
    sys.exit(main())
