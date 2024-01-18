# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import argparse
import getpass
import json
import logging
import os
import textwrap
from pathlib import Path
from typing import Any, Tuple

from attr.converters import to_bool
from cvat_sdk.core.proxies.tasks import ResourceType

from .version import VERSION


def get_auth(s):
    """Parse USER[:PASS] strings and prompt for password if none was
    supplied."""
    user, _, password = s.partition(":")
    password = password or os.environ.get("PASS") or getpass.getpass()
    return user, password


def parse_label_arg(s):
    """If s is a file load it as JSON, otherwise parse s as JSON."""
    if os.path.exists(s):
        with open(s, "r") as fp:
            return json.load(fp)
    else:
        return json.loads(s)


def parse_resource_type(s: str) -> ResourceType:
    try:
        return ResourceType[s.upper()]
    except KeyError:
        return s


def parse_function_parameter(s: str) -> Tuple[str, Any]:
    key, sep, type_and_value = s.partition("=")

    if not sep:
        raise argparse.ArgumentTypeError("parameter value not specified")

    type_, sep, value = type_and_value.partition(":")

    if not sep:
        raise argparse.ArgumentTypeError("parameter type not specified")

    if type_ == "int":
        value = int(value)
    elif type_ == "float":
        value = float(value)
    elif type_ == "str":
        pass
    elif type_ == "bool":
        value = to_bool(value)
    else:
        raise argparse.ArgumentTypeError(f"unsupported parameter type {type_!r}")

    return (key, value)


class BuildDictAction(argparse.Action):
    def __init__(self, option_strings, dest, default=None, **kwargs):
        super().__init__(option_strings, dest, default=default or {}, **kwargs)

    def __call__(self, parser, namespace, values, option_string=None):
        key, value = values
        getattr(namespace, self.dest)[key] = value


