
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
from ..util.project import make_project_path, load_project


def build_create_parser(parser):
    parser.add_argument('-d', '--dest', default='.', dest='dst_dir',
        help="Save directory for the new project (default: current dir")
    parser.add_argument('-n', '--name', default=None,
        help="Name of the new project (default: same as project dir)")
    parser.add_argument('--overwrite', action='store_true',
        help="Overwrite existing files in the save directory")
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

def build_import_parser(parser):
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

def build_build_parser(parser):
    return parser

def build_export_parser(parser):
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
        help="Output format")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    parser.add_argument('--overwrite', action='store_true',
        help="Overwrite existing files in the save directory")
    parser.add_argument('extra_args', nargs=argparse.REMAINDER, default=None,
        help="Additional arguments for converter (pass '-- -h' for help)")
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

def build_stats_parser(parser):
    parser.add_argument('name')
    return parser

def build_docs_parser(parser):
    return parser

def build_extract_parser(parser):
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

def build_merge_parser(parser):
    parser.add_argument('other_project_dir',
        help="Directory of the project to get data updates from")
    parser.add_argument('-d', '--dest', dest='dst_dir', default=None,
        help="Output directory (default: current project's dir)")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
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

def build_diff_parser(parser):
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

def build_transform_parser(parser):
    parser.add_argument('-d', '--dest', dest='dst_dir', required=True,
        help="Directory to save output")
    parser.add_argument('-m', '--model', dest='model_name', required=True,
        help="Model to apply to the project")
    parser.add_argument('-f', '--output-format', required=True,
        help="Output format")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    return parser

def transform_command(args):
    project = load_project(args.project_dir)

    dst_dir = osp.abspath(args.dst_dir)
    os.makedirs(dst_dir, exist_ok=False)
    project.make_dataset().apply_model(
        save_dir=dst_dir,
        model_name=args.model_name)

    log.info("Transform results saved to '%s'" % (dst_dir))

    return 0


def build_parser(parser=argparse.ArgumentParser()):
    command_parsers = parser.add_subparsers(dest='command_name')

    build_create_parser(command_parsers.add_parser('create')) \
        .set_defaults(command=create_command)

    build_import_parser(command_parsers.add_parser('import')) \
        .set_defaults(command=import_command)

    build_export_parser(command_parsers.add_parser('export')) \
        .set_defaults(command=export_command)

    build_extract_parser(command_parsers.add_parser('extract')) \
        .set_defaults(command=extract_command)

    build_merge_parser(command_parsers.add_parser('merge')) \
        .set_defaults(command=merge_command)

    build_build_parser(command_parsers.add_parser('build'))
    build_stats_parser(command_parsers.add_parser('stats'))
    build_docs_parser(command_parsers.add_parser('docs'))
    build_diff_parser(command_parsers.add_parser('diff')) \
        .set_defaults(command=diff_command)

    build_transform_parser(command_parsers.add_parser('transform')) \
        .set_defaults(command=transform_command)

    return parser

def main(args=None):
    parser = build_parser()
    args = parser.parse_args(args)
    if 'command' not in args:
        parser.print_help()
        return 1

    return args.command(args)
