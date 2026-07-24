# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


import io
import unittest
from pathlib import Path
from typing import Any

import pytest
from cvat_sdk import make_client

from shared.utils.config import BASE_URL, USER_PASS
from shared.utils.helpers import generate_image_file


def run_cli(
    test: unittest.TestCase | Any,
    *args: str,
    expected_code: int = 0,
) -> None:
    from cvat_cli.__main__ import main

    if isinstance(test, unittest.TestCase):
        # Unittest
        test.assertEqual(expected_code, main(args), str(args))
    else:
        # Pytest case
        assert expected_code == main(args)


def generate_images(dst_dir: Path, count: int) -> list[Path]:
    filenames = []
    dst_dir.mkdir(parents=True, exist_ok=True)
    for i in range(count):
        filename = dst_dir / f"img_{i}.jpg"
        filename.write_bytes(generate_image_file(filename.name).getvalue())
        filenames.append(filename)
    return filenames


class TestCliBase:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        restore_db_per_function,  # force fixture call order to allow DB setup
        restore_redis_inmem_per_function,
        restore_redis_ondisk_per_function,
        fxt_stdout: io.StringIO,
        tmp_path: Path,
        admin_user: str,
    ):
        self.tmp_path = tmp_path
        self.stdout = fxt_stdout
        self.host, self.port = BASE_URL.rsplit(":", maxsplit=1)
        self.user = admin_user
        self.password = USER_PASS
        self.client = make_client(
            host=self.host, port=self.port, credentials=(self.user, self.password)
        )
        self.client.config.status_check_period = 0.01

        yield

    def run_cli(
        self,
        cmd: str,
        *args: str,
        expected_code: int = 0,
        organization: str | None = None,
        authenticate: bool = True,
    ) -> str:
        common_args = [
            f"--server-host={self.host}",
            f"--server-port={self.port}",
        ]

        if authenticate:
            common_args += [
                f"--auth={self.user}:{self.password}",
            ]

        if organization is not None:
            common_args.append(f"--organization={organization}")

        run_cli(
            self,
            *common_args,
            cmd,
            *args,
            expected_code=expected_code,
        )
        return self.stdout.getvalue()