def make_cmdline_parser() -> argparse.ArgumentParser:
    #######################################################################
    # Command line interface definition
    #######################################################################
    parser = argparse.ArgumentParser(
        description="Perform common operations related to CVAT tasks.\n\n"
    )
    parser.add_argument("--version", action="version", version=VERSION)
    parser.add_argument(
        "--insecure",
        action="store_true",
        help="Allows to disable SSL certificate check",
    )

    task_subparser = parser.add_subparsers(dest="action")

    #######################################################################
    # Positional arguments
    #######################################################################
    parser.add_argument(
        "--auth",
        type=get_auth,
        metavar="USER:[PASS]",
        default=getpass.getuser(),
        help="""defaults to the current user and supports the PASS
                environment variable or password prompt
                (default user: %(default)s).""",
    )
    parser.add_argument(
        "--server-host", type=str, default="localhost", help="host (default: %(default)s)"
    )
    parser.add_argument(
        "--server-port",
        type=int,
        default=None,
        help="port (default: 80 for http and 443 for https connections)",
    )
    parser.add_argument(
        "--organization",
        "--org",
        metavar="SLUG",
        help="""short name (slug) of the organization
                to use when listing or creating resources;
                set to blank string to use the personal workspace
                (default: list all accessible objects, create in personal workspace)""",
    )
    parser.add_argument(
        "--debug",
        action="store_const",
        dest="loglevel",
        const=logging.DEBUG,
        default=logging.INFO,
        help="show debug output",
    )

    #######################################################################
    # Create
    #######################################################################
    task_create_parser = task_subparser.add_parser(
        "create",
        description=textwrap.dedent(
            """\
            Create a new CVAT task. To create a task, you need
            to specify labels using the --labels argument or
            attach the task to an existing project using the
            --project_id argument.
        """
        ),
        formatter_class=argparse.RawTextHelpFormatter,
    )
    task_create_parser.add_argument("name", type=str, help="name of the task")
    task_create_parser.add_argument(
        "resource_type",
        default="local",
        choices=list(ResourceType),
        type=parse_resource_type,
        help="type of files specified",
    )
    task_create_parser.add_argument("resources", type=str, help="list of paths or URLs", nargs="+")
    task_create_parser.add_argument(
        "--annotation_path", default="", type=str, help="path to annotation file"
    )
    task_create_parser.add_argument(
        "--annotation_format",
        default="CVAT 1.1",
        type=str,
        help="format of the annotation file being uploaded, e.g. CVAT 1.1",
    )
    task_create_parser.add_argument(
        "--bug_tracker", "--bug", default=None, type=str, help="bug tracker URL"
    )
    task_create_parser.add_argument(
        "--chunk_size", default=None, type=int, help="the number of frames per chunk"
    )
    task_create_parser.add_argument(
        "--completion_verification_period",
        dest="status_check_period",
        default=2,
        type=float,
        help=textwrap.dedent(
            """\
            number of seconds to wait until checking
            if data compression finished (necessary before uploading annotations)
        """
        ),
    )
    task_create_parser.add_argument(
        "--copy_data",
        default=False,
        action="store_true",
        help=textwrap.dedent(
            """\
            set the option to copy the data, only used when resource type is
            share (default: %(default)s)
        """
        ),
    )
    task_create_parser.add_argument(
        "--frame_step",
        default=None,
        type=int,
        help=textwrap.dedent(
            """\
            set the frame step option in the advanced configuration
            when uploading image series or videos (default: %(default)s)
        """
        ),
    )
    task_create_parser.add_argument(
        "--image_quality",
        default=70,
        type=int,
        help=textwrap.dedent(
            """\
            set the image quality option in the advanced configuration
            when creating tasks.(default: %(default)s)
        """
        ),
    )
    task_create_parser.add_argument(
        "--labels",
        default="[]",
        type=parse_label_arg,
        help="string or file containing JSON labels specification",
    )
    task_create_parser.add_argument(
        "--project_id", default=None, type=int, help="project ID if project exists"
    )
    task_create_parser.add_argument(
        "--overlap",
        default=None,
        type=int,
        help="the number of intersected frames between different segments",
    )
    task_create_parser.add_argument(
        "--segment_size", default=None, type=int, help="the number of frames in a segment"
    )
    task_create_parser.add_argument(
        "--sorting-method",
        default="lexicographical",
        choices=["lexicographical", "natural", "predefined", "random"],
        help="""data soring method (default: %(default)s)""",
    )
    task_create_parser.add_argument(
        "--start_frame", default=None, type=int, help="the start frame of the video"
    )
    task_create_parser.add_argument(
        "--stop_frame", default=None, type=int, help="the stop frame of the video"
    )
    task_create_parser.add_argument(
        "--use_cache", action="store_true", help="""use cache"""  # automatically sets default=False
    )
    task_create_parser.add_argument(
        "--use_zip_chunks",
        action="store_true",  # automatically sets default=False
        help="""zip chunks before sending them to the server""",
    )
    task_create_parser.add_argument(
        "--cloud_storage_id",
        default=None,
        type=int,
        help="cloud storage ID if you would like to use data from cloud storage",
    )
    task_create_parser.add_argument(
        "--filename_pattern",
        type=str,
        help=textwrap.dedent(
            """\
            pattern for filtering data from the manifest file for the upload.
            Only shell-style wildcards are supported:
            * - matches everything
            ? - matches any single character
            [seq] - matches any character in 'seq'
            [!seq] - matches any character not in seq
        """
        ),
    )

    #######################################################################
    # Delete
    #######################################################################
    delete_parser = task_subparser.add_parser("delete", description="Delete a CVAT task.")
    delete_parser.add_argument("task_ids", type=int, help="list of task IDs", nargs="+")

    #######################################################################
    # List
    #######################################################################
    ls_parser = task_subparser.add_parser(
        "ls", description="List all CVAT tasks in simple or JSON format."
    )
    ls_parser.add_argument(
        "--json",
        dest="use_json_output",
        default=False,
        action="store_true",
        help="output JSON data",
    )

    #######################################################################
    # Frames
    #######################################################################
    frames_parser = task_subparser.add_parser(
        "frames", description="Download all frame images for a CVAT task."
    )
    frames_parser.add_argument("task_id", type=int, help="task ID")
    frames_parser.add_argument(
        "frame_ids", type=int, help="list of frame IDs to download", nargs="+"
    )
    frames_parser.add_argument(
        "--outdir", type=str, default="", help="directory to save images (default: CWD)"
    )
    frames_parser.add_argument(
        "--quality",
        type=str,
        choices=("original", "compressed"),
        default="original",
        help="choose quality of images (default: %(default)s)",
    )

    #######################################################################
    # Dump
    #######################################################################
    dump_parser = task_subparser.add_parser(
        "dump", description="Download annotations for a CVAT task."
    )
    dump_parser.add_argument("task_id", type=int, help="task ID")
    dump_parser.add_argument("filename", type=str, help="output file")
    dump_parser.add_argument(
        "--format",
        dest="fileformat",
        type=str,
        default="CVAT for images 1.1",
        help="annotation format (default: %(default)s)",
    )
    dump_parser.add_argument(
        "--completion_verification_period",
        dest="status_check_period",
        default=2,
        type=float,
        help="number of seconds to wait until checking if dataset building finished",
    )
    dump_parser.add_argument(
        "--with-images",
        type=to_bool,
        default=False,
        dest="include_images",
        help="Whether to include images or not (default: %(default)s)",
    )

    #######################################################################
    # Upload Annotations
    #######################################################################
    upload_parser = task_subparser.add_parser(
        "upload", description="Upload annotations for a CVAT task."
    )
    upload_parser.add_argument("task_id", type=int, help="task ID")
    upload_parser.add_argument("filename", type=str, help="upload file")
    upload_parser.add_argument(
        "--format",
        dest="fileformat",
        type=str,
        default="CVAT 1.1",
        help="annotation format (default: %(default)s)",
    )

    #######################################################################
    # Export task
    #######################################################################
    export_task_parser = task_subparser.add_parser("export", description="Export a CVAT task.")
    export_task_parser.add_argument("task_id", type=int, help="task ID")
    export_task_parser.add_argument("filename", type=str, help="output file")
    export_task_parser.add_argument(
        "--completion_verification_period",
        dest="status_check_period",
        default=2,
        type=float,
        help="time interval between checks if archive building has been finished, in seconds",
    )

    #######################################################################
    # Import task
    #######################################################################
    import_task_parser = task_subparser.add_parser("import", description="Import a CVAT task.")
    import_task_parser.add_argument("filename", type=str, help="upload file")
    import_task_parser.add_argument(
        "--completion_verification_period",
        dest="status_check_period",
        default=2,
        type=float,
        help="time interval between checks if archive processing was finished, in seconds",
    )

    #######################################################################
    # Auto-annotate
    #######################################################################
    auto_annotate_task_parser = task_subparser.add_parser(
        "auto-annotate",
        description="Automatically annotate a CVAT task by running a function on the local machine.",
    )
    auto_annotate_task_parser.add_argument("task_id", type=int, help="task ID")

    function_group = auto_annotate_task_parser.add_mutually_exclusive_group(required=True)

    function_group.add_argument(
        "--function-module",
        metavar="MODULE",
        help="qualified name of a module to use as the function",
    )

    function_group.add_argument(
        "--function-file",
        metavar="PATH",
        type=Path,
        help="path to a Python source file to use as the function",
    )

    auto_annotate_task_parser.add_argument(
        "--function-parameter",
        "-p",
        metavar="NAME=TYPE:VALUE",
        type=parse_function_parameter,
        action=BuildDictAction,
        dest="function_parameters",
        help="parameter for the function",
    )

    auto_annotate_task_parser.add_argument(
        "--clear-existing", action="store_true", help="Remove existing annotations from the task"
    )

    auto_annotate_task_parser.add_argument(
        "--allow-unmatched-labels",
        action="store_true",
        help="Allow the function to declare labels not configured in the task",
    )

    return parser


def get_action_args(
    parser: argparse.ArgumentParser, parsed_args: argparse.Namespace
) -> argparse.Namespace:
    # FIXME: a hacky way to remove unnecessary args
    action_args = dict(vars(parsed_args))

    for action in parser._actions:
        action_args.pop(action.dest, None)

    # remove default args
    for k, v in dict(action_args).items():
        if v is None:
            action_args.pop(k, None)

    return argparse.Namespace(**action_args)
