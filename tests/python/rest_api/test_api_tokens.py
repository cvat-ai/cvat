import json
from contextlib import ExitStack
from datetime import datetime, timedelta, timezone

import pytest
from cvat_sdk.api_client import exceptions, models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from cvat_sdk.core.utils import filter_dict
from deepdiff import DeepDiff
from pytest_cases import parametrize

from shared.utils.config import make_api_client

from .utils import CollectionSimpleFilterTestBase


@pytest.mark.usefixtures("restore_db_per_function")
class TestPostApiToken:
    @pytest.mark.parametrize("user_group", ["admin", "user", "worker"])
    def test_can_create_token(self, users, user_group):
        user = next(u for u in users if user_group in u["groups"])

        with make_api_client(user["username"]) as api_client:
            token, _ = api_client.auth_api.create_api_tokens(
                api_token_write_request=models.ApiTokenWriteRequest(name="test token")
            )

        assert token.value

        with make_api_client(access_token=token.value) as api_client:
            user, _ = api_client.users_api.retrieve_self()

        assert user.username == user["username"]

    def test_can_create_token_with_expiration(self, admin_user):
        expiration_date = datetime.now(tz=timezone.utc) - timedelta(seconds=1)

        with make_api_client(admin_user) as api_client:
            token, _ = api_client.auth_api.create_api_tokens(
                api_token_write_request=models.ApiTokenWriteRequest(
                    name="test token", expiry_date=expiration_date
                )
            )

        assert token.expiry_date == expiration_date

        with (
            make_api_client(access_token=token.value) as api_client,
            pytest.raises(exceptions.UnauthorizedException, match="Invalid token"),
        ):
            api_client.users_api.retrieve_self()

    @parametrize("is_readonly", [True, False])
    def test_can_create_readonly_token(self, admin_user, is_readonly, tasks):
        with make_api_client(admin_user) as api_client:
            token, _ = api_client.auth_api.create_api_tokens(
                api_token_write_request=models.ApiTokenWriteRequest(
                    name="test token", read_only=is_readonly
                )
            )

        assert token.read_only == is_readonly

        with make_api_client(access_token=token.value) as api_client:
            user, _ = api_client.users_api.retrieve_self()
            assert user.username == admin_user

            with ExitStack() as es:
                if is_readonly:
                    es.enter_context(pytest.raises(exceptions.ForbiddenException))

                api_client.tasks_api.partial_update(
                    next(iter(tasks))["id"],
                    patched_task_write_request=models.PatchedTaskWriteRequest(name="new name"),
                )


