
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import logging as log
import sys

from . import contexts, commands
from .util import CliException, add_subparser
from ..version import VERSION


def loglevel(name):
    numeric = getattr(log, name.upper(), None)
    if not isinstance(numeric, int):
        raise ValueError('Invalid log level: %s' % name)
    return numeric

def parse_command(input_args):
    parser = argparse.ArgumentParser(prog='datumaro')

    parser.add_argument('--version', action='version', version=VERSION)
    parser.add_argument('--loglevel', type=loglevel, default='info',
        help="Logging level (default: %(default)s)")

    known_commands = [
        ('project', contexts.project),
        ('source', contexts.source),
        ('model', contexts.model),

        ('create', commands.create),
        ('add', commands.add),
        ('remove', commands.remove),
        ('export', commands.export),
        ('explain', commands.explain),
    ]
    subcommands = parser.add_subparsers()
    for command_name, command in known_commands:
        add_subparser(subcommands, command_name, command.build_parser)

    return parser.parse_args(input_args)

def set_up_logger(general_args):
    loglevel = general_args.loglevel
    log.basicConfig(format='%(asctime)s %(levelname)s: %(message)s',
        level=loglevel)

def main(args=None):
    args = parse_command(args)

    set_up_logger(args)

    if 'command' not in args:
        parser.print_help()
        return 1

    try:
        return args.command(args)
    except CliException as e:
        log.error(e)
        return 1
    except Exception as e:
        log.error(e)
        raise


if __name__ == '__main__':
    sys.exit(main())