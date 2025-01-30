# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from http import HTTPStatus
from time import sleep, time

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

# https://docs.pytest.org/en/7.1.x/example/markers.html#marking-whole-classes-or-modules
pytestmark = [pytest.mark.with_external_services]


def target_url():
    env_data = {}
    with open(CVAT_ROOT_DIR / "tests/python/webhook_receiver/.env", "r") as f:
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


def get_deliveries(webhook_id, expected_count=1, *, timeout: int = 60):
    start_time = time()

    delivery_response = {}
    while True:
        response = get_method("admin1", f"webhooks/{webhook_id}/deliveries")
        assert response.status_code == HTTPStatus.OK

        deliveries = response.json()
        if deliveries["count"] == expected_count:
            delivery_response = json.loads(deliveries["results"][0]["response"])
            break

        if time() - start_time > timeout:
            raise TimeoutError("Failed to get deliveries within the specified time interval")

        sleep(1)

    return deliveries, delivery_response


@pytest.mark.usefixtures("restore_db_per_function")
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

    def test_webhook_create_and_delete_project_in_organization(self, organizations):
        org_id = list(organizations)[0]["id"]
        events = ["create:project", "delete:project"]

        webhook = create_webhook(events, "organization", org_id=org_id)

        response = post_method("admin1", "projects", {"name": "project_name"}, org_id=org_id)
        assert response.status_code == HTTPStatus.CREATED
        project = response.json()

        deliveries, create_payload = get_deliveries(webhook["id"])

        assert deliveries["count"] == 1

        response = delete_method("admin1", f"projects/{project['id']}", org_id=org_id)
        assert response.status_code == HTTPStatus.NO_CONTENT

        deliveries, delete_payload = get_deliveries(webhook["id"], 2)

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


@pytest.mark.usefixtures("restore_db_per_function")
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
        events_1 = ["create:task", "update:issue"]
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


@pytest.mark.usefixtures("restore_db_per_function")
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

        deliveries, payload = get_deliveries(webhook_id=webhook_id)

        assert deliveries["count"] == 1
        assert payload["before_update"]["assignee"]["id"] == tasks[task_id]["assignee"]["id"]
        assert payload["task"]["assignee"]["id"] == assignee_id

    def test_webhook_create_and_delete_task(self, organizations):
        org_id = list(organizations)[0]["id"]
        events = ["create:task", "delete:task"]

        webhook = create_webhook(events, "organization", org_id=org_id)

        post_data = {"name": "task_name", "labels": [{"name": "label_0"}]}
        response = post_method("admin1", "tasks", post_data, org_id=org_id)
        assert response.status_code == HTTPStatus.CREATED

        task = response.json()

        deliveries, create_payload = get_deliveries(webhook["id"])

        assert deliveries["count"] == 1

        response = delete_method("admin1", f"tasks/{task['id']}", org_id=org_id)
        assert response.status_code == HTTPStatus.NO_CONTENT

        deliveries, delete_payload = get_deliveries(webhook["id"], 2)

        assert deliveries["count"] == 2

        assert create_payload["event"] == "create:task"
        assert delete_payload["event"] == "delete:task"

        # These values cannot be computed if the task has no data
        assert create_payload["task"]["jobs"]["completed"] is None
        assert create_payload["task"]["jobs"]["validation"] is None
        assert task["jobs"]["completed"] == 0
        assert task["jobs"]["validation"] == 0
        assert delete_payload["task"]["jobs"]["completed"] == 0
        assert delete_payload["task"]["jobs"]["validation"] == 0

        assert (
            DeepDiff(
                create_payload["task"],
                task,
                ignore_order=True,
                exclude_paths=["root['updated_date']", "root['jobs']", "root['labels']"],
            )
            == {}
        )
        assert (
            DeepDiff(
                delete_payload["task"],
                task,
                ignore_order=True,
                exclude_paths=["root['updated_date']", "root['jobs']", "root['labels']"],
            )
            == {}
        )


