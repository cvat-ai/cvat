# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
from typing import Dict, List, Sequence, Tuple

import tqdm
from cvat_sdk import Client, models
from cvat_sdk.core.helpers import TqdmProgressReporter
from cvat_sdk.core.proxies.tasks import ResourceType


class CLI:
    def __init__(self, client: Client, credentials: Tuple[str, str]):
        self.client = client

        # allow arbitrary kwargs in models
        # TODO: will silently ignore invalid args, so remove this ASAP
        self.client.api_client.configuration.discard_unknown_keys = True

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
        resource_type: ResourceType,
        resources: Sequence[str],
        *,
        annotation_path: str = "",
        annotation_format: str = "CVAT XML 1.1",
        status_check_period: int = 2,
        dataset_repository_url: str = "",
        lfs: bool = False,
        **kwargs,
    ) -> None:
        """
        Create a new task with the given name and labels JSON and add the files to it.
        """
        task = self.client.tasks.create_from_data(
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
            pbar=self._make_pbar(),
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
            pbar=self._make_pbar(),
        )

    def tasks_export(self, task_id: str, filename: str, *, status_check_period: int = 2) -> None:
        """Download a task backup"""
        self.client.tasks.retrieve(obj_id=task_id).download_backup(
            filename=filename, status_check_period=status_check_period, pbar=self._make_pbar()
        )

    def tasks_import(self, filename: str, *, status_check_period: int = 2) -> None:
        """Import a task from a backup file"""
        self.client.tasks.create_from_backup(
            filename=filename, status_check_period=status_check_period, pbar=self._make_pbar()
        )

    def _make_pbar(self, title: str = None) -> TqdmProgressReporter:
        return TqdmProgressReporter(
            tqdm.tqdm(unit_scale=True, unit="B", unit_divisor=1024, desc=title)
        )
