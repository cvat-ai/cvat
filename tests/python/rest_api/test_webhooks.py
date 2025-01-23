# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from copy import deepcopy
from http import HTTPStatus
from itertools import product

import pytest
from cvat_sdk.api_client.api_client import ApiClient, Endpoint
from deepdiff import DeepDiff

from shared.utils.config import delete_method, get_method, patch_method, post_method

from .utils import CollectionSimpleFilterTestBase


@pytest.mark.usefixtures("restore_db_per_function")
class TestPostWebhooks:
    proj_webhook = {
        "description": "webhook description",
        "content_type": "application/json",
        "enable_ssl": False,
        "events": ["create:task", "delete:task"],
        "is_active": True,
        "project_id": 1,
        "secret": "secret",
        "target_url": "http://example.com",
        "type": "project",
    }

    org_webhook = {
        "description": "webhook description",
        "content_type": "application/json",
        "enable_ssl": False,
        "events": ["create:task", "delete:task"],
        "is_active": True,
        "secret": "secret",
        "target_url": "http://example.com",
        "type": "organization",
    }

    def test_sandbox_admin_can_create_webhook_for_project(self, projects, users):
        admin = next((u for u in users if "admin" in u["groups"]))
        project = [
            p for p in projects if p["owner"]["id"] != admin["id"] and p["organization"] is None
        ][0]

        webhook = deepcopy(self.proj_webhook)
        webhook["project_id"] = project["id"]

        response = post_method(admin["username"], "webhooks", webhook)

        assert response.status_code == HTTPStatus.CREATED
        assert "secret" not in response.json()

    def test_admin_can_create_webhook_for_org(self, users, organizations, is_org_member):
        admins = [u for u in users if "admin" in u["groups"]]
        username, org_id = next(
            (
                (user["username"], org["id"])
                for user in admins
                for org in organizations
                if not is_org_member(user["id"], org["id"])
            )
        )

        webhook = deepcopy(self.org_webhook)

        response = post_method(username, "webhooks", webhook, org_id=org_id)

        assert response.status_code == HTTPStatus.CREATED
        assert "secret" not in response.json()

    def test_admin_can_create_webhook_for_project_in_org(
        self, users, projects_by_org, organizations, is_org_member
    ):
        admins = [u for u in users if "admin" in u["groups"]]
        not_org_members = [
            (u, o) for u, o in product(admins, organizations) if not is_org_member(u["id"], o["id"])
        ]

        username, org_id = next(
            (
                (u["username"], o["id"])
                for u, o in not_org_members
                for p in projects_by_org.get(o["id"], [])
                if p["owner"]["id"] != u["id"]
            )
        )

        webhook = deepcopy(self.org_webhook)

        response = post_method(username, "webhooks", webhook, org_id=org_id)

        assert response.status_code == HTTPStatus.CREATED
        assert "secret" not in response.json()

    @pytest.mark.parametrize("privilege", ["user"])
    def test_sandbox_project_owner_can_create_webhook_for_project(self, privilege, projects, users):
        users = [user for user in users if privilege in user["groups"]]
        username, project_id = next(
            (
                (user["username"], project["id"])
                for user in users
                for project in projects
                if project["owner"]["id"] == user["id"] and project["organization"] is None
            )
        )

        webhook = deepcopy(self.proj_webhook)
        webhook["project_id"] = project_id

        response = post_method(username, "webhooks", webhook)

        assert response.status_code == HTTPStatus.CREATED
        assert "secret" not in response.json()

    @pytest.mark.parametrize("privilege", ["worker", "user"])
    def test_sandbox_project_assignee_cannot_create_webhook_for_project(
        self, privilege, projects, users
    ):
        users = [u for u in users if privilege in u["groups"]]
        projects = [p for p in projects if p["assignee"] is not None]
        username, project_id = next(
            (
                (user["username"], project["id"])
                for user in users
                for project in projects
                if project["assignee"]["id"] == user["id"] and project["organization"] is None
            )
        )

        webhook = deepcopy(self.proj_webhook)
        webhook["project_id"] = project_id

        response = post_method(username, "webhooks", webhook)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("role", ["maintainer", "owner"])
    def test_member_can_create_webhook_for_org(self, role, find_users, organizations):
        username, org_id = next(
            (
                (u["username"], o["id"])
                for o in organizations
                for u in find_users(org=o["id"], role=role, exclude_privilege="admin")
            )
        )

        webhook = deepcopy(self.org_webhook)

        response = post_method(username, "webhooks", webhook, org_id=org_id)

        assert response.status_code == HTTPStatus.CREATED
        assert "secret" not in response.json()

    @pytest.mark.parametrize("role", ["maintainer", "owner"])
    def test_member_can_create_webhook_for_project(
        self, role, find_users, organizations, projects_by_org, is_project_staff
    ):
        username, oid, pid = next(
            (
                (u["username"], o["id"], p["id"])
                for o in organizations
                for u in find_users(org=o["id"], role=role, exclude_privilege="admin")
                for p in projects_by_org.get(o["id"], [])
                if not is_project_staff(u["id"], p["id"])
            )
        )

        webhook = deepcopy(self.proj_webhook)
        webhook["project_id"] = pid

        response = post_method(username, "webhooks", webhook, org_id=oid)

        assert response.status_code == HTTPStatus.CREATED
        assert "secret" not in response.json()

    @pytest.mark.parametrize("role", ["supervisor", "worker"])
    def test_member_cannot_create_webhook_for_org(self, role, find_users, organizations):
        username, org_id = next(
            (
                (u["username"], o["id"])
                for o in organizations
                for u in find_users(org=o["id"], role=role, exclude_privilege="admin")
            )
        )

        webhook = deepcopy(self.org_webhook)

        response = post_method(username, "webhooks", webhook, org_id=org_id)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("role", ["supervisor", "worker"])
    def test_member_cannot_create_webhook_for_project(
        self, role, find_users, organizations, projects_by_org, is_project_staff
    ):
        username, oid, pid = next(
            (
                (u["username"], o["id"], p["id"])
                for o in organizations
                for u in find_users(org=o["id"], role=role, exclude_privilege="admin")
                for p in projects_by_org.get(o["id"], [])
                if not is_project_staff(u["id"], p["id"])
            )
        )

        webhook = deepcopy(self.proj_webhook)
        webhook["project_id"] = pid

        response = post_method(username, "webhooks", webhook, org_id=oid)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("role", ["supervisor"])
    def test_member_project_owner_can_create_webhook_for_project(
        self, role, find_users, organizations, projects_by_org, is_project_staff
    ):
        username, oid, pid = next(
            (
                (u["username"], o["id"], p["id"])
                for o in organizations
                for u in find_users(org=o["id"], role=role, exclude_privilege="admin")
                for p in projects_by_org.get(o["id"], [])
                if p["owner"]["id"] == u["id"]
            )
        )

        webhook = deepcopy(self.proj_webhook)
        webhook["project_id"] = pid

        response = post_method(username, "webhooks", webhook, org_id=oid)

        assert response.status_code == HTTPStatus.CREATED
        assert "secret" not in response.json()

    def test_non_member_cannot_create_webhook_for_org(
        self, find_users, organizations, is_org_member
    ):
        username, org_id = next(
            (
                (u["username"], o["id"])
                for o in organizations
                for u in find_users(exclude_privilege="admin")
                if not is_org_member(u["id"], o["id"])
            )
        )

        webhook = deepcopy(self.org_webhook)

        response = post_method(username, "webhooks", webhook, org_id=org_id)

        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_can_create_without_unnecessary_fields(self):
        post_data = deepcopy(self.proj_webhook)
        post_data.pop("enable_ssl")
        post_data.pop("content_type")
        post_data.pop("description")
        post_data.pop("is_active")
        post_data.pop("secret")

        response = post_method("admin2", "webhooks", post_data)

        assert response.status_code == HTTPStatus.CREATED

    def test_can_create_with_mismatching_project_org_fields(self, projects_by_org):
        # In this case we could either fail or ignore invalid query param
        # Currently, the invalid org id will be ignored and the value
        # will be taken from the project.
        post_data = deepcopy(self.proj_webhook)
        org_id = next(iter(projects_by_org))
        project = projects_by_org[org_id][0]
        post_data["project_id"] = project["id"]
        org_id = next(k for k in projects_by_org if k != org_id)

        response = post_method("admin1", "webhooks", post_data, org_id=org_id)

        assert response.status_code == HTTPStatus.CREATED
        assert response.json()["project_id"] == post_data["project_id"]
        assert response.json()["organization"] == project["organization"]

    def test_cannot_create_without_target_url(self):
        post_data = deepcopy(self.proj_webhook)
        post_data.pop("target_url")

        response = post_method("admin2", "webhooks", post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_without_events_list(self):
        post_data = deepcopy(self.proj_webhook)
        post_data.pop("events")

        response = post_method("admin2", "webhooks", post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_without_type(self):
        post_data = deepcopy(self.proj_webhook)
        post_data.pop("type")

        response = post_method("admin2", "webhooks", post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_without_project_id(self):
        post_data = deepcopy(self.proj_webhook)
        post_data.pop("project_id")

        response = post_method("admin2", "webhooks", post_data)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_organization_webhook_when_project_id_is_not_null(self, organizations):
        post_data = deepcopy(self.proj_webhook)
        post_data["type"] = "organization"
        org_id = organizations.raw[0]["id"]

        response = post_method("admin2", "webhooks", post_data, org_id=org_id)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    @pytest.mark.skip("Not implemented yet")
    def test_cannot_create_non_unique_webhook(self):
        response = post_method("admin2", "webhooks", self.proj_webhook)

        response = post_method("admin2", "webhooks", self.proj_webhook)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_for_non_existent_organization(self, organizations):
        post_data = deepcopy(self.proj_webhook)
        post_data["type"] = "organization"
        org_id = max(a["id"] for a in organizations.raw) + 1

        response = post_method("admin2", "webhooks", post_data, org_id=org_id)

        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_cannot_create_for_non_existent_project(self, projects):
        post_data = deepcopy(self.proj_webhook)
        post_data["project_id"] = max(a["id"] for a in projects.raw) + 1

        response = post_method("admin2", "webhooks", post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_with_non_supported_type(self):
        post_data = deepcopy(self.proj_webhook)
        post_data["type"] = "some_type"

        response = post_method("admin2", "webhooks", post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_with_non_supported_content_type(self):
        post_data = deepcopy(self.proj_webhook)
        post_data["content_type"] = ["application/x-www-form-urlencoded"]

        response = post_method("admin2", "webhooks", post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    @pytest.mark.parametrize(
        "event", ["some:event", "create:project", "update:organization", "create:invitation"]
    )
    def test_cannot_create_project_webhook_with_non_supported_event_type(self, event):
        post_data = deepcopy(self.proj_webhook)
        post_data["events"] = [event]

        response = post_method("admin2", "webhooks", post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    @pytest.mark.parametrize("event", ["some:event", "create:organization"])
    def test_cannot_create_organization_webhook_with_non_supported_event_type(
        self, event, organizations
    ):
        post_data = deepcopy(self.proj_webhook)
        post_data["type"] = "organization"
        post_data["events"] = [event]
        org_id = next(iter(organizations))["id"]

        response = post_method("admin2", "webhooks", post_data, org_id=org_id)

        assert response.status_code == HTTPStatus.BAD_REQUEST


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetWebhooks:
    def test_admin_can_get_webhook(self, webhooks, users, projects):
        proj_webhooks = [w for w in webhooks if w["type"] == "project"]
        username, wid = next(
            (
                (user["username"], webhook["id"])
                for user in users
                for webhook in proj_webhooks
                if "admin" in user["groups"]
                and webhook["owner"]["id"] != user["id"]
                and projects[webhook["project_id"]]["owner"]["id"] != user["id"]
            )
        )

        response = get_method(username, f"webhooks/{wid}")

        assert response.status_code == HTTPStatus.OK
        assert "secret" not in response.json()
        assert DeepDiff(webhooks[wid], response.json(), ignore_order=True) == {}

    @pytest.mark.parametrize("privilege", ["user"])
    def test_project_owner_can_get_webhook(self, privilege, webhooks, projects, users):
        proj_webhooks = [w for w in webhooks if w["type"] == "project"]
        username, wid = next(
            (
                (user["username"], webhook["id"])
                for user in users
                for webhook in proj_webhooks
                if privilege in user["groups"]
                and projects[webhook["project_id"]]["owner"]["id"] == user["id"]
            )
        )

        response = get_method(username, f"webhooks/{wid}")

        assert response.status_code == HTTPStatus.OK
        assert "secret" not in response.json()
        assert DeepDiff(webhooks[wid], response.json(), ignore_order=True) == {}

    @pytest.mark.parametrize("privilege", ["user"])
    def test_webhook_owner_can_get_webhook(self, privilege, webhooks, projects, users):
        proj_webhooks = [w for w in webhooks if w["type"] == "project"]
        username, wid = next(
            (
                (user["username"], webhook["id"])
                for user in users
                for webhook in proj_webhooks
                if privilege in user["groups"] and webhook["owner"]["id"] == user["id"]
            )
        )

        response = get_method(username, f"webhooks/{wid}")

        assert response.status_code == HTTPStatus.OK
        assert "secret" not in response.json()
        assert DeepDiff(webhooks[wid], response.json(), ignore_order=True) == {}

    @pytest.mark.parametrize("privilege", ["user"])
    def test_not_project_staff_cannot_get_webhook(self, privilege, webhooks, projects, users):
        proj_webhooks = [w for w in webhooks if w["type"] == "project"]
        username, wid = next(
            (
                (user["username"], webhook["id"])
                for user in users
                for webhook in proj_webhooks
                if privilege in user["groups"]
                and projects[webhook["project_id"]]["owner"]["id"] != user["id"]
                and webhook["owner"]["id"] != user["id"]
            )
        )

        response = get_method(username, f"webhooks/{wid}")

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("role", ["owner", "maintainer"])
    def test_org_staff_can_see_org_webhook(self, role, webhooks, find_users):
        webhook = next((w for w in webhooks if w["type"] == "organization"))
        username = next((u["username"] for u in find_users(role=role, org=webhook["organization"])))

        response = get_method(username, f"webhooks/{webhook['id']}", org_id=webhook["organization"])

        assert response.status_code == HTTPStatus.OK
        assert "secret" not in response.json()
        assert DeepDiff(webhook, response.json(), ignore_order=True) == {}

    @pytest.mark.parametrize("role", ["owner", "maintainer"])
    def test_org_staff_can_see_project_webhook_in_org(self, role, webhooks, find_users, projects):
        proj_webhooks = [
            w for w in webhooks if w["organization"] is not None and w["type"] == "project"
        ]
        username, webhook = next(
            (
                (user["username"], webhook)
                for webhook in proj_webhooks
                for user in find_users(role=role, org=webhook["organization"])
                if projects[webhook["project_id"]]["owner"]["id"] != user["id"]
                and webhook["owner"]["id"] != user["id"]
            )
        )

        response = get_method(username, f"webhooks/{webhook['id']}", org_id=webhook["organization"])

        assert response.status_code == HTTPStatus.OK
        assert "secret" not in response.json()
        assert DeepDiff(webhook, response.json(), ignore_order=True) == {}

    @pytest.mark.parametrize("role", ["worker", "supervisor"])
    def test_member_cannot_get_org_webhook(self, role, webhooks, find_users):
        webhook = next((w for w in webhooks if w["type"] == "organization"))
        username = next((u["username"] for u in find_users(role=role, org=webhook["organization"])))

        response = get_method(username, f"webhooks/{webhook['id']}", org_id=webhook["organization"])

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("role", ["worker", "supervisor"])
    def test_member_cannot_get_project_webhook_in_org(self, role, webhooks, find_users, projects):
        proj_webhooks = [
            w for w in webhooks if w["organization"] is not None and w["type"] == "project"
        ]
        username, webhook = next(
            (
                (user["username"], webhook)
                for webhook in proj_webhooks
                for user in find_users(role=role, org=webhook["organization"])
                if projects[webhook["project_id"]]["owner"]["id"] != user["id"]
                and webhook["owner"]["id"] != user["id"]
            )
        )

        response = get_method(username, f"webhooks/{webhook['id']}", org_id=webhook["organization"])

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("role", ["supervisor"])
    def test_member_can_get_project_webhook_in_org(self, role, webhooks, find_users, projects):
        proj_webhooks = [
            w for w in webhooks if w["organization"] is not None and w["type"] == "project"
        ]
        username, webhook = next(
            (
                (user["username"], webhook)
                for webhook in proj_webhooks
                for user in find_users(role=role, org=webhook["organization"])
                if projects[webhook["project_id"]]["owner"]["id"] == user["id"]
                or webhook["owner"]["id"] == user["id"]
            )
        )

        response = get_method(username, f"webhooks/{webhook['id']}", org_id=webhook["organization"])

        assert response.status_code == HTTPStatus.OK
        assert "secret" not in response.json()
        assert DeepDiff(webhook, response.json(), ignore_order=True) == {}


class TestWebhooksListFilters(CollectionSimpleFilterTestBase):
    field_lookups = {
        "owner": ["owner", "username"],
    }

    @pytest.fixture(autouse=True)
    def setup(self, restore_db_per_class, admin_user, webhooks):
        self.user = admin_user
        self.samples = webhooks

    def _get_endpoint(self, api_client: ApiClient) -> Endpoint:
        return api_client.webhooks_api.list_endpoint

    @pytest.mark.parametrize(
        "field",
        ("target_url", "owner", "type", "project_id"),
    )
    def test_can_use_simple_filter_for_object_list(self, field):
        return super()._test_can_use_simple_filter_for_object_list(field)


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetListWebhooks:
    def test_can_get_webhooks_list(self, webhooks):
        response = get_method("admin2", "webhooks")

        assert response.status_code == HTTPStatus.OK
        assert all(["secret" not in webhook for webhook in response.json()["results"]])
        assert DeepDiff(webhooks.raw, response.json()["results"], ignore_order=True) == {}

    def test_admin_can_get_webhooks_for_project(self, webhooks):
        pid = next(
            (
                webhook["project_id"]
                for webhook in webhooks
                if webhook["type"] == "project" and webhook["organization"] is None
            )
        )

        expected_response = [
            webhook
            for webhook in webhooks
            if webhook["type"] == "project" and webhook["project_id"] == pid
        ]
        filter_val = '{"and":[{"==":[{"var":"project_id"},%s]}]}' % pid

        response = get_method("admin2", "webhooks", filter=filter_val)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(expected_response, response.json()["results"], ignore_order=True) == {}

    def test_admin_can_get_webhooks_for_organization(self, webhooks):
        org_id = next(
            (webhook["organization"] for webhook in webhooks if webhook["organization"] is not None)
        )

        expected_response = [webhook for webhook in webhooks if webhook["organization"] == org_id]

        response = get_method("admin2", "webhooks", org_id=org_id)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(expected_response, response.json()["results"], ignore_order=True) == {}

    def test_admin_can_get_webhooks_for_project_in_org(self, webhooks):
        pid, oid = next(
            (
                (webhook["project_id"], webhook["organization"])
                for webhook in webhooks
                if webhook["type"] == "project" and webhook["organization"] is not None
            )
        )

        expected_response = [
            webhook
            for webhook in webhooks
            if webhook["project_id"] == pid and webhook["organization"] == oid
        ]
        filter_val = '{"and":[{"==":[{"var":"project_id"},%s]}]}' % pid

        response = get_method("admin2", "webhooks", org_id=oid, filter=filter_val)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(expected_response, response.json()["results"], ignore_order=True) == {}

    @pytest.mark.parametrize("privilege", ["user"])
    def test_user_cannot_get_webhook_list_for_project(
        self, privilege, find_users, webhooks, projects
    ):
        username, pid = next(
            (
                (user["username"], webhook["project_id"])
                for user in find_users(privilege=privilege)
                for webhook in webhooks
                if webhook["type"] == "project"
                and webhook["organization"] is None
                and webhook["owner"]["id"] != user["id"]
                and projects[webhook["project_id"]]["owner"]["id"] != user["id"]
            )
        )

        filter_val = '{"and":[{"==":[{"var":"project_id"},%s]}]}' % pid

        response = get_method(username, "webhooks", filter=filter_val)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff([], response.json()["results"], ignore_order=True) == {}

    @pytest.mark.parametrize("privilege", ["user"])
    def test_user_can_get_webhook_list_for_project(self, privilege, find_users, webhooks, projects):
        username, pid = next(
            (
                (user["username"], webhook["project_id"])
                for user in find_users(privilege=privilege)
                for webhook in webhooks
                if webhook["type"] == "project"
                and webhook["organization"] is None
                and projects[webhook["project_id"]]["owner"]["id"] == user["id"]
            )
        )

        expected_response = [
            w for w in webhooks if w["type"] == "project" and w["project_id"] == pid
        ]
        filter_val = '{"and":[{"==":[{"var":"project_id"},%s]}]}' % pid

        response = get_method(username, "webhooks", filter=filter_val)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(expected_response, response.json()["results"], ignore_order=True) == {}

    def test_non_member_cannot_see_webhook_list_for_org(self, webhooks, users, is_org_member):
        username, org_id = next(
            (
                (user["username"], webhook["organization"])
                for webhook in webhooks
                for user in users
                if webhook["organization"] is not None
                and not is_org_member(user["id"], webhook["organization"])
                and "admin" not in user["groups"]
            )
        )

        response = get_method(username, "webhooks", org_id=org_id)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize("role", ["maintainer", "owner"])
    def test_org_staff_can_see_all_org_webhooks(self, role, webhooks, organizations, find_users):
        username, org_id = next(
            (
                (user["username"], org["id"])
                for webhook in webhooks
                for org in organizations
                for user in find_users(role=role, org=org["id"])
                if webhook["organization"] == org["id"]
            )
        )

        expected_response = [webhook for webhook in webhooks if webhook["organization"] == org_id]

        response = get_method(username, "webhooks", org_id=org_id)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(expected_response, response.json()["results"], ignore_order=True) == {}

    @pytest.mark.parametrize("role", ["worker", "supervisor"])
    def test_member_cannot_see_all_org_webhook(
        self, role, webhooks, organizations, find_users, projects
    ):
        username, org_id = next(
            (
                (user["username"], org["id"])
                for webhook in webhooks
                for org in organizations
                for user in find_users(role=role, org=org["id"])
                if webhook["organization"] == org["id"]
            )
        )

        expected_response = [
            webhook
            for webhook in webhooks
            if webhook["organization"] == org_id
            and (
                webhook["owner"]["username"] == username
                or (
                    webhook["project_id"]
                    and projects[webhook["project_id"]]["owner"]["username"] == username
                )
            )
        ]

        response = get_method(username, "webhooks", org_id=org_id)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(expected_response, response.json()["results"], ignore_order=True) == {}

    @pytest.mark.parametrize("role", ["supervisor"])
    def test_member_can_see_list_of_project_webhooks_in_org(
        self, role, webhooks, organizations, find_users, projects
    ):
        username, org_id = next(
            (
                (user["username"], org["id"])
                for webhook in webhooks
                for org in organizations
                for user in find_users(role=role, org=org["id"])
                if webhook["organization"] == org["id"]
                and webhook["type"] == "project"
                and projects[webhook["project_id"]]["owner"]["id"] == user["id"]
            )
        )

        expected_response = [
            webhook
            for webhook in webhooks
            if webhook["organization"] == org_id
            and webhook["type"] == "project"
            and projects[webhook["project_id"]]["owner"]["username"] == username
        ]

        response = get_method(username, "webhooks", org_id=org_id)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(expected_response, response.json()["results"], ignore_order=True) == {}

    @pytest.mark.parametrize("field_value, query_value", [(1, 1), (None, "")])
    def test_can_filter_by_org_id(self, field_value, query_value, webhooks):
        webhooks = filter(lambda w: w["organization"] == field_value, webhooks)
        response = get_method("admin2", f"webhooks", org_id=query_value)

        assert response.status_code == HTTPStatus.OK
        assert DeepDiff(list(webhooks), response.json()["results"], ignore_order=True) == {}


@pytest.mark.usefixtures("restore_db_per_function")
class TestPatchWebhooks:
    WID = 2

    def test_sandbox_admin_can_update_any_webhook(self, webhooks, find_users):
        username, webhook = next(
            (
                (user["username"], deepcopy(webhook))
                for user in find_users(privilege="admin")
                for webhook in webhooks
                if webhook["owner"]["id"] != user["id"] and webhook["organization"] is None
            )
        )
        patch_data = {
            "target_url": "http://newexample.com",
            "secret": "newsecret",
            "events": ["create:task"],
            "is_active": not webhook["is_active"],
            "enable_ssl": not webhook["enable_ssl"],
        }
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data)

        assert response.status_code == HTTPStatus.OK
        assert "secret" not in response.json()
        assert (
            DeepDiff(
                webhook,
                response.json(),
                ignore_order=True,
                exclude_paths=["root['updated_date']", "root['secret']"],
            )
            == {}
        )

    def test_cannot_update_with_nonexistent_contenttype(self):
        patch_data = {"content_type": "application/x-www-form-urlencoded"}

        response = patch_method("admin2", f"webhooks/{self.WID}", patch_data)
        assert response.status_code == HTTPStatus.BAD_REQUEST

    @pytest.mark.parametrize("privilege", ["user"])
    def test_sandbox_user_can_update_webhook(self, privilege, find_users, webhooks):
        username, webhook = next(
            (
                (user["username"], deepcopy(webhook))
                for user in find_users(privilege=privilege)
                for webhook in webhooks
                if webhook["owner"]["id"] == user["id"]
            )
        )

        patch_data = {"target_url": "http://newexample.com"}
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data)

        assert response.status_code == HTTPStatus.OK
        assert "secret" not in response.json()
        assert (
            DeepDiff(
                webhook,
                response.json(),
                ignore_order=True,
                exclude_paths=["root['updated_date']", "root['secret']"],
            )
            == {}
        )

    @pytest.mark.parametrize("privilege", ["worker", "user"])
    def test_sandbox_user_cannot_update_webhook(self, privilege, find_users, webhooks):
        username, webhook = next(
            (
                (user["username"], deepcopy(webhook))
                for user in find_users(privilege=privilege)
                for webhook in webhooks
                if webhook["owner"]["id"] != user["id"]
            )
        )

        patch_data = {"target_url": "http://newexample.com"}
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data)

        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_admin_can_update_org_webhook(self, find_users, organizations, webhooks, is_org_member):
        org_webhooks = [w for w in webhooks if w["type"] == "organization"]
        admin, oid, webhook = next(
            (
                (u["username"], o["id"], deepcopy(w))
                for u in find_users(privilege="admin")
                for o in organizations
                for w in org_webhooks
                if w["organization"] == o["id"] and not is_org_member(u["id"], o["id"])
            )
        )

        patch_data = {"target_url": "http://newexample.com"}
        webhook.update(patch_data)

        response = patch_method(admin, f"webhooks/{webhook['id']}", patch_data, org_id=oid)

        assert response.status_code == HTTPStatus.OK
        assert "secret" not in response.json()
        assert (
            DeepDiff(
                webhook,
                response.json(),
                ignore_order=True,
                exclude_paths=["root['updated_date']", "root['secret']"],
            )
            == {}
        )

    @pytest.mark.parametrize("role", ["maintainer", "owner"])
    def test_member_can_update_org_webhook(self, role, find_users, organizations, webhooks):
        org_webhooks = [w for w in webhooks if w["type"] == "organization"]
        username, oid, webhook = next(
            (
                (u["username"], o["id"], deepcopy(w))
                for o in organizations
                for u in find_users(role=role, org=o["id"])
                for w in org_webhooks
                if w["organization"] == o["id"]
            )
        )

        patch_data = {"target_url": "http://newexample.com"}
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data, org_id=oid)

        assert response.status_code == HTTPStatus.OK
        assert "secret" not in response.json()
        assert (
            DeepDiff(
                webhook,
                response.json(),
                ignore_order=True,
                exclude_paths=["root['updated_date']", "root['secret']"],
            )
            == {}
        )

    @pytest.mark.parametrize("role", ["worker", "supervisor"])
    def test_member_cannot_update_org_webhook(self, role, find_users, organizations, webhooks):
        org_webhooks = [w for w in webhooks if w["type"] == "organization"]
        username, oid, webhook = next(
            (
                (u["username"], o["id"], deepcopy(w))
                for o in organizations
                for u in find_users(role=role, org=o["id"])
                for w in org_webhooks
                if w["organization"] == o["id"]
            )
        )

        patch_data = {"target_url": "http://newexample.com"}
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data, org_id=oid)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize(
        "role, allow",
        [("maintainer", True), ("owner", True), ("supervisor", False), ("worker", False)],
    )
    def test_member_can_update_any_project_webhook_in_org(
        self, role, allow, find_users, organizations, projects_by_org, webhooks, is_project_staff
    ):
        proj_webhooks = [w for w in webhooks if w["type"] == "project"]
        username, org_id, webhook = next(
            (
                (u["username"], o["id"], deepcopy(w))
                for o in organizations
                for u in find_users(role=role, org=o["id"])
                for w in proj_webhooks
                for p in projects_by_org.get(o["id"], [])
                if w["project_id"] == p["id"]
                and w["organization"] == o["id"]
                and not is_project_staff(u["id"], p["id"])
                and w["owner"]["id"] != u["id"]
            )
        )

        patch_data = {"target_url": "http://newexample.com"}
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data, org_id=org_id)

        if not allow:
            assert response.status_code == HTTPStatus.FORBIDDEN
        else:
            assert response.status_code == HTTPStatus.OK
            assert "secret" not in response.json()
            assert (
                DeepDiff(
                    webhook,
                    response.json(),
                    ignore_order=True,
                    exclude_paths=["root['updated_date']", "root['secret']"],
                )
                == {}
            )

    @pytest.mark.parametrize("role", ["supervisor"])
    def test_member_can_update_project_webhook_in_org(
        self, role, find_users, organizations, projects_by_org, webhooks
    ):
        proj_webhooks = [w for w in webhooks if w["type"] == "project"]
        username, org_id, webhook = next(
            (
                (u["username"], o["id"], deepcopy(w))
                for o in organizations
                for u in find_users(role=role, org=o["id"])
                for w in proj_webhooks
                for p in projects_by_org.get(o["id"], [])
                if w["project_id"] == p["id"]
                and w["organization"] == o["id"]
                and u["id"] == p["owner"]["id"]
            )
        )

        patch_data = {"target_url": "http://newexample.com"}
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data, org_id=org_id)

        assert response.status_code == HTTPStatus.OK
        assert "secret" not in response.json()
        assert (
            DeepDiff(
                webhook,
                response.json(),
                ignore_order=True,
                exclude_paths=["root['updated_date']", "root['secret']"],
            )
            == {}
        )


