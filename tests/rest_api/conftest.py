import pytest
import json
import os.path as osp
from .utils.config import ASSETS_DIR
from subprocess import Popen, PIPE

cvat_db_asset = osp.join(ASSETS_DIR, 'cvat_db.sql')
cvat_data_asset = osp.join(ASSETS_DIR, 'cvat_data.tar.bz2')

@pytest.fixture(scope='session', autouse=True)
def restore_db():
    # TO-DO: handle case when retcode != 0
    def restore():
       p1 = Popen(['cat', osp.join(ASSETS_DIR, 'cvat_db.sql')], stdout=PIPE)
       p2 = Popen('docker exec -i cvat_db psql -q -U root -d cvat'.split(), stdin=p1.stdout, stdout=PIPE)
       p1.stdout.close()
       p2.communicate()[0]

       p3 = Popen(['cat', osp.join(ASSETS_DIR, 'cvat_data.tar.bz2')], stdout=PIPE)
       p4 = Popen(['docker', 'run', '--rm', '-i', '--volumes-from', 'cvat', 'ubuntu',
           'tar', '-xj', '--strip', '3', '-C', '/home/django/data'
       ], stdin=p3.stdout, stdout=PIPE)
       p3.stdout.close()
       p4.communicate()[0]

    restore()
    yield
    restore()

@pytest.fixture(scope='module')
def users():
    with open(osp.join(ASSETS_DIR, 'users.json')) as f:
        return json.load(f)['results']

@pytest.fixture(scope='module')
def organizations():
    with open(osp.join(ASSETS_DIR, 'organizations.json')) as f:
        return json.load(f)

@pytest.fixture(scope='module')
def memberships():
    with open(osp.join(ASSETS_DIR, 'memberships.json')) as f:
        return json.load(f)['results']

@pytest.fixture(scope='module')
def users_by_name(users):
    return {user['username']: user for user in users}

@pytest.fixture(scope='module')
def members(memberships):
    members = {}
    for membership in memberships:
        org = membership['organization']
        members.setdefault(org, []).append(membership['user']['username'])
    return members

@pytest.fixture(scope='module')
def users_by_group(users):
    data = {}
    for user in users:
        for group in user['groups']:
            data.setdefault(group, []).append(user)
    return data

@pytest.fixture(scope='module')
def roles_by_org(memberships):
    data = {}
    for membership in memberships:
        org = membership['organization']
        role = membership['role']
        data.setdefault(org, {}).setdefault(role, []).append({
            'username': membership['user']['username'],
            'id': membership['id']
        })
    return data

@pytest.fixture(scope='module')
def memberships_by_org(memberships):
    members = {}
    for membership in memberships:
        org = membership['organization']
        members.setdefault(org, []).append(membership)
    return members

@pytest.fixture(scope='module')
def memberships_by_role(memberships):
    members = {}
    for membership in memberships:
        role = membership['role']
        members.setdefault(role, []).append(membership)
    return members

@pytest.fixture(scope='module')
def find_users(test_db):
    def find(**kwargs):
        assert len(kwargs) > 0
        assert any(kwargs)

        data = test_db
        kwargs = dict(filter(lambda a: a[1] is not None, kwargs.items()))
        for field, value in kwargs.items():
            if field.startswith('exclude_'):
                field = field.split('_', maxsplit=1)[1]
                exclude_rows = set(v['id'] for v in
                    filter(lambda a: a[field] == value, test_db))
                data = list(filter(lambda a: a['id'] not in exclude_rows, data))
            else:
                data = list(filter(lambda a: a[field] == value, data))

        return data
    return find


@pytest.fixture(scope='module')
def test_db(users, users_by_name, memberships):
    data = []
    fields = ['username', 'id', 'privilege', 'role', 'org', 'membership_id']
    def add_row(**kwargs):
        data.append({field: kwargs.get(field) for field in fields})

    for user in users:
        for group in user['groups']:
            add_row(username=user['username'], id=user['id'], privilege=group)

    for membership in memberships:
        username = membership['user']['username']
        for group in users_by_name[username]['groups']:
            add_row(username=username, role=membership['role'], privilege=group,
                id=membership['user']['id'], org=membership['organization'],
                membership_id=membership['id'])

    return data



