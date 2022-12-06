# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from http import HTTPStatus
from pathlib import Path
from cvat_sdk.core.client import Config
from cvat_sdk.core.proxies.tasks import ResourceType

import pytest

from cvat_sdk.api_client import ApiClient, models
from cvat_sdk import Client, exceptions

from shared.utils.config import BASE_URL, USER_PASS
from shared.utils.helpers import generate_image_file

@pytest.fixture
def fxt_image_file(tmp_path: Path):
    img_path = tmp_path / "img.png"
    with img_path.open("wb") as f:
        f.write(generate_image_file(filename=str(img_path), size=(5, 10)).getvalue())

    return img_path

class TestUserLimits:
    @classmethod
    def _create_user(cls, api_client: ApiClient, email: str) -> str:
        username = email.split('@', maxsplit=1)[0]
        with api_client:
            (user, response) = api_client.auth_api.create_register(
                models.RegisterSerializerExRequest(
                    username=username, password1=USER_PASS, password2=USER_PASS, email=email
                )
            )
            assert response.status == HTTPStatus.CREATED

        return user.username

    @pytest.fixture(autouse=True)
    def set_up(self, restore_db_per_function, tmp_path: Path):
        self.tmp_dir = tmp_path

        self.client = Client(BASE_URL, config=Config(status_check_period=0.01))
        self.user = self._create_user(self.client.api_client, email="test_user_limits@example.com")

    _DEFAULT_TASK_LIMIT = 10

    def test_can_reach_user_task_limit(self, fxt_image_file: Path):
        def _create_task(idx: int):
            return self.client.tasks.create_from_data(
                spec=models.TaskWriteRequest(
                    name=f"test_task_{idx}",
                    labels=[models.PatchedLabelRequest(name="cat")]
                ),
                resource_type=ResourceType.LOCAL,
                resources=[str(fxt_image_file)]
            )

        with self.client:
            self.client.login((self.user, USER_PASS))

            for i in range(self._DEFAULT_TASK_LIMIT):
                _create_task(i)

            with pytest.raises(exceptions.ApiException) as capture:
                _create_task(i)

        assert capture.value.status == HTTPStatus.FORBIDDEN
        assert json.loads(capture.value.body) == ["user tasks limit reached"]
