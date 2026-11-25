# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from copy import deepcopy
from http import HTTPStatus

import pytest
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from deepdiff import DeepDiff

from shared.utils.config import (
    delete_method,
    get_method,
    get_paginated_collection,
    make_api_client,
    options_method,
    patch_method,
)

from .utils import CollectionSimpleFilterTestBase


class TestMetadataOrganizations:
    _ORG = 2

    @pytest.mark.parametrize(
        "privilege, role, is_member",
        [
            ("admin", None, None),
            ("user", None, False),
            ("worker", None, False),
            (None, "owner", True),
            (None, "maintainer", True),
            (None, "worker", True),
            (None, "supervisor", True),
        ],
    )
    def test_can_send_options_request(
        self,
        privilege: str | None,
        role: str | None,
        is_member: bool | None,
        find_users,
        organizations,
    ):
        exclude_org = None if is_member else self._ORG
        org = self._ORG if is_member else None

        filters = {}

        for key, value in {
            "privilege": privilege,
            "role": role,
            "org": org,
            "exclude_org": exclude_org,
        }.items():
            if value is not None:
                filters[key] = value

        user = find_users(**filters)[0]["username"]

        response = options_method(user, f"organizations")
        assert response.status_code == HTTPStatus.OK

        response = options_method(user, f"organizations/{self._ORG}")
        assert response.status_code == HTTPStatus.OK


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetOrganizations:
    _ORG = 2

    @pytest.mark.parametrize(
        "privilege, role, is_member, is_allow",
        [
            ("admin", None, None, True),
            ("user", None, False, False),
            ("worker", None, False, False),
            (None, "owner", True, True),
            (None, "maintainer", True, True),
            (None, "worker", True, True),
            (None, "supervisor", True, True),
        ],
    )
    def test_can_see_specific_organization(
        self,
        privilege: str | None,
        role: str | None,
        is_member: bool | None,
        is_allow: bool,
        find_users,
        organizations,
    ):
        exclude_org = None if is_member else self._ORG
        org = self._ORG if is_member else None

        filters = {}

        for key, value in {
            "privilege": privilege,
            "role": role,
            "org": org,
            "exclude_org": exclude_org,
        }.items():
            if value is not None:
                filters[key] = value

        user = find_users(**filters)[0]["username"]

        response = get_method(user, f"organizations/{self._ORG}")
        if is_allow:
            assert response.status_code == HTTPStatus.OK
            assert DeepDiff(organizations[self._ORG], response.json()) == {}
        else:
            assert response.status_code == HTTPStatus.FORBIDDEN

    def test_can_remove_owner_and_fetch_with_sdk(self, admin_user, organizations):
        # test for API schema regressions
        source_org = next(
            org
            for org in organizations
            if org.get("owner") and org["owner"]["username"] != admin_user
        ).copy()

        with make_api_client(admin_user) as api_client:
            api_client.users_api.destroy(source_org["owner"]["id"])

            _, response = api_client.organizations_api.retrieve(source_org["id"])
            fetched_org = json.loads(response.data)

        source_org["owner"] = None
        assert DeepDiff(source_org, fetched_org, ignore_order=True) == {}


