
# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import json
import logging as log
import os.path as osp
from collections import OrderedDict

from datumaro.components.project import Project
from datumaro.components.operations import (IntersectMerge,
    QualityError, MergeError)

from ..util import at_least, MultilineFormatter, CliException
from ..util.project import generate_next_file_name, load_project


def build_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor(help="Merge few projects",
        description="""
            Merges multiple datasets into one. This can be useful if you
            have few annotations and wish to merge them,
            taking into consideration potential overlaps and conflicts.
            This command can try to find a common ground by voting or
            return a list of conflicts.|n
            |n
            Examples:|n
            - Merge annotations from 3 (or more) annotators:|n
            |s|smerge project1/ project2/ project3/|n
            - Check groups of the merged dataset for consistence:|n
            |s|s|slook for groups consising of 'person', 'hand' 'head', 'foot'|n
            |s|smerge project1/ project2/ -g 'person,hand?,head,foot?'
        """,
        formatter_class=MultilineFormatter)

    def _group(s):
        return s.split(',')

    parser.add_argument('project', nargs='+', action=at_least(2),
        help="Path to a project (repeatable)")
    parser.add_argument('-iou', '--iou-thresh', default=0.25, type=float,
        help="IoU match threshold for segments (default: %(default)s)")
    parser.add_argument('-oconf', '--output-conf-thresh',
        default=0.0, type=float,
        help="Confidence threshold for output "
            "annotations (default: %(default)s)")
    parser.add_argument('--quorum', default=0, type=int,
        help="Minimum count for a label and attribute voting "
            "results to be counted (default: %(default)s)")
    parser.add_argument('-g', '--groups', action='append', type=_group,
        default=[],
        help="A comma-separated list of labels in "
            "annotation groups to check. '?' postfix can be added to a label to"
            "make it optional in the group (repeatable)")
    parser.add_argument('-o', '--output-dir', dest='dst_dir', default=None,
        help="Output directory (default: current project's dir)")
    parser.add_argument('--overwrite', action='store_true',
        help="Overwrite existing files in the save directory")
    parser.set_defaults(command=merge_command)

    return parser

def merge_command(args):
    source_projects = [load_project(p) for p in args.project]

    dst_dir = args.dst_dir
    if dst_dir:
        if not args.overwrite and osp.isdir(dst_dir) and os.listdir(dst_dir):
            raise CliException("Directory '%s' already exists "
                "(pass --overwrite to overwrite)" % dst_dir)
    else:
        dst_dir = generate_next_file_name('merged')

    source_datasets = []
    for p in source_projects:
        log.debug("Loading project '%s' dataset", p.config.project_name)
        source_datasets.append(p.make_dataset())

    merger = IntersectMerge(conf=IntersectMerge.Conf(
        pairwise_dist=args.iou_thresh, groups=args.groups,
        output_conf_thresh=args.output_conf_thresh, quorum=args.quorum
    ))
    merged_dataset = merger(source_datasets)

    merged_project = Project()
    output_dataset = merged_project.make_dataset()
    output_dataset.define_categories(merged_dataset.categories())
    merged_dataset = output_dataset.update(merged_dataset)
    merged_dataset.save(save_dir=dst_dir)

    report_path = osp.join(dst_dir, 'merge_report.json')
    save_merge_report(merger, report_path)

    dst_dir = osp.abspath(dst_dir)
    log.info("Merge results have been saved to '%s'" % dst_dir)
    log.info("Report has been saved to '%s'" % report_path)

    return 0

def save_merge_report(merger, path):
    item_errors = OrderedDict()
    source_errors = OrderedDict()
    all_errors = []

    for e in merger.errors:
        if isinstance(e, QualityError):
            item_errors[str(e.item_id)] = item_errors.get(str(e.item_id), 0) + 1
        elif isinstance(e, MergeError):
            for s in e.sources:
                source_errors[s] = source_errors.get(s, 0) + 1
            item_errors[str(e.item_id)] = item_errors.get(str(e.item_id), 0) + 1

        all_errors.append(str(e))

    errors = OrderedDict([
        ('Item errors', item_errors),
        ('Source errors', source_errors),
        ('All errors', all_errors),
    ])

    with open(path, 'w') as f:
        json.dump(errors, f, indent=4)