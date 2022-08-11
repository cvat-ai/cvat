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

    def test_cannot_create_non_unique_webhook(self):
        response = post_method('admin2', 'webhooks', self.webhook_spec)

        response = post_method('admin2', 'webhooks', self.webhook_spec)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_for_non_existent_project(self, projects):
        webhook_spec = deepcopy(self.webhook_spec)
        webhook_spec['project_id'] = max(a['id'] for a in projects.raw) + 1

        response = post_method('admin2', 'webhooks', webhook_spec)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_for_non_existent_organization(self, organizations):
        webhook_spec = deepcopy(self.webhook_spec)
        webhook_spec['type'] = 'organization'
        webhook_spec['organization_id'] = max(a['id'] for a in organizations.raw) + 1

        response = post_method('admin2', 'webhooks', webhook_spec)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_with_non_supported_type(self):
        webhook_spec = deepcopy(self.webhook_spec)
        webhook_spec['type'] = 'some_type'

        response = post_method('admin2', 'webhooks', webhook_spec)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_with_non_supported_content_type(self):
        webhook_spec = deepcopy(self.webhook_spec)
        webhook_spec['content_type'] = ['application/x-www-form-urlencoded']

        response = post_method('admin2', 'webhooks', webhook_spec)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    @pytest.mark.parametrize('event', ['some_event', 'project_created', 'organization_updated', 'invitation_created'])
    def test_cannot_create_project_webhook_with_non_supported_event_type(self, event):
        webhook_spec = deepcopy(self.webhook_spec)
        webhook_spec['events'] = [event]

        response = post_method('admin2', 'webhooks', webhook_spec)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    @pytest.mark.parametrize('event', ['some_event', 'organization_created'])
    def test_cannot_create_organization_webhook_with_non_supported_event_type(self, event, organizations):
        webhook_spec = deepcopy(self.webhook_spec)
        webhook_spec['type'] = 'organization'
        webhook_spec['organization_id'] = next(iter(organizations))['id']
        webhook_spec['events'] = [event]

        response = post_method('admin2', 'webhooks', webhook_spec)

        assert response.status_code == HTTPStatus.BAD_REQUEST

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
    WID = 1

    def test_can_update_webhook(self, webhooks):
        webhook = deepcopy(webhooks[self.WID])
        patch_data = {
            'target_url': 'http://newexample.com',
            'secret': 'newsecret',
            'events': ['task_created'],
            'is_active': not webhook['is_active'],
            'enable_ssl': not webhook['enable_ssl'],
        }
        webhook.update(patch_data)

        response = patch_method('admin2', f"webhooks/{self.WID}", patch_data)

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

    def test_cannot_update_type_of_webhook(self, projects):
        patch_data = {
            'type': 'project',
            'project_id': next(iter(projects))['id'],
        }

        response = patch_method('admin2', f"webhooks/{self.WID}", patch_data)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_update_organization_of_webhook(self, webhooks, organizations):
        wid = next(webhook['id'] for webhook in webhooks if webhook['type'] == 'organization')
        old_oid = webhooks[wid]['organization']
        new_oid = (set(a['id'] for a in organizations) - {old_oid}).pop()
        patch_data = {
            'organization_id': new_oid,
        }

        response = patch_method('admin2', f"webhooks/{wid}", patch_data)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR




    # + test_cannot_update_type_of_webhook
    # test_cannot_update_organization_of_webhook
    # test_cannot_update_owner_of_webhook
    # test_cannot_update_with_nonexistent_contenttype
    # test_cannot_update_date_fields

