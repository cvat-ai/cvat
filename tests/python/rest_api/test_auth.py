# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from http import HTTPStatus

import pytest
from cvat_sdk.api_client import ApiClient, Configuration, models
from shared.utils.config import BASE_URL, USER_PASS, make_api_client


@pytest.mark.usefixtures("dontchangedb")
class TestBasicAuth:
    def test_can_do_basic_auth(self, admin_user: str):
        username = admin_user
        config = Configuration(host=BASE_URL, username=username, password=USER_PASS)
        with ApiClient(config) as client:
            (user, response) = client.users_api.retrieve_self()
            assert response.status == HTTPStatus.OK
            assert user.username == username


@pytest.mark.usefixtures("changedb")
class TestTokenAuth:
    @staticmethod
    def login(client: ApiClient, username: str) -> models.Token:
        (auth, _) = client.auth_api.create_login(
            models.LoginRequest(username=username, password=USER_PASS)
        )
        client.set_default_header("Authorization", "Token " + auth.key)
        return auth

    @classmethod
    def make_client(cls, username: str) -> ApiClient:
        with ApiClient(Configuration(host=BASE_URL)) as client:
            cls.login(client, username)
            return client

    def test_can_do_token_auth_and_manage_cookies(self, admin_user: str):
        username = admin_user
        with ApiClient(Configuration(host=BASE_URL)) as client:
            auth = self.login(client, username=username)
            assert "sessionid" in client.cookies
            assert "csrftoken" in client.cookies
            assert auth.key

            (user, response) = client.users_api.retrieve_self()
            assert response.status == HTTPStatus.OK
            assert user.username == username

    def test_can_do_logout(self, admin_user: str):
        username = admin_user
        with self.make_client(username) as client:
            (_, response) = client.auth_api.create_logout()
            assert response.status == HTTPStatus.OK

            (_, response) = client.users_api.retrieve_self(
                _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.UNAUTHORIZED


@pytest.mark.usefixtures("changedb")
class TestCredentialsManagement:
    def test_can_register(self):
        username = "newuser"
        email = "123@456.com"
        with ApiClient(Configuration(host=BASE_URL)) as client:
            (user, response) = client.auth_api.create_register(
                models.RestrictedRegisterRequest(
                    username=username, password1=USER_PASS, password2=USER_PASS, email=email
                )
            )
            assert response.status == HTTPStatus.CREATED
            assert user.username == username

        with make_api_client(username) as client:
            (user, response) = client.users_api.retrieve_self()
            assert response.status == HTTPStatus.OK
            assert user.username == username
            assert user.email == email

    def test_can_change_password(self, admin_user: str):
        username = admin_user
        new_pass = "5w4knrqaW#$@gewa"
        with make_api_client(username) as client:
            (info, response) = client.auth_api.create_password_change(
                models.PasswordChangeRequest(
                    old_password=USER_PASS, new_password1=new_pass, new_password2=new_pass
                )
            )
            assert response.status == HTTPStatus.OK
            assert info.detail == "New password has been saved."

            (_, response) = client.users_api.retrieve_self(
                _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.UNAUTHORIZED

            client.configuration.password = new_pass
            (user, response) = client.users_api.retrieve_self()
            assert response.status == HTTPStatus.OK
            assert user.username == username

    def test_can_report_weak_password(self, admin_user: str):
        username = admin_user
        new_pass = "pass"
        with make_api_client(username) as client:
            (_, response) = client.auth_api.create_password_change(
                models.PasswordChangeRequest(
                    old_password=USER_PASS, new_password1=new_pass, new_password2=new_pass
                ),
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.BAD_REQUEST
            assert json.loads(response.data) == {
                "new_password2": [
                    "This password is too short. It must contain at least 8 characters.",
                    "This password is too common.",
                ]
            }

    def test_can_report_mismatching_passwords(self, admin_user: str):
        username = admin_user
        with make_api_client(username) as client:
            (_, response) = client.auth_api.create_password_change(
                models.PasswordChangeRequest(
                    old_password=USER_PASS, new_password1="3j4tb13/T$#", new_password2="q#@$n34g5"
                ),
                _parse_response=False,
                _check_status=False,
            )
            assert response.status == HTTPStatus.BAD_REQUEST
            assert json.loads(response.data) == {
                "new_password2": ["The two password fields didn’t match."]
            }
