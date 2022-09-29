# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os.path as osp
from http import HTTPStatus

import pytest
from deepdiff import DeepDiff

from shared.fixtures.init import CVAT_ROOT_DIR, _run
from shared.utils.config import delete_method, get_method, patch_method, post_method

# Testing webhook functionality:
#  - webhook_receiver container receive post request and return responses with the same body
#  - CVAT save response body for each delivery
#
# So idea of this testing system is quite simple:
#  1) trigger some webhook
#  2) check that webhook is sent by checking value of `response` field for the last delivery of this webhook


def target_url():
    env_data = {}
    with open(osp.join(CVAT_ROOT_DIR, "tests", "python", "webhook_receiver", ".env"), "r") as f:
        for line in f:
            name, value = tuple(line.strip().split("="))
            env_data[name] = value

    container_id = _run(
        "docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' test_webhook_receiver_1"
    )[0].strip()[1:-1]

    return f'http://{container_id}:{env_data["SERVER_PORT"]}/{env_data["PAYLOAD_ENDPOINT"]}'


def webhook_spec(events, project_id=None, webhook_type="organization"):
    # Django URL field doesn't allow to use http://webhooks:2020/payload (using alias)
    # So we forced to use ip address of webhook receiver container
    return {
        "target_url": target_url(),
        "content_type": "application/json",
        "enable_ssl": False,
        "events": events,
        "is_active": True,
        "project_id": project_id,
        "type": webhook_type,
    }


def create_webhook(events, webhook_type, project_id=None, org_id=""):
    assert (webhook_type == "project" and project_id is not None) or (
        webhook_type == "organization" and org_id
    )

    response = post_method(
        "admin1", "webhooks", webhook_spec(events, project_id, webhook_type), org_id=org_id
    )
    assert response.status_code == HTTPStatus.CREATED

    return response.json()


def get_deliveries(webhook_id):
    response = get_method("admin1", f"webhooks/{webhook_id}/deliveries")
    assert response.status_code == HTTPStatus.OK

    deliveries = response.json()
    last_payload = json.loads(deliveries["results"][0]["response"])

    return deliveries, last_payload


@pytest.mark.usefixtures("changedb")
class TestWebhookProjectEvents:
    def test_webhook_update_project_name(self):
        response = post_method("admin1", "projects", {"name": "project"})
        assert response.status_code == HTTPStatus.CREATED
        project = response.json()

        events = ["update:project"]
        webhook = create_webhook(events, "project", project_id=project["id"])

        patch_data = {"name": "new_project_name"}
        response = patch_method("admin1", f"projects/{project['id']}", patch_data)
        assert response.status_code == HTTPStatus.OK

        response = get_method("admin1", f"webhooks/{webhook['id']}/deliveries")
        assert response.status_code == HTTPStatus.OK

        deliveries, payload = get_deliveries(webhook["id"])

        assert deliveries["count"] == 1

        assert payload["event"] == events[0]
        assert payload["sender"]["username"] == "admin1"
        assert payload["before_update"]["name"] == project["name"]

        project.update(patch_data)
        assert (
            DeepDiff(
                payload["project"],
                project,
                ignore_order=True,
                exclude_paths=["root['updated_date']"],
            )
            == {}
        )

    def test_webhook_update_project_labels(self):
        response = post_method("admin1", "projects", {"name": "project"})
        assert response.status_code == HTTPStatus.CREATED
        project = response.json()

        events = ["update:project"]
        webhook = create_webhook(events, "project", project["id"])

        patch_data = {"labels": [{"name": "label_0", "color": "#aabbcc"}]}
        response = patch_method("admin1", f"projects/{project['id']}", patch_data)
        assert response.status_code == HTTPStatus.OK

        deliveries, payload = get_deliveries(webhook["id"])

        assert deliveries["count"] == 1

        assert payload["event"] == events[0]
        assert len(payload["before_update"]["labels"]) == 0
        assert len(payload["project"]["labels"]) == 1
        assert payload["project"]["labels"][0]["name"] == patch_data["labels"][0]["name"]
        assert payload["project"]["labels"][0]["color"] == patch_data["labels"][0]["color"]

    def test_webhook_create_and_delete_project(self, organizations):
        org_id = list(organizations)[0]["id"]
        events = ["create:project", "delete:project"]

        webhook = create_webhook(events, "organization", org_id=org_id)

        response = post_method(
            "admin1", "projects", {"name": "test_create_project_webhook"}, org_id=org_id
        )
        assert response.status_code == HTTPStatus.CREATED
        project = response.json()

        deliveries, create_payload = get_deliveries(webhook["id"])

        assert deliveries["count"] == 1

        response = delete_method("admin1", f"projects/{project['id']}", org_id=org_id)
        assert response.status_code == HTTPStatus.NO_CONTENT

        deliveries, delete_payload = get_deliveries(webhook["id"])

        assert deliveries["count"] == 2

        assert create_payload["event"] == "create:project"
        assert delete_payload["event"] == "delete:project"
        assert (
            DeepDiff(
                create_payload["project"],
                project,
                ignore_order=True,
                exclude_paths=["root['updated_date']"],
            )
            == {}
        )
        assert (
            DeepDiff(
                delete_payload["project"],
                project,
                ignore_order=True,
                exclude_paths=["root['updated_date']"],
            )
            == {}
        )


