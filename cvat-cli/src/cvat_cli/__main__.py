# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import logging
import sys

import urllib3.exceptions
from cvat_sdk import exceptions
from cvat_sdk.core.exceptions import AuthStoreError

from ._internal.commands_all import COMMANDS
from ._internal.common import (
    CriticalError,
    build_client,
    configure_common_arguments,
    configure_logger,
)
from ._internal.utils import popattr

logger = logging.getLogger(__name__)


def main(args: list[str] = None):
    parser = argparse.ArgumentParser(description=COMMANDS.description)
    configure_common_arguments(parser)
    COMMANDS.configure_parser(parser)

    parsed_args = parser.parse_args(args)

    configure_logger(logger, parsed_args)

    executor = popattr(parsed_args, "_executor")
    needs_client = popattr(parsed_args, "_needs_client")

    try:
        if needs_client:
            with build_client(parsed_args, logger=logger) as client:
                executor(client, **vars(parsed_args))
        else:
            executor(parsed_args)
    except (
        exceptions.ApiException,
        urllib3.exceptions.HTTPError,
        CriticalError,
        AuthStoreError,
    ) as e:
        logger.critical(e)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
