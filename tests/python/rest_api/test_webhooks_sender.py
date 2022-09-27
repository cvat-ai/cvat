# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
import os.path as osp
from http import HTTPStatus

import pytest
from deepdiff import DeepDiff

from shared.fixtures.init import CVAT_ROOT_DIR, _run
from shared.utils.config import get_method, patch_method, post_method

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


@pytest.mark.usefixtures("changedb")
class TestWebhookProjectEvents:
    def test_webhook_project_update(self):
        events = ["update:project"]
        patch_data = {"name": "new_project_name"}

        # create project
        response = post_method("admin1", "projects", {"name": "project"})
        assert response.status_code == HTTPStatus.CREATED
        project = response.json()

        # create webhook
        response = post_method(
            "admin1", "webhooks", webhook_spec(events, project["id"], webhook_type="project")
        )
        assert response.status_code == HTTPStatus.CREATED
        webhook = response.json()

        # update project
        response = patch_method("admin1", f"projects/{project['id']}", patch_data)
        assert response.status_code == HTTPStatus.OK

        # get list of deliveries of webhook
        response = get_method("admin1", f"webhooks/{webhook['id']}/deliveries")
        assert response.status_code == HTTPStatus.OK

        response_data = response.json()

        # check that we sent only one webhook
        assert response_data["count"] == 1

        # check value of payload that CVAT sent
        payload = json.loads(response_data["results"][0]["response"])
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