class TestOrganizationsListFilters(CollectionSimpleFilterTestBase):
    field_lookups = {
        "owner": ["owner", "username"],
    }

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, organizations):
        self.user = admin_user
        self.samples = organizations

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.organizations_api.list_endpoint

    @pytest.mark.parametrize(
        "field",
        ("name", "owner", "slug"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchOrganizations:
    _ORG = 2

    @pytest.fixture(scope="class")
    def request_data(self):
        return {
            "slug": "new",
            "name": "new",
            "description": "new",
            "contact": {"email": "new@cvat.org"},
        }

    @pytest.fixture(scope="class")
    def expected_data(self, organizations, request_data):
        data = deepcopy(organizations[self._ORG])
        data.update(request_data)
        return data

    @pytest.mark.parametrize(
        "privilege, role, is_member, is_allow",
        [
            ("admin", None, None, True),
            ("user", None, False, False),
            ("worker", None, False, False),
            (None, "owner", True, True),
            (None, "maintainer", True, True),
            (None, "worker", True, False),
            (None, "supervisor", True, False),
        ],
    )
    def test_can_update_specific_organization(
        self,
        privilege: str | None,
        role: str | None,
        is_member: bool | None,
        is_allow: bool,
        find_users,
        request_data,
        expected_data,
    ):
        exclude_org = None if is_member else self._ORG
        org = self._ORG if is_member else None

        filters = {}

        for key, value in {
            "privilege": privilege,
            "role": role,
            "org": org,
            "exclude_org": exclude_org,
        }.items():
            if value is not None:
                filters[key] = value

        user = find_users(**filters)[0]["username"]
        response = patch_method(user, f"organizations/{self._ORG}", request_data)

        if is_allow:
            assert response.status_code == HTTPStatus.OK
            assert (
                DeepDiff(expected_data, response.json(), exclude_paths="root['updated_date']") == {}
            )
        else:
            assert response.status_code != HTTPStatus.OK

    def _get_org_roles(self) -> dict[str, str]:
        memberships = get_paginated_collection("admin1", "memberships", org_id=self._ORG)
        return {m["user"]["username"]: m["role"] for m in memberships}

    def test_owner_can_transfer_ownership_to_maintainer(self, users_by_name) -> None:
        response = patch_method(
            "user7", f"organizations/{self._ORG}", {"owner_id": users_by_name["user8"]["id"]}
        )

        assert response.status_code == HTTPStatus.OK, response.content
        assert response.json()["owner"]["username"] == "user8"

        roles = self._get_org_roles()
        assert roles["user8"] == "owner"
        assert roles["user7"] == "maintainer"
        assert list(roles.values()).count("owner") == 1

        response = delete_method("user7", f"organizations/{self._ORG}")
        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize(
        "requester, expected_status",
        [
            ("admin1", HTTPStatus.OK),
            ("user4", HTTPStatus.FORBIDDEN),  # maintainer
            ("user2", HTTPStatus.FORBIDDEN),  # supervisor
            ("worker2", HTTPStatus.FORBIDDEN),  # worker
            ("user1", HTTPStatus.FORBIDDEN),  # not a member
        ],
    )
    def test_only_owner_or_admin_can_transfer_ownership(
        self, requester, expected_status, users_by_name
    ) -> None:
        response = patch_method(
            requester, f"organizations/{self._ORG}", {"owner_id": users_by_name["user8"]["id"]}
        )

        assert response.status_code == expected_status, response.content
        if expected_status != HTTPStatus.OK:
            assert self._get_org_roles()["user7"] == "owner"

    @pytest.mark.parametrize(
        "owner_id",
        [
            pytest.param("user2", id="supervisor"),
            pytest.param("worker2", id="worker"),
            pytest.param(None, id="null"),
            pytest.param(100000, id="nonexistent user"),
        ],
    )
    def test_cannot_transfer_ownership_to_invalid_target(self, owner_id, users_by_name) -> None:
        if owner_id in users_by_name:
            owner_id = users_by_name[owner_id]["id"]

        response = patch_method("user7", f"organizations/{self._ORG}", {"owner_id": owner_id})

        assert response.status_code == HTTPStatus.BAD_REQUEST, response.content
        assert self._get_org_roles()["user7"] == "owner"

    @pytest.mark.parametrize(
        "requester, expected_status",
        [("user7", HTTPStatus.FORBIDDEN), ("admin1", HTTPStatus.BAD_REQUEST)],
    )
    def test_cannot_transfer_ownership_to_non_member(
        self, requester, expected_status, users_by_name
    ) -> None:
        response = patch_method(
            requester, f"organizations/{self._ORG}", {"owner_id": users_by_name["user1"]["id"]}
        )

        assert response.status_code == expected_status, response.content

    def test_transfer_to_current_owner_changes_nothing(self, users_by_name) -> None:
        roles_before = self._get_org_roles()

        response = patch_method(
            "user7", f"organizations/{self._ORG}", {"owner_id": users_by_name["user7"]["id"]}
        )

        assert response.status_code == HTTPStatus.OK, response.content
        assert response.json()["owner"]["username"] == "user7"
        assert self._get_org_roles() == roles_before


@pytest.mark.usefixtures("restore_db_per_function")
class TestDeleteOrganizations:
    _ORG = 2

    @pytest.mark.parametrize(
        "privilege, role, is_member, is_allow",
        [
            ("admin", None, None, True),
            (None, "owner", True, True),
            (None, "maintainer", True, False),
            (None, "worker", True, False),
            (None, "supervisor", True, False),
            ("user", None, False, False),
            ("worker", None, False, False),
        ],
    )
    def test_can_delete(
        self,
        privilege: str | None,
        role: str | None,
        is_member: bool | None,
        is_allow: bool,
        find_users,
    ):
        exclude_org = None if is_member else self._ORG
        org = self._ORG if is_member else None

        filters = {}

        for key, value in {
            "privilege": privilege,
            "role": role,
            "org": org,
            "exclude_org": exclude_org,
        }.items():
            if value is not None:
                filters[key] = value

        user = find_users(**filters)[0]["username"]

        response = delete_method(user, f"organizations/{self._ORG}")

        if is_allow:
            assert response.status_code == HTTPStatus.NO_CONTENT
        else:
            assert response.status_code != HTTPStatus.OK