class TestGetApiToken:
    def test_can_get_api_token(self, admin_user, api_tokens):
        expected = next(iter(api_tokens))

        with make_api_client(admin_user) as api_client:
            _, response = api_client.auth_api.retrieve_api_tokens(expected["id"])
            actual = json.loads(response.data)

        assert DeepDiff(expected, actual, exclude_paths=["private_key"]) == {}

    def test_cannot_see_foreign_tokens(self, users, api_tokens_by_username):
        token_owner, token_owner_tokens = next(iter(api_tokens_by_username.items()))
        token = token_owner_tokens[0]

        other_user = next(
            u for u in users if u["username"] != token_owner and not u["is_superuser"]
        )

        with (
            make_api_client(other_user["username"]) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.auth_api.retrieve_api_tokens(token["id"])

        assert (
            api_client.auth_api.list_api_tokens(
                filter=json.dumps({"!": {"==": [{"var": "owner"}, other_user["id"]]}})
            )[0].count
            == 0
        )

    def test_can_get_self(self, api_tokens_by_username):
        _, user_tokens = next(iter(api_tokens_by_username.items()))
        token = user_tokens[0]

        with make_api_client(access_token=token["private_key"]) as api_client:
            received_token = json.loads(api_client.auth_api.retrieve_api_tokens_self()[1].data)

        assert (
            DeepDiff(
                token,
                received_token,
                exclude_paths=["updated_date", "last_used_date", "private_key"],
            )
            == {}
        )

    @pytest.mark.usefixtures("restore_db_per_function")
    @pytest.mark.parametrize("token_eol_reason", ["expired", "stale", "revoked"])
    def test_can_only_see_alive_tokens(self, token_eol_reason: str, admin_user):
        with make_api_client(admin_user) as api_client:
            if token_eol_reason == "expired":
                token_id = api_client.auth_api.create_api_tokens(
                    api_token_write_request=models.ApiTokenWriteRequest(
                        name="test token",
                        expiry_date=datetime.now(timezone.utc) - timedelta(seconds=1),
                    )
                )[0].id
            elif token_eol_reason == "revoked":
                token_id = api_client.auth_api.create_api_tokens(
                    api_token_write_request=models.ApiTokenWriteRequest(name="test token")
                )[0].id
                api_client.auth_api.destroy_api_tokens(token_id)
            elif token_eol_reason == "stale":
                token_id = 6
            else:
                assert False, f"Unexpected token eol reason '{token_eol_reason}'"

            with pytest.raises(
                exceptions.NotFoundException, match="No ApiToken matches the given query"
            ):
                api_client.auth_api.retrieve_api_tokens(token_id)

            assert (
                api_client.auth_api.list_api_tokens(
                    filter=json.dumps({"==": [{"var": "id"}, token_id]})
                )[0].count
                == 0
            )


class TestApiTokenListFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(scope="session")
    def _cleaned_api_tokens(self, api_tokens):
        return [filter_dict(t, drop=("private_key",)) for t in api_tokens]

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, _cleaned_api_tokens):
        self.user = admin_user
        self.samples = _cleaned_api_tokens

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.auth_api.list_api_tokens_endpoint

    @pytest.mark.parametrize("field", ("name", "owner"))
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchApiToken:
    def test_can_modify_token(self, api_tokens_by_username):
        user, user_tokens = next(iter(api_tokens_by_username.items()))
        token = user_tokens[0]

        updated_values = {
            "name": "new name",
            "expiry_date": datetime.now(timezone.utc) + timedelta(days=1),
            "read_only": not token["read_only"],
        }

        updated_token = dict(token)
        updated_token.update(updated_values)

        with make_api_client(user) as api_client:
            _, response = api_client.auth_api.partial_update_api_tokens(
                token["id"],
                patched_api_token_write_request=models.PatchedApiTokenWriteRequest(
                    **updated_values
                ),
            )
            received_token = json.loads(response.data)

        updated_token["expiry_date"] = (
            updated_token["expiry_date"].isoformat().replace("+00:00", "Z")
        )
        assert (
            DeepDiff(updated_token, received_token, exclude_paths=["updated_date", "private_key"])
            == {}
        )

    def test_cannot_modify_foreign_token(self, users, api_tokens_by_username):
        token_owner, token_owner_tokens = next(iter(api_tokens_by_username.items()))
        token = token_owner_tokens[0]

        other_user = next(
            u["username"] for u in users if u["username"] != token_owner and not u["is_superuser"]
        )

        with (
            make_api_client(other_user) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.auth_api.partial_update_api_tokens(
                token["id"],
                patched_api_token_write_request=models.PatchedApiTokenWriteRequest(name="new name"),
            )


@pytest.mark.usefixtures("restore_db_per_function")
class TestDeleteApiToken:
    def test_can_revoke_own_token(self, api_tokens_by_username):
        user, user_tokens = next(iter(api_tokens_by_username.items()))
        token = user_tokens[0]

        with make_api_client(user) as api_client:
            api_client.auth_api.destroy_api_tokens(token["id"])

    def test_cannot_revoke_foreign_token(self, users, api_tokens_by_username):
        token_owner, token_owner_tokens = next(iter(api_tokens_by_username.items()))
        token = token_owner_tokens[0]

        other_user = next(
            u["username"] for u in users if u["username"] != token_owner and not u["is_superuser"]
        )

        with (
            make_api_client(other_user) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.auth_api.destroy_api_tokens(token["id"])


class TestTokenAuthPermissions:
    # Some operations are not allowed with token auth for security reasons

    def test_cannot_change_password_when_using_token_auth(self, admin_user, api_tokens_by_username):
        token = next(t for t in api_tokens_by_username[admin_user] if not t["read_only"])

        with (
            make_api_client(access_token=token["private_key"]) as api_client,
            pytest.raises(exceptions.UnauthorizedException),
        ):
            api_client.auth_api.create_password_change(
                password_change_request=models.PasswordChangeRequest(
                    old_password="any", new_password1="any", new_password2="any"
                )
            )

    def test_cannot_create_token_when_using_token_auth(self, admin_user, api_tokens_by_username):
        token = next(t for t in api_tokens_by_username[admin_user] if not t["read_only"])

        with (
            make_api_client(access_token=token["private_key"]) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.auth_api.create_api_tokens(
                api_token_write_request=models.ApiTokenWriteRequest(name="test token")
            )

    def test_cannot_edit_token_when_using_token_auth(self, admin_user, api_tokens_by_username):
        token = next(t for t in api_tokens_by_username[admin_user] if not t["read_only"])

        with (
            make_api_client(access_token=token["private_key"]) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.auth_api.partial_update_api_tokens(
                token["id"],
                patched_api_token_write_request=models.PatchedApiTokenWriteRequest(name="new name"),
            )

    def test_cannot_revoke_token_when_using_token_auth(self, admin_user, api_tokens_by_username):
        token = next(t for t in api_tokens_by_username[admin_user] if not t["read_only"])

        with (
            make_api_client(access_token=token["private_key"]) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.auth_api.destroy_api_tokens(token["id"])

    def test_cannot_edit_user_when_using_token_auth(
        self, admin_user, api_tokens_by_username, users_by_name
    ):
        token = next(t for t in api_tokens_by_username[admin_user] if not t["read_only"])
        user = users_by_name[admin_user]

        with (
            make_api_client(access_token=token["private_key"]) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.users_api.partial_update(
                user["id"], patched_user_request=models.PatchedUserRequest(first_name="new name")
            )


@pytest.mark.usefixtures("restore_db_per_function")
class TestTokenTracking:
    def test_can_update_last_use(self, api_tokens_by_username):
        _, user_tokens = next(iter(api_tokens_by_username.items()))
        token = user_tokens[0]

        with make_api_client(access_token=token["private_key"]) as api_client:
            updated_token, _ = api_client.auth_api.retrieve_api_tokens_self()

        old_last_used_date = token["last_used_date"]
        if old_last_used_date is not None:
            old_last_used_date = datetime.fromisoformat(
                token["last_used_date"].rstrip("Z")
            ).replace(tzinfo=timezone.utc)

        assert updated_token.last_used_date != old_last_used_date
