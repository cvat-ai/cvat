
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import logging as log
import logging.handlers
import os
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

class _LogManager:
    _LOGLEVEL_ENV_NAME = '_DATUMARO_INIT_LOGLEVEL'
    _BUFFER_SIZE = 1000
    _root = None
    _init_handler = None
    _default_handler = None

    @classmethod
    def init_basic_logger(cls):
        base_loglevel = os.getenv(cls._LOGLEVEL_ENV_NAME, 'info')
        base_loglevel = loglevel(base_loglevel)
        root = log.getLogger()
        root.setLevel(base_loglevel)

        # NOTE: defer use of this handler until the logger
        # is properly initialized, but keep logging enabled before this.
        # Store messages obtained during initialization and print them after
        # if necessary.
        default_handler = log.StreamHandler()
        default_handler.setFormatter(
            log.Formatter('%(asctime)s %(levelname)s: %(message)s'))

        init_handler = logging.handlers.MemoryHandler(cls._BUFFER_SIZE,
            target=default_handler)
        root.addHandler(init_handler)

        cls._root = root
        cls._init_handler = init_handler
        cls._default_handler = default_handler

    @classmethod
    def set_up_logger(cls, level):
        log.getLogger().setLevel(level)

        if cls._init_handler:
            # NOTE: Handlers are not capable of filtering with loglevel
            # despite a level can be set for a handler. The level is checked
            # by Logger. However, handler filters are checked at handler level.
            class LevelFilter:
                def __init__(self, level):
                    super().__init__()
                    self.level = level

                def filter(self, record):
                    return record.levelno >= self.level
            filt = LevelFilter(level)
            cls._default_handler.addFilter(filt)

            cls._root.removeHandler(cls._init_handler)
            cls._init_handler.close()
            del cls._init_handler
            cls._init_handler = None

            cls._default_handler.removeFilter(filt)

            cls._root.addHandler(cls._default_handler)

def main(args=None):
    _LogManager.init_basic_logger()

    parser = make_parser()
    args = parser.parse_args(args)

    _LogManager.set_up_logger(args.loglevel)

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