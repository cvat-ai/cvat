# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import getpass
import importlib
import importlib.util
import logging
import os
import sys
from http.client import HTTPConnection
from pathlib import Path
from typing import Any, Optional

import attrs
import cvat_sdk.auto_annotation as cvataa
from cvat_sdk.core.client import Client, Config

from ..version import VERSION
from .parsers import BuildDictAction, parse_function_parameter
from .utils import popattr


class CriticalError(Exception):
    pass


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
    handler = logging.StreamHandler(sys.stderr)
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


def configure_function_implementation_arguments(parser: argparse.ArgumentParser) -> None:
    function_group = parser.add_mutually_exclusive_group(required=True)

    function_group.add_argument(
        "--function-module",
        metavar="MODULE",
        help="qualified name of a module to use as the function",
    )

    function_group.add_argument(
        "--function-file",
        metavar="PATH",
        type=Path,
        help="path to a Python source file to use as the function",
    )

    parser.add_argument(
        "--function-parameter",
        "-p",
        metavar="NAME=TYPE:VALUE",
        type=parse_function_parameter,
        action=BuildDictAction,
        dest="function_parameters",
        help="parameter for the function",
    )

    original_executor = parser.get_default("_executor")

    def execute_with_function_loader(
        client,
        *,
        function_module: Optional[str],
        function_file: Optional[Path],
        function_parameters: dict[str, Any],
        **kwargs,
    ):
        original_executor(
            client,
            function_loader=FunctionLoader(function_module, function_file, function_parameters),
            **kwargs,
        )

    parser.set_defaults(_executor=execute_with_function_loader)


@attrs.frozen
class FunctionLoader:
    function_module: Optional[str]
    function_file: Optional[Path]
    function_parameters: dict[str, Any]

    def __attrs_post_init__(self):
        assert self.function_module is not None or self.function_file is not None

    def load(self) -> cvataa.DetectionFunction:
        if self.function_module is not None:
            function = importlib.import_module(self.function_module)
        else:
            module_spec = importlib.util.spec_from_file_location(
                "__cvat_function__", self.function_file
            )
            function = importlib.util.module_from_spec(module_spec)
            module_spec.loader.exec_module(function)

        if hasattr(function, "create"):
            # this is actually a function factory
            function = function.create(**self.function_parameters)
        else:
            if self.function_parameters:
                raise TypeError("function takes no parameters")

        return function
