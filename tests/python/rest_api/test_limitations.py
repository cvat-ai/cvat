from http import HTTPStatus

import pytest
from deepdiff import DeepDiff

from shared.utils.config import delete_method, get_method, patch_method


@pytest.mark.usefixtures("restore_db_per_function")
class TestOrgLimitations:
    def test_can_update_and_get_org_limitation(self):
        org_id = 1
        data = {"projects": 99, "memberships": None}
        admin = "admin1"
        endpoint = f"organizations/{org_id}/limitations"

        response = get_method(admin, endpoint)
        assert response.status_code == HTTPStatus.OK

        expected_result = response.json()
        expected_result.update(data)

        response = patch_method(admin, endpoint, data)
        assert response.status_code == HTTPStatus.OK

        response = get_method(admin, endpoint)
        assert response.status_code == HTTPStatus.OK

        result = response.json()
        assert DeepDiff(expected_result, result, ignore_order=True) == {}

    def test_cannot_delete_org_that_has_paid_plan(self):
        org_id = 1
        data = {"type": "paid", "projects": 99}
        admin = "admin1"
        endpoint = f"organizations/{org_id}/limitations"

        response = patch_method(admin, endpoint, data)
        assert response.status_code == HTTPStatus.OK

        response = delete_method(admin, f"organizations/{org_id}")
        assert response.status_code == HTTPStatus.BAD_REQUEST

@pytest.mark.usefixtures("restore_db_per_function")
class TestUserLimitations:
    def test_can_update_and_get_user_limitation(self):
        user_id = 1
        data = {"projects": 99, "organizations": None}
        admin = "admin1"
        endpoint = f"users/{user_id}/limitations"

        response = get_method(admin, endpoint)
        assert response.status_code == HTTPStatus.OK

        expected_result = response.json()
        expected_result.update(data)

        response = patch_method(admin, endpoint, data)
        assert response.status_code == HTTPStatus.OK

        response = get_method(admin, endpoint)
        assert response.status_code == HTTPStatus.OK

        result = response.json()
        assert DeepDiff(expected_result, result, ignore_order=True) == {}
