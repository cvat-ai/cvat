import pytest
from copy import deepcopy
from deepdiff import DeepDiff
from http import HTTPStatus
from rest_api.utils.config import get_method, patch_method, post_method, delete_method

@pytest.mark.usefixtures('changedb')
class TestPostWebhooks:
    webhook_spec = {
        'description': 'webhook description',
        'content_type': 'application/json',
        'enable_ssl': False,
        'events': [
            'task_created',
            'task_deleted'
        ],
        'is_active': True,
        'project_id': 1,
        'secret': 'secret',
        'target_url': 'http://example.com',
        'type': 'project',
    }

    def test_can_create_webhook_for_project(self):
        response = post_method('admin2', 'webhooks', self.webhook_spec)

        assert response.status_code == HTTPStatus.CREATED
        assert 'secret' not in response.json()

    def test_project_owner_can_create_webhook_for_project(self, projects):
        project_owner = projects[self.webhook_spec['project_id']]['owner']['username']
        response = post_method(project_owner, 'webhooks', self.webhook_spec)

        assert response.status_code == HTTPStatus.CREATED
        assert 'secret' not in response.json()

    def test_project_assignee_cannot_create_webhook_for_project(self, projects):
        pytest.skip('Not implemented yet')
        project = next((project for project in projects if project.get('assignee')))
        project_assignee = project['assignee']['username']
        post_data = deepcopy(self.webhook_spec)
        post_data['project_id'] = project['id']

        response = post_method(project_assignee, 'webhooks', self.webhook_spec)

        assert response.status_code == HTTPStatus.CREATED
        assert 'secret' not in response.json()

    def test_can_create_without_unnecessary_fields(self):
        post_data = deepcopy(self.webhook_spec)
        post_data.pop('enable_ssl')
        post_data.pop('content_type')
        post_data.pop('description')
        post_data.pop('is_active')
        post_data.pop('secret')

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.CREATED

    def test_cannot_create_without_target_url(self):
        post_data = deepcopy(self.webhook_spec)
        post_data.pop('target_url')

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_without_events_list(self):
        post_data = deepcopy(self.webhook_spec)
        post_data.pop('events')

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_without_type(self):
        post_data = deepcopy(self.webhook_spec)
        post_data.pop('type')

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_without_organization_id(self):
        post_data = deepcopy(self.webhook_spec)
        post_data['type'] = 'organization'
        post_data.pop('project_id')

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_without_project_id(self):
        post_data = deepcopy(self.webhook_spec)
        post_data.pop('project_id')

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_organization_webhook_when_project_id_is_not_null(self, organizations):
        post_data = deepcopy(self.webhook_spec)
        post_data['type'] = 'organization'
        post_data['organization_id'] = organizations.raw[0]['id']

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_non_unique_webhook(self):
        response = post_method('admin2', 'webhooks', self.webhook_spec)

        response = post_method('admin2', 'webhooks', self.webhook_spec)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_for_non_existent_project(self, projects):
        post_data = deepcopy(self.webhook_spec)
        post_data['project_id'] = max(a['id'] for a in projects.raw) + 1

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_for_non_existent_organization(self, organizations):
        post_data = deepcopy(self.webhook_spec)
        post_data['type'] = 'organization'
        post_data['organization_id'] = max(a['id'] for a in organizations.raw) + 1

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_with_non_supported_type(self):
        post_data = deepcopy(self.webhook_spec)
        post_data['type'] = 'some_type'

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_with_non_supported_content_type(self):
        post_data = deepcopy(self.webhook_spec)
        post_data['content_type'] = ['application/x-www-form-urlencoded']

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    @pytest.mark.parametrize('event', ['some_event', 'project_created', 'organization_updated', 'invitation_created'])
    def test_cannot_create_project_webhook_with_non_supported_event_type(self, event):
        post_data = deepcopy(self.webhook_spec)
        post_data['events'] = [event]

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    @pytest.mark.parametrize('event', ['some_event', 'organization_created'])
    def test_cannot_create_organization_webhook_with_non_supported_event_type(self, event, organizations):
        post_data = deepcopy(self.webhook_spec)
        post_data['type'] = 'organization'
        post_data['organization_id'] = next(iter(organizations))['id']
        post_data['events'] = [event]

        response = post_method('admin2', 'webhooks', post_data)

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

        response = patch_method('admin2', f'webhooks/{self.WID}', patch_data)

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

        response = patch_method('admin2', f'webhooks/{self.WID}', patch_data)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_update_with_nonexistent_contenttype(self):
        patch_data = {
            'content_type': 'application/x-www-form-urlencoded',
        }

        response = patch_method('admin2', f'webhooks/{self.WID}', patch_data)
        assert response.status_code == HTTPStatus.BAD_REQUEST


class TestDeleteWebhooks:
    def test_can_delete_webhook(self, webhooks):
        webhook_id = next(iter(webhooks))['id']

        response = get_method('admin2', f'webhooks/{webhook_id}')
        assert response.status_code == HTTPStatus.OK

        response = delete_method('admin2', f'webhooks/{webhook_id}')
        assert response.status_code == HTTPStatus.NO_CONTENT

        response = get_method('admin2', f'webhooks/{webhook_id}')
        assert response.status_code == HTTPStatus.NOT_FOUND


