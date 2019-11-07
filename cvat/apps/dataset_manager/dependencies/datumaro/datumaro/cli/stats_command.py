
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import os
import os.path as osp

from datumaro.components.project import Project
from datumaro.util.command_targets import *

from . import project as project_module
from . import source as source_module
from . import item as item_module


def compute_external_dataset_stats(target, params):
    raise NotImplementedError()

def build_parser(parser=argparse.ArgumentParser()):
    parser.add_argument('target', nargs='?', default=None)
    parser.add_argument('params', nargs=argparse.REMAINDER)

    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")

    return parser

def process_command(target, params, args):
    project_dir = args.project_dir
    target_kind, target_value = target
    if target_kind == TargetKinds.project:
        return project_module.main(['stats', '-p', target_value] + params)
    elif target_kind == TargetKinds.source:
        return source_module.main(['stats', '-p', project_dir, target_value] + params)
    elif target_kind == TargetKinds.item:
        return item_module.main(['stats', '-p', project_dir, target_value] + params)
    elif target_kind == TargetKinds.external_dataset:
        return compute_external_dataset_stats(target_value, params)
    return 1

def main(args=None):
    parser = build_parser()
    args = parser.parse_args(args)

    project_path = args.project_dir
    if is_project_path(project_path):
        project = Project.load(project_path)
    else:
        project = None
    try:
        args.target = target_selector(
            ProjectTarget(is_default=True, project=project),
            SourceTarget(project=project),
            ExternalDatasetTarget(),
            ImageTarget()
        )(args.target)
        if args.target[0] == TargetKinds.project:
            if is_project_path(args.target[1]):
                args.project_dir = osp.dirname(osp.abspath(args.target[1]))
    except argparse.ArgumentTypeError as e:
        print(e)
        parser.print_help()
        return 1

    return process_command(args.target, args.params, args)
