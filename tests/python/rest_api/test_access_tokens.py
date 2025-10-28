import csv
import json
from contextlib import ExitStack
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from io import StringIO
from time import sleep

import pytest
from cvat_sdk.api_client import exceptions, models
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from deepdiff import DeepDiff
from pytest_cases import parametrize

from shared.utils.config import make_api_client

from .utils import CollectionSimpleFilterTestBase, export_backup, export_dataset, export_events


@pytest.mark.usefixtures("restore_db_per_function")
class TestPostAccessToken:
    @pytest.mark.parametrize("user_group", ["admin", "user", "worker"])
    def test_can_create_token(self, users, user_group):
        user = next(u for u in users if user_group in u["groups"])

        with make_api_client(user["username"]) as api_client:
            token, _ = api_client.auth_api.create_access_tokens(
                access_token_write_request=models.AccessTokenWriteRequest(name="test token")
            )

        assert token.value

        with make_api_client(access_token=token.value) as api_client:
            user, _ = api_client.users_api.retrieve_self()

        assert user.username == user["username"]

    def test_can_create_token_with_expiration(self, admin_user):
        expiration_date = datetime.now(tz=timezone.utc) - timedelta(seconds=1)

        with make_api_client(admin_user) as api_client:
            token, _ = api_client.auth_api.create_access_tokens(
                access_token_write_request=models.AccessTokenWriteRequest(
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
            token, _ = api_client.auth_api.create_access_tokens(
                access_token_write_request=models.AccessTokenWriteRequest(
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


class TestGetAccessToken:
    def test_can_get_access_token(self, admin_user, access_tokens):
        expected = next(iter(access_tokens))

        with make_api_client(admin_user) as api_client:
            _, response = api_client.auth_api.retrieve_access_tokens(expected["id"])
            actual = json.loads(response.data)

        assert DeepDiff(expected, actual, exclude_paths=["private_key"]) == {}

    @parametrize("is_admin", [True, False])
    def test_cannot_see_foreign_tokens(self, users, access_tokens_by_username, is_admin):
        token_owner, token_owner_tokens = next(iter(access_tokens_by_username.items()))
        token = token_owner_tokens[0]

        other_user = next(
            u
            for u in users
            if u["username"] != token_owner
            if u["is_superuser"] == is_admin
            if not access_tokens_by_username.get(u["username"])
        )

        with make_api_client(other_user["username"]) as api_client:
            _, response = api_client.auth_api.retrieve_access_tokens(
                token["id"], _check_status=False
            )
            if is_admin:
                assert response.status == HTTPStatus.OK
            else:
                assert response.status == HTTPStatus.FORBIDDEN

        assert api_client.auth_api.list_access_tokens()[0].count == 0

    def test_can_get_self(self, access_tokens_by_username):
        _, user_tokens = next(iter(access_tokens_by_username.items()))
        token = user_tokens[0]

        with make_api_client(access_token=token["private_key"]) as api_client:
            received_token = json.loads(api_client.auth_api.retrieve_access_tokens_self()[1].data)

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
                token_id = api_client.auth_api.create_access_tokens(
                    access_token_write_request=models.AccessTokenWriteRequest(
                        name="test token",
                        expiry_date=datetime.now(timezone.utc) - timedelta(seconds=1),
                    )
                )[0].id
            elif token_eol_reason == "revoked":
                token_id = api_client.auth_api.create_access_tokens(
                    access_token_write_request=models.AccessTokenWriteRequest(name="test token")
                )[0].id
                api_client.auth_api.destroy_access_tokens(token_id)
            elif token_eol_reason == "stale":
                token_id = 6
            else:
                assert False, f"Unexpected token eol reason '{token_eol_reason}'"

            with pytest.raises(
                exceptions.NotFoundException, match="No AccessToken matches the given query"
            ):
                api_client.auth_api.retrieve_access_tokens(token_id)

            assert (
                api_client.auth_api.list_access_tokens(
                    filter=json.dumps({"==": [{"var": "id"}, token_id]})
                )[0].count
                == 0
            )


class TestAccessTokenListFilters(CollectionSimpleFilterTestBase):
    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, users_by_name, raw_access_tokens_by_username):
        # Only own keys are visible to each user
        self.user, self.samples = next(
            (username, user_tokens)
            for username, user_tokens in raw_access_tokens_by_username.items()
            if users_by_name[username]["is_superuser"] and user_tokens
        )

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.auth_api.list_access_tokens_endpoint

    @pytest.mark.parametrize("field", ("name",))
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchAccessToken:
    def test_can_modify_token(self, access_tokens_by_username):
        user, user_tokens = next(iter(access_tokens_by_username.items()))
        token = user_tokens[0]

        updated_values = {
            "name": "new name",
            "expiry_date": datetime.now(timezone.utc) + timedelta(days=1),
            "read_only": not token["read_only"],
        }

        updated_token = dict(token)
        updated_token.update(updated_values)

        with make_api_client(user) as api_client:
            _, response = api_client.auth_api.partial_update_access_tokens(
                token["id"],
                patched_access_token_write_request=models.PatchedAccessTokenWriteRequest(
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

    def test_cannot_modify_foreign_token(self, users, access_tokens_by_username):
        token_owner, token_owner_tokens = next(iter(access_tokens_by_username.items()))
        token = token_owner_tokens[0]

        other_user = next(
            u["username"] for u in users if u["username"] != token_owner and not u["is_superuser"]
        )

        with (
            make_api_client(other_user) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.auth_api.partial_update_access_tokens(
                token["id"],
                patched_access_token_write_request=models.PatchedAccessTokenWriteRequest(
                    name="new name"
                ),
            )

    def test_cannot_modify_expired_token(self, admin_user):
        with make_api_client(admin_user) as api_client:
            token_id = api_client.auth_api.create_access_tokens(
                access_token_write_request=models.AccessTokenWriteRequest(
                    name="test token",
                    expiry_date=datetime.now(timezone.utc) - timedelta(seconds=1),
                )
            )[0].id

            with pytest.raises(
                exceptions.NotFoundException, match="No AccessToken matches the given query"
            ):
                api_client.auth_api.partial_update_access_tokens(
                    token_id,
                    patched_access_token_write_request=models.PatchedAccessTokenWriteRequest(
                        expiry_date=datetime.now(timezone.utc) + timedelta(days=1)
                    ),
                )


@pytest.mark.usefixtures("restore_db_per_function")
class TestDeleteAccessToken:
    def test_can_revoke_own_token(self, access_tokens_by_username):
        user, user_tokens = next(iter(access_tokens_by_username.items()))
        token = user_tokens[0]

        with make_api_client(user) as api_client:
            api_client.auth_api.destroy_access_tokens(token["id"])

    def test_cannot_revoke_foreign_token(self, users, access_tokens_by_username):
        token_owner, token_owner_tokens = next(iter(access_tokens_by_username.items()))
        token = token_owner_tokens[0]

        other_user = next(
            u["username"] for u in users if u["username"] != token_owner and not u["is_superuser"]
        )

        with (
            make_api_client(other_user) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.auth_api.destroy_access_tokens(token["id"])


class TestTokenAuthPermissions:
    # Some operations are not allowed with token auth for security reasons, even if not read only

    def test_cannot_change_password_when_using_token_auth(
        self, admin_user, access_tokens_by_username
    ):
        token = next(t for t in access_tokens_by_username[admin_user] if not t["read_only"])

        with (
            make_api_client(access_token=token["private_key"]) as api_client,
            pytest.raises(exceptions.UnauthorizedException),
        ):
            api_client.auth_api.create_password_change(
                password_change_request=models.PasswordChangeRequest(
                    old_password="any", new_password1="any", new_password2="any"
                )
            )

    def test_cannot_create_token_when_using_token_auth(self, admin_user, access_tokens_by_username):
        token = next(t for t in access_tokens_by_username[admin_user] if not t["read_only"])

        with (
            make_api_client(access_token=token["private_key"]) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.auth_api.create_access_tokens(
                access_token_write_request=models.AccessTokenWriteRequest(name="test token")
            )

    def test_cannot_edit_token_when_using_token_auth(self, admin_user, access_tokens_by_username):
        token = next(t for t in access_tokens_by_username[admin_user] if not t["read_only"])

        with (
            make_api_client(access_token=token["private_key"]) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.auth_api.partial_update_access_tokens(
                token["id"],
                patched_access_token_write_request=models.PatchedAccessTokenWriteRequest(
                    name="new name"
                ),
            )

    def test_cannot_revoke_token_when_using_token_auth(self, admin_user, access_tokens_by_username):
        token = next(t for t in access_tokens_by_username[admin_user] if not t["read_only"])

        with (
            make_api_client(access_token=token["private_key"]) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.auth_api.destroy_access_tokens(token["id"])

    def test_cannot_edit_user_when_using_token_auth(
        self, admin_user, access_tokens_by_username, users_by_name
    ):
        token = next(t for t in access_tokens_by_username[admin_user] if not t["read_only"])
        user = users_by_name[admin_user]

        with (
            make_api_client(access_token=token["private_key"]) as api_client,
            pytest.raises(exceptions.ForbiddenException),
        ):
            api_client.users_api.partial_update(
                user["id"], patched_user_request=models.PatchedUserRequest(first_name="new name")
            )

    @pytest.mark.usefixtures("restore_redis_ondisk_per_function")
    @parametrize("is_readonly", [True, False])
    @parametrize("export_type", ["annotations", "dataset", "backup"])
    def test_token_can_export_project(
        self, admin_user, access_tokens_by_username, projects, export_type, is_readonly
    ):
        token = next(
            t for t in access_tokens_by_username[admin_user] if t["read_only"] == is_readonly
        )

        project_id = next(p["id"] for p in projects if p["tasks"]["count"] > 0)

        with make_api_client(access_token=token["private_key"]) as api_client:
            if export_type in ("annotations", "dataset"):
                export_dataset(
                    api_client.projects_api, id=project_id, save_images=(export_type == "dataset")
                )
            elif export_type == "backup":
                export_backup(api_client.projects_api, id=project_id)

    @pytest.mark.usefixtures("restore_redis_ondisk_per_function")
    @parametrize("is_readonly", [True, False])
    @parametrize("export_type", ["annotations", "dataset", "backup"])
    def test_token_can_export_task(
        self, admin_user, access_tokens_by_username, tasks, export_type, is_readonly
    ):
        token = next(
            t for t in access_tokens_by_username[admin_user] if t["read_only"] == is_readonly
        )

        task_id = next(p["id"] for p in tasks if p["size"] > 0)

        with make_api_client(access_token=token["private_key"]) as api_client:
            if export_type in ("annotations", "dataset"):
                export_dataset(
                    api_client.tasks_api, id=task_id, save_images=(export_type == "dataset")
                )
            elif export_type == "backup":
                export_backup(api_client.tasks_api, id=task_id)

    @pytest.mark.usefixtures("restore_redis_ondisk_per_function")
    @parametrize("is_readonly", [True, False])
    @parametrize("export_type", ["annotations", "dataset"])
    def test_token_can_export_jobs(
        self, admin_user, access_tokens_by_username, jobs, export_type, is_readonly
    ):
        token = next(
            t for t in access_tokens_by_username[admin_user] if t["read_only"] == is_readonly
        )

        job_id = next(p["id"] for p in jobs)

        with make_api_client(access_token=token["private_key"]) as api_client:
            if export_type in ("annotations", "dataset"):
                export_dataset(
                    api_client.jobs_api, id=job_id, save_images=(export_type == "dataset")
                )
            elif export_type == "backup":
                export_backup(api_client.jobs_api, id=job_id)


@pytest.mark.usefixtures("restore_db_per_function")
class TestTokenTracking:
    def test_can_update_last_use(self, access_tokens_by_username):
        _, user_tokens = next(iter(access_tokens_by_username.items()))
        token = user_tokens[0]

        with make_api_client(access_token=token["private_key"]) as api_client:
            updated_token, _ = api_client.auth_api.retrieve_access_tokens_self()

        old_last_used_date = token["last_used_date"]
        if old_last_used_date is not None:
            old_last_used_date = datetime.fromisoformat(
                token["last_used_date"].rstrip("Z")
            ).replace(tzinfo=timezone.utc)

        assert updated_token.last_used_date != old_last_used_date

    @pytest.mark.usefixtures("restore_redis_inmem_per_function")
    def test_can_record_token_events_in_audit_logs(self, admin_user, tasks):
        test_start_date = datetime.now(tz=timezone.utc)

        with make_api_client(admin_user) as api_client:
            token = api_client.auth_api.create_access_tokens(
                access_token_write_request=models.AccessTokenWriteRequest(
                    name="test token", read_only=False
                )
            )[0]

        task_id = next(p["id"] for p in tasks if p["size"] > 0)

        with make_api_client(access_token=token.value) as api_client:
            api_client.tasks_api.partial_update(
                task_id, patched_task_write_request=models.PatchedTaskWriteRequest(name="newname")
            )

        with make_api_client(admin_user) as api_client:
            api_client.auth_api.partial_update_access_tokens(
                token.id,
                patched_access_token_write_request=models.PatchedAccessTokenWriteRequest(
                    expiry_date=test_start_date + timedelta(days=1)
                ),
            )

            api_client.auth_api.destroy_access_tokens(token.id)

            # Clickhouse updates are not immediate, vector has buffering on sinks.
            # All these checks are in a single test because of this extra waiting.
            # Potentially unstable, should probably be improved or maybe moved into server tests.
            sleep(5)

            events_csv = export_events(api_client, api_version=2, _from=test_start_date)
            csv_reader = csv.DictReader(StringIO(events_csv.decode()))
            rows = list(csv_reader)

            def find_row(scope: str):
                return next((i, r) for i, r in enumerate(rows) if r["scope"] == scope)

            token_creation_row_index, row = find_row(scope="create:accesstoken")
            assert row["obj_id"] == str(token.id)

            task_update_row_index, row = find_row(scope="update:task")
            assert row["task_id"] == str(task_id)
            assert row["access_token_id"] == str(token.id)
            assert row["obj_name"] == "name"
            assert row["obj_val"] == "newname"

            token_update_row_index, row = find_row(scope="update:accesstoken")
            # token id is not present in the "update:*" event fields, can't check it
            assert row["obj_name"] == "expiry_date"

            token_delete_row_index, row = find_row(scope="delete:accesstoken")
            assert row["obj_id"] == str(token.id)

            assert token_creation_row_index < task_update_row_index
            assert task_update_row_index < token_update_row_index
            assert token_update_row_index < token_delete_row_index
