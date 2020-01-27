
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse

from ...util import add_subparser


def build_export_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()
    return parser

def build_stats_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()
    return parser

def build_diff_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()
    return parser

def build_edit_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()
    return parser

def build_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    subparsers = parser.add_subparsers()
    add_subparser(subparsers, 'export', build_export_parser)
    add_subparser(subparsers, 'stats', build_stats_parser)
    add_subparser(subparsers, 'diff', build_diff_parser)
    add_subparser(subparsers, 'edit', build_edit_parser)

    return parser