@pytest.mark.usefixtures("restore_db_per_function")
class TestWebhookJobEvents:
    def test_webhook_update_job_assignee(self, jobs, tasks, users):
        job = next(
            (
                job
                for job in jobs
                if job["assignee"] is None and tasks[job["task_id"]]["organization"] is not None
            )
        )

        org_id = tasks[job["task_id"]]["organization"]

        webhook_id = create_webhook(["update:job"], "organization", org_id=org_id)["id"]

        patch_data = {"assignee": list(users)[0]["id"]}
        response = patch_method("admin1", f"jobs/{job['id']}", patch_data, org_id=org_id)
        assert response.status_code == HTTPStatus.OK

        deliveries, payload = get_deliveries(webhook_id)

        assert deliveries["count"] == 1
        assert payload["before_update"]["assignee"] is None
        assert payload["job"]["assignee"]["id"] == patch_data["assignee"]

    def test_webhook_update_job_stage(self, jobs, tasks):
        stages = {"annotation", "validation", "acceptance"}
        job = next((job for job in jobs if tasks[job["task_id"]]["organization"] is not None))

        org_id = tasks[job["task_id"]]["organization"]

        webhook_id = create_webhook(["update:job"], "organization", org_id=org_id)["id"]

        patch_data = {"stage": (stages - {job["stage"]}).pop()}
        response = patch_method("admin1", f"jobs/{job['id']}", patch_data, org_id=org_id)
        assert response.status_code == HTTPStatus.OK

        deliveries, payload = get_deliveries(webhook_id)
        assert deliveries["count"] == 1
        assert payload["before_update"]["stage"] == job["stage"]
        assert payload["job"]["stage"] == patch_data["stage"]

    def test_webhook_update_job_state(self, jobs, tasks):
        states = {"new", "in progress", "rejected", "completed"}
        job = next(
            (
                job
                for job in jobs
                if tasks[job["task_id"]]["organization"] is not None
                and job["state"] == "in progress"
            )
        )

        org_id = tasks[job["task_id"]]["organization"]

        webhook_id = create_webhook(["update:job"], "organization", org_id=org_id)["id"]

        patch_data = {"state": (states - {job["state"]}).pop()}
        response = patch_method("admin1", f"jobs/{job['id']}", patch_data, org_id=org_id)
        assert response.status_code == HTTPStatus.OK

        deliveries, payload = get_deliveries(webhook_id)
        assert deliveries["count"] == 1
        assert payload["before_update"]["state"] == job["state"]
        assert payload["job"]["state"] == patch_data["state"]


@pytest.mark.usefixtures("restore_db_per_function")
class TestWebhookIssueEvents:
    def test_webhook_update_issue_resolved(self, issues, jobs, tasks):
        issue = next(
            (
                issue
                for issue in issues
                if tasks[jobs[issue["job"]]["task_id"]]["organization"] is not None
            )
        )

        org_id = tasks[jobs[issue["job"]]["task_id"]]["organization"]

        webhook_id = create_webhook(["update:issue"], "organization", org_id=org_id)["id"]

        patch_data = {"resolved": not issue["resolved"]}
        response = patch_method("admin1", f"issues/{issue['id']}", patch_data, org_id=org_id)
        assert response.status_code == HTTPStatus.OK

        deliveries, payload = get_deliveries(webhook_id)

        assert deliveries["count"] == 1
        assert payload["before_update"]["resolved"] == issue["resolved"]
        assert payload["issue"]["resolved"] == patch_data["resolved"]

    def test_webhook_update_issue_position(self, issues, jobs, tasks):
        issue = next(
            (
                issue
                for issue in issues
                if tasks[jobs[issue["job"]]["task_id"]]["organization"] is not None
            )
        )

        org_id = tasks[jobs[issue["job"]]["task_id"]]["organization"]

        webhook_id = create_webhook(["update:issue"], "organization", org_id=org_id)["id"]

        patch_data = {"position": [0, 1, 2, 3]}
        response = patch_method("admin1", f"issues/{issue['id']}", patch_data, org_id=org_id)
        assert response.status_code == HTTPStatus.OK

        deliveries, payload = get_deliveries(webhook_id)

        assert deliveries["count"] == 1
        assert payload["before_update"]["position"] == issue["position"]
        assert payload["issue"]["position"] == patch_data["position"]

    def test_webhook_create_and_delete_issue(self, organizations, jobs, tasks):
        org_id = list(organizations)[0]["id"]
        job_id = next(
            (job["id"] for job in jobs if tasks[job["task_id"]]["organization"] == org_id)
        )
        events = ["create:issue", "delete:issue"]

        webhook = create_webhook(events, "organization", org_id=org_id)

        post_data = {"frame": 0, "position": [0, 1, 2, 3], "job": job_id, "message": "issue_msg"}
        response = post_method("admin1", "issues", post_data, org_id=org_id)
        assert response.status_code == HTTPStatus.CREATED

        issue = response.json()

        deliveries, create_payload = get_deliveries(webhook["id"])

        assert deliveries["count"] == 1

        response = delete_method("admin1", f"issues/{issue['id']}", org_id=org_id)
        assert response.status_code == HTTPStatus.NO_CONTENT

        deliveries, delete_payload = get_deliveries(webhook["id"], 2)

        assert deliveries["count"] == 2

        assert create_payload["event"] == "create:issue"
        assert delete_payload["event"] == "delete:issue"
        assert (
            DeepDiff(
                create_payload["issue"],
                issue,
                ignore_order=True,
                exclude_paths=["root['updated_date']", "root['comments']"],
            )
            == {}
        )
        assert (
            DeepDiff(
                delete_payload["issue"],
                issue,
                ignore_order=True,
                exclude_paths=["root['updated_date']", "root['comments']"],
            )
            == {}
        )


