
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import logging as log
import os
import os.path as osp
import shutil

from datumaro.components.project import Project
from datumaro.components.comparator import Comparator
from datumaro.components.dataset_filter import DatasetItemEncoder
from .diff import DiffVisualizer
from ...util import add_subparser
from ...util.project import make_project_path, load_project


def build_create_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    parser.add_argument('-d', '--dest', default='.', dest='dst_dir',
        help="Save directory for the new project (default: current dir")
    parser.add_argument('-n', '--name', default=None,
        help="Name of the new project (default: same as project dir)")
    parser.add_argument('--overwrite', action='store_true',
        help="Overwrite existing files in the save directory")
    parser.set_defaults(command=create_command)

    return parser

def create_command(args):
    project_dir = osp.abspath(args.dst_dir)
    project_path = make_project_path(project_dir)

    if osp.isdir(project_dir) and os.listdir(project_dir):
        if not args.overwrite:
            log.error("Directory '%s' already exists "
                "(pass --overwrite to force creation)" % project_dir)
            return 1
        else:
            shutil.rmtree(project_dir)
    os.makedirs(project_dir, exist_ok=args.overwrite)

    if not args.overwrite and osp.isfile(project_path):
        log.error("Project file '%s' already exists "
            "(pass --overwrite to force creation)" % project_path)
        return 1

    project_name = args.name
    if project_name is None:
        project_name = osp.basename(project_dir)

    log.info("Creating project at '%s'" % (project_dir))

    Project.generate(project_dir, {
        'project_name': project_name,
    })

    log.info("Project has been created at '%s'" % (project_dir))

    return 0

def build_import_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    import datumaro.components.importers as importers_module
    importers_list = [name for name, cls in importers_module.items]

    parser.add_argument('-s', '--source', required=True,
        help="Path to import a project from")
    parser.add_argument('-f', '--format', required=True,
        help="Source project format (options: %s)" % (', '.join(importers_list)))
    parser.add_argument('-d', '--dest', default='.', dest='dst_dir',
        help="Directory to save the new project to (default: current dir)")
    parser.add_argument('-n', '--name', default=None,
        help="Name of the new project (default: same as project dir)")
    parser.add_argument('--overwrite', action='store_true',
        help="Overwrite existing files in the save directory")
    parser.add_argument('--copy', action='store_true',
        help="Copy the dataset instead of saving source links")
    parser.add_argument('--skip-check', action='store_true',
        help="Skip source checking")
    # parser.add_argument('extra_args', nargs=argparse.REMAINDER,
    #     help="Additional arguments for importer (pass '-- -h' for help)")
    parser.set_defaults(command=import_command)

    return parser

def import_command(args):
    project_dir = osp.abspath(args.dst_dir)
    project_path = make_project_path(project_dir)

    if osp.isdir(project_dir) and os.listdir(project_dir):
        if not args.overwrite:
            log.error("Directory '%s' already exists "
                "(pass --overwrite to force creation)" % project_dir)
            return 1
        else:
            shutil.rmtree(project_dir)
    os.makedirs(project_dir, exist_ok=args.overwrite)

    if not args.overwrite and osp.isfile(project_path):
        log.error("Project file '%s' already exists "
            "(pass --overwrite to force creation)" % project_path)
        return 1

    project_name = args.name
    if project_name is None:
        project_name = osp.basename(project_dir)

    log.info("Importing project from '%s' as '%s'" % \
        (args.source, args.format))

    source = osp.abspath(args.source)
    project = Project.import_from(source, args.format)
    project.config.project_name = project_name
    project.config.project_dir = project_dir

    if not args.skip_check or args.copy:
        log.info("Checking the dataset...")
        dataset = project.make_dataset()
    if args.copy:
        log.info("Cloning data...")
        dataset.save(merge=True, save_images=True)
    else:
        project.save()

    log.info("Project has been created at '%s'" % (project_dir))

    return 0

def build_export_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    import datumaro.components.converters as converters_module
    converters_list = [name for name, cls in converters_module.items]

    parser.add_argument('-e', '--filter', default=None,
        help="Filter expression for dataset items. Examples: "
             "extract images with width < height: "
             "'/item[image/width < image/height]'; "
             "extract images with large-area bboxes: "
             "'/item[annotation/type=\"bbox\" and annotation/area>2000]'"
            "filter out irrelevant annotations from items: "
             "'/item/annotation[label = \"person\"]'"
        )
    parser.add_argument('-a', '--filter-annotations', action='store_true',
        help="Filter annotations instead of dataset "
            "items (default: %(default)s)")
    parser.add_argument('-d', '--dest', dest='dst_dir', required=True,
        help="Directory to save output")
    parser.add_argument('-f', '--output-format', required=True,
        help="Output format (options: %s)" % (', '.join(converters_list)))
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    parser.add_argument('--overwrite', action='store_true',
        help="Overwrite existing files in the save directory")
    parser.add_argument('extra_args', nargs=argparse.REMAINDER, default=None,
        help="Additional arguments for converter (pass '-- -h' for help)")
    parser.set_defaults(command=export_command)

    return parser

def export_command(args):
    project = load_project(args.project_dir)

    dst_dir = osp.abspath(args.dst_dir)
    if not args.overwrite and osp.isdir(dst_dir) and os.listdir(dst_dir):
        log.error("Directory '%s' already exists "
            "(pass --overwrite to force creation)" % dst_dir)
        return 1
    os.makedirs(dst_dir, exist_ok=args.overwrite)

    log.info("Loading the project...")
    dataset = project.make_dataset()

    log.info("Exporting the project...")
    dataset.export_project(
        save_dir=dst_dir,
        output_format=args.output_format,
        filter_expr=args.filter,
        filter_annotations=args.filter_annotations,
        cmdline_args=args.extra_args)
    log.info("Project exported to '%s' as '%s'" % \
        (dst_dir, args.output_format))

    return 0

