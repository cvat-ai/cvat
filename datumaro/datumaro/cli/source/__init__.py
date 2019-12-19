
# Copyright (C) 2019 Intel Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import logging as log
import os
import os.path as osp
import shutil

from ..util.project import load_project


def build_create_parser(parser):
    parser.add_argument('-n', '--name', required=True,
        help="Name of the source to be created")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    return parser

def create_command(args):
    project = load_project(args.project_dir)
    config = project.config

    name = args.name

    if project.env.git.has_submodule(name):
        log.fatal("Submodule '%s' already exists" % (name))
        return 1

    try:
        project.get_source(name)
        log.fatal("Source '%s' already exists" % (name))
        return 1
    except KeyError:
        pass

    dst_dir = osp.join(config.project_dir, config.sources_dir, name)
    project.env.git.init(dst_dir)

    project.add_source(name, { 'url': name })
    project.save()

    log.info("Source '%s' has been added to the project, location: '%s'" \
        % (name, dst_dir))

    return 0

def build_import_parser(parser):
    sp = parser.add_subparsers(dest='source_type')

    repo_parser = sp.add_parser('repo')
    repo_parser.add_argument('url',
        help="URL of the source git repository")
    repo_parser.add_argument('-b', '--branch', default='master',
        help="Branch of the source repository (default: %(default)s)")
    repo_parser.add_argument('--checkout', action='store_true',
        help="Do branch checkout")

    dir_parser = sp.add_parser('dir')
    dir_parser.add_argument('url',
        help="Path to the source directory")
    dir_parser.add_argument('--copy', action='store_true',
        help="Copy the dataset instead of saving source links")

    parser.add_argument('-n', '--name', default=None,
        help="Name of the new source")
    parser.add_argument('-f', '--format', default=None,
        help="Name of the source dataset format (default: 'project')")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    parser.add_argument('--skip-check', action='store_true',
        help="Skip source checking")
    return parser

def import_command(args):
    project = load_project(args.project_dir)

    if args.source_type == 'repo':
        name = args.name
        if name is None:
            name = osp.splitext(osp.basename(args.url))[0]

        if project.env.git.has_submodule(name):
            log.fatal("Submodule '%s' already exists" % (name))
            return 1

        try:
            project.get_source(name)
            log.fatal("Source '%s' already exists" % (name))
            return 1
        except KeyError:
            pass

        dst_dir = project.local_source_dir(name)
        project.env.git.create_submodule(name, dst_dir,
            url=args.url, branch=args.branch, no_checkout=not args.checkout)

        source = { 'url': args.url }
        if args.format:
            source['format'] = args.format
        project.add_source(name, source)

        if not args.skip_check:
            log.info("Checking the source...")
            project.make_source_project(name)
        project.save()

        log.info("Source '%s' has been added to the project, location: '%s'" \
            % (name, dst_dir))
    elif args.source_type == 'dir':
        url = osp.abspath(args.url)
        if not osp.exists(url):
            log.fatal("Source path '%s' does not exist" % url)
            return 1

        name = args.name
        if name is None:
            name = osp.splitext(osp.basename(url))[0]

        try:
            project.get_source(name)
            log.fatal("Source '%s' already exists" % (name))
            return 1
        except KeyError:
            pass

        dst_dir = url
        if args.copy:
            dst_dir = project.local_source_dir(name)
            log.info("Copying from '%s' to '%s'" % (url, dst_dir))
            shutil.copytree(url, dst_dir)
            url = name

        source = { 'url': url }
        if args.format:
            source['format'] = args.format
        project.add_source(name, source)

        if not args.skip_check:
            log.info("Checking the source...")
            project.make_source_project(name)
        project.save()

        log.info("Source '%s' has been added to the project, location: '%s'" \
            % (name, dst_dir))

    return 0

def build_remove_parser(parser):
    parser.add_argument('-n', '--name', required=True,
        help="Name of the source to be removed")
    parser.add_argument('--force', action='store_true',
        help="Ignore possible errors during removal")
    parser.add_argument('-p', '--project', dest='project_dir', default='.',
        help="Directory of the project to operate on (default: current dir)")
    return parser

def remove_command(args):
    project = load_project(args.project_dir)

    name = args.name
    if name is None:
        log.fatal("Expected source name")
        return

    if project.env.git.has_submodule(name):
        if args.force:
            log.warning("Forcefully removing the '%s' source..." % (name))

        project.env.git.remove_submodule(name, force=args.force)

    project.remove_source(name)
    project.save()

    log.info("Source '%s' has been removed from the project" % (name))

    return 0

def build_export_parser(parser):
    parser.add_argument('-n', '--name', required=True,
        help="Source dataset to be extracted")
    parser.add_argument('-e', '--filter', default=None,
        help="Filter expression for dataset items. Examples: "
             "extract images with width < height: "
             "'/item[image/width < image/height]'; "
             "extract images with large-area bboxes: "
             "'/item[annotation/type=\"bbox\" and annotation/area>2000]'"
        )
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
    source_project = project.make_source_project(args.name)
    dataset = source_project.make_dataset()

    log.info("Exporting the project...")
    dataset.export(
        save_dir=dst_dir,
        output_format=args.output_format,
        filter_expr=args.filter,
        cmdline_args=args.extra_args)
    log.info("Source '%s' exported to '%s' as '%s'" % \
        (args.name, dst_dir, args.output_format))

    return 0

def build_parser(parser=argparse.ArgumentParser()):
    command_parsers = parser.add_subparsers(dest='command_name')

    build_create_parser(command_parsers.add_parser('create')) \
        .set_defaults(command=create_command)
    build_import_parser(command_parsers.add_parser('import')) \
        .set_defaults(command=import_command)
    build_remove_parser(command_parsers.add_parser('remove')) \
        .set_defaults(command=remove_command)
    build_export_parser(command_parsers.add_parser('export')) \
        .set_defaults(command=export_command)

    return parser


def main(args=None):
    parser = build_parser()
    args = parser.parse_args(args)
    if 'command' not in args:
        parser.print_help()
        return 1

    return args.command(args)
