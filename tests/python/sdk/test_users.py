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


class TestUserUsecases:
    @pytest.fixture(autouse=True)
    def setup(
        self,
        tmp_path: Path,
        fxt_login: Tuple[Client, str],
        fxt_logger: Tuple[Logger, io.StringIO],
        fxt_stdout: io.StringIO,
    ):
        self.tmp_path = tmp_path
        logger, self.logger_stream = fxt_logger
        self.stdout = fxt_stdout
        self.client, self.user = fxt_login
        self.client.logger = logger

        api_client = self.client.api_client
        for k in api_client.configuration.logger:
            api_client.configuration.logger[k] = logger

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