@pytest.mark.usefixtures("changedb")
class TestWebhookIntersection:
    # Test case description:
    #     few webhooks are triggered by the same event
    # In this case we need to check that CVAT will sent
    # the right number of payloads to the target url

    def test_project_and_organization_webhooks_intersection(self, organizations):
        org_id = list(organizations)[0]["id"]
        post_data = {"name": "project_name"}

        response = post_method("admin1", "projects", post_data, org_id=org_id)
        assert response.status_code == HTTPStatus.CREATED

        events = ["update:project"]
        project_id = response.json()["id"]
        webhook_id_1 = create_webhook(events, "organization", org_id=org_id)["id"]
        webhook_id_2 = create_webhook(events, "project", project_id=project_id, org_id=org_id)["id"]

        patch_data = {"name": "new_project_name"}
        response = patch_method("admin1", f"projects/{project_id}", patch_data)
        assert response.status_code == HTTPStatus.OK

        deliveries_1, payload_1 = get_deliveries(webhook_id_1)
        deliveries_2, payload_2 = get_deliveries(webhook_id_2)

        assert deliveries_1["count"] == deliveries_2["count"] == 1

        assert payload_1["project"]["name"] == payload_2["project"]["name"] == patch_data["name"]

        assert (
            payload_1["before_update"]["name"]
            == payload_2["before_update"]["name"]
            == post_data["name"]
        )

        assert payload_1["webhook_id"] == webhook_id_1
        assert payload_2["webhook_id"] == webhook_id_2

        assert deliveries_1["results"][0]["webhook_id"] == webhook_id_1
        assert deliveries_2["results"][0]["webhook_id"] == webhook_id_2

    def test_two_project_webhooks_intersection(self):
        post_data = {"name": "project_name"}
        response = post_method("admin1", "projects", post_data)
        assert response.status_code == HTTPStatus.CREATED

        project_id = response.json()["id"]
        events_1 = ["create:task", "update:project"]
        events_2 = ["create:task", "create:issue"]
        webhook_id_1 = create_webhook(events_1, "project", project_id=project_id)["id"]
        webhook_id_2 = create_webhook(events_2, "project", project_id=project_id)["id"]

        post_data = {"name": "project_name", "project_id": project_id}
        response = post_method("admin1", "tasks", post_data)
        assert response.status_code == HTTPStatus.CREATED

        deliveries_1, payload_1 = get_deliveries(webhook_id_1)
        deliveries_2, payload_2 = get_deliveries(webhook_id_2)

        assert deliveries_1["count"] == deliveries_2["count"] == 1

        assert payload_1["event"] == payload_2["event"] == "create:task"
        assert payload_1["task"]["name"] == payload_2["task"]["name"] == post_data["name"]

        assert payload_1["webhook_id"] == webhook_id_1
        assert payload_2["webhook_id"] == webhook_id_2

    def test_two_organization_webhook_intersection(self, organizations):
        org_id = list(organizations)[0]["id"]

        events_1 = ["create:project", "update:membership"]
        events_2 = ["create:project", "update:job"]

        webhook_id_1 = create_webhook(events_1, "organization", org_id=org_id)["id"]
        webhook_id_2 = create_webhook(events_2, "organization", org_id=org_id)["id"]

        post_data = {"name": "project_name"}
        response = post_method("admin1", "projects", post_data, org_id=org_id)
        assert response.status_code == HTTPStatus.CREATED

        project = response.json()

        deliveries_1, payload_1 = get_deliveries(webhook_id_1)
        deliveries_2, payload_2 = get_deliveries(webhook_id_2)

        assert deliveries_1["count"] == deliveries_2["count"] == 1

        assert payload_1["webhook_id"] == webhook_id_1
        assert payload_2["webhook_id"] == webhook_id_2

        assert (
            DeepDiff(
                payload_1["project"],
                project,
                ignore_order=True,
                exclude_paths=["root['updated_date']"],
            )
            == {}
        )
        assert (
            DeepDiff(
                payload_2["project"],
                project,
                ignore_order=True,
                exclude_paths=["root['updated_date']"],
            )
            == {}
        )


