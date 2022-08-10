from shutil import ignore_patterns
import pytest
from copy import deepcopy
from deepdiff import DeepDiff
from http import HTTPStatus
from rest_api.utils.config import get_method, patch_method, post_method

@pytest.mark.usefixtures('changedb')
class TestPostWebhooks:
    webhook_spec = {
        "content_type": "application/json",
        "enable_ssl": False,
        "events": [
            "task_created",
            "task_deleted"
        ],
        "is_active": True,
        "project_id": 1,
        "secret": "secret",
        "target_url": "http://example.com",
        "type": "project",
    }

    def test_can_create_webhook_for_project(self):
        response = post_method('admin2', 'webhooks', self.webhook_spec)

        assert response.status_code == HTTPStatus.CREATED
        assert 'secret' not in response.json()

    # test_cannot_create_non_unique_webhook
    # test_cannot_create_with_nonexistent_project
    # test_cannot_create_with_non_supported_type
    # test_cannot_create_project_webhook_for_empty_project
    # test_cannot_create_with_non_supported_content_type

@pytest.mark.usefixtures('dontchangedb')
class TestGetWebhooks:
    def test_can_get_webhook_by_id(self, webhooks):
        webhook = next(iter(webhooks))
        response = get_method('admin2', f"webhooks/{webhook['id']}")

        assert response.status_code == HTTPStatus.OK
        assert 'secret' not in response.json()
        assert DeepDiff(webhook, response.json(), ignore_order=True) == {}

    def test_can_get_webhooks_list(self, webhooks):
        response = get_method('admin2', 'webhooks')

        assert response.status_code == HTTPStatus.OK
        assert all(['secret' not in webhook for webhook in response.json()['results']])
        assert DeepDiff(webhooks.raw, response.json()['results'], ignore_order=True) == {}

@pytest.mark.usefixtures('changedb')
class TestPatchWebhooks:
    @pytest.mark.parametrize('webhook_id', [1])
    def test_can_update_webhook(self, webhook_id, webhooks):
        webhook = deepcopy(webhooks[webhook_id])
        data = {
            'target_url': 'http://newexample.com',
            'secret': 'newsecret',
            'events': ['task_created'],
            'is_active': not webhook['is_active'],
            'enable_ssl': not webhook['enable_ssl'],
        }
        webhook.update(data)

        response = patch_method(
            'admin2',
            f"webhooks/{webhook_id}",
            data
        )

        assert response.status_code == HTTPStatus.OK
        assert 'secret' not in response.json()
        assert DeepDiff(
            webhook,
            response.json(),
            ignore_order=True,
            exclude_paths=[
                "root['updated_date']",
                "root['secret']"
        ]) == {}

    # test_cannot_update_type_of_webhook
    # test_cannot_update_organization_of_webhook
    # test_cannot_update_owner_of_webhook
    # test_cannot_update_with_nonexistent_contenttype
    # test_cannot_update_date_fields