@pytest.mark.usefixtures("restore_db_per_function")
class TestWebhookMembershipEvents:
    def test_webhook_update_membership_role(self, memberships):
        roles = {"worker", "supervisor", "maintainer"}

        membership = next(
            (membership for membership in memberships if membership["role"] != "owner")
        )
        org_id = membership["organization"]

        webhook_id = create_webhook(["update:membership"], "organization", org_id=org_id)["id"]

        patch_data = {"role": (roles - {membership["role"]}).pop()}
        response = patch_method(
            "admin1", f"memberships/{membership['id']}", patch_data, org_id=org_id
        )
        assert response.status_code == HTTPStatus.OK

        deliveries, payload = get_deliveries(webhook_id)

        assert deliveries["count"] == 1
        assert payload["before_update"]["role"] == membership["role"]
        assert payload["membership"]["role"] == patch_data["role"]

    def test_webhook_delete_membership(self, memberships):
        membership = next(
            (membership for membership in memberships if membership["role"] != "owner")
        )
        org_id = membership["organization"]

        webhook_id = create_webhook(["delete:membership"], "organization", org_id=org_id)["id"]

        response = delete_method("admin1", f"memberships/{membership['id']}", org_id=org_id)
        assert response.status_code == HTTPStatus.NO_CONTENT

        deliveries, payload = get_deliveries(webhook_id)

        assert deliveries["count"] == 1
        assert (
            DeepDiff(
                payload["membership"],
                membership,
                ignore_order=True,
                exclude_paths=["root['updated_date']", "root['invitation']"],
            )
            == {}
        )


@pytest.mark.usefixtures("restore_db_per_function")
class TestWebhookOrganizationEvents:
    def test_webhook_update_organization_name(self, organizations):
        org_id = list(organizations)[0]["id"]

        webhook_id = create_webhook(["update:organization"], "organization", org_id=org_id)["id"]

        patch_data = {"name": "new_org_name"}
        patch_method("admin1", f"organizations/{org_id}", patch_data, org_id=org_id)

        deliveries, payload = get_deliveries(webhook_id)

        assert deliveries["count"] == 1
        assert payload["before_update"]["name"] == organizations[org_id]["name"]
        assert payload["organization"]["name"] == patch_data["name"]


@pytest.mark.usefixtures("restore_db_per_function")
class TestWebhookCommentEvents:
    def test_webhook_update_comment_message(self, comments, issues, jobs, tasks):
        org_comments = list(
            (comment, tasks[jobs[issues[comment["issue"]]["job"]]["task_id"]]["organization"])
            for comment in comments
        )

        comment, org_id = next(
            ((comment, org_id) for comment, org_id in org_comments if org_id is not None)
        )

        webhook_id = create_webhook(["update:comment"], "organization", org_id=org_id)["id"]

        patch_data = {"message": "new comment message"}
        response = patch_method("admin1", f"comments/{comment['id']}", patch_data, org_id=org_id)
        assert response.status_code == HTTPStatus.OK

        deliveries, payload = get_deliveries(webhook_id)

        assert deliveries["count"] == 1
        assert payload["before_update"]["message"] == comment["message"]

        comment.update(patch_data)
        assert (
            DeepDiff(
                payload["comment"],
                comment,
                ignore_order=True,
                exclude_paths=["root['updated_date']"],
            )
            == {}
        )

    def test_webhook_create_and_delete_comment(self, issues, jobs, tasks):
        issue = next(
            (
                issue
                for issue in issues
                if tasks[jobs[issue["job"]]["task_id"]]["organization"] is not None
            )
        )

        org_id = tasks[jobs[issue["job"]]["task_id"]]["organization"]

        events = ["create:comment", "delete:comment"]
        webhook_id = create_webhook(events, "organization", org_id=org_id)["id"]

        post_data = {"issue": issue["id"], "message": "new comment message"}
        response = post_method("admin1", f"comments", post_data, org_id=org_id)
        assert response.status_code == HTTPStatus.CREATED

        create_deliveries, create_payload = get_deliveries(webhook_id)

        comment_id = response.json()["id"]
        response = delete_method("admin1", f"comments/{comment_id}", org_id=org_id)
        assert response.status_code == HTTPStatus.NO_CONTENT

        delete_deliveries, delete_payload = get_deliveries(webhook_id, 2)

        assert create_deliveries["count"] == 1
        assert delete_deliveries["count"] == 2

        assert create_payload["event"] == "create:comment"
        assert delete_payload["event"] == "delete:comment"

        assert (
            create_payload["comment"]["message"]
            == delete_payload["comment"]["message"]
            == post_data["message"]
        )


