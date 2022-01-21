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
def users_by_group(users):
    data = {}
    for user in users:
        for group in user['groups']:
            data.setdefault(group, []).append(user)
    return data

@pytest.fixture(scope='module')
def memberships_by_org(memberships):
    members = {}
    for membership in memberships:
        org = membership['organization']
        members.setdefault(org, []).append(membership['user']['username'])
    return members

@pytest.fixture(scope='module')
def memberships_by_role(memberships):
    members = {}
    for membership in memberships:
        org = membership['organization']
        members.setdefault(org, []).append(membership['user']['username'])
    return members

@pytest.fixture(scope='module')
def data_by_field(memberships_by_org, memberships_by_role, users_by_group):
    return {
        'privilege': users_by_group,
        'role': memberships_by_role,
        'org': memberships_by_org
    }


@pytest.fixture(scope='module')
def find_user(users_by_group):
    def find(privilege=None):
        if privilege is None:
            return None

        keys = {'username', 'id', 'groups'}
        return [dict(filter(lambda a: a[0] in keys, user))
            for user in users_by_group[privilege]]

    return find

@pytest.fixture(scope='module')
def find_member(data_by_field, memberships):
    def find(**kwargs):
        assert len(kwargs) > 0
        assert any(kwargs)

        candidates = [set(membership['id'] for membership in membeships)
            for key, value in kwargs
            for membeships in data_by_field[key][value]
        ]

        matches = [membership for membership in memberships
            if membership['id'] in set.intersection(*candidates)]

        data = []
        for membership in matches:
            data.append({
                'username': membership['user']['username'],
                'id': membership['user']['user_id'],
                'groups': membership['user']['groups'],
                'membership_id': membership['id'],
                'role': membership['role'],
                'org': membership['organization'],
            })

        return data
    return find



    return user