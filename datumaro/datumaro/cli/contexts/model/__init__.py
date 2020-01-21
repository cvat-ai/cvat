
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import logging as log
import os
import os.path as osp
import shutil

from datumaro.components.config import DEFAULT_FORMAT
from ...util import add_subparser
from ...util.project import load_project


def build_openvino_add_parser(parser=argparse.ArgumentParser()):
    parser.add_argument('-d', '--description', required=True,
        help="Path to the model description file (.xml)")
    parser.add_argument('-w', '--weights', required=True,
        help="Path to the model weights file (.bin)")
    parser.add_argument('-i', '--interpretation-script', required=True,
        help="Path to the network output interpretation script (.py)")
    parser.add_argument('--plugins-path', default=None,
        help="Path to the custom Inference Engine plugins directory")
    parser.add_argument('--copy', action='store_true',
        help="Copy the model data to the project")

    return parser

def openvino_args_extractor(args):
    my_args = argparse.Namespace()
    my_args.description = args.description
    my_args.weights = args.weights
    my_args.interpretation_script = args.interpretation_script
    my_args.plugins_path = args.plugins_path
    return my_args

def build_add_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    parser.add_argument('name',
        help="Name of the model to be added")
    launchers_sp = parser.add_subparsers(dest='launcher')

    build_openvino_add_parser(launchers_sp.add_parser('openvino')) \
        .set_defaults(launcher_args_extractor=openvino_args_extractor)

    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    parser.set_defaults(command=add_command)

    return parser

def add_command(args):
    project = load_project(args.project_dir)

    log.info("Adding '%s' model to '%s' project" % \
        (args.launcher, project.config.project_name))

    options = args.launcher_args_extractor(args)

    if args.launcher == 'openvino' and args.copy:
        config = project.config
        env_config = project.env.config

        model_dir_rel = osp.join(
            config.env_dir, env_config.models_dir, args.name)
        model_dir = osp.join(
            config.project_dir, model_dir_rel)

        os.makedirs(model_dir, exist_ok=True)

        shutil.copy(options.description,
            osp.join(model_dir, osp.basename(options.description)))
        options.description = \
            osp.join(model_dir_rel, osp.basename(options.description))

        shutil.copy(options.weights,
            osp.join(model_dir, osp.basename(options.weights)))
        options.weights = \
            osp.join(model_dir_rel, osp.basename(options.weights))

        shutil.copy(options.interpretation_script,
            osp.join(model_dir, osp.basename(options.interpretation_script)))
        options.interpretation_script = \
            osp.join(model_dir_rel, osp.basename(options.interpretation_script))

    project.add_model(args.name, {
        'launcher': args.launcher,
        'options': vars(options),
    })

    project.save()

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

    parser.add_argument('-o', '--output-dir', dest='dst_dir', required=True,
        help="Directory to save output")
    parser.add_argument('-m', '--model', dest='model_name', required=True,
        help="Model to apply to the project")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    parser.set_defaults(command=run_command)

    return parser

def run_command(args):
    project = load_project(args.project_dir)

    dst_dir = osp.abspath(args.dst_dir)
    os.makedirs(dst_dir, exist_ok=False)
    project.make_dataset().apply_model(
        save_dir=dst_dir,
        model_name=args.model_name)

    log.info("Inference results have been saved to '%s'" % dst_dir)

    return 0


def build_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    subparsers = parser.add_subparsers()
    add_subparser(subparsers, 'add', build_add_parser)
    add_subparser(subparsers, 'remove', build_remove_parser)
    add_subparser(subparsers, 'run', build_run_parser)

    return parser
