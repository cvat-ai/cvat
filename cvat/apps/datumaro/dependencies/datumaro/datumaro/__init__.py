
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import logging as log
import sys

from .cli import (
    project as project_module,
    source as source_module,
    item as item_module,
    model as model_module,
    # inference as inference_module,

    create_command as create_command_module,
    add_command as add_command_module,
    remove_command as remove_command_module,
    export_command as export_command_module,
    # diff_command as diff_command_module,
    # build_command as build_command_module,
    stats_command as stats_command_module,
    explain_command as explain_command_module,
)
from .components.config import VERSION


KNOWN_COMMANDS = {
    # contexts
    'project': project_module.main,
    'source': source_module.main,
    'item': item_module.main,
    'model': model_module.main,
    # 'inference': inference_module.main,

    # shortcuts
    'create': create_command_module.main,
    'add': add_command_module.main,
    'remove': remove_command_module.main,
    'export': export_command_module.main,
    # 'diff': diff_command_module.main,
    # 'build': build_command_module.main,
    'stats': stats_command_module.main,
    'explain': explain_command_module.main,
}

def get_command(name, args=None):
    return KNOWN_COMMANDS[name]

def loglevel(name):
    numeric = getattr(log, name.upper(), None)
    if not isinstance(numeric, int):
        raise ValueError('Invalid log level: %s' % name)
    return numeric

def parse_command(input_args):
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=KNOWN_COMMANDS.keys(),
        help='A command to execute')
    parser.add_argument('args', nargs=argparse.REMAINDER)
    parser.add_argument('--version', action='version', version=VERSION)
    parser.add_argument('--loglevel', type=loglevel, default='info',
        help="Logging level (default: %(default)s)")

    general_args = parser.parse_args(input_args)
    command_name = general_args.command
    command_args = general_args.args
    return general_args, command_name, command_args

def set_up_logger(general_args):
    loglevel = general_args.loglevel
    log.basicConfig(format='%(asctime)s %(levelname)s: %(message)s',
        level=loglevel)

def main(args=None):
    if args is None:
        args = sys.argv[1:]

    general_args, command_name, command_args = parse_command(args)

    set_up_logger(general_args)

    command = get_command(command_name, general_args)
    return command(command_args)


if __name__ == '__main__':
    sys.exit(main())
