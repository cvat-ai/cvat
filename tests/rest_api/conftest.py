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
def memberships():
    with open(osp.join(ASSETS_DIR, 'memberships.json')) as f:
        return json.load(f)['results']

@pytest.fixture(scope='module')
def users_by_name():
    with open(osp.join(ASSETS_DIR, 'users.json')) as f:
        return {data['username']: data for data in json.load(f)['results']}

@pytest.fixture(scope='module')
def members(memberships):
    members = {}
    for membership in memberships:
        org = membership['organization']
        members.setdefault(org, []).append(membership['user']['username'])
    return members

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
