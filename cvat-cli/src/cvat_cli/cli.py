# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import importlib
import importlib.util
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import cvat_sdk.auto_annotation as cvataa
from cvat_sdk import Client, models
from cvat_sdk.core.helpers import DeferredTqdmProgressReporter
from cvat_sdk.core.proxies.tasks import ResourceType


class CLI:
    def __init__(self, client: Client, credentials: Tuple[str, str]):
        self.client = client

        self.client.login(credentials)

        self.client.check_server_version(fail_if_unsupported=False)

    def tasks_list(self, *, use_json_output: bool = False, **kwargs):
        """List all tasks in either basic or JSON format."""
        results = self.client.tasks.list(return_json=use_json_output, **kwargs)
        if use_json_output:
            print(json.dumps(json.loads(results), indent=2))
        else:
            for r in results:
                print(r.id)

    def tasks_create(
        self,
        name: str,
        labels: List[Dict[str, str]],
        resources: Sequence[str],
        *,
        resource_type: ResourceType = ResourceType.LOCAL,
        annotation_path: str = "",
        annotation_format: str = "CVAT XML 1.1",
        status_check_period: int = 2,
        **kwargs,
    ) -> None:
        """
        Create a new task with the given name and labels JSON and add the files to it.
        """

        task_params = {}
        data_params = {}

        for k, v in kwargs.items():
            if k in models.DataRequest.attribute_map or k == "frame_step":
                data_params[k] = v
            else:
                task_params[k] = v

        task = self.client.tasks.create_from_data(
            spec=models.TaskWriteRequest(name=name, labels=labels, **task_params),
            resource_type=resource_type,
            resources=resources,
            data_params=data_params,
            annotation_path=annotation_path,
            annotation_format=annotation_format,
            status_check_period=status_check_period,
            pbar=DeferredTqdmProgressReporter(),
        )
        print("Created task id", task.id)

    def tasks_delete(self, task_ids: Sequence[int]) -> None:
        """Delete a list of tasks, ignoring those which don't exist."""
        self.client.tasks.remove_by_ids(task_ids=task_ids)

    def tasks_frames(
        self,
        task_id: int,
        frame_ids: Sequence[int],
        *,
        outdir: str = "",
        quality: str = "original",
    ) -> None:
        """
        Download the requested frame numbers for a task and save images as
        task_<ID>_frame_<FRAME>.jpg.
        """
        self.client.tasks.retrieve(obj_id=task_id).download_frames(
            frame_ids=frame_ids,
            outdir=outdir,
            quality=quality,
            filename_pattern=f"task_{task_id}" + "_frame_{frame_id:06d}{frame_ext}",
        )

    def tasks_dump(
        self,
        task_id: int,
        fileformat: str,
        filename: str,
        *,
        status_check_period: int = 2,
        include_images: bool = False,
    ) -> None:
        """
        Download annotations for a task in the specified format (e.g. 'YOLO ZIP 1.0').
        """
        self.client.tasks.retrieve(obj_id=task_id).export_dataset(
            format_name=fileformat,
            filename=filename,
            pbar=DeferredTqdmProgressReporter(),
            status_check_period=status_check_period,
            include_images=include_images,
        )

    def tasks_upload(
        self, task_id: str, fileformat: str, filename: str, *, status_check_period: int = 2
    ) -> None:
        """Upload annotations for a task in the specified format
        (e.g. 'YOLO ZIP 1.0')."""
        self.client.tasks.retrieve(obj_id=task_id).import_annotations(
            format_name=fileformat,
            filename=filename,
            status_check_period=status_check_period,
            pbar=DeferredTqdmProgressReporter(),
        )

    def tasks_export(self, task_id: str, filename: str, *, status_check_period: int = 2) -> None:
        """Download a task backup"""
        self.client.tasks.retrieve(obj_id=task_id).download_backup(
            filename=filename,
            status_check_period=status_check_period,
            pbar=DeferredTqdmProgressReporter(),
        )

    def tasks_import(self, filename: str, *, status_check_period: int = 2) -> None:
        """Import a task from a backup file"""
        self.client.tasks.create_from_backup(
            filename=filename,
            status_check_period=status_check_period,
            pbar=DeferredTqdmProgressReporter(),
        )

    def tasks_auto_annotate(
        self,
        task_id: int,
        *,
        function_module: Optional[str] = None,
        function_file: Optional[Path] = None,
        function_parameters: Dict[str, Any],
        clear_existing: bool = False,
        allow_unmatched_labels: bool = False,
    ) -> None:
        if function_module is not None:
            function = importlib.import_module(function_module)
        elif function_file is not None:
            module_spec = importlib.util.spec_from_file_location("__cvat_function__", function_file)
            function = importlib.util.module_from_spec(module_spec)
            module_spec.loader.exec_module(function)
        else:
            assert False, "function identification arguments missing"

        if hasattr(function, "create"):
            # this is actually a function factory
            function = function.create(**function_parameters)
        else:
            if function_parameters:
                raise TypeError("function takes no parameters")

        cvataa.annotate_task(
            self.client,
            task_id,
            function,
            pbar=DeferredTqdmProgressReporter(),
            clear_existing=clear_existing,
            allow_unmatched_labels=allow_unmatched_labels,
        )
