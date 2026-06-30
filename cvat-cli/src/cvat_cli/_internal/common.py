# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import importlib
import importlib.util
import logging
import sys
from http.client import HTTPConnection
from pathlib import Path
from typing import Any

import attrs
import cvat_sdk.auto_annotation as cvataa
from cvat_sdk.core.auth import (
    ClientAuthParameters,
    configure_client_auth_arguments,
    make_client_from_cli,
)
from cvat_sdk.core.client import Client
from cvat_sdk.core.exceptions import AuthStoreError

from ..version import VERSION
from .parsers import BuildDictAction, parse_function_parameter
from .utils import popattr


class CriticalError(Exception):
    pass


def configure_common_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--version", action="version", version=VERSION)
    configure_client_auth_arguments(parser)
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
    auth_args = ClientAuthParameters.from_namespace(parsed_args)
    for field in attrs.fields(ClientAuthParameters):
        popattr(parsed_args, field.name)

    try:
        client = make_client_from_cli(auth_args, logger=logger)
    except AuthStoreError as e:
        raise CriticalError(str(e)) from e

    client.check_server_version(fail_if_unsupported=False)
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
        function_module: str | None,
        function_file: Path | None,
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
    function_module: str | None
    function_file: Path | None
    function_parameters: dict[str, Any]

    def __attrs_post_init__(self):
        assert self.function_module is not None or self.function_file is not None

    def load(self) -> cvataa.AutoAnnotationFunction:
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

        if not hasattr(function, "spec"):
            raise cvataa.BadFunctionError("function has no 'spec' attribute")

        return function