@pytest.mark.usefixtures("restore_db_per_function")
class TestDeleteWebhooks:
    @pytest.mark.parametrize("privilege, allow", [("user", False), ("admin", True)])
    def test_user_can_delete_project_webhook(
        self, privilege, allow, find_users, webhooks, projects
    ):
        users = find_users(privilege=privilege)
        username, webhook_id = next(
            (
                (user["username"], webhook["id"])
                for webhook in webhooks
                for user in users
                if webhook["type"] == "project"
                and webhook["organization"] is None
                and webhook["owner"]["id"] != user["id"]
                and projects[webhook["project_id"]]["owner"]["id"] != user["id"]
            )
        )

        if not allow:
            response = delete_method(username, f"webhooks/{webhook_id}")
            assert response.status_code == HTTPStatus.FORBIDDEN
        else:
            response = delete_method(username, f"webhooks/{webhook_id}")
            assert response.status_code == HTTPStatus.NO_CONTENT

            response = get_method(username, f"webhooks/{webhook_id}")
            assert response.status_code == HTTPStatus.NOT_FOUND

    def test_admin_can_delete_project_webhook_in_org(
        self, find_users, webhooks, projects, is_org_member
    ):
        admins = find_users(privilege="admin")
        username, webhook_id = next(
            (
                (user["username"], webhook["id"])
                for user in admins
                for webhook in webhooks
                if webhook["type"] == "project"
                and webhook["organization"] is not None
                and webhook["owner"]["id"] != user["id"]
                and projects[webhook["project_id"]]["owner"]["id"] != user["id"]
                and not is_org_member(user["id"], webhook["organization"])
            )
        )

        response = delete_method(username, f"webhooks/{webhook_id}")
        assert response.status_code == HTTPStatus.NO_CONTENT

        response = get_method(username, f"webhooks/{webhook_id}")
        assert response.status_code == HTTPStatus.NOT_FOUND

    def test_admin_can_delete_org_webhook(self, find_users, webhooks, is_org_member):
        admins = find_users(privilege="admin")
        username, webhook_id = next(
            (
                (user["username"], webhook["id"])
                for user in admins
                for webhook in webhooks
                if webhook["type"] == "organization"
                and webhook["organization"] is not None
                and webhook["owner"]["id"] != user["id"]
                and not is_org_member(user["id"], webhook["organization"])
            )
        )

        response = delete_method(username, f"webhooks/{webhook_id}")
        assert response.status_code == HTTPStatus.NO_CONTENT

        response = get_method(username, f"webhooks/{webhook_id}")
        assert response.status_code == HTTPStatus.NOT_FOUND

    @pytest.mark.parametrize("privilege", ["user"])
    def test_project_owner_can_delete_project_webhook(
        self, privilege, find_users, webhooks, projects
    ):
        users = find_users(privilege=privilege)
        username, webhook_id = next(
            (
                (user["username"], webhook["id"])
                for user in users
                for webhook in webhooks
                if webhook["type"] == "project"
                and webhook["organization"] is None
                and projects[webhook["project_id"]]["owner"]["id"] == user["id"]
            )
        )

        response = delete_method(username, f"webhooks/{webhook_id}")
        assert response.status_code == HTTPStatus.NO_CONTENT

        response = get_method(username, f"webhooks/{webhook_id}")
        assert response.status_code == HTTPStatus.NOT_FOUND

    @pytest.mark.parametrize("privilege", ["user"])
    def test_webhook_owner_can_delete_project_webhook(
        self, privilege, find_users, webhooks, projects
    ):
        users = find_users(privilege=privilege)
        username, webhook_id = next(
            (
                (user["username"], webhook["id"])
                for user in users
                for webhook in webhooks
                if webhook["type"] == "project"
                and webhook["organization"] is None
                and webhook["owner"]["id"] == user["id"]
            )
        )

        response = delete_method(username, f"webhooks/{webhook_id}")
        assert response.status_code == HTTPStatus.NO_CONTENT

        response = get_method(username, f"webhooks/{webhook_id}")
        assert response.status_code == HTTPStatus.NOT_FOUND

    @pytest.mark.parametrize(
        "role, allow",
        [("owner", True), ("maintainer", True), ("worker", False), ("supervisor", False)],
    )
    def test_member_can_delete_org_webhook(self, role, allow, find_users, organizations, webhooks):
        org_webhooks = [w for w in webhooks if w["type"] == "organization"]
        username, org_id, webhook_id = next(
            (
                (user["username"], org["id"], webhook["id"])
                for org in organizations
                for webhook in org_webhooks
                for user in find_users(role=role, org=org["id"])
                if webhook["organization"] == org["id"]
            )
        )

        if not allow:
            response = delete_method(username, f"webhooks/{webhook_id}", org_id=org_id)
            assert response.status_code == HTTPStatus.FORBIDDEN
        else:
            response = delete_method(username, f"webhooks/{webhook_id}", org_id=org_id)
            assert response.status_code == HTTPStatus.NO_CONTENT

            response = get_method(username, f"webhooks/{webhook_id}", org_id=org_id)
            assert response.status_code == HTTPStatus.NOT_FOUND

    @pytest.mark.parametrize(
        "role, allow",
        [("owner", True), ("maintainer", True), ("worker", False), ("supervisor", False)],
    )
    def test_member_can_delete_project_webhook_in_org(
        self, role, allow, find_users, organizations, projects, webhooks
    ):
        proj_webhooks = [w for w in webhooks if w["type"] == "project"]
        username, org_id, webhook_id = next(
            (
                (user["username"], webhook["organization"], webhook["id"])
                for org in organizations
                for user in find_users(role=role, org=org["id"])
                for webhook in proj_webhooks
                if webhook["organization"]
                and webhook["organization"] == org["id"]
                and projects[webhook["project_id"]]["owner"]["id"] != user["id"]
                and webhook["owner"]["id"] != user["id"]
            )
        )

        if not allow:
            response = delete_method(username, f"webhooks/{webhook_id}", org_id=org_id)
            assert response.status_code == HTTPStatus.FORBIDDEN
        else:
            response = delete_method(username, f"webhooks/{webhook_id}", org_id=org_id)
            assert response.status_code == HTTPStatus.NO_CONTENT

            response = get_method(username, f"webhooks/{webhook_id}", org_id=org_id)
            assert response.status_code == HTTPStatus.NOT_FOUND

    @pytest.mark.parametrize("role", ["supervisor"])
    def test_member_webhook_staff_can_delete_project_webhook_in_org(
        self, role, find_users, organizations, projects, webhooks
    ):
        proj_webhooks = [w for w in webhooks if w["type"] == "project"]
        username, org_id, webhook_id = next(
            (
                (user["username"], webhook["organization"], webhook["id"])
                for org in organizations
                for user in find_users(role=role, org=org["id"])
                for webhook in proj_webhooks
                if webhook["organization"]
                and webhook["organization"] == org["id"]
                and (
                    projects[webhook["project_id"]]["owner"]["id"] == user["id"]
                    or webhook["owner"]["id"] == user["id"]
                )
            )
        )

        response = delete_method(username, f"webhooks/{webhook_id}", org_id=org_id)
        assert response.status_code == HTTPStatus.NO_CONTENT

        response = get_method(username, f"webhooks/{webhook_id}", org_id=org_id)
        assert response.status_code == HTTPStatus.NOT_FOUND
