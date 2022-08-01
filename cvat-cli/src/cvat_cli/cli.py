# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from typing import Dict, List, Sequence, Tuple

import tqdm

from cvat_sdk import Client, models
from cvat_sdk.helpers import TqdmProgressReporter
from cvat_sdk.types import ResourceType


class CLI:
    def __init__(self, client: Client, credentials: Tuple[str, str]):
        self.client = client

        # allow arbitrary kwargs in models
        # TODO: will silently ignore invalid args, so remove this ASAP
        self.client.api.configuration.discard_unknown_keys = True

        self.client.login(credentials)

    def tasks_data(
        self,
        task_id: int,
        *,
        resource_type: ResourceType,
        resources: Sequence[str],
        **kwargs,
    ) -> None:
        return self.client.retrieve_task(task_id).upload_data(
            resource_type=resource_type, resources=resources, pbar=self._make_pbar(), params=kwargs
        )

    def tasks_list(self, *, use_json_output: bool = True, **kwargs):
        """List all tasks in either basic or JSON format."""
        return self.client.list_tasks(return_json=use_json_output, **kwargs)

    def tasks_create(
        self,
        name: str,
        labels: List[Dict[str, str]],
        resource_type: ResourceType,
        resources: Sequence[str],
        *,
        annotation_path: str = "",
        annotation_format: str = "CVAT XML 1.1",
        status_check_period: int = 2,
        dataset_repository_url: str = "",
        lfs: bool = False,
        **kwargs,
    ) -> int:
        """
        Create a new task with the given name and labels JSON and
        add the files to it.

        Returns: id of the created task
        """
        return self.client.create_task(
            spec=models.TaskWriteRequest(name=name, labels=labels, **kwargs),
            resource_type=resource_type,
            resources=resources,
            data_params=kwargs,
            annotation_path=annotation_path,
            annotation_format=annotation_format,
            status_check_period=status_check_period,
            dataset_repository_url=dataset_repository_url,
            use_lfs=lfs,
            pbar=self._make_pbar(),
        )

    def tasks_delete(self, task_ids: Sequence[int]) -> None:
        """Delete a list of tasks, ignoring those which don't exist."""
        self.client.delete_tasks(task_ids=task_ids)

    def tasks_frames(
        self,
        task_id: int,
        frame_ids: Sequence[int],
        *,
        outdir: str = "",
        quality: str = "original",
    ) -> None:
        """Download the requested frame numbers for a task and save images as
        task_<ID>_frame_<FRAME>.jpg."""
        self.client.retrieve_task(task_id=task_id).download_frames(
            frame_ids=frame_ids, outdir=outdir, quality=quality
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
        return self.client.retrieve_task(task_id=task_id).export_dataset(
            format_name=fileformat,
            filename=filename,
            pbar=self._make_pbar(),
            status_check_period=status_check_period,
            include_images=include_images,
        )

    def tasks_upload(
        self, task_id: str, fileformat: str, filename: str, *, status_check_period: int = 2
    ) -> None:
        """Upload annotations for a task in the specified format
        (e.g. 'YOLO ZIP 1.0')."""
        return self.client.retrieve_task(task_id=task_id).import_annotations(
            format_name=fileformat,
            filename=filename,
            status_check_period=status_check_period,
            pbar=self._make_pbar(),
        )

    def tasks_export(self, task_id: str, filename: str, *, status_check_period: int = 2) -> None:
        """Download a task backup"""
        return self.client.retrieve_task(task_id=task_id).download_backup(
            filename=filename, status_check_period=status_check_period, pbar=self._make_pbar()
        )

    def tasks_import(self, filename: str, *, status_check_period: int = 2) -> None:
        """Import a task from a backup file"""

        return self.client.create_task_from_backup(
            filename=filename, status_check_period=status_check_period, pbar=self._make_pbar()
        )

    def login(self, credentials: Tuple[str, str]) -> None:
        self.client.login(credentials=credentials)

    def _make_pbar(self, title: str = None) -> TqdmProgressReporter:
        return TqdmProgressReporter(
            tqdm.tqdm(unit_scale=True, unit="B", unit_divisor=1024, desc=title)
        )
