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
#  - cvat save response body for each delivery
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

def create_webhook(events, webhook_type, project_id=None, org_id=''):
    assert (webhook_type == "project" and project_id is not None) or (webhook_type == "organization" and org_id)

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
class TestWebhookUpdateProject:
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

        deliveries, payload = get_deliveries(webhook['id'])

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

        deliveries, payload = get_deliveries(webhook['id'])

        assert deliveries["count"] == 1

        assert payload["event"] == events[0]
        assert len(payload["before_update"]["labels"]) == 0
        assert len(payload["project"]["labels"]) == 1
        assert payload["project"]["labels"][0]["name"] == patch_data["labels"][0]["name"]
        assert payload["project"]["labels"][0]["color"] == patch_data["labels"][0]["color"]

class TestWebhookCreateDeleteProject:
    def test_create_and_delete_project_event(self, organizations):
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
