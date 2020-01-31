
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import logging as log
import sys

from . import contexts, commands
from .util import CliException, add_subparser
from ..version import VERSION


_log_levels = {
    'debug': log.DEBUG,
    'info': log.INFO,
    'warning': log.WARNING,
    'error': log.ERROR,
    'critical': log.CRITICAL
}

def loglevel(name):
    return _log_levels[name]

def _make_subcommands_help(commands, help_line_start=0):
    desc = ""
    for command_name, _, command_help in commands:
        desc += ("  %-" + str(max(0, help_line_start - 2 - 1)) + "s%s\n") % \
            (command_name, command_help)
    return desc

def make_parser():
    parser = argparse.ArgumentParser(prog="datumaro",
        description="Dataset Framework",
        formatter_class=argparse.RawDescriptionHelpFormatter)

    parser.add_argument('--version', action='version', version=VERSION)
    parser.add_argument('--loglevel', type=loglevel, default='info',
        help="Logging level (options: %s; default: %s)" % \
            (', '.join(_log_levels.keys()), "%(default)s"))

    known_contexts = [
        ('project', contexts.project, "Actions on projects (datasets)"),
        ('source', contexts.source, "Actions on data sources"),
        ('model', contexts.model, "Actions on models"),
    ]
    known_commands = [
        ('create', commands.create, "Create project"),
        ('add', commands.add, "Add source to project"),
        ('remove', commands.remove, "Remove source from project"),
        ('export', commands.export, "Export project"),
        ('explain', commands.explain, "Run Explainable AI algorithm for model"),
    ]

    # Argparse doesn't support subparser groups:
    # https://stackoverflow.com/questions/32017020/grouping-argparse-subparser-arguments
    help_line_start = max((len(e[0]) for e in known_contexts + known_commands),
        default=0)
    help_line_start = max((2 + help_line_start) // 4 + 1, 6) * 4 # align to tabs
    subcommands_desc = ""
    if known_contexts:
        subcommands_desc += "Contexts:\n"
        subcommands_desc += _make_subcommands_help(known_contexts,
            help_line_start)
    if known_commands:
        if subcommands_desc:
            subcommands_desc += "\n"
        subcommands_desc += "Commands:\n"
        subcommands_desc += _make_subcommands_help(known_commands,
            help_line_start)
    if subcommands_desc:
        subcommands_desc += \
            "\nRun '%s COMMAND --help' for more information on a command." % \
                parser.prog

    subcommands = parser.add_subparsers(title=subcommands_desc,
        description="", help=argparse.SUPPRESS)
    for command_name, command, _ in known_contexts + known_commands:
        add_subparser(subcommands, command_name, command.build_parser)

    return parser

def set_up_logger(args):
    log.basicConfig(format='%(asctime)s %(levelname)s: %(message)s',
        level=args.loglevel)

def main(args=None):
    parser = make_parser()
    args = parser.parse_args(args)

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