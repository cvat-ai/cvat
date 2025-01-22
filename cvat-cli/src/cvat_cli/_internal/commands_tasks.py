# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import argparse
import textwrap
from collections.abc import Sequence
from typing import Optional

import cvat_sdk.auto_annotation as cvataa
from attr.converters import to_bool
from cvat_sdk import Client, models
from cvat_sdk.core.helpers import DeferredTqdmProgressReporter
from cvat_sdk.core.proxies.tasks import ResourceType

from .command_base import CommandGroup, GenericCommand, GenericDeleteCommand, GenericListCommand
from .common import FunctionLoader, configure_function_implementation_arguments
from .parsers import parse_label_arg, parse_resource_type, parse_threshold

COMMANDS = CommandGroup(description="Perform operations on CVAT tasks.")


class GenericTaskCommand(GenericCommand):
    resource_type_str = "task"

    def repo(self, client: Client):
        return client.tasks


@COMMANDS.command_class("ls")
class TaskList(GenericListCommand, GenericTaskCommand):
    pass


@COMMANDS.command_class("create")
class TaskCreate:
    description = textwrap.dedent(
        """\
        Create a new CVAT task. To create a task, you need
        to specify labels using the --labels argument or
        attach the task to an existing project using the
        --project_id argument.
        """
    )

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("name", type=str, help="name of the task")
        parser.add_argument(
            "resource_type",
            default="local",
            choices=list(ResourceType),
            type=parse_resource_type,
            help="type of files specified",
        )
        parser.add_argument("resources", type=str, help="list of paths or URLs", nargs="+")
        parser.add_argument(
            "--annotation_path", default="", type=str, help="path to annotation file"
        )
        parser.add_argument(
            "--annotation_format",
            default="CVAT 1.1",
            type=str,
            help="format of the annotation file being uploaded, e.g. CVAT 1.1",
        )
        parser.add_argument(
            "--bug_tracker", "--bug", default=argparse.SUPPRESS, type=str, help="bug tracker URL"
        )
        parser.add_argument(
            "--chunk_size",
            default=argparse.SUPPRESS,
            type=int,
            help="the number of frames per chunk",
        )
        parser.add_argument(
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
        parser.add_argument(
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
        parser.add_argument(
            "--frame_step",
            default=argparse.SUPPRESS,
            type=int,
            help=textwrap.dedent(
                """\
                set the frame step option in the advanced configuration
                when uploading image series or videos
                """
            ),
        )
        parser.add_argument(
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
        parser.add_argument(
            "--labels",
            default="[]",
            type=parse_label_arg,
            help="string or file containing JSON labels specification",
        )
        parser.add_argument(
            "--project_id", default=argparse.SUPPRESS, type=int, help="project ID if project exists"
        )
        parser.add_argument(
            "--overlap",
            default=argparse.SUPPRESS,
            type=int,
            help="the number of intersected frames between different segments",
        )
        parser.add_argument(
            "--segment_size",
            default=argparse.SUPPRESS,
            type=int,
            help="the number of frames in a segment",
        )
        parser.add_argument(
            "--sorting-method",
            default="lexicographical",
            choices=["lexicographical", "natural", "predefined", "random"],
            help="""data soring method (default: %(default)s)""",
        )
        parser.add_argument(
            "--start_frame",
            default=argparse.SUPPRESS,
            type=int,
            help="the start frame of the video",
        )
        parser.add_argument(
            "--stop_frame", default=argparse.SUPPRESS, type=int, help="the stop frame of the video"
        )
        parser.add_argument(
            "--use_cache",
            action="store_true",
            help="""use cache""",  # automatically sets default=False
        )
        parser.add_argument(
            "--use_zip_chunks",
            action="store_true",  # automatically sets default=False
            help="""zip chunks before sending them to the server""",
        )
        parser.add_argument(
            "--cloud_storage_id",
            default=argparse.SUPPRESS,
            type=int,
            help="cloud storage ID if you would like to use data from cloud storage",
        )
        parser.add_argument(
            "--filename_pattern",
            default=argparse.SUPPRESS,
            type=str,
            help=textwrap.dedent(
                """\
                pattern for filtering data from the manifest file for the upload.
                Only shell-style wildcards are supported:
                * - matches everything;
                ? - matches any single character;
                [seq] - matches any character in 'seq';
                [!seq] - matches any character not in seq
                """
            ),
        )

    def execute(
        self,
        client,
        *,
        name: str,
        labels: list[dict[str, str]],
        resources: Sequence[str],
        resource_type: ResourceType,
        annotation_path: str,
        annotation_format: str,
        status_check_period: int,
        **kwargs,
    ) -> None:
        task_params = {}
        data_params = {}

        for k, v in kwargs.items():
            if k in models.DataRequest.attribute_map or k == "frame_step":
                data_params[k] = v
            else:
                task_params[k] = v

        task = client.tasks.create_from_data(
            spec=models.TaskWriteRequest(name=name, labels=labels, **task_params),
            resource_type=resource_type,
            resources=resources,
            data_params=data_params,
            annotation_path=annotation_path,
            annotation_format=annotation_format,
            status_check_period=status_check_period,
            pbar=DeferredTqdmProgressReporter(),
        )
        print(task.id)


@COMMANDS.command_class("delete")
class TaskDelete(GenericDeleteCommand, GenericTaskCommand):
    pass


@COMMANDS.command_class("frames")
class TaskFrames:
    description = textwrap.dedent(
        """\
        Download the requested frame numbers for a task and save images as
        task_<ID>_frame_<FRAME>.jpg.
        """
    )

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("task_id", type=int, help="task ID")
        parser.add_argument("frame_ids", type=int, help="list of frame IDs to download", nargs="+")
        parser.add_argument(
            "--outdir", type=str, default="", help="directory to save images (default: CWD)"
        )
        parser.add_argument(
            "--quality",
            type=str,
            choices=("original", "compressed"),
            default="original",
            help="choose quality of images (default: %(default)s)",
        )

    def execute(
        self,
        client: Client,
        *,
        task_id: int,
        frame_ids: Sequence[int],
        outdir: str,
        quality: str,
    ) -> None:
        client.tasks.retrieve(obj_id=task_id).download_frames(
            frame_ids=frame_ids,
            outdir=outdir,
            quality=quality,
            filename_pattern=f"task_{task_id}" + "_frame_{frame_id:06d}{frame_ext}",
        )


@COMMANDS.command_class("export-dataset")
class TaskExportDataset:
    description = textwrap.dedent(
        """\
        Export a task as a dataset in the specified format (e.g. 'YOLO 1.1').
        """
    )

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("task_id", type=int, help="task ID")
        parser.add_argument("filename", type=str, help="output file")
        parser.add_argument(
            "--format",
            dest="fileformat",
            type=str,
            default="CVAT for images 1.1",
            help="annotation format (default: %(default)s)",
        )
        parser.add_argument(
            "--completion_verification_period",
            dest="status_check_period",
            default=2,
            type=float,
            help="number of seconds to wait until checking if dataset building finished",
        )
        parser.add_argument(
            "--with-images",
            type=to_bool,
            default=False,
            dest="include_images",
            help="Whether to include images or not (default: %(default)s)",
        )

    def execute(
        self,
        client: Client,
        *,
        task_id: int,
        fileformat: str,
        filename: str,
        status_check_period: int,
        include_images: bool,
    ) -> None:
        client.tasks.retrieve(obj_id=task_id).export_dataset(
            format_name=fileformat,
            filename=filename,
            pbar=DeferredTqdmProgressReporter(),
            status_check_period=status_check_period,
            include_images=include_images,
        )


@COMMANDS.command_class("import-dataset")
class TaskImportDataset:
    description = textwrap.dedent(
        """\
        Import annotations into a task from a dataset in the specified format
        (e.g. 'YOLO 1.1').
        """
    )

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("task_id", type=int, help="task ID")
        parser.add_argument("filename", type=str, help="upload file")
        parser.add_argument(
            "--format",
            dest="fileformat",
            type=str,
            default="CVAT 1.1",
            help="annotation format (default: %(default)s)",
        )

    def execute(
        self,
        client: Client,
        *,
        task_id: int,
        fileformat: str,
        filename: str,
    ) -> None:
        client.tasks.retrieve(obj_id=task_id).import_annotations(
            format_name=fileformat,
            filename=filename,
            pbar=DeferredTqdmProgressReporter(),
        )


@COMMANDS.command_class("backup")
class TaskBackup:
    description = """Download a task backup."""

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("task_id", type=int, help="task ID")
        parser.add_argument("filename", type=str, help="output file")
        parser.add_argument(
            "--completion_verification_period",
            dest="status_check_period",
            default=2,
            type=float,
            help="time interval between checks if archive building has been finished, in seconds",
        )

    def execute(
        self, client: Client, *, task_id: int, filename: str, status_check_period: int
    ) -> None:
        client.tasks.retrieve(obj_id=task_id).download_backup(
            filename=filename,
            status_check_period=status_check_period,
            pbar=DeferredTqdmProgressReporter(),
        )


@COMMANDS.command_class("create-from-backup")
class TaskCreateFromBackup:
    description = """Create a task from a backup file."""

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("filename", type=str, help="upload file")
        parser.add_argument(
            "--completion_verification_period",
            dest="status_check_period",
            default=2,
            type=float,
            help="time interval between checks if archive processing was finished, in seconds",
        )

    def execute(self, client: Client, *, filename: str, status_check_period: int) -> None:
        task = client.tasks.create_from_backup(
            filename=filename,
            status_check_period=status_check_period,
            pbar=DeferredTqdmProgressReporter(),
        )
        print(task.id)


@COMMANDS.command_class("auto-annotate")
class TaskAutoAnnotate:
    description = "Automatically annotate a CVAT task by running a function on the local machine."

    def configure_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument("task_id", type=int, help="task ID")

        configure_function_implementation_arguments(parser)

        parser.add_argument(
            "--clear-existing",
            action="store_true",
            help="Remove existing annotations from the task",
        )

        parser.add_argument(
            "--allow-unmatched-labels",
            action="store_true",
            help="Allow the function to declare labels not configured in the task",
        )

        parser.add_argument(
            "--conf-threshold",
            type=parse_threshold,
            help="Confidence threshold for filtering detections",
            default=None,
        )

        parser.add_argument(
            "--conv-mask-to-poly",
            action="store_true",
            help="Convert mask shapes to polygon shapes",
        )

    def execute(
        self,
        client: Client,
        *,
        task_id: int,
        function_loader: FunctionLoader,
        clear_existing: bool = False,
        allow_unmatched_labels: bool = False,
        conf_threshold: Optional[float],
        conv_mask_to_poly: bool,
    ) -> None:
        function = function_loader.load()

        cvataa.annotate_task(
            client,
            task_id,
            function,
            pbar=DeferredTqdmProgressReporter(),
            clear_existing=clear_existing,
            allow_unmatched_labels=allow_unmatched_labels,
            conf_threshold=conf_threshold,
            conv_mask_to_poly=conv_mask_to_poly,
        )
