
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse

from . import source as source_module


def build_parser(parser=argparse.ArgumentParser()):
    source_module.build_add_parser(parser). \
        set_defaults(command=source_module.remove_command)

    return parser

def main(args=None):
    parser = build_parser()
    args = parser.parse_args(args)

    return args.command(args)
