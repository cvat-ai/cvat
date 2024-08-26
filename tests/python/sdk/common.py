# Copyright (C) 2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
import zipfile
from pathlib import Path

from cvat_sdk.core.proxies.jobs import Job
from cvat_sdk.core.proxies.projects import Project
from cvat_sdk.core.proxies.tasks import Task
from cvat_sdk.core.proxies.types import Location

from shared.utils.config import IMPORT_EXPORT_BUCKET_ID
from shared.utils.s3 import S3Client
from shared.utils.s3 import make_client as make_s3_client

from .util import make_pbar

ProjectOrTaskOrJob = Project | Task | Job


class _TestDatasetExport:
    def _test_export_locally(
        self,
        resource: ProjectOrTaskOrJob,
        *,
        file_path: Path,
        **export_kwargs,
    ):
        pbar_out = io.StringIO()
        pbar = make_pbar(file=pbar_out)
        resource.export_dataset(pbar=pbar, **export_kwargs)
        assert self.stdout.getvalue() == ""
        assert "100%" in pbar_out.getvalue().strip("\r").split("\r")[-1]
        assert file_path.is_file()

    def _test_export_to_cloud_storage(
        self,
        resource: ProjectOrTaskOrJob,
        *,
        file_path: Path,
        cs_client: S3Client,
        **export_kwargs,
    ):
        resource.export_dataset(**export_kwargs)
        assert self.stdout.getvalue() == ""
        dataset = cs_client.download_fileobj(str(file_path))
        assert zipfile.is_zipfile(io.BytesIO(dataset))

    def _test_can_export_dataset(
        self,
        resource: ProjectOrTaskOrJob,
        *,
        file_path: Path,
        annotation_format: str,
        include_images: bool,
        location: Location | None,
        request,
        cloud_storages,
    ):
        kwargs = {
            "format_name": annotation_format,
            "filename": file_path,
            "include_images": include_images,
            "location": location,
        }

        expected_locally = (
            location == Location.LOCAL
            or not location
            and (
                not resource.target_storage
                or resource.target_storage.location.value == Location.LOCAL
            )
        )

        if expected_locally:
            self._test_export_locally(resource, file_path=file_path, **kwargs)
        else:
            bucket = next(cs for cs in cloud_storages if cs["id"] == IMPORT_EXPORT_BUCKET_ID)[
                "resource"
            ]
            s3_client = make_s3_client(bucket=bucket)
            request.addfinalizer(lambda: s3_client.remove_file(filename=str(file_path)))
            self._test_export_to_cloud_storage(
                resource,
                file_path=file_path,
                cs_client=s3_client,
                **(
                    {"cloud_storage_id": IMPORT_EXPORT_BUCKET_ID}
                    if location == Location.CLOUD_STORAGE
                    else {}
                ),
                **kwargs,
            )
