import pytest
from copy import deepcopy
from deepdiff import DeepDiff
from http import HTTPStatus
from shared.utils.config import get_method, patch_method, post_method, delete_method
from itertools import product

# TO-DO:
# - use find_users
# - use is_admin_user
# - use admin user
# DONE TestPostWebhooks rename proj_webhook on proj_webhook

@pytest.mark.usefixtures('changedb')
class TestPostWebhooks:
    proj_webhook = {
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

    org_webhook = {
        'description': 'webhook description',
        'content_type': 'application/json',
        'enable_ssl': False,
        'events': [
            'task_created',
            'task_deleted'
        ],
        'is_active': True,
        'secret': 'secret',
        'target_url': 'http://example.com',
        'type': 'organization',
    }

    def test_sandbox_admin_can_create_webhook_for_project(self, projects, users):
        admin = next((u for u in users if 'admin' in u['groups']))
        project = [p for p in projects if p['owner']['id'] != admin['id'] and p['organization'] is None][0]

        webhook = deepcopy(self.proj_webhook)
        webhook['project_id'] = project['id']

        response = post_method(admin['username'], 'webhooks', webhook)

        assert response.status_code == HTTPStatus.CREATED
        assert 'secret' not in response.json()

    def test_admin_can_create_webhook_for_org(self, users, organizations, is_org_member):
        admins = [u for u in users if 'admin' in u['groups']]
        username, org_id = next((
            (user['username'], org['id'])
            for user in admins
            for org in organizations
            if not is_org_member(user['id'], org['id'])
        ))

        webhook = deepcopy(self.org_webhook)

        response = post_method(username, 'webhooks', webhook, org_id=org_id)

        assert response.status_code == HTTPStatus.CREATED
        assert 'secret' not in response.json()

    def test_admin_can_create_webhook_for_project_in_org(self, users, projects_by_org,
            organizations, is_org_member):
        admins = [u for u in users if 'admin' in u['groups']]
        not_org_members = [(u, o) for u, o in product(admins, organizations)
            if not is_org_member(u['id'], o['id'])]

        for u, o in not_org_members:
            for p in projects_by_org.get(o['id'], []):
                if p['owner']['id'] != u['id']:
                    username, pid, oid = u['username'], p['id'], o['id']
                    break

        webhook = deepcopy(self.org_webhook)

        response = post_method(username, 'webhooks', webhook, org_id=oid)

        assert response.status_code == HTTPStatus.CREATED
        assert 'secret' not in response.json()


    @pytest.mark.parametrize('privilege', ['user', 'business'])
    def test_sandbox_project_owner_can_create_webhook_for_project(self, privilege, projects, users):
        users = [user for user in users if privilege in user['groups']]
        username, project_id = next((
            (user['username'], project['id'])
            for user in users
            for project in projects
            if project['owner']['id'] == user['id'] and project['organization'] is None
        ))

        webhook = deepcopy(self.proj_webhook)
        webhook['project_id'] = project_id

        response = post_method(username, 'webhooks', webhook)

        assert response.status_code == HTTPStatus.CREATED
        assert 'secret' not in response.json()

    @pytest.mark.parametrize('privilege', ['worker', 'user', 'business'])
    def test_sandbox_project_assignee_cannot_create_webhook_for_project(self, privilege, projects, users):
        users = [u for u in users if privilege in u['groups']]
        projects = [p for p in projects if p['assignee'] is not None]
        username, project_id = next((
            (user['username'], project['id'])
            for user in users
            for project in projects
            if project['assignee']['id'] == user['id'] and project['organization'] is None
        ))


        webhook = deepcopy(self.proj_webhook)
        webhook['project_id'] = project_id

        response = post_method(username, 'webhooks', webhook)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize('role', ['maintainer', 'owner'])
    def test_member_can_create_webhook_for_org(self, role, find_users, organizations):
        username, org_id = next((
            (u['username'], o['id'])
            for o in organizations
            for u in find_users(org=o['id'], role=role, exclude_privilege='admin')
        ))

        webhook = deepcopy(self.org_webhook)

        response = post_method(username, 'webhooks', webhook, org_id=org_id)

        assert response.status_code == HTTPStatus.CREATED
        assert 'secret' not in response.json()

    @pytest.mark.parametrize('role', ['maintainer', 'owner'])
    def test_member_can_create_webhook_for_project(self, role, find_users, organizations,
            projects_by_org, is_project_staff):
        username, oid, pid = next((
            (u['username'], o['id'], p['id'])
            for o in organizations
            for u in find_users(org=o['id'], role=role, exclude_privilege='admin')
            for p in projects_by_org.get(o['id'], [])
            if not is_project_staff(u['id'], p['id'])
        ))

        webhook = deepcopy(self.proj_webhook)
        webhook['project_id'] = pid

        response = post_method(username, 'webhooks', webhook, org_id=oid)

        assert response.status_code == HTTPStatus.CREATED
        assert 'secret' not in response.json()

    @pytest.mark.parametrize('role', ['supervisor', 'worker'])
    def test_member_cannot_create_webhook_for_org(self, role, find_users, organizations):
        username, org_id = next((
            (u['username'], o['id'])
            for o in organizations
            for u in find_users(org=o['id'], role=role, exclude_privilege='admin')
        ))

        webhook = deepcopy(self.org_webhook)

        response = post_method(username, 'webhooks', webhook, org_id=org_id)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize('role', ['supervisor', 'worker'])
    def test_member_cannot_create_webhook_for_project(self, role, find_users, organizations,
            projects_by_org, is_project_staff):
        username, oid, pid = next((
            (u['username'], o['id'], p['id'])
            for o in organizations
            for u in find_users(org=o['id'], role=role, exclude_privilege='admin')
            for p in projects_by_org.get(o['id'], [])
            if not is_project_staff(u['id'], p['id'])
        ))

        webhook = deepcopy(self.proj_webhook)
        webhook['project_id'] = pid

        response = post_method(username, 'webhooks', webhook, org_id=oid)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize('role', ['supervisor'])
    def test_member_project_owner_can_create_webhook_for_project(self, role, find_users, organizations,
            projects_by_org, is_project_staff):
        username, oid, pid = next((
            (u['username'], o['id'], p['id'])
            for o in organizations
            for u in find_users(org=o['id'], role=role, exclude_privilege='admin')
            for p in projects_by_org.get(o['id'], [])
            if p['owner']['id'] == u['id']
        ))

        webhook = deepcopy(self.proj_webhook)
        webhook['project_id'] = pid

        response = post_method(username, 'webhooks', webhook, org_id=oid)

        assert response.status_code == HTTPStatus.CREATED
        assert 'secret' not in response.json()

    def test_non_member_cannot_create_webhook_for_org(self, find_users, organizations,
            is_org_member):
        username, org_id = next((
            (u['username'], o['id'])
            for o in organizations
            for u in find_users(exclude_privilege='admin')
            if not is_org_member(u['id'], o['id'])
        ))

        webhook = deepcopy(self.org_webhook)

        response = post_method(username, 'webhooks', webhook, org_id=org_id)

        assert response.status_code == HTTPStatus.FORBIDDEN


    def test_can_create_without_unnecessary_fields(self):
        post_data = deepcopy(self.proj_webhook)
        post_data.pop('enable_ssl')
        post_data.pop('content_type')
        post_data.pop('description')
        post_data.pop('is_active')
        post_data.pop('secret')

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.CREATED

    def test_cannot_create_without_target_url(self):
        post_data = deepcopy(self.proj_webhook)
        post_data.pop('target_url')

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST


    def test_cannot_create_without_events_list(self):
        post_data = deepcopy(self.proj_webhook)
        post_data.pop('events')

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_without_type(self):
        post_data = deepcopy(self.proj_webhook)
        post_data.pop('type')

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_without_project_id(self):
        post_data = deepcopy(self.proj_webhook)
        post_data.pop('project_id')

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_organization_webhook_when_project_id_is_not_null(self, organizations):
        post_data = deepcopy(self.proj_webhook)
        post_data['type'] = 'organization'
        org_id = organizations.raw[0]['id']

        response = post_method('admin2', 'webhooks', post_data, org_id=org_id)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_non_unique_webhook(self):
        pytest.skip('Not implemeted yet')
        response = post_method('admin2', 'webhooks', self.proj_webhook)

        response = post_method('admin2', 'webhooks', self.proj_webhook)

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    def test_cannot_create_for_non_existent_organization(self, organizations):
        post_data = deepcopy(self.proj_webhook)
        post_data['type'] = 'organization'
        org_id = max(a['id'] for a in organizations.raw) + 1

        response = post_method('admin2', 'webhooks', post_data, org_id=org_id)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_for_non_existent_project(self, projects):
        post_data = deepcopy(self.proj_webhook)
        post_data['project_id'] = max(a['id'] for a in projects.raw) + 1

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST


    def test_cannot_create_with_non_supported_type(self):
        post_data = deepcopy(self.proj_webhook)
        post_data['type'] = 'some_type'

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    def test_cannot_create_with_non_supported_content_type(self):
        post_data = deepcopy(self.proj_webhook)
        post_data['content_type'] = ['application/x-www-form-urlencoded']

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    @pytest.mark.parametrize('event', ['some_event', 'project_created', 'organization_updated', 'invitation_created'])
    def test_cannot_create_project_webhook_with_non_supported_event_type(self, event):
        post_data = deepcopy(self.proj_webhook)
        post_data['events'] = [event]

        response = post_method('admin2', 'webhooks', post_data)

        assert response.status_code == HTTPStatus.BAD_REQUEST

    @pytest.mark.parametrize('event', ['some_event', 'organization_created'])
    def test_cannot_create_organization_webhook_with_non_supported_event_type(self, event, organizations):
        post_data = deepcopy(self.proj_webhook)
        post_data['type'] = 'organization'
        post_data['events'] = [event]
        org_id = next(iter(organizations))['id']

        response = post_method('admin2', 'webhooks', post_data, org_id=org_id)

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

    def test_sandbox_admin_can_update_any_webhook(self, webhooks, find_users):
        username, webhook = next((
            (user['username'], deepcopy(webhook))
            for user in find_users(privilege='admin')
            for webhook in webhooks
            if webhook['owner']['id'] != user['id'] and webhook['organization'] is None
        ))
        patch_data = {
            'target_url': 'http://newexample.com',
            'secret': 'newsecret',
            'events': ['task_created'],
            'is_active': not webhook['is_active'],
            'enable_ssl': not webhook['enable_ssl'],
        }
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data)

        assert response.status_code == HTTPStatus.OK
        assert 'secret' not in response.json()
        assert DeepDiff(webhook, response.json(), ignore_order=True,
            exclude_paths=["root['updated_date']", "root['secret']"]) == {}

    def test_cannot_update_type_of_webhook(self, projects):
        pytest.skip('need to check this test')
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

    @pytest.mark.parametrize('privilege', ['user', 'business'])
    def test_sandbox_user_can_update_webhook(self, privilege, find_users, webhooks):
        username, webhook = next((
            (user['username'], deepcopy(webhook))
            for user in find_users(privilege=privilege)
            for webhook in webhooks
            if webhook['owner']['id'] == user['id']
        ))

        patch_data = {'target_url': 'http://newexample.com'}
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data)

        assert response.status_code == HTTPStatus.OK
        assert 'secret' not in response.json()
        assert DeepDiff(webhook, response.json(), ignore_order=True,
            exclude_paths=["root['updated_date']", "root['secret']"]) == {}


    @pytest.mark.parametrize('privilege', ['worker', 'user', 'business'])
    def test_sandbox_user_cannot_update_webhook(self, privilege, find_users, webhooks):
        username, webhook = next((
            (user['username'], deepcopy(webhook))
            for user in find_users(privilege=privilege)
            for webhook in webhooks
            if webhook['owner']['id'] != user['id']
        ))

        patch_data = {'target_url': 'http://newexample.com'}
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data)

        assert response.status_code == HTTPStatus.FORBIDDEN

    def test_admin_can_update_org_webhook(self, find_users, organizations, webhooks, is_org_member):
        org_webhooks = [w for w in webhooks if w['type'] == 'organization']
        admin, oid, webhook = next((
            (u['username'], o['id'], deepcopy(w))
            for u in find_users(privilege='admin')
            for o in organizations
            for w in org_webhooks
            if w['organization'] == o['id'] and not is_org_member(u['id'], o['id'])
        ))

        patch_data = {'target_url': 'http://newexample.com'}
        webhook.update(patch_data)

        response = patch_method(admin, f"webhooks/{webhook['id']}", patch_data, org_id=oid)

        assert response.status_code == HTTPStatus.OK
        assert 'secret' not in response.json()
        assert DeepDiff(webhook, response.json(), ignore_order=True,
            exclude_paths=["root['updated_date']", "root['secret']"]) == {}

    @pytest.mark.parametrize('role', ['maintainer', 'owner'])
    def test_member_can_update_org_webhook(self, role, find_users, organizations, webhooks):
        org_webhooks = [w for w in webhooks if w['type'] == 'organization']
        username, oid, webhook = next((
            (u['username'], o['id'], deepcopy(w))
            for o in organizations
            for u in find_users(role=role, org=o['id'])
            for w in org_webhooks
            if w['organization'] == o['id']
        ))

        patch_data = {'target_url': 'http://newexample.com'}
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data, org_id=oid)

        assert response.status_code == HTTPStatus.OK
        assert 'secret' not in response.json()
        assert DeepDiff(webhook, response.json(), ignore_order=True,
            exclude_paths=["root['updated_date']", "root['secret']"]) == {}


    @pytest.mark.parametrize('role', ['worker', 'supervisor'])
    def test_member_cannot_update_org_webhook(self, role, find_users, organizations, webhooks):
        org_webhooks = [w for w in webhooks if w['type'] == 'organization']
        username, oid, webhook = next((
            (u['username'], o['id'], deepcopy(w))
            for o in organizations
            for u in find_users(role=role, org=o['id'])
            for w in org_webhooks
            if w['organization'] == o['id']
        ))

        patch_data = {'target_url': 'http://newexample.com'}
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data, org_id=oid)

        assert response.status_code == HTTPStatus.FORBIDDEN

    @pytest.mark.parametrize('role, allow', [
        ('maintainer', True), ('owner', True),
        ('supervisor', False), ('worker', False)
    ])
    def test_member_can_update_any_project_webhook_in_org(self, role, allow, find_users,
            organizations, projects_by_org, webhooks, is_project_staff):
        proj_webhooks = [w for w in webhooks if w['type'] == 'project']
        username, oid, pid, webhook = next((
            (u['username'], o['id'], p['id'], deepcopy(w))
            for o in organizations
            for u in find_users(role=role, org=o['id'])
            for w in proj_webhooks
            for p in projects_by_org.get(o['id'], [])
            if w['project'] == p['id']
                    and w['organization'] == o['id']
                    and not is_project_staff(u['id'], p['id'])
                    and w['owner']['id'] != u['id']
        ))

        patch_data = {'target_url': 'http://newexample.com'}
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data, org_id=oid)

        if not allow:
            assert response.status_code == HTTPStatus.FORBIDDEN
        else:
            assert response.status_code == HTTPStatus.OK
            assert 'secret' not in response.json()
            assert DeepDiff(webhook, response.json(), ignore_order=True,
                exclude_paths=["root['updated_date']", "root['secret']"]) == {}

    @pytest.mark.parametrize('role', ['supervisor'])
    def test_member_can_update_project_webhook_in_org(self, role, find_users,
            organizations, projects_by_org, webhooks):
        proj_webhooks = [w for w in webhooks if w['type'] == 'project']
        username, oid, pid, webhook = next((
            (u['username'], o['id'], p['id'], deepcopy(w))
            for o in organizations
            for u in find_users(role=role, org=o['id'])
            for w in proj_webhooks
            for p in projects_by_org.get(o['id'], [])
            if w['project'] == p['id']
                and w['organization'] == o['id']
                and u['id'] == p['owner']['id']
        ))

        patch_data = {'target_url': 'http://newexample.com'}
        webhook.update(patch_data)

        response = patch_method(username, f"webhooks/{webhook['id']}", patch_data, org_id=oid)

        assert response.status_code == HTTPStatus.OK
        assert 'secret' not in response.json()
        assert DeepDiff(webhook, response.json(), ignore_order=True,
            exclude_paths=["root['updated_date']", "root['secret']"]) == {}



@pytest.mark.usefixtures('changedb')
class TestDeleteWebhooks:
    def test_can_delete_webhook(self, webhooks):
        webhook_id = next(iter(webhooks))['id']

        response = get_method('admin2', f'webhooks/{webhook_id}')
        assert response.status_code == HTTPStatus.OK

        response = delete_method('admin2', f'webhooks/{webhook_id}')
        assert response.status_code == HTTPStatus.NO_CONTENT

        response = get_method('admin2', f'webhooks/{webhook_id}')
        assert response.status_code == HTTPStatus.NOT_FOUND