def build_extract_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    parser.add_argument('-e', '--filter', default=None,
        help="XML XPath filter expression for dataset items. Examples: "
             "extract images with width < height: "
             "'/item[image/width < image/height]'; "
             "extract images with large-area bboxes: "
             "'/item[annotation/type=\"bbox\" and annotation/area>2000]' "
             "filter out irrelevant annotations from items: "
             "'/item/annotation[label = \"person\"]'"
        )
    parser.add_argument('-a', '--filter-annotations', action='store_true',
        help="Filter annotations instead of dataset "
            "items (default: %(default)s)")
    parser.add_argument('--remove-empty', action='store_true',
        help="Remove an item if there are no annotations left after filtration")
    parser.add_argument('--dry-run', action='store_true',
        help="Print XML representations to be filtered and exit")
    parser.add_argument('-d', '--dest', dest='dst_dir', required=True,
        help="Output directory")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    return parser

def extract_command(args):
    project = load_project(args.project_dir)

    dst_dir = osp.abspath(args.dst_dir)
    if not args.dry_run:
        os.makedirs(dst_dir, exist_ok=False)

    dataset = project.make_dataset()

    kwargs = {}
    if args.filter_annotations:
        kwargs['remove_empty'] = args.remove_empty

    if args.dry_run:
        dataset = dataset.extract(filter_expr=args.filter,
            filter_annotations=args.filter_annotations, **kwargs)
        for item in dataset:
            encoded_item = DatasetItemEncoder.encode(item, dataset.categories())
            xml_item = DatasetItemEncoder.to_string(encoded_item)
            print(xml_item)
        return 0

    dataset.extract_project(save_dir=dst_dir, filter_expr=args.filter,
        filter_annotations=args.filter_annotations, **kwargs)

    log.info("Subproject extracted to '%s'" % (dst_dir))

    return 0

def build_merge_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    parser.add_argument('other_project_dir',
        help="Directory of the project to get data updates from")
    parser.add_argument('-d', '--dest', dest='dst_dir', default=None,
        help="Output directory (default: current project's dir)")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    parser.set_defaults(command=merge_command)

    return parser

def merge_command(args):
    first_project = load_project(args.project_dir)
    second_project = load_project(args.other_project_dir)

    first_dataset = first_project.make_dataset()
    first_dataset.update(second_project.make_dataset())

    dst_dir = args.dst_dir
    first_dataset.save(save_dir=dst_dir)

    if dst_dir is None:
        dst_dir = first_project.config.project_dir
    dst_dir = osp.abspath(dst_dir)
    log.info("Merge result saved to '%s'" % (dst_dir))

    return 0

def build_diff_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    parser.add_argument('other_project_dir',
        help="Directory of the second project to be compared")
    parser.add_argument('-d', '--dest', default=None, dest='dst_dir',
        help="Directory to save comparison results (default: do not save)")
    parser.add_argument('-f', '--output-format',
        default=DiffVisualizer.DEFAULT_FORMAT,
        choices=[f.name for f in DiffVisualizer.Format],
        help="Output format (default: %(default)s)")
    parser.add_argument('--iou-thresh', default=0.5, type=float,
        help="IoU match threshold for detections (default: %(default)s)")
    parser.add_argument('--conf-thresh', default=0.5, type=float,
        help="Confidence threshold for detections (default: %(default)s)")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the first project to be compared (default: current dir)")
    parser.set_defaults(command=diff_command)

    return parser

def diff_command(args):
    first_project = load_project(args.project_dir)
    second_project = load_project(args.other_project_dir)

    comparator = Comparator(
        iou_threshold=args.iou_thresh,
        conf_threshold=args.conf_thresh)

    save_dir = args.dst_dir
    if save_dir is not None:
        log.info("Saving diff to '%s'" % save_dir)
        os.makedirs(osp.abspath(save_dir))

    visualizer = DiffVisualizer(save_dir=save_dir, comparator=comparator,
        output_format=args.output_format)
    visualizer.save_dataset_diff(
        first_project.make_dataset(),
        second_project.make_dataset())

    return 0

def build_transform_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    parser.add_argument('-m', '--method', required=True,
        help="Model to apply to the project")
    parser.add_argument('-d', '--dest', dest='dst_dir', default=None,
        help="Directory to save output (default: current dir)")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    parser.set_defaults(command=transform_command)

    return parser

def transform_command(args):
    project = load_project(args.project_dir)

    dst_dir = osp.abspath(args.dst_dir)
    if dst_dir is not None:
        os.makedirs(dst_dir, exist_ok=False)

    project.make_dataset().transform_project(
        method=args.method,
        save_dir=dst_dir
    )

    log.info("Transform results saved to '%s'" % (dst_dir))

    return 0


def build_parser(parser_ctor=argparse.ArgumentParser):
    parser = parser_ctor()

    subparsers = parser.add_subparsers()
    add_subparser(subparsers, 'create', build_create_parser)
    add_subparser(subparsers, 'import', build_import_parser)
    add_subparser(subparsers, 'export', build_export_parser)
    add_subparser(subparsers, 'extract', build_extract_parser)
    add_subparser(subparsers, 'merge', build_merge_parser)
    add_subparser(subparsers, 'diff', build_diff_parser)
    add_subparser(subparsers, 'transform', build_transform_parser)

    return parser