@pytest.mark.usefixtures("changedb")
class TestWebhookTaskEvents:
    def test_webhook_update_task_assignee(self, users, tasks):
        task_id, project_id = next(
            (
                (task["id"], task["project_id"])
                for task in tasks
                if task["project_id"] is not None
                and task["organization"] is None
                and task["assignee"] is not None
            )
        )

        assignee_id = next(
            (user["id"] for user in users if user["id"] != tasks[task_id]["assignee"]["id"])
        )

        webhook_id = create_webhook(["update:task"], "project", project_id=project_id)["id"]

        patch_data = {"assignee_id": assignee_id}
        response = patch_method("admin1", f"tasks/{task_id}", patch_data)
        assert response.status_code == HTTPStatus.OK
        print("real assignee id", response.json()["assignee"]["id"])

        deliveries, payload = get_deliveries(webhook_id=webhook_id)

        assert deliveries["count"] == 1
        assert payload["before_update"]["assignee_id"] == tasks[task_id]["assignee"]["id"]
        assert payload["task"]["assignee"]["id"] == assignee_id

    def test_webhook_update_task_label(self, tasks):
        task_id, org_id = next(
            (
                (task["id"], task["organization"])
                for task in tasks
                if task["project_id"] is None and task["organization"] is not None
            )
        )

        webhook_id = create_webhook(["update:task"], "organization", org_id=org_id)["id"]

        patch_data = {"labels": [{"name": "new_label"}]}
        response = patch_method("admin1", f"tasks/{task_id}", patch_data, org_id=org_id)
        assert response.status_code == HTTPStatus.OK

        deliveries, payload = get_deliveries(webhook_id=webhook_id)

        assert deliveries["count"] == 1
        assert (
            len(payload["before_update"]["labels"])
            == len(tasks[task_id]["labels"])
            == len(payload["task"]["labels"]) - 1
        )

    def test_webhook_create_and_delete_task(self):
        pass


@pytest.mark.usefixtures("changedb")
class TestWebhookJobEvents:
    def test_webhook_update_job_assignee(self):
        pass

    def test_webhook_update_job_stage(self):
        pass

    def test_webhook_update_job_state(self):
        pass


@pytest.mark.usefixtures("changedb")
class TestWebhookIssueEvents:
    def test_webhook_create_and_delete_issue(self):
        pass


@pytest.mark.usefixtures("changedb")
class TestPingWebhook:
    def test_ping_webhook(self, projects):
        project_id = list(projects)[0]["id"]

        webhook = create_webhook(["create:task"], "project", project_id=project_id)

        response = post_method("admin1", f"webhooks/{webhook['id']}/ping", {})
        assert response.status_code == HTTPStatus.OK

        deliveries, payload = get_deliveries(webhook["id"])

        assert deliveries["count"] == 1

        assert (
            DeepDiff(
                payload["webhook"],
                webhook,
                ignore_order=True,
                exclude_paths=["root['updated_date']"],
            )
            == {}
        )
