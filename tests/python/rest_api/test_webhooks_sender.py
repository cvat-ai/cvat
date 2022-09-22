import json
from http import HTTPStatus

from deepdiff import DeepDiff

from shared.fixtures.init import _run
from shared.utils.config import get_method, patch_method, post_method
from webhook_receiver.server import PAYLOAD_ENDPOINT, TARGET_PORT

# Webhook functionality testing:
#  - webhook_receiver container receive post request and return responses with the same body
#  - cvat save response body for each delivery
#
# So idea of this testing system is quite simple:
#  1) trigger some webhook
#  2) check that webhook is sent by checking value of response field for the last delivery of this webhook


def webhook_container_id():
    return _run(
        "docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' test_webhook_receiver_1"
    )[0].strip()[1:-1]


def webhook_spec(events, project_id=None, type="organization"):
    # Django URL field doesn't allow to use http://webhook:2020/payload (using alias)
    # So we forced to use ip address of webhook receiver container
    return {
        "target_url": f"http://{webhook_container_id()}:{TARGET_PORT}/{PAYLOAD_ENDPOINT}",
        "content_type": "application/json",
        "enable_ssl": False,
        "events": events,
        "is_active": True,
        "project_id": project_id,
        "type": "project",
    }


@pytest.mark.usefixtures('changedb')
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
            "admin1", "webhooks", webhook_spec(events, project["id"], type="project")
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
