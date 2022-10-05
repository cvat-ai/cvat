# Copyright (C) 2021-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from copy import deepcopy
from http import HTTPStatus

import pytest
from deepdiff import DeepDiff

from shared.utils.config import delete_method, get_method, options_method, patch_method


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


@pytest.mark.usefixtures("dontchangedb")
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


@pytest.mark.usefixtures("changedb")
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


@pytest.mark.usefixtures("changedb")
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
