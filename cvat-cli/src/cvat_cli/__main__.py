# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import logging
import sys
from http.client import HTTPConnection

import requests

from cvat_cli.core.core import CLI, CVAT_API_V2
from cvat_cli.core.definition import parser

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
        "frames": CLI.tasks_frame,
        "dump": CLI.tasks_dump,
        "upload": CLI.tasks_upload,
        "export": CLI.tasks_export,
        "import": CLI.tasks_import,
    }
    args = parser.parse_args()
    config_log(args.loglevel)
    with requests.Session() as session:
        api = CVAT_API_V2("%s:%s" % (args.server_host, args.server_port), args.https)
        cli = CLI(session, api, args.auth)
        try:
            actions[args.action](cli, **args.__dict__)
        except (
            requests.exceptions.HTTPError,
            requests.exceptions.ConnectionError,
            requests.exceptions.RequestException,
        ) as e:
            log.critical(e)

    return 0


if __name__ == "__main__":
    sys.exit(main())
