# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import json
import os.path
from typing import Any

from attr.converters import to_bool
from cvat_sdk.core.proxies.tasks import ResourceType


def parse_resource_type(s: str) -> ResourceType:
    try:
        return ResourceType[s.upper()]
    except KeyError:
        return s


def parse_label_arg(s):
    """If s is a file load it as JSON, otherwise parse s as JSON."""
    if os.path.exists(s):
        with open(s, "r") as fp:
            return json.load(fp)
    else:
        return json.loads(s)


def parse_function_parameter(s: str) -> tuple[str, Any]:
    key, sep, type_and_value = s.partition("=")

    if not sep:
        raise argparse.ArgumentTypeError("parameter value not specified")

    type_, sep, value = type_and_value.partition(":")

    if not sep:
        raise argparse.ArgumentTypeError("parameter type not specified")

    if type_ == "int":
        value = int(value)
    elif type_ == "float":
        value = float(value)
    elif type_ == "str":
        pass
    elif type_ == "bool":
        value = to_bool(value)
    else:
        raise argparse.ArgumentTypeError(f"unsupported parameter type {type_!r}")

    return (key, value)


def parse_threshold(s: str) -> float:
    try:
        value = float(s)
    except ValueError as e:
        raise argparse.ArgumentTypeError("must be a number") from e

    if not 0 <= value <= 1:
        raise argparse.ArgumentTypeError("must be between 0 and 1")
    return value


class BuildDictAction(argparse.Action):
    def __init__(self, option_strings, dest, default=None, **kwargs):
        super().__init__(option_strings, dest, default=default or {}, **kwargs)

    def __call__(self, parser, namespace, values, option_string=None):
        key, value = values
        getattr(namespace, self.dest)[key] = value
