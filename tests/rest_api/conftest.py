# Copyright (C) 2021 Intel Corporation
#
# SPDX-License-Identifier: MIT

from subprocess import run, CalledProcessError
import pytest
import json
import os.path as osp
from .utils.config import ASSETS_DIR

def cvat_db_container(command):
    run(('docker exec cvat_db ' + command).split(), check=True) #nosec

def docker_cp(source, target):
    run(' '.join(['docker container cp', source, target]).split(), check=True) #nosec

def restore_data_volume():
    command = 'docker run --rm --volumes-from cvat --mount ' \
        f'type=bind,source={ASSETS_DIR},target=/mnt/ ubuntu tar ' \
        '--strip 3 -C /home/django/data -xjf /mnt/cvat_data.tar.bz2'
    run(command.split(), check=True) #nosec

def restore_cvat_db():
    cvat_db_container('psql -U root -d postgres -f /cvat_db/restore_db.sql')

def drop_test_db():
    restore_cvat_db()
    cvat_db_container('rm -rf /cvat_db')
    cvat_db_container('dropdb test_db')

def create_test_db():
    docker_cp(source=osp.join(ASSETS_DIR, 'cvat_db'), target='cvat_db:/')
    cvat_db_container('createdb test_db')
    cvat_db_container('psql -U root -d test_db -f /cvat_db/cvat_db.sql')

@pytest.fixture(scope='session', autouse=True)
def init_test_db():
    try:
        restore_data_volume()
        create_test_db()
    except CalledProcessError:
        drop_test_db()
        pytest.exit(f"Cannot to initialize test DB")

    yield

    drop_test_db()

@pytest.fixture(scope='function', autouse=True)
def restore():
    restore_cvat_db()

class Container:
    def __init__(self, data, key='id'):
        self.raw_data = data
        self.map_data = { obj[key]: obj for obj in data }

    @property
    def raw(self):
        return self.raw_data

    @property
    def map(self):
        return self.map_data

    def __iter__(self):
        return iter(self.raw_data)

    def __len__(self):
        return len(self.raw_data)

    def __getitem__(self, key):
        if isinstance(key, slice):
            return self.raw_data[key]
        return self.map_data[key]

@pytest.fixture(scope='module')
def users():
    with open(osp.join(ASSETS_DIR, 'users.json')) as f:
        return Container(json.load(f)['results'])

@pytest.fixture(scope='module')
def organizations():
    with open(osp.join(ASSETS_DIR, 'organizations.json')) as f:
        return Container(json.load(f))

@pytest.fixture(scope='module')
def memberships():
    with open(osp.join(ASSETS_DIR, 'memberships.json')) as f:
        return Container(json.load(f)['results'])

@pytest.fixture(scope='module')
def tasks():
    with open(osp.join(ASSETS_DIR, 'tasks.json')) as f:
        return Container(json.load(f)['results'])

@pytest.fixture(scope='module')
def projects():
    with open(osp.join(ASSETS_DIR, 'projects.json')) as f:
        return Container(json.load(f)['results'])

@pytest.fixture(scope='module')
def jobs():
    with open(osp.join(ASSETS_DIR, 'jobs.json')) as f:
        return Container(json.load(f)['results'])

@pytest.fixture(scope='module')
def invitations():
    with open(osp.join(ASSETS_DIR, 'invitations.json')) as f:
        return Container(json.load(f)['results'], key='key')

@pytest.fixture(scope='module')
def annotations():
    with open(osp.join(ASSETS_DIR, 'annotations.json')) as f:
        return json.load(f)

@pytest.fixture(scope='module')
def users_by_name(users):
    return {user['username']: user for user in users}

@pytest.fixture(scope='module')
def find_users(test_db):
    def find(**kwargs):
        assert len(kwargs) > 0
        assert any(kwargs.values())

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
