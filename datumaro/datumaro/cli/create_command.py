
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse

from . import project as project_module


def build_parser(parser=argparse.ArgumentParser()):
    project_module.build_create_parser(parser) \
        .set_defaults(command=project_module.create_command)

    return parser

def main(args=None):
    parser = build_parser()
    args = parser.parse_args(args)

    return args.command(args)
