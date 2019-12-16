
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse


def run_command(args):
    return 0

def build_run_parser(parser):
    return parser

def build_parser(parser=argparse.ArgumentParser()):
    command_parsers = parser.add_subparsers(dest='command')

    build_run_parser(command_parsers.add_parser('run')). \
        set_defaults(command=run_command)

    return parser

def process_command(command, args):
    return 0

def main(args=None):
    parser = build_parser()
    args = parser.parse_args(args)
    if 'command' not in args:
        parser.print_help()
        return 1

    return args.command(args)
