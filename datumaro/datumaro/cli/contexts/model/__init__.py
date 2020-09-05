
# Copyright (C) 2019-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import logging as log
import os
import os.path as osp
import re

from datumaro.components.config import DEFAULT_FORMAT
from datumaro.components.project import Environment

from ...util import CliException, MultilineFormatter, add_subparser
from ...util.project import load_project, \
    generate_next_name, generate_next_file_name


def build_add_parser(parser_ctor=argparse.ArgumentParser):
    builtins = sorted(Environment().launchers.items)

    parser = parser_ctor(help="Add model to project",
        description="""
            Registers an executable model into a project. A model requires
            a launcher to be executed. Each launcher has its own options, which
            are passed after '--' separator, pass '-- -h' for more info.
            |n
            List of builtin launchers: %s
        """ % ', '.join(builtins),
        formatter_class=MultilineFormatter)

    parser.add_argument('-l', '--launcher', required=True,
        help="Model launcher")
    parser.add_argument('extra_args', nargs=argparse.REMAINDER, default=None,
        help="Additional arguments for converter (pass '-- -h' for help)")
    parser.add_argument('--copy', action='store_true',
        help="Copy the model to the project")
    parser.add_argument('-n', '--name', default=None,
        help="Name of the model to be added (default: generate automatically)")
    parser.add_argument('--overwrite', action='store_true',
        help="Overwrite if exists")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    parser.set_defaults(command=add_command)

    return parser

def add_command(args):
    project = load_project(args.project_dir)

    if args.name:
        if not args.overwrite and args.name in project.config.models:
            raise CliException("Model '%s' already exists "
                "(pass --overwrite to overwrite)" % args.name)
    else:
        args.name = generate_next_name(
            project.config.models, 'model', '-', default=0)
        assert args.name not in project.config.models, args.name

    try:
        launcher = project.env.launchers.get(args.launcher)
    except KeyError:
        raise CliException("Launcher '%s' is not found" % args.launcher)

    cli_plugin = getattr(launcher, 'cli_plugin', launcher)
    model_args = cli_plugin.from_cmdline(args.extra_args)

    if args.copy:
        log.info("Copying model data")

        model_dir = project.local_model_dir(args.name)
        os.makedirs(model_dir, exist_ok=False)

        try:
            cli_plugin.copy_model(model_dir, model_args)
        except (AttributeError, NotImplementedError):
            log.error("Can't copy: copying is not available for '%s' models" % \
                args.launcher)

    log.info("Checking the model")
    project.add_model(args.name, {
        'launcher': args.launcher,
        'options': model_args,
    })
    project.make_executable_model(args.name)

    project.save()

    log.info("Model '%s' with launcher '%s' has been added to project '%s'" % \
        (args.name, args.launcher, project.config.project_name))

    return 0

def build_remove_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    parser.add_argument('name',
        help="Name of the model to be removed")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    parser.set_defaults(command=remove_command)

    return parser

def remove_command(args):
    project = load_project(args.project_dir)

    project.remove_model(args.name)
    project.save()

    return 0

def build_run_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    parser.add_argument('-o', '--output-dir', dest='dst_dir',
        help="Directory to save output")
    parser.add_argument('-m', '--model', dest='model_name', required=True,
        help="Model to apply to the project")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    parser.add_argument('--overwrite', action='store_true',
        help="Overwrite if exists")
    parser.set_defaults(command=run_command)

    return parser

def run_command(args):
    project = load_project(args.project_dir)

    dst_dir = args.dst_dir
    if dst_dir:
        if not args.overwrite and osp.isdir(dst_dir) and os.listdir(dst_dir):
            raise CliException("Directory '%s' already exists "
                "(pass --overwrite overwrite)" % dst_dir)
    else:
        dst_dir = generate_next_file_name('%s-inference' % \
            project.config.project_name)

    project.make_dataset().apply_model(
        save_dir=osp.abspath(dst_dir),
        model=args.model_name)

    log.info("Inference results have been saved to '%s'" % dst_dir)

    return 0

def build_info_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    parser.add_argument('-n', '--name',
        help="Model name")
    parser.add_argument('-v', '--verbose', action='store_true',
        help="Show details")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    parser.set_defaults(command=info_command)

    return parser

def info_command(args):
    project = load_project(args.project_dir)

    if args.name:
        model = project.get_model(args.name)
        print(model)
    else:
        for name, conf in project.config.models.items():
            print(name)
            if args.verbose:
                print(dict(conf))

def build_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    subparsers = parser.add_subparsers()
    add_subparser(subparsers, 'add', build_add_parser)
    add_subparser(subparsers, 'remove', build_remove_parser)
    add_subparser(subparsers, 'run', build_run_parser)
    add_subparser(subparsers, 'info', build_info_parser)

    return parser