@pytest.mark.usefixtures("restore_db_per_class")
class TestGetWebhookDeliveries:
    def test_not_project_staff_cannot_get_webhook(self, projects, users):
        user, project = next(
            (user, project)
            for user in users
            if "user" in user["groups"]
            for project in projects
            if project["owner"]["id"] != user["id"]
        )

        webhook = create_webhook(["create:task"], "project", project_id=project["id"])
        owner = next(user for user in users if user["id"] == project["owner"]["id"])

        response = post_method(owner["username"], f"webhooks/{webhook['id']}/ping", {})
        assert response.status_code == HTTPStatus.OK

        delivery_id = response.json()["id"]

        response = get_method(user["username"], f"webhooks/{webhook['id']}/deliveries")
        assert response.status_code == HTTPStatus.FORBIDDEN

        response = get_method(
            user["username"], f"webhooks/{webhook['id']}/deliveries/{delivery_id}"
        )
        assert response.status_code == HTTPStatus.FORBIDDEN


@pytest.mark.usefixtures("restore_db_per_function")
class TestWebhookPing:
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

    def test_not_project_staff_cannot_ping(self, projects, users):
        user, project = next(
            (user, project)
            for user in users
            if "user" in user["groups"]
            for project in projects
            if project["owner"]["id"] != user["id"]
        )

        webhook = create_webhook(["create:task"], "project", project_id=project["id"])

        response = post_method(user["username"], f"webhooks/{webhook['id']}/ping", {})
        assert response.status_code == HTTPStatus.FORBIDDEN


@pytest.mark.usefixtures("restore_db_per_function")
class TestWebhookRedelivery:
    def test_webhook_redelivery(self, projects):
        project = list(projects)[0]

        webhook_id = create_webhook(["update:project"], "project", project_id=project["id"])["id"]

        patch_data = {"name": "new_project_name"}
        response = patch_method("admin1", f"projects/{project['id']}", patch_data)
        assert response.status_code == HTTPStatus.OK

        deliveries_1, payload_1 = get_deliveries(webhook_id)
        delivery_id = deliveries_1["results"][0]["id"]

        response = post_method(
            "admin1", f"webhooks/{webhook_id}/deliveries/{delivery_id}/redelivery", {}
        )
        assert response.status_code == HTTPStatus.OK

        deliveries_2, payload_2 = get_deliveries(webhook_id, 2)

        assert deliveries_1["count"] == 1
        assert deliveries_2["count"] == 2

        assert deliveries_1["results"][0]["redelivery"] is False
        assert deliveries_2["results"][0]["redelivery"] is True

        project.update(patch_data)
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

    def test_not_project_staff_cannot_redeliver(self, projects, users):
        user, project = next(
            (user, project)
            for user in users
            if "user" in user["groups"]
            for project in projects
            if project["owner"]["id"] != user["id"]
        )

        webhook = create_webhook(["create:task"], "project", project_id=project["id"])
        owner = next(user for user in users if user["id"] == project["owner"]["id"])

        response = post_method(owner["username"], f"webhooks/{webhook['id']}/ping", {})
        assert response.status_code == HTTPStatus.OK

        delivery_id = response.json()["id"]

        response = post_method(
            user["username"], f"webhooks/{webhook['id']}/deliveries/{delivery_id}/redelivery", {}
        )
        assert response.status_code == HTTPStatus.FORBIDDEN
