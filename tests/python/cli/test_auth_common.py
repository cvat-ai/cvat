# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse

from cvat_cli._internal.common import add_cli_parser_args


def test_add_cli_parser_args_defaults_are_none():
    parser = argparse.ArgumentParser()
    add_cli_parser_args(parser)
    ns = parser.parse_args([])
    assert ns.server_host is None
    assert ns.server_port is None
    assert ns.auth is None
    assert ns.profile is None
    assert ns.insecure is False


def test_add_cli_parser_args_parses_profile_and_auth():
    parser = argparse.ArgumentParser()
    add_cli_parser_args(parser)
    ns = parser.parse_args(["--profile", "mycvat"])
    assert ns.profile == "mycvat"
    ns2 = parser.parse_args(["--auth", "bob:pw"])
    assert callable(ns2.auth)
