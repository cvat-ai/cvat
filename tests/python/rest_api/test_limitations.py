from http import HTTPStatus

import pytest

from shared.utils.config import delete_method, get_method, patch_method


@pytest.mark.usefixtures("restore_db_per_function")
class TestUpdateLimitations:
    def test_can_update_org_limitation(self):
        response = get_method("admin1", "limitations", org_id=1)
        assert response.status_code == HTTPStatus.OK
        limitation = response.json()[0]

        data = {"projects": 99}
        response = patch_method("admin1", f"limitations/{limitation['id']}", data)
        assert response.status_code == HTTPStatus.OK

        response = get_method("admin1", "limitations", org_id=1)
        assert response.status_code == HTTPStatus.OK
        limitation = response.json()[0]

        assert all([value == limitation[key] for key, value in data.items()])

    def test_cannot_delete_org_that_has_paid_plan(self):
        org_id = 1

        response = get_method("admin1", "limitations", org_id=org_id)
        assert response.status_code == HTTPStatus.OK
        limitation = response.json()[0]

        data = {"type": "paid", "projects": 99}
        response = patch_method("admin1", f"limitations/{limitation['id']}", data)
        assert response.status_code == HTTPStatus.OK

        response = delete_method("admin1", f"organizations/{org_id}")
        assert response.status_code == HTTPStatus.BAD_REQUEST
