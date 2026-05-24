# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from functools import partial
from pathlib import PurePosixPath

import pytest

import shared.utils.s3 as s3


@pytest.fixture
def fxt_uploaded_s3_file(request: pytest.FixtureRequest):
    def upload_file(s3_client: s3.S3Client, *, path: PurePosixPath | str, data: bytes):
        s3_client.create_file(
            data=data,
            filename=str(path),
        )
        request.addfinalizer(
            partial(
                s3_client.remove_file,
                filename=str(path),
            )
        )

    return upload_file
