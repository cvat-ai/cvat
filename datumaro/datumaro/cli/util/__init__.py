
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT


class CliException(Exception): pass

def add_subparser(subparsers, name, builder):
    return builder(lambda **kwargs: subparsers.add_parser(name, **kwargs))