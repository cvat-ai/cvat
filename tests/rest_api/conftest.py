import pytest
import json
import os.path as osp
from .utils.config import ASSETS_DIR
import time
import docker

cvat_db_asset = osp.join(ASSETS_DIR, 'cvat_db.sql')
cvat_data_asset = osp.join(ASSETS_DIR, 'cvat_data.tar.bz2')

@pytest.fixture(scope='session')
def docker_client():
    yield docker.from_env()

@pytest.fixture(scope='session')
def cvat_db_container(docker_client):
    yield docker_client.containers.get('cvat_db')

@pytest.fixture(scope='session', autouse=True)
def restore_volumes(docker_client):
    start = time.time()
    docker_client.containers.run('ubuntu',
        'tar -xj --strip 3 -C /home/django/data -f /mnt/cvat_data.tar.bz2',
        remove=True,
        volumes_from=['cvat'],
        mounts=[docker.types.Mount('/mnt/', ASSETS_DIR, type='bind')],
    )
    print('Restore volumes', time.time() - start)

@pytest.fixture(scope='session', autouse=True)
def put_archive(cvat_db_container):
    start = time.time()
    with open(osp.join(ASSETS_DIR, 'cvat_db.tar'), 'rb') as f:
        cvat_db_container.put_archive('/', f)

    cvat_db_container.exec_run('pg_restore -c -U root -d cvat -1 /cvat_db/cvat_db.dump')
    cvat_db_container.exec_run('psql -U root -d postgres -c "CREATE DATABASE test_db WITH TEMPLATE cvat"')

    print('Put archieve', time.time() - start)

    yield

    start = time.time()

    cvat_db_container.exec_run('rm -r cvat_db')
    cvat_db_container.exec_run('dumpdb test_db')

    print('Clean all', time.time() - start)


@pytest.fixture(scope='function', autouse=True)
def restore_cvat_db(cvat_db_container):
    start = time.time()
    cvat_db_container.exec_run('psql -q -U root -d postgres -f /cvat_db/restore_cvat_db.sql')
    print('Restore cvat db', time.time() - start)

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



