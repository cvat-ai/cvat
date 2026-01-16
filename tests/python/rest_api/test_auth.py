# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from collections.abc import Generator
from contextlib import contextmanager
from http import HTTPStatus
from unittest import mock

import pytest
from cvat_sdk.api_client import ApiClient, Configuration, models

from shared.utils.config import BASE_URL, USER_PASS, make_api_client


@pytest.mark.usefixtures("restore_db_per_class")
class TestBasicAuth:
    def test_can_use_basic_auth(self, admin_user: str):
        username = admin_user
        config = Configuration(host=BASE_URL, username=username, password=USER_PASS)
        with ApiClient(config) as client:
            (user, response) = client.users_api.retrieve_self()
            assert response.status == HTTPStatus.OK
            assert user.username == username


@pytest.mark.usefixtures("restore_db_per_function")
class TestTokenAuth:
    @staticmethod
    def login(api_client: ApiClient, username: str) -> models.Token:
        (auth, _) = api_client.auth_api.create_login(
            models.LoginSerializerExRequest(username=username, password=USER_PASS)
        )

        # Remove automatically managed cookies
        api_client.cookies.pop("sessionid")
        api_client.cookies.pop("csrftoken")

        # Set up the token authentication
        api_client.set_default_header("Authorization", "Token " + auth.key)

        return auth

    @classmethod
    @contextmanager
    def make_client(cls, username: str | None = None) -> Generator[ApiClient, None, None]:
        with ApiClient(Configuration(host=BASE_URL)) as api_client:
            if username:
                cls.login(api_client, username)

            yield api_client

    def _test_can_auth(self, api_client: ApiClient, *, username: str, auth_key: str):
        from cvat_sdk.api_client.rest import RESTClientObject

        original_request = RESTClientObject.request

        def patched_request(*args, **kwargs):
            assert "sessionid" not in kwargs["headers"].get("Cookie", "")
            assert "X-CSRFToken" not in kwargs["headers"]
            assert kwargs["headers"]["Authorization"] == "Token " + auth_key

            return original_request(api_client.rest_client, *args, **kwargs)

        with mock.patch.object(
            api_client.rest_client, "request", side_effect=patched_request
        ) as mock_request:
            (user, response) = api_client.users_api.retrieve_self()

            mock_request.assert_called_once()

        assert response.status == HTTPStatus.OK
        assert user.username == username

    def test_can_use_token_auth(self, admin_user: str):
        username = admin_user
        with self.make_client() as api_client:
            auth = self.login(api_client, username=username)
            assert auth.key

            self._test_can_auth(api_client, username=username, auth_key=auth.key)

    def test_can_use_token_auth_from_config(self, admin_user: str):
        username = admin_user
        with self.make_client() as api_client:
            auth = self.login(api_client, username=username)

            config = Configuration(
                host=BASE_URL,
                api_key={
                    "tokenAuth": auth.key,
                },
            )

        with ApiClient(config) as api_client:
            self._test_can_auth(api_client, username=username, auth_key=auth.key)

    def test_can_logout(self, admin_user: str):
        with self.make_client(admin_user) as api_client:
            (_, response) = api_client.auth_api.create_logout()
            assert response.status == HTTPStatus.OK

            (_, response) = api_client.users_api.retrieve_self(
                _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.UNAUTHORIZED


@pytest.mark.usefixtures("restore_db_per_function")
class TestSessionAuth:
    @staticmethod
    def login(api_client: ApiClient, username: str) -> models.Token:
        (auth, _) = api_client.auth_api.create_login(
            models.LoginSerializerExRequest(username=username, password=USER_PASS)
        )

        # Set up the session and CSRF authentication
        api_client.set_default_header("Origin", api_client.build_origin_header())
        api_client.set_default_header("X-CSRFToken", api_client.cookies["csrftoken"].value)

        return auth

    @classmethod
    @contextmanager
    def make_client(cls, username: str | None = None) -> Generator[ApiClient, None, None]:
        with ApiClient(Configuration(host=BASE_URL)) as api_client:
            if username:
                cls.login(api_client, username)

            yield api_client

    def _test_can_use_auth(self, api_client: ApiClient, *, username: str):
        from cvat_sdk.api_client.rest import RESTClientObject

        original_request = RESTClientObject.request

        def patched_request(*args, **kwargs):
            assert "sessionid" in kwargs["headers"].get("Cookie", "")
            assert "csrftoken" in kwargs["headers"].get("Cookie", "")
            assert "X-CSRFToken" in kwargs["headers"]
            assert "Origin" in kwargs["headers"]
            assert "Authorization" not in kwargs["headers"]

            return original_request(api_client.rest_client, *args, **kwargs)

        with mock.patch.object(
            api_client.rest_client, "request", side_effect=patched_request
        ) as mock_request:
            (user, response) = api_client.users_api.retrieve_self()

            mock_request.assert_called_once()

        assert response.status == HTTPStatus.OK
        assert user.username == username

        # Check CSRF authentication in an "unsafe" request
        api_client.users_api.partial_update(
            user.id, patched_user_request=models.PatchedUserRequest(first_name="Newname")
        )

    def test_can_use_session_auth(self, admin_user: str):
        username = admin_user
        with self.make_client(username) as api_client:
            self._test_can_use_auth(api_client, username=username)

    def test_can_use_session_auth_from_config(self, admin_user: str):
        username = admin_user
        with self.make_client(username) as api_client:
            config = Configuration(
                host=BASE_URL,
                api_key={
                    "sessionAuth": api_client.cookies["sessionid"].value,
                    "csrfAuth": api_client.cookies["csrftoken"].value,
                },
            )

        with ApiClient(config) as api_client:
            self._test_can_use_auth(api_client, username=username)

    def test_can_logout(self, admin_user: str):
        with self.make_client(admin_user) as api_client:
            (_, response) = api_client.auth_api.create_logout()
            assert response.status == HTTPStatus.OK

            (_, response) = api_client.users_api.retrieve_self(
                _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.UNAUTHORIZED


@pytest.mark.usefixtures("restore_db_per_function")
class TestAccessTokenAuth:
    @classmethod
    @contextmanager
    def make_client(cls, *, token: str | None = None) -> Generator[ApiClient, None, None]:
        with ApiClient(Configuration(host=BASE_URL)) as api_client:
            if token:
                api_client.configuration.access_token = token

            yield api_client

    def _test_can_use_auth(self, api_client: ApiClient, *, username: str, access_token: str):
        from cvat_sdk.api_client.rest import RESTClientObject

        original_request = RESTClientObject.request

        def patched_request(*args, **kwargs):
            assert "sessionid" not in kwargs["headers"].get("Cookie", "")
            assert "X-CSRFToken" not in kwargs["headers"]
            assert kwargs["headers"]["Authorization"] == "Bearer " + access_token

            return original_request(api_client.rest_client, *args, **kwargs)

        with mock.patch.object(
            api_client.rest_client, "request", side_effect=patched_request
        ) as mock_request:
            (user, response) = api_client.users_api.retrieve_self()

            mock_request.assert_called_once()

        assert response.status == HTTPStatus.OK
        assert user.username == username

    def test_can_use_token_auth(self, admin_user: str, access_tokens_by_username):
        token = access_tokens_by_username[admin_user][0]["private_key"]
        with self.make_client(token=token) as api_client:
            self._test_can_use_auth(api_client, username=admin_user, access_token=token)

    def test_logout_is_not_an_error(self, admin_user: str, access_tokens_by_username):
        token = access_tokens_by_username[admin_user][0]["private_key"]
        with ApiClient(Configuration(host=BASE_URL)) as session_api_client:
            session_api_client.auth_api.create_login(
                login_serializer_ex_request=models.LoginSerializerExRequest(
                    username=admin_user, password=USER_PASS
                )
            )
            session_api_client.set_default_header(
                "Origin", session_api_client.build_origin_header()
            )
            session_api_client.set_default_header(
                "X-CSRFToken", session_api_client.cookies["csrftoken"].value
            )

            with self.make_client(token=token) as token_api_client:
                # It must be a noop call in the case of API access token auth
                (_, response) = token_api_client.auth_api.create_logout()
                assert response.status == HTTPStatus.OK

                # the credentials are still in the client and can be used
                assert token_api_client.configuration.access_token == token
                self._test_can_use_auth(token_api_client, username=admin_user, access_token=token)

            # Other sessions must not be affected by the logout
            session_api_client.users_api.retrieve_self()


@pytest.mark.usefixtures("restore_db_per_function")
class TestCredentialsManagement:
    def test_can_register(self):
        username = "newuser"
        email = "123@456.com"
        with ApiClient(Configuration(host=BASE_URL)) as api_client:
            (user, response) = api_client.auth_api.create_register(
                models.RegisterSerializerExRequest(
                    username=username, password1=USER_PASS, password2=USER_PASS, email=email
                )
            )
            assert response.status == HTTPStatus.CREATED
            assert user.username == username

        with make_api_client(username) as api_client:
            (user, response) = api_client.users_api.retrieve_self()
            assert response.status == HTTPStatus.OK
            assert user.username == username
            assert user.email == email

    def test_can_change_password(self, admin_user: str):
        username = admin_user
        new_pass = "5w4knrqaW#$@gewa"
        with make_api_client(username) as api_client:
            (info, response) = api_client.auth_api.create_password_change(
                models.PasswordChangeRequest(
                    old_password=USER_PASS, new_password1=new_pass, new_password2=new_pass
                )
            )
            assert response.status == HTTPStatus.OK
            assert info.detail == "New password has been saved."

            (_, response) = api_client.users_api.retrieve_self(
                _parse_response=False, _check_status=False
            )
            assert response.status == HTTPStatus.UNAUTHORIZED

            api_client.configuration.password = new_pass
            (user, response) = api_client.users_api.retrieve_self()
            assert response.status == HTTPStatus.OK
            assert user.username == username

    def test_can_report_weak_password(self, admin_user: str):
        username = admin_user
        new_pass = "pass"
        with make_api_client(username) as api_client:
            (_, response) = api_client.auth_api.create_password_change(
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
        with make_api_client(username) as api_client:
            (_, response) = api_client.auth_api.create_password_change(
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
