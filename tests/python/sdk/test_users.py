# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import io
from logging import Logger
from pathlib import Path
from typing import Tuple

import pytest
from cvat_sdk import Client, models
from cvat_sdk.api_client import exceptions

from shared.utils.config import USER_PASS


class TestUserUsecases:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        changedb,  # force fixture call order to allow DB setup
        tmp_path: Path,
        fxt_logger: Tuple[Logger, io.StringIO],
        fxt_client: Client,
        fxt_stdout: io.StringIO,
        admin_user: str,
    ):
        self.tmp_path = tmp_path
        _, self.logger_stream = fxt_logger
        self.client = fxt_client
        self.stdout = fxt_stdout
        self.user = admin_user
        self.client.login((self.user, USER_PASS))

        yield

    def test_can_retrieve_user(self):
        me = self.client.users.retrieve_current_user()

        user = self.client.users.retrieve(me.id)

        assert user.id == me.id
        assert user.username == self.user
        assert self.stdout.getvalue() == ""

    def test_can_list_users(self):
        users = self.client.users.list()

        assert self.user in set(u.username for u in users)
        assert self.stdout.getvalue() == ""

    def test_can_update_user(self):
        user = self.client.users.retrieve_current_user()

        user.update(models.PatchedUserRequest(first_name="foo", last_name="bar"))

        retrieved_user = self.client.users.retrieve(user.id)
        assert retrieved_user.first_name == "foo"
        assert retrieved_user.last_name == "bar"
        assert user.first_name == retrieved_user.first_name
        assert user.last_name == retrieved_user.last_name
        assert self.stdout.getvalue() == ""

    def test_can_remove_user(self):
        users = self.client.users.list()
        removed_user = next(u for u in users if u.username != self.user)

        removed_user.remove()

        with pytest.raises(exceptions.NotFoundException):
            removed_user.fetch()

        assert self.stdout.getvalue() == ""
