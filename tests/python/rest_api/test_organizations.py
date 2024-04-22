# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022-2023 CVAT.ai Corporation
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
            ("business", None, False),
            ("worker", None, False),
            (None, "owner", True),
            (None, "maintainer", True),
            (None, "worker", True),
            (None, "supervisor", True),
        ],
    )
    def test_can_send_options_request(self, privilege, role, is_member, find_users, organizations):
        exclude_org = None if is_member else self._ORG
        org = self._ORG if is_member else None
        user = find_users(privilege=privilege, role=role, org=org, exclude_org=exclude_org)[0][
            "username"
        ]

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
            ("business", None, False, False),
            ("worker", None, False, False),
            (None, "owner", True, True),
            (None, "maintainer", True, True),
            (None, "worker", True, True),
            (None, "supervisor", True, True),
        ],
    )
    def test_can_see_specific_organization(
        self, privilege, role, is_member, is_allow, find_users, organizations
    ):
        exclude_org = None if is_member else self._ORG
        org = self._ORG if is_member else None
        user = find_users(privilege=privilege, role=role, org=org, exclude_org=exclude_org)[0][
            "username"
        ]

        response = get_method(user, f"organizations/{self._ORG}")
        if is_allow:
            assert response.status_code == HTTPStatus.OK
            assert DeepDiff(organizations[self._ORG], response.json()) == {}
        else:
            assert response.status_code == HTTPStatus.NOT_FOUND

    def test_can_remove_owner_and_fetch_with_sdk(self, admin_user, organizations):
        # test for API schema regressions
        source_org = next(
            org
            for org in organizations
            if org.get("owner") and org["owner"]["username"] != admin_user
        ).copy()

        with make_api_client(admin_user) as api_client:
            api_client.users_api.destroy(source_org["owner"]["id"])

            (_, response) = api_client.organizations_api.retrieve(source_org["id"])
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
        return super().test_can_use_simple_filter_for_object_list(field)


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
            ("business", None, False, False),
            ("worker", None, False, False),
            (None, "owner", True, True),
            (None, "maintainer", True, True),
            (None, "worker", True, False),
            (None, "supervisor", True, False),
        ],
    )
    def test_can_update_specific_organization(
        self, privilege, role, is_member, is_allow, find_users, request_data, expected_data
    ):
        exclude_org = None if is_member else self._ORG
        org = self._ORG if is_member else None
        user = find_users(privilege=privilege, role=role, org=org, exclude_org=exclude_org)[0][
            "username"
        ]

        response = patch_method(user, f"organizations/{self._ORG}", request_data)

        if is_allow:
            assert response.status_code == HTTPStatus.OK
            assert (
                DeepDiff(expected_data, response.json(), exclude_paths="root['updated_date']") == {}
            )
        else:
            assert response.status_code != HTTPStatus.OK


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
            ("business", None, False, False),
            ("worker", None, False, False),
        ],
    )
    def test_can_delete(self, privilege, role, is_member, is_allow, find_users):
        exclude_org = None if is_member else self._ORG
        org = self._ORG if is_member else None
        user = find_users(privilege=privilege, role=role, org=org, exclude_org=exclude_org)[0][
            "username"
        ]

        response = delete_method(user, f"organizations/{self._ORG}")

        if is_allow:
            assert response.status_code == HTTPStatus.NO_CONTENT
        else:
            assert response.status_code != HTTPStatus.OK
