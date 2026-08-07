# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from http import HTTPStatus

import pytest

from shared.utils.config import get_method, patch_method


class TestGrowthData:
    INITIAL_PROMPT_STATE = {
        "github_prompt_shown": False,
        "github_prompt_support_clicked": False,
        "github_prompt_enabled": True,
        "promotion_notifications_allowed": True,
    }

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_function, admin_user, find_users):
        self.admin_user = admin_user
        self.user = find_users(privilege="user")[0]
        self.other_user = find_users(privilege="user", exclude_username=self.user["username"])[0]

    @staticmethod
    def _assert_growth_data(growth_data, user, expected_prompt_state):
        assert set(growth_data) == {
            "id",
            "owner",
            "github_prompt_shown",
            "github_prompt_support_clicked",
            "github_prompt_enabled",
            "promotion_notifications_allowed",
        }
        assert isinstance(growth_data["id"], int)
        assert growth_data["owner"]["id"] == user["id"]
        assert growth_data["owner"]["username"] == user["username"]

        assert {
            field: growth_data[field] for field in expected_prompt_state
        } == expected_prompt_state

    def _get_growth_data(self, username, user):
        response = get_method(username, "growth", user_id=user["id"])
        assert response.status_code == HTTPStatus.OK

        data = response.json()
        assert data["count"] == 1
        assert len(data["results"]) == 1

        growth_data = data["results"][0]
        self._assert_growth_data(
            growth_data,
            user,
            self.INITIAL_PROMPT_STATE,
        )
        return growth_data

    def test_list_is_limited_to_current_user(self):
        self._get_growth_data(self.user["username"], self.user)

        response = get_method(self.user["username"], "growth", user_id=self.other_user["id"])
        assert response.status_code == HTTPStatus.OK
        assert response.json()["count"] == 0

        self._get_growth_data(self.admin_user, self.other_user)

    def test_user_can_update_prompt_state(self):
        growth_data = self._get_growth_data(self.user["username"], self.user)
        growth_id = growth_data["id"]

        expected_prompt_state = self.INITIAL_PROMPT_STATE.copy()
        for fields in (
            {"promotion_notifications_allowed": False},
            {"promotion_notifications_allowed": True},
            {"github_prompt_shown": True},
            {"github_prompt_support_clicked": True},
        ):
            response = patch_method(self.user["username"], f"growth/{growth_id}", fields)
            assert response.status_code == HTTPStatus.OK

            expected_prompt_state.update(fields)
            expected_prompt_state["github_prompt_enabled"] = (
                expected_prompt_state["promotion_notifications_allowed"]
                and not expected_prompt_state["github_prompt_shown"]
                and not expected_prompt_state["github_prompt_support_clicked"]
            )
            self._assert_growth_data(response.json(), self.user, expected_prompt_state)

    @pytest.mark.parametrize(
        "field",
        ("github_prompt_shown", "github_prompt_support_clicked"),
    )
    def test_user_cannot_clear_prompt_state(self, field):
        growth_data = self._get_growth_data(self.user["username"], self.user)

        response = patch_method(
            self.user["username"], f"growth/{growth_data['id']}", {field: False}
        )
        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert field in response.json()

    def test_user_cannot_update_another_users_growth_data(self):
        growth_data = self._get_growth_data(self.admin_user, self.other_user)

        response = patch_method(
            self.user["username"],
            f"growth/{growth_data['id']}",
            {"promotion_notifications_allowed": False},
        )
        assert response.status_code == HTTPStatus.FORBIDDEN
