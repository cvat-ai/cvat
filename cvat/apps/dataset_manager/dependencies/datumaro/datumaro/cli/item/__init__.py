
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import os
import os.path as osp


def build_export_parser(parser):
    return parser

def build_stats_parser(parser):
    return parser

def build_diff_parser(parser):
    return parser

def build_edit_parser(parser):
    return parser

def build_parser(parser=argparse.ArgumentParser()):
    command_parsers = parser.add_subparsers(dest='command_name')

    build_export_parser(command_parsers.add_parser('export'))
    build_stats_parser(command_parsers.add_parser('stats'))
    build_diff_parser(command_parsers.add_parser('diff'))
    build_edit_parser(command_parsers.add_parser('edit'))

    return parser

def main(args=None):
    parser = build_parser()
    args = parser.parse_args(args)
    if 'command' not in args:
        parser.print_help()
        return 1

    return args.command(args)
