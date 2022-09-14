# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Sequence, Tuple

import tqdm
from cvat_sdk import Client, models
from cvat_sdk.api_client.model_utils import to_json
from cvat_sdk.core.helpers import TqdmProgressReporter
from cvat_sdk.core.proxies.tasks import ResourceType
from cvat_sdk.core.utils import filter_dict


class CLI:
    def __init__(self, client: Client, credentials: Tuple[str, str]):
        self.client = client

        # allow arbitrary kwargs in models
        # TODO: will silently ignore invalid args, so remove this ASAP
        self.client.api_client.configuration.discard_unknown_keys = True

        self.client.login(credentials)

    @staticmethod
    def get_available_task_fields() -> set[str]:
        # We don't need to resolve forward references here and all the stuff from get_type_hints()
        # Just the field names
        return set(models.ITaskRead.__annotations__.keys())

    DEFAULT_CSV_TASK_OUTPUT_FIELDS = ("id", "name")

    def tasks_list(
        self,
        *,
        use_json_output: bool = False,
        output_fields: Optional[Sequence[str]] = None,
        **kwargs,
    ) -> None:
        """
        List all tasks in either CSV or JSON format.
        """

        def _render_field_to_csv(field: Any) -> str:
            if isinstance(field, dict) and "id" in field:
                return str(field["id"])
            else:
                return str(field)

        if output_fields:
            # verify requested fields
            available_fields = self.get_available_task_fields()
            unknown_fields = set(output_fields).difference(available_fields)
            if unknown_fields:
                raise ValueError(
                    "Unknown task fields requested for output: %s. Available fields are: %s"
                    % (", ".join(unknown_fields), ", ".join(available_fields))
                )
        elif not output_fields and not use_json_output:
            output_fields = self.DEFAULT_CSV_TASK_OUTPUT_FIELDS

        results = self.client.tasks.list(**kwargs)

        results = (to_json(r._model) for r in results)
        if output_fields:
            results = (filter_dict(r, keep=output_fields) for r in results)

        if use_json_output:
            print(json.dumps(list(results), indent=2))
        else:
            print(",".join(output_fields))
            for r in results:
                print(",".join(_render_field_to_csv(r.get(k, None)) for k in output_fields))

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
