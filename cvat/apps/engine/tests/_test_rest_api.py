# Copyright (C) 2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

# FIXME: Git application and package name clash in tests
class _GitImportFix:
    import sys
    former_path = sys.path[:]

    @classmethod
    def apply(cls):
        # HACK: fix application and module name clash
        # 'git' app is found earlier than a library in the path.
        # The clash is introduced by unittest discover
        import sys
        print('apply')

        apps_dir = __file__[:__file__.rfind('/engine/')]
        assert 'apps' in apps_dir
        try:
            sys.path.remove(apps_dir)
        except ValueError:
            pass

        for name in list(sys.modules):
            if name.startswith('git.') or name == 'git':
                m = sys.modules.pop(name, None)
                del m

        import git
        assert apps_dir not in git.__file__

    @classmethod
    def restore(cls):
        import sys
        print('restore')

        for name in list(sys.modules):
            if name.startswith('git.') or name == 'git':
                m = sys.modules.pop(name)
                del m

        sys.path.insert(0, __file__[:__file__.rfind('/engine/')])

        import importlib
        importlib.invalidate_caches()

def _setUpModule():
    _GitImportFix.apply()

    import sys
    sys.path.insert(0, __file__[:__file__.rfind('/engine/')])

# def tearDownModule():
    # _GitImportFix.restore()

import io
import os
import os.path as osp
import random
import shutil
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from enum import Enum
from glob import glob
from io import BytesIO
from unittest import mock

import av
import numpy as np
from django.conf import settings
from django.contrib.auth.models import Group, User
from PIL import Image
from pycocotools import coco as coco_loader
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from cvat.apps.engine.models import (AttributeType, Data, Job, Project,
    Segment, StatusChoice, Task)

_setUpModule()

def create_db_users(cls):
    (group_admin, _) = Group.objects.get_or_create(name="admin")
    (group_user, _) = Group.objects.get_or_create(name="user")
    (group_annotator, _) = Group.objects.get_or_create(name="annotator")
    (group_observer, _) = Group.objects.get_or_create(name="observer")

    user_admin = User.objects.create_superuser(username="admin", email="",
        password="admin")
    user_admin.groups.add(group_admin)
    user_owner = User.objects.create_user(username="user1", password="user1")
    user_owner.groups.add(group_user)
    user_assignee = User.objects.create_user(username="user2", password="user2")
    user_assignee.groups.add(group_annotator)
    user_annotator = User.objects.create_user(username="user3", password="user3")
    user_annotator.groups.add(group_annotator)
    user_observer = User.objects.create_user(username="user4", password="user4")
    user_observer.groups.add(group_observer)
    user_dummy = User.objects.create_user(username="user5", password="user5")
    user_dummy.groups.add(group_user)

    cls.admin = user_admin
    cls.owner = cls.user1 = user_owner
    cls.assignee = cls.user2 = user_assignee
    cls.annotator = cls.user3 = user_annotator
    cls.observer = cls.user4 = user_observer
    cls.user = cls.user5 = user_dummy

def create_db_task(data):
    data_settings = {
        "size": data.pop("size"),
        "image_quality": data.pop("image_quality"),
    }

    db_data = Data.objects.create(**data_settings)
    shutil.rmtree(db_data.get_data_dirname(), ignore_errors=True)
    os.makedirs(db_data.get_data_dirname())
    os.makedirs(db_data.get_upload_dirname())

    db_task = Task.objects.create(**data)
    shutil.rmtree(db_task.get_task_dirname(), ignore_errors=True)
    os.makedirs(db_task.get_task_dirname())
    os.makedirs(db_task.get_task_logs_dirname())
    os.makedirs(db_task.get_task_artifacts_dirname())
    db_task.data = db_data
    db_task.save()

    for x in range(0, db_task.data.size, db_task.segment_size):
        start_frame = x
        stop_frame = min(x + db_task.segment_size - 1, db_task.data.size - 1)

        db_segment = Segment()
        db_segment.task = db_task
        db_segment.start_frame = start_frame
        db_segment.stop_frame = stop_frame
        db_segment.save()

        db_job = Job()
        db_job.segment = db_segment
        db_job.save()

    return db_task

def create_dummy_db_tasks(obj, project=None):
    tasks = []

    data = {
        "name": "my task #1",
        "owner": obj.owner,
        "assignee": obj.assignee,
        "overlap": 0,
        "segment_size": 100,
        "z_order": False,
        "image_quality": 75,
        "size": 100,
        "project": project
    }
    db_task = create_db_task(data)
    tasks.append(db_task)

    data = {
        "name": "my multijob task",
        "owner": obj.user,
        "overlap": 0,
        "segment_size": 100,
        "z_order": True,
        "image_quality": 50,
        "size": 200,
        "project": project
    }
    db_task = create_db_task(data)
    tasks.append(db_task)

    data = {
        "name": "my task #2",
        "owner": obj.owner,
        "assignee": obj.assignee,
        "overlap": 0,
        "segment_size": 100,
        "z_order": False,
        "image_quality": 75,
        "size": 100,
        "project": project
    }
    db_task = create_db_task(data)
    tasks.append(db_task)

    data = {
        "name": "super task",
        "owner": obj.admin,
        "overlap": 0,
        "segment_size": 50,
        "z_order": False,
        "image_quality": 95,
        "size": 50,
        "project": project
    }
    db_task = create_db_task(data)
    tasks.append(db_task)

    return tasks

def create_dummy_db_projects(obj):
    projects = []

    data = {
        "name": "my empty project",
        "owner": obj.owner,
        "assignee": obj.assignee,
    }
    db_project = Project.objects.create(**data)
    projects.append(db_project)

    data = {
        "name": "my project without assignee",
        "owner": obj.user,
    }
    db_project = Project.objects.create(**data)
    create_dummy_db_tasks(obj, db_project)
    projects.append(db_project)

    data = {
        "name": "my big project",
        "owner": obj.owner,
        "assignee": obj.assignee,
    }
    db_project = Project.objects.create(**data)
    create_dummy_db_tasks(obj, db_project)
    projects.append(db_project)

    data = {
        "name": "public project",
    }
    db_project = Project.objects.create(**data)
    create_dummy_db_tasks(obj, db_project)
    projects.append(db_project)

    data = {
        "name": "super project",
        "owner": obj.admin,
        "assignee": obj.assignee,
    }
    db_project = Project.objects.create(**data)
    create_dummy_db_tasks(obj, db_project)
    projects.append(db_project)

    return projects


class ForceLogin:
    def __init__(self, user, client):
        self.user = user
        self.client = client

    def __enter__(self):
        if self.user:
            self.client.force_login(self.user, backend='django.contrib.auth.backends.ModelBackend')

        return self

    def __exit__(self, exception_type, exception_value, traceback):
        if self.user:
            self.client.logout()


class JobGetAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.task = create_dummy_db_tasks(cls)[0]
        cls.job = Job.objects.filter(segment__task_id=cls.task.id).first()
        cls.job.assignee = cls.annotator
        cls.job.save()

    def _run_api_v1_jobs_id(self, jid, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/v1/jobs/{}'.format(jid))

        return response

    def _check_request(self, response):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.job.id)
        self.assertEqual(response.data["status"], StatusChoice.ANNOTATION)
        self.assertEqual(response.data["start_frame"], self.job.segment.start_frame)
        self.assertEqual(response.data["stop_frame"], self.job.segment.stop_frame)

    def test_api_v1_jobs_id_admin(self):
        response = self._run_api_v1_jobs_id(self.job.id, self.admin)
        self._check_request(response)
        response = self._run_api_v1_jobs_id(self.job.id + 10, self.admin)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v1_jobs_id_owner(self):
        response = self._run_api_v1_jobs_id(self.job.id, self.owner)
        self._check_request(response)
        response = self._run_api_v1_jobs_id(self.job.id + 10, self.owner)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v1_jobs_id_annotator(self):
        response = self._run_api_v1_jobs_id(self.job.id, self.annotator)
        self._check_request(response)
        response = self._run_api_v1_jobs_id(self.job.id + 10, self.annotator)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v1_jobs_id_observer(self):
        response = self._run_api_v1_jobs_id(self.job.id, self.observer)
        self._check_request(response)
        response = self._run_api_v1_jobs_id(self.job.id + 10, self.observer)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v1_jobs_id_user(self):
        response = self._run_api_v1_jobs_id(self.job.id, self.user)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self._run_api_v1_jobs_id(self.job.id + 10, self.user)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v1_jobs_id_no_auth(self):
        response = self._run_api_v1_jobs_id(self.job.id, None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        response = self._run_api_v1_jobs_id(self.job.id + 10, None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class JobUpdateAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.task = create_dummy_db_tasks(self)[0]
        self.job = Job.objects.filter(segment__task_id=self.task.id).first()
        self.job.assignee = self.annotator
        self.job.save()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _run_api_v1_jobs_id(self, jid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.put('/api/v1/jobs/{}'.format(jid), data=data, format='json')

        return response

    def _check_request(self, response, data):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.job.id)
        self.assertEqual(response.data["status"], data.get('status', self.job.status))
        assignee = self.job.assignee.id if self.job.assignee else None
        self.assertEqual(response.data["assignee"], data.get('assignee', assignee))
        self.assertEqual(response.data["start_frame"], self.job.segment.start_frame)
        self.assertEqual(response.data["stop_frame"], self.job.segment.stop_frame)

    def test_api_v1_jobs_id_admin(self):
        data = {"status": StatusChoice.COMPLETED, "assignee": self.owner.id}
        response = self._run_api_v1_jobs_id(self.job.id, self.admin, data)
        self._check_request(response, data)
        response = self._run_api_v1_jobs_id(self.job.id + 10, self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v1_jobs_id_owner(self):
        data = {"status": StatusChoice.VALIDATION, "assignee": self.annotator.id}
        response = self._run_api_v1_jobs_id(self.job.id, self.owner, data)
        self._check_request(response, data)
        response = self._run_api_v1_jobs_id(self.job.id + 10, self.owner, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v1_jobs_id_annotator(self):
        data = {"status": StatusChoice.ANNOTATION, "assignee": self.user.id}
        response = self._run_api_v1_jobs_id(self.job.id, self.annotator, data)
        self._check_request(response, data)
        response = self._run_api_v1_jobs_id(self.job.id + 10, self.annotator, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v1_jobs_id_observer(self):
        data = {"status": StatusChoice.ANNOTATION, "assignee": self.admin.id}
        response = self._run_api_v1_jobs_id(self.job.id, self.observer, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self._run_api_v1_jobs_id(self.job.id + 10, self.observer, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v1_jobs_id_user(self):
        data = {"status": StatusChoice.ANNOTATION, "assignee": self.user.id}
        response = self._run_api_v1_jobs_id(self.job.id, self.user, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self._run_api_v1_jobs_id(self.job.id + 10, self.user, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v1_jobs_id_no_auth(self):
        data = {"status": StatusChoice.ANNOTATION, "assignee": self.user.id}
        response = self._run_api_v1_jobs_id(self.job.id, None, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        response = self._run_api_v1_jobs_id(self.job.id + 10, None, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class JobPartialUpdateAPITestCase(JobUpdateAPITestCase):
    def _run_api_v1_jobs_id(self, jid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/v1/jobs/{}'.format(jid), data=data, format='json')

        return response

    def test_api_v1_jobs_id_annotator_partial(self):
        data = {"status": StatusChoice.VALIDATION}
        response = self._run_api_v1_jobs_id(self.job.id, self.owner, data)
        self._check_request(response, data)

    def test_api_v1_jobs_id_admin_partial(self):
        data = {"assignee": self.user.id}
        response = self._run_api_v1_jobs_id(self.job.id, self.owner, data)
        self._check_request(response, data)

class ServerAboutAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _run_api_v1_server_about(self, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/v1/server/about')

        return response

    def _check_request(self, response):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data.get("name", None))
        self.assertIsNotNone(response.data.get("description", None))
        self.assertIsNotNone(response.data.get("version", None))

    def test_api_v1_server_about_admin(self):
        response = self._run_api_v1_server_about(self.admin)
        self._check_request(response)

    def test_api_v1_server_about_user(self):
        response = self._run_api_v1_server_about(self.user)
        self._check_request(response)

    def test_api_v1_server_about_no_auth(self):
        response = self._run_api_v1_server_about(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class ServerExceptionAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.data = {
            "system": "Linux",
            "client": "rest_framework.APIClient",
            "time": "2019-01-29T12:34:56.000000Z",
            "task_id": 1,
            "job_id": 1,
            "proj_id": 2,
            "client_id": 12321235123,
            "message": "just test message",
            "filename": "http://localhost/my_file.js",
            "line": 1,
            "column": 1,
            "stack": ""
        }

    def _run_api_v1_server_exception(self, user):
        with ForceLogin(user, self.client):
            #pylint: disable=unused-variable
            with mock.patch("cvat.apps.engine.views.clogger") as clogger:
                response = self.client.post('/api/v1/server/exception',
                    self.data, format='json')

        return response

    def test_api_v1_server_exception_admin(self):
        response = self._run_api_v1_server_exception(self.admin)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_api_v1_server_exception_user(self):
        response = self._run_api_v1_server_exception(self.user)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_api_v1_server_exception_no_auth(self):
        response = self._run_api_v1_server_exception(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ServerLogsAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.data = [
        {
            "time": "2019-01-29T12:34:56.000000Z",
            "task_id": 1,
            "job_id": 1,
            "proj_id": 2,
            "client_id": 12321235123,
            "message": "just test message",
            "name": "add point",
            "is_active": True,
            "payload": {"count": 1}
        },
        {
            "time": "2019-02-24T12:34:56.000000Z",
            "client_id": 12321235123,
            "name": "add point",
            "is_active": True,
        }]

    def _run_api_v1_server_logs(self, user):
        with ForceLogin(user, self.client):
            #pylint: disable=unused-variable
            with mock.patch("cvat.apps.engine.views.clogger") as clogger:
                response = self.client.post('/api/v1/server/logs',
                    self.data, format='json')

        return response

    def test_api_v1_server_logs_admin(self):
        response = self._run_api_v1_server_logs(self.admin)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_api_v1_server_logs_user(self):
        response = self._run_api_v1_server_logs(self.user)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_api_v1_server_logs_no_auth(self):
        response = self._run_api_v1_server_logs(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        create_db_users(self)

    def _check_response(self, user, response, is_full=True):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self._check_data(user, response.data, is_full)

    def _check_data(self, user, data, is_full):
        self.assertEqual(data["id"], user.id)
        self.assertEqual(data["username"], user.username)
        self.assertEqual(data["first_name"], user.first_name)
        self.assertEqual(data["last_name"], user.last_name)
        extra_check = self.assertIn if is_full else self.assertNotIn
        extra_check("email", data)
        extra_check("groups", data)
        extra_check("is_staff", data)
        extra_check("is_superuser", data)
        extra_check("is_active", data)
        extra_check("last_login", data)
        extra_check("date_joined", data)

class UserListAPITestCase(UserAPITestCase):
    def _run_api_v1_users(self, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/v1/users')

        return response

    def _check_response(self, user, response, is_full):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user_info in response.data['results']:
            db_user = getattr(self, user_info['username'])
            self._check_data(db_user, user_info, is_full)

    def test_api_v1_users_admin(self):
        response = self._run_api_v1_users(self.admin)
        self._check_response(self.admin, response, True)

    def test_api_v1_users_user(self):
        response = self._run_api_v1_users(self.user)
        self._check_response(self.user, response, False)

    def test_api_v1_users_annotator(self):
        response = self._run_api_v1_users(self.annotator)
        self._check_response(self.annotator, response, False)

    def test_api_v1_users_observer(self):
        response = self._run_api_v1_users(self.observer)
        self._check_response(self.observer, response, False)

    def test_api_v1_users_no_auth(self):
        response = self._run_api_v1_users(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class UserSelfAPITestCase(UserAPITestCase):
    def _run_api_v1_users_self(self, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/v1/users/self')

        return response

    def test_api_v1_users_self_admin(self):
        response = self._run_api_v1_users_self(self.admin)
        self._check_response(self.admin, response)

    def test_api_v1_users_self_user(self):
        response = self._run_api_v1_users_self(self.user)
        self._check_response(self.user, response)

    def test_api_v1_users_self_annotator(self):
        response = self._run_api_v1_users_self(self.annotator)
        self._check_response(self.annotator, response)

    def test_api_v1_users_self_observer(self):
        response = self._run_api_v1_users_self(self.observer)
        self._check_response(self.observer, response)

    def test_api_v1_users_self_no_auth(self):
        response = self._run_api_v1_users_self(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class UserGetAPITestCase(UserAPITestCase):
    def _run_api_v1_users_id(self, user, user_id):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/v1/users/{}'.format(user_id))

        return response

    def test_api_v1_users_id_admin(self):
        response = self._run_api_v1_users_id(self.admin, self.user.id)
        self._check_response(self.user, response, True)

        response = self._run_api_v1_users_id(self.admin, self.admin.id)
        self._check_response(self.admin, response, True)

        response = self._run_api_v1_users_id(self.admin, self.owner.id)
        self._check_response(self.owner, response, True)

    def test_api_v1_users_id_user(self):
        response = self._run_api_v1_users_id(self.user, self.user.id)
        self._check_response(self.user, response, True)

        response = self._run_api_v1_users_id(self.user, self.owner.id)
        self._check_response(self.owner, response, False)

    def test_api_v1_users_id_annotator(self):
        response = self._run_api_v1_users_id(self.annotator, self.annotator.id)
        self._check_response(self.annotator, response, True)

        response = self._run_api_v1_users_id(self.annotator, self.user.id)
        self._check_response(self.user, response, False)

    def test_api_v1_users_id_observer(self):
        response = self._run_api_v1_users_id(self.observer, self.observer.id)
        self._check_response(self.observer, response, True)

        response = self._run_api_v1_users_id(self.observer, self.user.id)
        self._check_response(self.user, response, False)

    def test_api_v1_users_id_no_auth(self):
        response = self._run_api_v1_users_id(None, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class UserPartialUpdateAPITestCase(UserAPITestCase):
    def _run_api_v1_users_id(self, user, user_id, data):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/v1/users/{}'.format(user_id), data=data)

        return response

    def _check_response_with_data(self, user, response, data, is_full):
        # refresh information about the user from DB
        user = User.objects.get(id=user.id)
        for k,v in data.items():
            self.assertEqual(response.data[k], v)
        self._check_response(user, response, is_full)

    def test_api_v1_users_id_admin_partial(self):
        data = {"username": "user09", "last_name": "my last name"}
        response = self._run_api_v1_users_id(self.admin, self.user.id, data)

        self._check_response_with_data(self.user, response, data, True)

    def test_api_v1_users_id_user_partial(self):
        data = {"username": "user10", "first_name": "my name"}
        response = self._run_api_v1_users_id(self.user, self.user.id, data)
        self._check_response_with_data(self.user, response, data, False)

        data = {"is_staff": True}
        response = self._run_api_v1_users_id(self.user, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        data = {"username": "admin", "is_superuser": True}
        response = self._run_api_v1_users_id(self.user, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        data = {"username": "non_active", "is_active": False}
        response = self._run_api_v1_users_id(self.user, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        data = {"username": "annotator01", "first_name": "slave"}
        response = self._run_api_v1_users_id(self.user, self.annotator.id, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v1_users_id_no_auth_partial(self):
        data = {"username": "user12"}
        response = self._run_api_v1_users_id(None, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class UserDeleteAPITestCase(UserAPITestCase):
    def _run_api_v1_users_id(self, user, user_id):
        with ForceLogin(user, self.client):
            response = self.client.delete('/api/v1/users/{}'.format(user_id))

        return response

    def test_api_v1_users_id_admin(self):
        response = self._run_api_v1_users_id(self.admin, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        response = self._run_api_v1_users_id(self.admin, self.admin.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_api_v1_users_id_user(self):
        response = self._run_api_v1_users_id(self.user, self.owner.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self._run_api_v1_users_id(self.user, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_api_v1_users_id_annotator(self):
        response = self._run_api_v1_users_id(self.annotator, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self._run_api_v1_users_id(self.annotator, self.annotator.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_api_v1_users_id_observer(self):
        response = self._run_api_v1_users_id(self.observer, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self._run_api_v1_users_id(self.observer, self.observer.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_api_v1_users_id_no_auth(self):
        response = self._run_api_v1_users_id(None, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class ProjectListAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.projects = create_dummy_db_projects(cls)

    def _run_api_v1_projects(self, user, params=""):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/v1/projects{}'.format(params))

        return response

    def test_api_v1_projects_admin(self):
        response = self._run_api_v1_projects(self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([project.name for project in self.projects]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v1_projects_user(self):
        response = self._run_api_v1_projects(self.user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([project.name for project in self.projects
                if 'my empty project' != project.name]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v1_projects_observer(self):
        response = self._run_api_v1_projects(self.observer)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([project.name for project in self.projects]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v1_projects_no_auth(self):
        response = self._run_api_v1_projects(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class ProjectGetAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.projects = create_dummy_db_projects(cls)

    def _run_api_v1_projects_id(self, pid, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/v1/projects/{}'.format(pid))

        return response

    def _check_response(self, response, db_project):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], db_project.name)
        owner = db_project.owner.id if db_project.owner else None
        self.assertEqual(response.data["owner"], owner)
        assignee = db_project.assignee.id if db_project.assignee else None
        self.assertEqual(response.data["assignee"], assignee)
        self.assertEqual(response.data["status"], db_project.status)

    def _check_api_v1_projects_id(self, user):
        for db_project in self.projects:
            response = self._run_api_v1_projects_id(db_project.id, user)
            if user and user.has_perm("engine.project.access", db_project):
                self._check_response(response, db_project)
            elif user:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            else:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_v1_projects_id_admin(self):
        self._check_api_v1_projects_id(self.admin)

    def test_api_v1_projects_id_user(self):
        self._check_api_v1_projects_id(self.user)

    def test_api_v1_projects_id_observer(self):
        self._check_api_v1_projects_id(self.observer)

    def test_api_v1_projects_id_no_auth(self):
        self._check_api_v1_projects_id(None)

class ProjectDeleteAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.projects = create_dummy_db_projects(cls)

    def _run_api_v1_projects_id(self, pid, user):
        with ForceLogin(user, self.client):
            response = self.client.delete('/api/v1/projects/{}'.format(pid), format="json")

        return response

    def _check_api_v1_projects_id(self, user):
        for db_project in self.projects:
            response = self._run_api_v1_projects_id(db_project.id, user)
            if user and user.has_perm("engine.project.delete", db_project):
                self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
            elif user:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            else:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_v1_projects_id_admin(self):
        self._check_api_v1_projects_id(self.admin)

    def test_api_v1_projects_id_user(self):
        self._check_api_v1_projects_id(self.user)

    def test_api_v1_projects_id_observer(self):
        self._check_api_v1_projects_id(self.observer)

    def test_api_v1_projects_id_no_auth(self):
        self._check_api_v1_projects_id(None)

class ProjectCreateAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _run_api_v1_projects(self, user, data):
        with ForceLogin(user, self.client):
            response = self.client.post('/api/v1/projects', data=data, format="json")

        return response

    def _check_response(self, response, user, data):
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], data["name"])
        self.assertEqual(response.data["owner"], data.get("owner", user.id))
        self.assertEqual(response.data["assignee"], data.get("assignee"))
        self.assertEqual(response.data["bug_tracker"], data.get("bug_tracker", ""))
        self.assertEqual(response.data["status"], StatusChoice.ANNOTATION)

    def _check_api_v1_projects(self, user, data):
        response = self._run_api_v1_projects(user, data)
        if user and user.has_perm("engine.project.create"):
            self._check_response(response, user, data)
        elif user:
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        else:
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_v1_projects_admin(self):
        data = {
            "name": "new name for the project",
            "bug_tracker": "http://example.com"
        }
        self._check_api_v1_projects(self.admin, data)

        data = {
            "owner": self.owner.id,
            "assignee": self.assignee.id,
            "name": "new name for the project"
        }
        self._check_api_v1_projects(self.admin, data)

        data = {
            "owner": self.admin.id,
            "name": "2"
        }
        self._check_api_v1_projects(self.admin, data)


    def test_api_v1_projects_user(self):
        data = {
            "name": "Dummy name",
            "bug_tracker": "it is just text"
        }
        self._check_api_v1_projects(self.user, data)

        data = {
            "owner": self.owner.id,
            "assignee": self.assignee.id,
            "name": "My import project with data"
        }
        self._check_api_v1_projects(self.user, data)


    def test_api_v1_projects_observer(self):
        data = {
            "name": "My Project #1",
            "owner": self.owner.id,
            "assignee": self.assignee.id
        }
        self._check_api_v1_projects(self.observer, data)

    def test_api_v1_projects_no_auth(self):
        data = {
            "name": "My Project #2",
            "owner": self.admin.id,
        }
        self._check_api_v1_projects(None, data)

class ProjectPartialUpdateAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.projects = create_dummy_db_projects(cls)

    def _run_api_v1_projects_id(self, pid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/v1/projects/{}'.format(pid),
                data=data, format="json")

        return response

    def _check_response(self, response, db_project, data):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        name = data.get("name", db_project.name)
        self.assertEqual(response.data["name"], name)
        owner = db_project.owner.id if db_project.owner else None
        owner = data.get("owner", owner)
        self.assertEqual(response.data["owner"], owner)
        assignee = db_project.assignee.id if db_project.assignee else None
        assignee = data.get("assignee", assignee)
        self.assertEqual(response.data["assignee"], assignee)
        self.assertEqual(response.data["status"], db_project.status)

    def _check_api_v1_projects_id(self, user, data):
        for db_project in self.projects:
            response = self._run_api_v1_projects_id(db_project.id, user, data)
            if user and user.has_perm("engine.project.change", db_project):
                self._check_response(response, db_project, data)
            elif user:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            else:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_v1_projects_id_admin(self):
        data = {
            "name": "new name for the project",
            "owner": self.owner.id,
        }
        self._check_api_v1_projects_id(self.admin, data)

    def test_api_v1_projects_id_user(self):
        data = {
            "name": "new name for the project",
            "owner": self.assignee.id,
        }
        self._check_api_v1_projects_id(self.user, data)

    def test_api_v1_projects_id_observer(self):
        data = {
            "name": "new name for the project",
        }
        self._check_api_v1_projects_id(self.observer, data)

    def test_api_v1_projects_id_no_auth(self):
        data = {
            "name": "new name for the project",
        }
        self._check_api_v1_projects_id(None, data)

class ProjectListOfTasksAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.projects = create_dummy_db_projects(cls)

    def _run_api_v1_projects_id_tasks(self, user, pid):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/v1/projects/{}/tasks'.format(pid))

        return response

    def test_api_v1_projects_id_tasks_admin(self):
        project = self.projects[1]
        response = self._run_api_v1_projects_id_tasks(self.admin, project.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([task.name for task in project.tasks.all()]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v1_projects_id_tasks_user(self):
        project = self.projects[1]
        response = self._run_api_v1_projects_id_tasks(self.user, project.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([task.name for task in project.tasks.all()
                if  task.owner in [None, self.user] or
                    task.assignee in [None, self.user]]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v1_projects_id_tasks_observer(self):
        project = self.projects[1]
        response = self._run_api_v1_projects_id_tasks(self.observer, project.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([task.name for task in project.tasks.all()]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v1_projects_id_tasks_no_auth(self):
        project = self.projects[1]
        response = self._run_api_v1_projects_id_tasks(None, project.id)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TaskListAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.tasks = create_dummy_db_tasks(cls)

    def _run_api_v1_tasks(self, user, params=""):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/v1/tasks{}'.format(params))

        return response

    def test_api_v1_tasks_admin(self):
        response = self._run_api_v1_tasks(self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([task.name for task in self.tasks]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v1_tasks_user(self):
        response = self._run_api_v1_tasks(self.user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([task.name for task in self.tasks
                if (task.owner == self.user or task.assignee == None)]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v1_tasks_observer(self):
        response = self._run_api_v1_tasks(self.observer)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([task.name for task in self.tasks]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v1_tasks_no_auth(self):
        response = self._run_api_v1_tasks(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class TaskGetAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.tasks = create_dummy_db_tasks(cls)

    def _run_api_v1_tasks_id(self, tid, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/v1/tasks/{}'.format(tid))

        return response

    def _check_response(self, response, db_task):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], db_task.name)
        self.assertEqual(response.data["size"], db_task.data.size)
        self.assertEqual(response.data["mode"], db_task.mode)
        owner = db_task.owner.id if db_task.owner else None
        self.assertEqual(response.data["owner"], owner)
        assignee = db_task.assignee.id if db_task.assignee else None
        self.assertEqual(response.data["assignee"], assignee)
        self.assertEqual(response.data["overlap"], db_task.overlap)
        self.assertEqual(response.data["segment_size"], db_task.segment_size)
        self.assertEqual(response.data["z_order"], db_task.z_order)
        self.assertEqual(response.data["image_quality"], db_task.data.image_quality)
        self.assertEqual(response.data["status"], db_task.status)
        self.assertListEqual(
            [label.name for label in db_task.label_set.all()],
            [label["name"] for label in response.data["labels"]]
        )

    def _check_api_v1_tasks_id(self, user):
        for db_task in self.tasks:
            response = self._run_api_v1_tasks_id(db_task.id, user)
            if user and user.has_perm("engine.task.access", db_task):
                self._check_response(response, db_task)
            elif user:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            else:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_v1_tasks_id_admin(self):
        self._check_api_v1_tasks_id(self.admin)

    def test_api_v1_tasks_id_user(self):
        self._check_api_v1_tasks_id(self.user)

    def test_api_v1_tasks_id_observer(self):
        self._check_api_v1_tasks_id(self.observer)

    def test_api_v1_tasks_id_no_auth(self):
        self._check_api_v1_tasks_id(None)

class TaskDeleteAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.tasks = create_dummy_db_tasks(cls)

    def _run_api_v1_tasks_id(self, tid, user):
        with ForceLogin(user, self.client):
            response = self.client.delete('/api/v1/tasks/{}'.format(tid), format="json")

        return response

    def _check_api_v1_tasks_id(self, user):
        for db_task in self.tasks:
            response = self._run_api_v1_tasks_id(db_task.id, user)
            if user and user.has_perm("engine.task.delete", db_task):
                self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
            elif user:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            else:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_v1_tasks_id_admin(self):
        self._check_api_v1_tasks_id(self.admin)

    def test_api_v1_tasks_id_user(self):
        self._check_api_v1_tasks_id(self.user)

    def test_api_v1_tasks_id_observer(self):
        self._check_api_v1_tasks_id(self.observer)

    def test_api_v1_tasks_id_no_auth(self):
        self._check_api_v1_tasks_id(None)

class TaskUpdateAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.tasks = create_dummy_db_tasks(cls)

    def _run_api_v1_tasks_id(self, tid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.put('/api/v1/tasks/{}'.format(tid),
                data=data, format="json")

        return response

    def _check_response(self, response, db_task, data):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        name = data.get("name", db_task.name)
        self.assertEqual(response.data["name"], name)
        self.assertEqual(response.data["size"], db_task.data.size)
        mode = data.get("mode", db_task.mode)
        self.assertEqual(response.data["mode"], mode)
        owner = db_task.owner.id if db_task.owner else None
        owner = data.get("owner", owner)
        self.assertEqual(response.data["owner"], owner)
        assignee = db_task.assignee.id if db_task.assignee else None
        assignee = data.get("assignee", assignee)
        self.assertEqual(response.data["assignee"], assignee)
        self.assertEqual(response.data["overlap"], db_task.overlap)
        self.assertEqual(response.data["segment_size"], db_task.segment_size)
        z_order = data.get("z_order", db_task.z_order)
        self.assertEqual(response.data["z_order"], z_order)
        image_quality = data.get("image_quality", db_task.data.image_quality)
        self.assertEqual(response.data["image_quality"], image_quality)
        self.assertEqual(response.data["status"], db_task.status)
        if data.get("labels"):
            self.assertListEqual(
                [label["name"] for label in data.get("labels")],
                [label["name"] for label in response.data["labels"]]
            )
        else:
            self.assertListEqual(
                [label.name for label in db_task.label_set.all()],
                [label["name"] for label in response.data["labels"]]
            )

    def _check_api_v1_tasks_id(self, user, data):
        for db_task in self.tasks:
            response = self._run_api_v1_tasks_id(db_task.id, user, data)
            if user and user.has_perm("engine.task.change", db_task):
                self._check_response(response, db_task, data)
            elif user:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            else:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_v1_tasks_id_admin(self):
        data = {
            "name": "new name for the task",
            "owner": self.owner.id,
            "labels": [{
                "name": "non-vehicle",
                "attributes": [{
                    "name": "my_attribute",
                    "mutable": True,
                    "input_type": AttributeType.CHECKBOX,
                    "default_value": "true"
                }]
            }]
        }
        self._check_api_v1_tasks_id(self.admin, data)

    def test_api_v1_tasks_id_user(self):
        data = {
            "name": "new name for the task",
            "owner": self.assignee.id,
            "labels": [{
                "name": "car",
                "attributes": [{
                    "name": "color",
                    "mutable": False,
                    "input_type": AttributeType.SELECT,
                    "default_value": "white",
                    "values": ["white", "yellow", "green", "red"]
                }]
            }]
        }
        self._check_api_v1_tasks_id(self.user, data)

    def test_api_v1_tasks_id_observer(self):
        data = {
            "name": "new name for the task",
            "labels": [{
                "name": "test",
            }]
        }
        self._check_api_v1_tasks_id(self.observer, data)

    def test_api_v1_tasks_id_no_auth(self):
        data = {
            "name": "new name for the task",
            "labels": [{
                "name": "test",
            }]
        }
        self._check_api_v1_tasks_id(None, data)

class TaskPartialUpdateAPITestCase(TaskUpdateAPITestCase):
    def _run_api_v1_tasks_id(self, tid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/v1/tasks/{}'.format(tid),
                data=data, format="json")

        return response

    def test_api_v1_tasks_id_admin_partial(self):
        data = {
            "name": "new name for the task #2",
        }
        self._check_api_v1_tasks_id(self.admin, data)

        data = {
            "name": "new name for the task",
            "owner": self.owner.id
        }
        self._check_api_v1_tasks_id(self.admin, data)
        # Now owner is updated, but self.db_tasks are obsolete
        # We can't do any tests without owner in data below


    def test_api_v1_tasks_id_user_partial(self):
        data = {
            "labels": [{
                "name": "car",
                "attributes": [{
                    "name": "color",
                    "mutable": False,
                    "input_type": AttributeType.SELECT,
                    "default_value": "white",
                    "values": ["white", "yellow", "green", "red"]
                }]
            }]
        }
        self._check_api_v1_tasks_id(self.user, data)

        data = {
            "owner": self.observer.id,
            "assignee": self.annotator.id
        }
        self._check_api_v1_tasks_id(self.user, data)


    def test_api_v1_tasks_id_observer(self):
        data = {
            "name": "my task #3"
        }
        self._check_api_v1_tasks_id(self.observer, data)

    def test_api_v1_tasks_id_no_auth(self):
        data = {
            "name": "new name for the task",
            "labels": [{
                "name": "test",
            }]
        }
        self._check_api_v1_tasks_id(None, data)

class TaskCreateAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _run_api_v1_tasks(self, user, data):
        with ForceLogin(user, self.client):
            response = self.client.post('/api/v1/tasks', data=data, format="json")

        return response

    def _check_response(self, response, user, data):
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], data["name"])
        self.assertEqual(response.data["mode"], "")
        self.assertEqual(response.data["owner"], data.get("owner", user.id))
        self.assertEqual(response.data["assignee"], data.get("assignee"))
        self.assertEqual(response.data["bug_tracker"], data.get("bug_tracker", ""))
        self.assertEqual(response.data["overlap"], data.get("overlap", None))
        self.assertEqual(response.data["segment_size"], data.get("segment_size", 0))
        self.assertEqual(response.data["z_order"], data.get("z_order", False))
        self.assertEqual(response.data["status"], StatusChoice.ANNOTATION)
        self.assertListEqual(
            [label["name"] for label in data.get("labels")],
            [label["name"] for label in response.data["labels"]]
        )

    def _check_api_v1_tasks(self, user, data):
        response = self._run_api_v1_tasks(user, data)
        if user and user.has_perm("engine.task.create"):
            self._check_response(response, user, data)
        elif user:
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        else:
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_v1_tasks_admin(self):
        data = {
            "name": "new name for the task",
            "labels": [{
                "name": "non-vehicle",
                "attributes": [{
                    "name": "my_attribute",
                    "mutable": True,
                    "input_type": AttributeType.CHECKBOX,
                    "default_value": "true"
                }]
            }]
        }
        self._check_api_v1_tasks(self.admin, data)

    def test_api_v1_tasks_user(self):
        data = {
            "name": "new name for the task",
            "owner": self.assignee.id,
            "labels": [{
                "name": "car",
                "attributes": [{
                    "name": "color",
                    "mutable": False,
                    "input_type": AttributeType.SELECT,
                    "default_value": "white",
                    "values": ["white", "yellow", "green", "red"]
                }]
            }]
        }
        self._check_api_v1_tasks(self.user, data)

    def test_api_v1_tasks_observer(self):
        data = {
            "name": "new name for the task",
            "labels": [{
                "name": "test",
            }]
        }
        self._check_api_v1_tasks(self.observer, data)

    def test_api_v1_tasks_no_auth(self):
        data = {
            "name": "new name for the task",
            "labels": [{
                "name": "test",
            }]
        }
        self._check_api_v1_tasks(None, data)

def generate_image_file(filename):
    f = BytesIO()
    gen = random.SystemRandom()
    width = gen.randint(100, 800)
    height = gen.randint(100, 800)
    image = Image.new('RGB', size=(width, height))
    image.save(f, 'jpeg')
    f.name = filename
    f.seek(0)

    return (width, height), f

def generate_image_files(*args):
    images = []
    image_sizes = []
    for image_name in args:
        img_size, image = generate_image_file(image_name)
        image_sizes.append(img_size)
        images.append(image)

    return image_sizes, images

def generate_video_file(filename, width=1920, height=1080, duration=1, fps=25):
    f = BytesIO()
    total_frames = duration * fps
    container = av.open(f, mode='w', format='mp4')

    stream = container.add_stream('mpeg4', rate=fps)
    stream.width = width
    stream.height = height
    stream.pix_fmt = 'yuv420p'

    for frame_i in range(total_frames):
        img = np.empty((stream.width, stream.height, 3))
        img[:, :, 0] = 0.5 + 0.5 * np.sin(2 * np.pi * (0 / 3 + frame_i / total_frames))
        img[:, :, 1] = 0.5 + 0.5 * np.sin(2 * np.pi * (1 / 3 + frame_i / total_frames))
        img[:, :, 2] = 0.5 + 0.5 * np.sin(2 * np.pi * (2 / 3 + frame_i / total_frames))

        img = np.round(255 * img).astype(np.uint8)
        img = np.clip(img, 0, 255)

        frame = av.VideoFrame.from_ndarray(img, format='rgb24')
        for packet in stream.encode(frame):
            container.mux(packet)

    # Flush stream
    for packet in stream.encode():
        container.mux(packet)

    # Close the file
    container.close()
    f.name = filename
    f.seek(0)

    return [(width, height)] * total_frames, f

def generate_zip_archive_file(filename, count):
    image_sizes = []
    zip_buf = BytesIO()
    with zipfile.ZipFile(zip_buf, 'w') as zip_chunk:
        for idx in range(count):
            image_name = "image_{:6d}.jpg".format(idx)
            size, image_buf = generate_image_file(image_name)
            image_sizes.append(size)
            zip_chunk.writestr(image_name, image_buf.getvalue())

    zip_buf.name = filename
    zip_buf.seek(0)
    return image_sizes, zip_buf

class TaskDataAPITestCase(APITestCase):
    _image_sizes = {}

    class ChunkType(str, Enum):
        IMAGESET = 'imageset'
        VIDEO = 'video'

        def __str__(self):
            return self.value

    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        filename = "test_1.jpg"
        path = os.path.join(settings.SHARE_ROOT, filename)
        img_size, data = generate_image_file(filename)
        with open(path, "wb") as image:
            image.write(data.read())
        cls._image_sizes[filename] = img_size

        filename = "test_2.jpg"
        path = os.path.join(settings.SHARE_ROOT, filename)
        img_size, data = generate_image_file(filename)
        with open(path, "wb") as image:
            image.write(data.read())
        cls._image_sizes[filename] = img_size

        filename = "test_3.jpg"
        path = os.path.join(settings.SHARE_ROOT, filename)
        img_size, data = generate_image_file(filename)
        with open(path, "wb") as image:
            image.write(data.read())
        cls._image_sizes[filename] = img_size

        filename = os.path.join("data", "test_3.jpg")
        path = os.path.join(settings.SHARE_ROOT, filename)
        os.makedirs(os.path.dirname(path))
        img_size, data = generate_image_file(filename)
        with open(path, "wb") as image:
            image.write(data.read())
        cls._image_sizes[filename] = img_size

        filename = "test_video_1.mp4"
        path = os.path.join(settings.SHARE_ROOT, filename)
        img_sizes, data = generate_video_file(filename, width=1280, height=720)
        with open(path, "wb") as video:
            video.write(data.read())
        cls._image_sizes[filename] = img_sizes

        filename = os.path.join("videos", "test_video_1.mp4")
        path = os.path.join(settings.SHARE_ROOT, filename)
        os.makedirs(os.path.dirname(path))
        img_sizes, data = generate_video_file(filename, width=1280, height=720)
        with open(path, "wb") as video:
            video.write(data.read())
        cls._image_sizes[filename] = img_sizes

        filename = os.path.join("test_archive_1.zip")
        path = os.path.join(settings.SHARE_ROOT, filename)
        img_sizes, data = generate_zip_archive_file(filename, count=5)
        with open(path, "wb") as zip_archive:
            zip_archive.write(data.read())
        cls._image_sizes[filename] = img_sizes

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        path = os.path.join(settings.SHARE_ROOT, "test_1.jpg")
        os.remove(path)

        path = os.path.join(settings.SHARE_ROOT, "test_2.jpg")
        os.remove(path)

        path = os.path.join(settings.SHARE_ROOT, "test_3.jpg")
        os.remove(path)

        path = os.path.join(settings.SHARE_ROOT, "data", "test_3.jpg")
        os.remove(path)

        path = os.path.join(settings.SHARE_ROOT, "test_video_1.mp4")
        os.remove(path)

        path = os.path.join(settings.SHARE_ROOT, "videos", "test_video_1.mp4")
        os.remove(path)


    def _run_api_v1_tasks_id_data_post(self, tid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.post('/api/v1/tasks/{}/data'.format(tid),
                data=data)

        return response

    def _create_task(self, user, data):
        with ForceLogin(user, self.client):
            response = self.client.post('/api/v1/tasks', data=data, format="json")
        return response

    def _get_task(self, user, tid):
        with ForceLogin(user, self.client):
            return self.client.get("/api/v1/tasks/{}".format(tid))

    def _run_api_v1_task_id_data_get(self, tid, user, data_type, data_quality=None, data_number=None):
        url = '/api/v1/tasks/{}/data?type={}'.format(tid, data_type)
        if data_quality is not None:
            url += '&quality={}'.format(data_quality)
        if data_number is not None:
            url += '&number={}'.format(data_number)
        with ForceLogin(user, self.client):
            return self.client.get(url)

    def _get_preview(self, tid, user):
        return self._run_api_v1_task_id_data_get(tid, user, "preview")

    def _get_compressed_chunk(self, tid, user, number):
        return self._run_api_v1_task_id_data_get(tid, user, "chunk", "compressed", number)

    def _get_original_chunk(self, tid, user, number):
        return self._run_api_v1_task_id_data_get(tid, user, "chunk", "original", number)

    def _get_compressed_frame(self, tid, user, number):
        return self._run_api_v1_task_id_data_get(tid, user, "frame", "compressed", number)

    def _get_original_frame(self, tid, user, number):
        return self._run_api_v1_task_id_data_get(tid, user, "frame", "original", number)

    @staticmethod
    def _extract_zip_chunk(chunk_buffer):
        chunk = zipfile.ZipFile(chunk_buffer, mode='r')
        return [Image.open(BytesIO(chunk.read(f))) for f in sorted(chunk.namelist())]

    @staticmethod
    def _extract_video_chunk(chunk_buffer):
        container = av.open(chunk_buffer)
        stream = container.streams.video[0]
        return [f.to_image() for f in container.decode(stream)]

    def _test_api_v1_tasks_id_data_spec(self, user, spec, data, expected_compressed_type, expected_original_type, image_sizes):
        # create task
        response = self._create_task(user, spec)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        task_id = response.data["id"]

        # post data for the task
        response = self._run_api_v1_tasks_id_data_post(task_id, user, data)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        response = self._get_task(user, task_id)

        expected_status_code = status.HTTP_200_OK
        if user == self.user and "owner" in spec and spec["owner"] != user.id and \
           "assignee" in spec and spec["assignee"] != user.id:
            expected_status_code = status.HTTP_403_FORBIDDEN
        self.assertEqual(response.status_code, expected_status_code)

        if expected_status_code == status.HTTP_200_OK:
            task = response.json()
            self.assertEqual(expected_compressed_type, task["data_compressed_chunk_type"])
            self.assertEqual(expected_original_type, task["data_original_chunk_type"])
            self.assertEqual(len(image_sizes), task["size"])

        # check preview
        response = self._get_preview(task_id, user)
        self.assertEqual(response.status_code, expected_status_code)
        if expected_status_code == status.HTTP_200_OK:
            preview = Image.open(io.BytesIO(b"".join(response.streaming_content)))
            self.assertLessEqual(preview.size, image_sizes[0])

        # check compressed chunk
        response = self._get_compressed_chunk(task_id, user, 0)
        self.assertEqual(response.status_code, expected_status_code)
        if expected_status_code == status.HTTP_200_OK:
            compressed_chunk = io.BytesIO(b"".join(response.streaming_content))
            if task["data_compressed_chunk_type"] == self.ChunkType.IMAGESET:
                images = self._extract_zip_chunk(compressed_chunk)
            else:
                images = self._extract_video_chunk(compressed_chunk)

            self.assertEqual(len(images), min(task["data_chunk_size"], len(image_sizes)))

            for image_idx, image in enumerate(images):
                self.assertEqual(image.size, image_sizes[image_idx])

        # check original chunk
        response = self._get_original_chunk(task_id, user, 0)
        self.assertEqual(response.status_code, expected_status_code)
        if expected_status_code == status.HTTP_200_OK:
            original_chunk  = io.BytesIO(b"".join(response.streaming_content))
            if task["data_original_chunk_type"] == self.ChunkType.IMAGESET:
                images = self._extract_zip_chunk(original_chunk)
            else:
                images = self._extract_video_chunk(original_chunk)

            for image_idx, image in enumerate(images):
                self.assertEqual(image.size, image_sizes[image_idx])

            self.assertEqual(len(images), min(task["data_chunk_size"], len(image_sizes)))

            if task["data_original_chunk_type"] == self.ChunkType.IMAGESET:
                server_files = [img for key, img in data.items() if key.startswith("server_files")]
                client_files = [img for key, img in data.items() if key.startswith("client_files")]

                if server_files:
                    source_files = [os.path.join(settings.SHARE_ROOT, f) for f in sorted(server_files)]
                else:
                    source_files = [f for f in sorted(client_files, key=lambda e: e.name)]

                source_images = []
                for f in source_files:
                    if zipfile.is_zipfile(f):
                        source_images.extend(self._extract_zip_chunk(f))
                    else:
                        source_images.append(Image.open(f))

                for img_idx, image in enumerate(images):
                    server_image = np.array(image)
                    source_image = np.array(source_images[img_idx])
                    self.assertTrue(np.array_equal(source_image, server_image))

    def _test_api_v1_tasks_id_data(self, user):
        task_spec = {
            "name": "my task #1",
            "owner": self.owner.id,
            "assignee": self.assignee.id,
            "overlap": 0,
            "segment_size": 100,
            "z_order": False,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        image_sizes, images = generate_image_files("test_1.jpg", "test_2.jpg", "test_3.jpg")
        task_data = {
            "client_files[0]": images[0],
            "client_files[1]": images[1],
            "client_files[2]": images[2],
            "image_quality": 75,
        }

        self._test_api_v1_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET, image_sizes)

        task_spec = {
            "name": "my task #2",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "server_files[0]": "test_1.jpg",
            "server_files[1]": "test_2.jpg",
            "server_files[2]": "test_3.jpg",
            "server_files[3]": os.path.join("data", "test_3.jpg"),
            "image_quality": 75,
        }
        image_sizes = [
            self._image_sizes[task_data["server_files[3]"]],
            self._image_sizes[task_data["server_files[0]"]],
            self._image_sizes[task_data["server_files[1]"]],
            self._image_sizes[task_data["server_files[2]"]],
        ]

        self._test_api_v1_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET, image_sizes)

        task_spec = {
            "name": "my video task #1",
            "overlap": 0,
            "segment_size": 100,
            "z_order": False,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }
        image_sizes, video = generate_video_file(filename="test_video_1.mp4", width=1280, height=720)
        task_data = {
            "client_files[0]": video,
            "image_quality": 43,
        }

        self._test_api_v1_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO, self.ChunkType.VIDEO, image_sizes)

        task_spec = {
            "name": "my video task #2",
            "overlap": 0,
            "segment_size": 5,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "server_files[0]": "test_video_1.mp4",
            "image_quality": 57,
        }
        image_sizes = self._image_sizes[task_data["server_files[0]"]]

        self._test_api_v1_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO, self.ChunkType.VIDEO, image_sizes)

        task_spec = {
            "name": "my video task #3",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }
        task_data = {
            "server_files[0]": os.path.join("videos", "test_video_1.mp4"),
            "image_quality": 57,
        }
        image_sizes = self._image_sizes[task_data["server_files[0]"]]

        self._test_api_v1_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO, self.ChunkType.VIDEO, image_sizes)

        task_spec = {
            "name": "my video task #4",
            "overlap": 0,
            "segment_size": 5,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "server_files[0]": "test_video_1.mp4",
            "image_quality": 12,
            "use_zip_chunks": True,
        }
        image_sizes = self._image_sizes[task_data["server_files[0]"]]

        self._test_api_v1_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.VIDEO, image_sizes)

        task_spec = {
            "name": "my archive task #6",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }
        task_data = {
            "server_files[0]": "test_archive_1.zip",
            "image_quality": 88,
        }
        image_sizes = self._image_sizes[task_data["server_files[0]"]]

        self._test_api_v1_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET, image_sizes)

        task_spec = {
            "name": "my archive task #7",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }
        image_sizes, archive = generate_zip_archive_file("test_archive_2.zip", 7)
        task_data = {
            "client_files[0]": archive,
            "image_quality": 100,
        }

        self._test_api_v1_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET, image_sizes)

    def test_api_v1_tasks_id_data_admin(self):
        self._test_api_v1_tasks_id_data(self.admin)

    def test_api_v1_tasks_id_data_owner(self):
        self._test_api_v1_tasks_id_data(self.owner)

    def test_api_v1_tasks_id_data_user(self):
        self._test_api_v1_tasks_id_data(self.user)

    def test_api_v1_tasks_id_data_no_auth(self):
        data = {
            "name": "my task #3",
            "owner": self.owner.id,
            "assignee": self.assignee.id,
            "overlap": 0,
            "segment_size": 100,
            "z_order": False,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }
        response = self._create_task(None, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

def compare_objects(self, obj1, obj2, ignore_keys, fp_tolerance=.001):
    if isinstance(obj1, dict):
        self.assertTrue(isinstance(obj2, dict), "{} != {}".format(obj1, obj2))
        for k, v1 in obj1.items():
            if k in ignore_keys:
                continue
            v2 = obj2[k]
            if k == 'attributes':
                key = lambda a: a['spec_id']
                v1.sort(key=key)
                v2.sort(key=key)
            compare_objects(self, v1, v2, ignore_keys)
    elif isinstance(obj1, list):
        self.assertTrue(isinstance(obj2, list), "{} != {}".format(obj1, obj2))
        self.assertEqual(len(obj1), len(obj2), "{} != {}".format(obj1, obj2))
        for v1, v2 in zip(obj1, obj2):
            compare_objects(self, v1, v2, ignore_keys)
    else:
        if isinstance(obj1, float) or isinstance(obj2, float):
            self.assertAlmostEqual(obj1, obj2, delta=fp_tolerance)
        else:
            self.assertEqual(obj1, obj2)

class JobAnnotationAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _create_task(self, owner, assignee):
        data = {
            "name": "my task #1",
            "owner": owner.id,
            "assignee": assignee.id,
            "overlap": 0,
            "segment_size": 100,
            "z_order": False,
            "labels": [
                {
                    "name": "car",
                    "attributes": [
                        {
                            "name": "model",
                            "mutable": False,
                            "input_type": "select",
                            "default_value": "mazda",
                            "values": ["bmw", "mazda", "renault"]
                        },
                        {
                            "name": "parked",
                            "mutable": True,
                            "input_type": "checkbox",
                            "default_value": False
                        },
                    ]
                },
                {"name": "person"},
            ]
        }

        with ForceLogin(owner, self.client):
            response = self.client.post('/api/v1/tasks', data=data, format="json")
            assert response.status_code == status.HTTP_201_CREATED
            tid = response.data["id"]

            images = {
                "client_files[0]": generate_image_file("test_1.jpg")[1],
                "client_files[1]": generate_image_file("test_2.jpg")[1],
                "client_files[2]": generate_image_file("test_3.jpg")[1],
                "image_quality": 75,
            }
            response = self.client.post("/api/v1/tasks/{}/data".format(tid), data=images)
            assert response.status_code == status.HTTP_202_ACCEPTED

            response = self.client.get("/api/v1/tasks/{}".format(tid))
            task = response.data

            response = self.client.get("/api/v1/tasks/{}/jobs".format(tid))
            jobs = response.data

        return (task, jobs)

    @staticmethod
    def _get_default_attr_values(task):
        default_attr_values = {}
        for label in task["labels"]:
            default_attr_values[label["id"]] = {
                "mutable": [],
                "immutable": [],
                "all": [],
            }
            for attr in label["attributes"]:
                default_value = {
                    "spec_id": attr["id"],
                    "value": attr["default_value"],
                }
                if attr["mutable"]:
                    default_attr_values[label["id"]]["mutable"].append(default_value)
                else:
                    default_attr_values[label["id"]]["immutable"].append(default_value)
                default_attr_values[label["id"]]["all"].append(default_value)
        return default_attr_values

    def _put_api_v1_jobs_id_data(self, jid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.put("/api/v1/jobs/{}/annotations".format(jid),
                data=data, format="json")

        return response

    def _get_api_v1_jobs_id_data(self, jid, user):
        with ForceLogin(user, self.client):
            response = self.client.get("/api/v1/jobs/{}/annotations".format(jid))

        return response

    def _delete_api_v1_jobs_id_data(self, jid, user):
        with ForceLogin(user, self.client):
            response = self.client.delete("/api/v1/jobs/{}/annotations".format(jid),
            format="json")

        return response

    def _patch_api_v1_jobs_id_data(self, jid, user, action, data):
        with ForceLogin(user, self.client):
            response = self.client.patch(
                "/api/v1/jobs/{}/annotations?action={}".format(jid, action),
                data=data, format="json")

        return response

    def _check_response(self, response, data):
        if not response.status_code in [
            status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]:
            compare_objects(self, data, response.data, ignore_keys=["id"])

    def _run_api_v1_jobs_id_annotations(self, owner, assignee, annotator):
        task, jobs = self._create_task(owner, assignee)
        if annotator:
            HTTP_200_OK = status.HTTP_200_OK
            HTTP_204_NO_CONTENT = status.HTTP_204_NO_CONTENT
            HTTP_400_BAD_REQUEST = status.HTTP_400_BAD_REQUEST
        else:
            HTTP_200_OK = status.HTTP_401_UNAUTHORIZED
            HTTP_204_NO_CONTENT = status.HTTP_401_UNAUTHORIZED
            HTTP_400_BAD_REQUEST = status.HTTP_401_UNAUTHORIZED

        job = jobs[0]
        data = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": []
        }
        response = self._put_api_v1_jobs_id_data(job["id"], annotator, data)
        self.assertEqual(response.status_code, HTTP_200_OK)

        data = {
            "version": 1,
            "tags": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": []
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][1]["default_value"]
                        }
                    ],
                    "points": [1.0, 2.1, 100, 300.222],
                    "type": "rectangle",
                    "occluded": False
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                    ],
                    "shapes": [
                        {
                            "frame": 0,
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                            "attributes": [
                                {
                                    "spec_id": task["labels"][0]["attributes"][1]["id"],
                                    "value": task["labels"][0]["attributes"][1]["default_value"]
                                },
                            ]
                        },
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [2.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": True,
                            "outside": True
                        },
                    ]
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False
                        }
                    ]
                },
            ]
        }

        default_attr_values = self._get_default_attr_values(task)
        response = self._put_api_v1_jobs_id_data(job["id"], annotator, data)
        data["version"] += 1 # need to update the version
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._get_api_v1_jobs_id_data(job["id"], annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        # server should add default attribute values if puted data doesn't contain it
        data["tags"][0]["attributes"] = default_attr_values[data["tags"][0]["label_id"]]["all"]
        data["tracks"][0]["shapes"][1]["attributes"] = default_attr_values[data["tracks"][0]["label_id"]]["mutable"]
        self._check_response(response, data)

        response = self._delete_api_v1_jobs_id_data(job["id"], annotator)
        data["version"] += 1 # need to update the version
        self.assertEqual(response.status_code, HTTP_204_NO_CONTENT)

        data = {
            "version": data["version"],
            "tags": [],
            "shapes": [],
            "tracks": []
        }
        response = self._get_api_v1_jobs_id_data(job["id"], annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        data = {
            "version": data["version"],
            "tags": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": []
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][1]["default_value"]
                        }
                    ],
                    "points": [1.0, 2.1, 100, 300.222],
                    "type": "rectangle",
                    "occluded": False
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                    ],
                    "shapes": [
                        {
                            "frame": 0,
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                            "attributes": [
                                {
                                    "spec_id": task["labels"][0]["attributes"][1]["id"],
                                    "value": task["labels"][0]["attributes"][1]["default_value"]
                                },
                            ]
                        },
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [2.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": True,
                            "outside": True
                        },
                    ]
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False
                        }
                    ]
                },
            ]
        }
        response = self._patch_api_v1_jobs_id_data(job["id"], annotator,
            "create", data)
        data["version"] += 1
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._get_api_v1_jobs_id_data(job["id"], annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        # server should add default attribute values if puted data doesn't contain it
        data["tags"][0]["attributes"] = default_attr_values[data["tags"][0]["label_id"]]["all"]
        data["tracks"][0]["shapes"][1]["attributes"] = default_attr_values[data["tracks"][0]["label_id"]]["mutable"]
        self._check_response(response, data)

        data = response.data
        if not response.status_code in [
            status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]:
            data["tags"][0]["label_id"] = task["labels"][0]["id"]
            data["shapes"][0]["points"] = [1, 2, 3.0, 100, 120, 1, 2, 4.0]
            data["shapes"][0]["type"] = "polygon"
            data["tracks"][0]["group"] = 10
            data["tracks"][0]["shapes"][0]["outside"] = False
            data["tracks"][0]["shapes"][0]["occluded"] = False

        response = self._patch_api_v1_jobs_id_data(job["id"], annotator,
            "update", data)
        data["version"] = data.get("version", 0) + 1 # need to update the version
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._get_api_v1_jobs_id_data(job["id"], annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._patch_api_v1_jobs_id_data(job["id"], annotator,
            "delete", data)
        data["version"] += 1 # need to update the version
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        data = {
            "version": data["version"],
            "tags": [],
            "shapes": [],
            "tracks": []
        }
        response = self._get_api_v1_jobs_id_data(job["id"], annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        data = {
            "version": data["version"],
            "tags": [
                {
                    "frame": 0,
                    "label_id": 11010101,
                    "group": None,
                    "attributes": []
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": [
                        {
                            "spec_id": 32234234,
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][0]["default_value"]
                        }
                    ],
                    "points": [1.0, 2.1, 100, 300.222],
                    "type": "rectangle",
                    "occluded": False
                },
                {
                    "frame": 1,
                    "label_id": 1212121,
                    "group": None,
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": 0,
                    "group": None,
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 0,
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                            "attributes": [
                                {
                                    "spec_id": 10000,
                                    "value": task["labels"][0]["attributes"][0]["values"][0]
                                },
                                {
                                    "spec_id": task["labels"][0]["attributes"][1]["id"],
                                    "value": task["labels"][0]["attributes"][1]["default_value"]
                                }
                            ]
                        },
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [2.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": True,
                            "outside": True
                        },
                    ]
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False
                        }
                    ]
                },
            ]
        }
        response = self._patch_api_v1_jobs_id_data(job["id"], annotator,
            "create", data)
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    def test_api_v1_jobs_id_annotations_admin(self):
        self._run_api_v1_jobs_id_annotations(self.admin, self.assignee,
            self.assignee)

    def test_api_v1_jobs_id_annotations_user(self):
        self._run_api_v1_jobs_id_annotations(self.user, self.assignee,
            self.assignee)

    def test_api_v1_jobs_id_annotations_observer(self):
        _, jobs = self._create_task(self.user, self.assignee)
        job = jobs[0]
        data = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": []
        }

        response = self._get_api_v1_jobs_id_data(job["id"], self.observer)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self._put_api_v1_jobs_id_data(job["id"], self.observer, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self._patch_api_v1_jobs_id_data(job["id"], self.observer, "create", data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self._delete_api_v1_jobs_id_data(job["id"], self.observer)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_api_v1_jobs_id_annotations_no_auth(self):
        self._run_api_v1_jobs_id_annotations(self.user, self.assignee, None)

class TaskAnnotationAPITestCase(JobAnnotationAPITestCase):
    def _put_api_v1_tasks_id_annotations(self, pk, user, data):
        with ForceLogin(user, self.client):
            response = self.client.put("/api/v1/tasks/{}/annotations".format(pk),
                data=data, format="json")

        return response

    def _get_api_v1_tasks_id_annotations(self, pk, user):
        with ForceLogin(user, self.client):
            response = self.client.get("/api/v1/tasks/{}/annotations".format(pk))

        return response

    def _delete_api_v1_tasks_id_annotations(self, pk, user):
        with ForceLogin(user, self.client):
            response = self.client.delete("/api/v1/tasks/{}/annotations".format(pk),
            format="json")

        return response

    def _dump_api_v1_tasks_id_annotations(self, pk, user, query_params=""):
        with ForceLogin(user, self.client):
            response = self.client.get(
                "/api/v1/tasks/{0}/annotations{1}".format(pk, query_params))

        return response

    def _patch_api_v1_tasks_id_annotations(self, pk, user, action, data):
        with ForceLogin(user, self.client):
            response = self.client.patch(
                "/api/v1/tasks/{}/annotations?action={}".format(pk, action),
                data=data, format="json")

        return response

    def _upload_api_v1_tasks_id_annotations(self, pk, user, data, query_params=""):
        with ForceLogin(user, self.client):
            response = self.client.put(
                path="/api/v1/tasks/{0}/annotations?{1}".format(pk, query_params),
                data=data,
                format="multipart",
                )

        return response

    def _get_formats(self, user):
        with ForceLogin(user, self.client):
            response = self.client.get(
                path="/api/v1/server/annotation/formats"
            )
        return response

    def _check_response(self, response, data):
        if not response.status_code in [
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]:
            try:
                compare_objects(self, data, response.data, ignore_keys=["id"])
            except AssertionError as e:
                print("Objects are not equal: ", data, response.data)
                print(e)
                raise

    def _run_api_v1_tasks_id_annotations(self, owner, assignee, annotator):
        task, _ = self._create_task(owner, assignee)
        if annotator:
            HTTP_200_OK = status.HTTP_200_OK
            HTTP_204_NO_CONTENT = status.HTTP_204_NO_CONTENT
            HTTP_400_BAD_REQUEST = status.HTTP_400_BAD_REQUEST
        else:
            HTTP_200_OK = status.HTTP_401_UNAUTHORIZED
            HTTP_204_NO_CONTENT = status.HTTP_401_UNAUTHORIZED
            HTTP_400_BAD_REQUEST = status.HTTP_401_UNAUTHORIZED

        data = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": []
        }
        response = self._put_api_v1_tasks_id_annotations(task["id"], annotator, data)
        data["version"] += 1
        self.assertEqual(response.status_code, HTTP_200_OK)

        data = {
            "version": data["version"],
            "tags": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": []
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][0]["default_value"]
                        }
                    ],
                    "points": [1.0, 2.1, 100, 300.222],
                    "type": "rectangle",
                    "occluded": False
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                    ],
                    "shapes": [
                        {
                            "frame": 0,
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                            "attributes": [
                                {
                                    "spec_id": task["labels"][0]["attributes"][1]["id"],
                                    "value": task["labels"][0]["attributes"][1]["default_value"]
                                }
                            ]
                        },
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [2.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": True,
                            "outside": True
                        },
                    ]
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False
                        }
                    ]
                },
            ]
        }
        response = self._put_api_v1_tasks_id_annotations(task["id"], annotator, data)
        data["version"] += 1

        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        default_attr_values = self._get_default_attr_values(task)
        response = self._get_api_v1_tasks_id_annotations(task["id"], annotator)
        # server should add default attribute values if puted data doesn't contain it
        data["tags"][0]["attributes"] = default_attr_values[data["tags"][0]["label_id"]]["all"]
        data["tracks"][0]["shapes"][1]["attributes"] = default_attr_values[data["tracks"][0]["label_id"]]["mutable"]
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._delete_api_v1_tasks_id_annotations(task["id"], annotator)
        data["version"] += 1
        self.assertEqual(response.status_code, HTTP_204_NO_CONTENT)

        data = {
            "version": data["version"],
            "tags": [],
            "shapes": [],
            "tracks": []
        }
        response = self._get_api_v1_tasks_id_annotations(task["id"], annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        data = {
            "version": data["version"],
            "tags": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": []
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][0]["default_value"]
                        }
                    ],
                    "points": [1.0, 2.1, 100, 300.222],
                    "type": "rectangle",
                    "occluded": False
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                    ],
                    "shapes": [
                        {
                            "frame": 0,
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                            "attributes": [
                                {
                                    "spec_id": task["labels"][0]["attributes"][1]["id"],
                                    "value": task["labels"][0]["attributes"][1]["default_value"]
                                }
                            ]
                        },
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [2.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": True,
                            "outside": True
                        },
                    ]
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False
                        }
                    ]
                },
            ]
        }
        response = self._patch_api_v1_tasks_id_annotations(task["id"], annotator,
            "create", data)
        data["version"] += 1
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._get_api_v1_tasks_id_annotations(task["id"], annotator)
        # server should add default attribute values if puted data doesn't contain it
        data["tags"][0]["attributes"] = default_attr_values[data["tags"][0]["label_id"]]["all"]
        data["tracks"][0]["shapes"][1]["attributes"] = default_attr_values[data["tracks"][0]["label_id"]]["mutable"]
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        data = response.data
        if not response.status_code in [
            status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]:
            data["tags"][0]["label_id"] = task["labels"][0]["id"]
            data["shapes"][0]["points"] = [1, 2, 3.0, 100, 120, 1, 2, 4.0]
            data["shapes"][0]["type"] = "polygon"
            data["tracks"][0]["group"] = 10
            data["tracks"][0]["shapes"][0]["outside"] = False
            data["tracks"][0]["shapes"][0]["occluded"] = False

        response = self._patch_api_v1_tasks_id_annotations(task["id"], annotator,
            "update", data)
        data["version"] = data.get("version", 0) + 1
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._get_api_v1_tasks_id_annotations(task["id"], annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._patch_api_v1_tasks_id_annotations(task["id"], annotator,
            "delete", data)
        data["version"] += 1
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        data = {
            "version": data["version"],
            "tags": [],
            "shapes": [],
            "tracks": []
        }
        response = self._get_api_v1_tasks_id_annotations(task["id"], annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        data = {
            "version": data["version"],
            "tags": [
                {
                    "frame": 0,
                    "label_id": 11010101,
                    "group": None,
                    "attributes": []
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "attributes": [
                        {
                            "spec_id": 32234234,
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][0]["default_value"]
                        }
                    ],
                    "points": [1.0, 2.1, 100, 300.222],
                    "type": "rectangle",
                    "occluded": False
                },
                {
                    "frame": 1,
                    "label_id": 1212121,
                    "group": None,
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": 0,
                    "group": None,
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 0,
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                            "attributes": [
                                {
                                    "spec_id": 10000,
                                    "value": task["labels"][0]["attributes"][0]["values"][0]
                                },
                                {
                                    "spec_id": task["labels"][0]["attributes"][1]["id"],
                                    "value": task["labels"][0]["attributes"][0]["default_value"]
                                }
                            ]
                        },
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [2.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": True,
                            "outside": True
                        },
                    ]
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False
                        }
                    ]
                },
            ]
        }
        response = self._patch_api_v1_tasks_id_annotations(task["id"], annotator,
            "create", data)
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    def _run_api_v1_tasks_id_annotations_dump_load(self, owner, assignee, annotator):
        if annotator:
            HTTP_200_OK = status.HTTP_200_OK
            HTTP_204_NO_CONTENT = status.HTTP_204_NO_CONTENT
            HTTP_202_ACCEPTED = status.HTTP_202_ACCEPTED
            HTTP_201_CREATED = status.HTTP_201_CREATED
        else:
            HTTP_200_OK = status.HTTP_401_UNAUTHORIZED
            HTTP_204_NO_CONTENT = status.HTTP_401_UNAUTHORIZED
            HTTP_202_ACCEPTED = status.HTTP_401_UNAUTHORIZED
            HTTP_201_CREATED = status.HTTP_401_UNAUTHORIZED

        def _get_initial_annotation(annotation_format):
            rectangle_tracks_with_attrs = [{
                "frame": 0,
                "label_id": task["labels"][0]["id"],
                "group": 0,
                "attributes": [
                    {
                        "spec_id": task["labels"][0]["attributes"][0]["id"],
                        "value": task["labels"][0]["attributes"][0]["values"][0]
                    },
                ],
                "shapes": [
                    {
                        "frame": 0,
                        "points": [1.0, 2.1, 50.1, 30.22],
                        "type": "rectangle",
                        "occluded": False,
                        "outside": False,
                        "attributes": [
                            {
                                "spec_id": task["labels"][0]["attributes"][1]["id"],
                                "value": task["labels"][0]["attributes"][1]["default_value"]
                            }
                        ]
                    },
                    {
                        "frame": 1,
                        "points": [2.0, 2.1, 77.2, 36.22],
                        "type": "rectangle",
                        "occluded": True,
                        "outside": True,
                        "attributes": [
                            {
                                "spec_id": task["labels"][0]["attributes"][1]["id"],
                                "value": task["labels"][0]["attributes"][1]["default_value"]
                            }
                        ]
                    },
                ]
            }]
            rectangle_tracks_wo_attrs = [{
                "frame": 1,
                "label_id": task["labels"][1]["id"],
                "group": 0,
                "attributes": [],
                "shapes": [
                    {
                        "frame": 1,
                        "attributes": [],
                        "points": [1.0, 2.1, 50.2, 36.6],
                        "type": "rectangle",
                        "occluded": False,
                        "outside": False
                    },
                    {
                        "frame": 2,
                        "attributes": [],
                        "points": [1.0, 2.1, 51, 36.6],
                        "type": "rectangle",
                        "occluded": False,
                        "outside": True
                    }
                ]
            }]

            rectangle_shapes_with_attrs = [{
                "frame": 0,
                "label_id": task["labels"][0]["id"],
                "group": 0,
                "attributes": [
                    {
                        "spec_id": task["labels"][0]["attributes"][0]["id"],
                        "value": task["labels"][0]["attributes"][0]["values"][0]
                    },
                    {
                        "spec_id": task["labels"][0]["attributes"][1]["id"],
                        "value": task["labels"][0]["attributes"][1]["default_value"]
                    }
                ],
                "points": [1.0, 2.1, 10.6, 53.22],
                "type": "rectangle",
                "occluded": False
            }]

            rectangle_shapes_wo_attrs = [{
                "frame": 1,
                "label_id": task["labels"][1]["id"],
                "group": 0,
                "attributes": [],
                "points": [2.0, 2.1, 40, 50.7],
                "type": "rectangle",
                "occluded": False
            }]

            polygon_shapes_wo_attrs = [{
                "frame": 1,
                "label_id": task["labels"][1]["id"],
                "group": 0,
                "attributes": [],
                "points": [2.0, 2.1, 100, 30.22, 40, 77, 1, 3],
                "type": "polygon",
                "occluded": False
            }]

            polygon_shapes_with_attrs = [{
                "frame": 2,
                "label_id": task["labels"][0]["id"],
                "group": 1,
                "attributes": [
                    {
                        "spec_id": task["labels"][0]["attributes"][0]["id"],
                        "value": task["labels"][0]["attributes"][0]["values"][1]
                    },
                    {
                        "spec_id": task["labels"][0]["attributes"][1]["id"],
                        "value": task["labels"][0]["attributes"][1]["default_value"]
                    }
                ],
                "points": [20.0, 0.1, 10, 3.22, 4, 7, 10, 30, 1, 2, 4.44, 5.55],
                "type": "polygon",
                "occluded": True
            },
            {
                "frame": 2,
                "label_id": task["labels"][1]["id"],
                "group": 1,
                "attributes": [],
                "points": [4, 7, 10, 30, 4, 5.55],
                "type": "polygon",
                "occluded": False
            }]

            tags_wo_attrs = [{
                "frame": 2,
                "label_id": task["labels"][1]["id"],
                "group": 0,
                "attributes": []
            }]
            tags_with_attrs = [{
                "frame": 1,
                "label_id": task["labels"][0]["id"],
                "group": 3,
                "attributes": [
                    {
                        "spec_id": task["labels"][0]["attributes"][0]["id"],
                        "value": task["labels"][0]["attributes"][0]["values"][1]
                    },
                    {
                        "spec_id": task["labels"][0]["attributes"][1]["id"],
                        "value": task["labels"][0]["attributes"][1]["default_value"]
                    }
                ],
            }]

            annotations = {
                    "version": 0,
                    "tags": [],
                    "shapes": [],
                    "tracks": [],
                }
            if annotation_format == "CVAT for video 1.1":
                annotations["tracks"] = rectangle_tracks_with_attrs + rectangle_tracks_wo_attrs

            elif annotation_format == "CVAT for images 1.1":
                annotations["shapes"] = rectangle_shapes_with_attrs + rectangle_shapes_wo_attrs \
                    + polygon_shapes_wo_attrs + polygon_shapes_with_attrs
                annotations["tags"] = tags_with_attrs + tags_wo_attrs

            elif annotation_format == "PASCAL VOC 1.1":
                annotations["shapes"] = rectangle_shapes_wo_attrs
                annotations["tags"] = tags_wo_attrs

            elif annotation_format == "YOLO 1.1" or \
                 annotation_format == "TFRecord 1.0":
                annotations["shapes"] = rectangle_shapes_wo_attrs

            elif annotation_format == "COCO 1.0":
                annotations["shapes"] = polygon_shapes_wo_attrs

            elif annotation_format == "Segmentation mask 1.1":
                annotations["shapes"] = rectangle_shapes_wo_attrs + polygon_shapes_wo_attrs
                annotations["tracks"] = rectangle_tracks_wo_attrs

            elif annotation_format == "MOT 1.1":
                annotations["shapes"] = rectangle_shapes_wo_attrs
                annotations["tracks"] = rectangle_tracks_wo_attrs

            elif annotation_format == "LabelMe 3.0":
                annotations["shapes"] = rectangle_shapes_with_attrs + \
                                        rectangle_shapes_wo_attrs + \
                                        polygon_shapes_wo_attrs + \
                                        polygon_shapes_with_attrs

            elif annotation_format == "Datumaro 1.0":
                annotations["shapes"] = rectangle_shapes_with_attrs + \
                                        rectangle_shapes_wo_attrs + \
                                        polygon_shapes_wo_attrs + \
                                        polygon_shapes_with_attrs
                annotations["tags"] = tags_with_attrs + tags_wo_attrs

            else:
                raise Exception("Unknown format {}".format(annotation_format))

            return annotations

        response = self._get_formats(annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        if annotator is not None:
            data = response.data
        else:
            data = self._get_formats(owner).data
        import_formats = data['importers']
        export_formats = data['exporters']
        self.assertTrue(isinstance(import_formats, list) and import_formats)
        self.assertTrue(isinstance(export_formats, list) and export_formats)
        import_formats = { v['name']: v for v in import_formats }
        export_formats = { v['name']: v for v in export_formats }

        formats = { exp: exp if exp in import_formats else None
            for exp in export_formats }
        if 'CVAT 1.1' in import_formats:
            if 'CVAT for video 1.1' in export_formats:
                formats['CVAT for video 1.1'] = 'CVAT 1.1'
            if 'CVAT for images 1.1' in export_formats:
                formats['CVAT for images 1.1'] = 'CVAT 1.1'
        if set(import_formats) ^ set(export_formats):
            # NOTE: this may not be an error, so we should not fail
            print("The following import formats have no pair:",
                set(import_formats) - set(export_formats))
            print("The following export formats have no pair:",
                set(export_formats) - set(import_formats))

        for export_format, import_format in formats.items():
            with self.subTest(export_format=export_format,
                    import_format=import_format):
                # 1. create task
                task, jobs = self._create_task(owner, assignee)

                # 2. add annotation
                data = _get_initial_annotation(export_format)
                response = self._put_api_v1_tasks_id_annotations(task["id"], annotator, data)
                data["version"] += 1

                self.assertEqual(response.status_code, HTTP_200_OK)
                self._check_response(response, data)

                # 3. download annotation
                response = self._dump_api_v1_tasks_id_annotations(task["id"], annotator,
                    "?format={}".format(export_format))
                if annotator and not export_formats[export_format]['enabled']:
                    self.assertEqual(response.status_code,
                        status.HTTP_405_METHOD_NOT_ALLOWED)
                    continue
                else:
                    self.assertEqual(response.status_code, HTTP_202_ACCEPTED)

                response = self._dump_api_v1_tasks_id_annotations(task["id"], annotator,
                    "?format={}".format(export_format))
                self.assertEqual(response.status_code, HTTP_201_CREATED)

                response = self._dump_api_v1_tasks_id_annotations(task["id"], annotator,
                    "?format={}&action=download".format(export_format))
                self.assertEqual(response.status_code, HTTP_200_OK)

                # 4. check downloaded data
                if annotator is not None:
                    self.assertTrue(response.streaming)
                    content = io.BytesIO(b"".join(response.streaming_content))
                    self._check_dump_content(content, task, jobs, data, export_format)
                    content.seek(0)
                else:
                    content = io.BytesIO()

                # 5. remove annotation form the task
                response = self._delete_api_v1_tasks_id_annotations(task["id"], annotator)
                data["version"] += 1
                self.assertEqual(response.status_code, HTTP_204_NO_CONTENT)

                # 6. upload annotation
                if not import_format:
                    continue

                uploaded_data = {
                    "annotation_file": content,
                }
                response = self._upload_api_v1_tasks_id_annotations(
                    task["id"], annotator, uploaded_data,
                    "format={}".format(import_format))
                self.assertEqual(response.status_code, HTTP_202_ACCEPTED)

                response = self._upload_api_v1_tasks_id_annotations(
                    task["id"], annotator, {},
                    "format={}".format(import_format))
                self.assertEqual(response.status_code, HTTP_201_CREATED)

                # 7. check annotation
                if import_format == "Segmentation mask 1.1":
                    continue # can't really predict the result to check
                response = self._get_api_v1_tasks_id_annotations(task["id"], annotator)
                self.assertEqual(response.status_code, HTTP_200_OK)

                if annotator is None:
                    continue
                data["version"] += 2 # upload is delete + put
                self._check_response(response, data)

    def _check_dump_content(self, content, task, jobs, data, format_name):
        def etree_to_dict(t):
            d = {t.tag: {} if t.attrib else None}
            children = list(t)
            if children:
                dd = defaultdict(list)
                for dc in map(etree_to_dict, children):
                    for k, v in dc.items():
                        dd[k].append(v)
                d = {t.tag: {k: v[0] if len(v) == 1 else v
                    for k, v in dd.items()}}
            if t.attrib:
                d[t.tag].update(('@' + k, v) for k, v in t.attrib.items())
            if t.text:
                text = t.text.strip()
                if not (children or t.attrib):
                    d[t.tag] = text
            return d

        if format_name in {"CVAT for video 1.1", "CVAT for images 1.1"}:
            with tempfile.TemporaryDirectory() as tmp_dir:
                zipfile.ZipFile(content).extractall(tmp_dir)
                xmls = glob(osp.join(tmp_dir, '**', '*.xml'), recursive=True)
                self.assertTrue(xmls)
                for xml in xmls:
                    xmlroot = ET.parse(xml).getroot()
                    self.assertEqual(xmlroot.tag, "annotations")
                    tags = xmlroot.findall("./meta")
                    self.assertEqual(len(tags), 1)
                    meta = etree_to_dict(tags[0])["meta"]
                    self.assertEqual(meta["task"]["name"], task["name"])
        elif format_name == "PASCAL VOC 1.1":
            self.assertTrue(zipfile.is_zipfile(content))
        elif format_name == "YOLO 1.1":
            self.assertTrue(zipfile.is_zipfile(content))
        elif format_name == "COCO 1.0":
            with tempfile.TemporaryDirectory() as tmp_dir:
                zipfile.ZipFile(content).extractall(tmp_dir)
                jsons = glob(osp.join(tmp_dir, '**', '*.json'), recursive=True)
                self.assertTrue(jsons)
                for json in jsons:
                    coco = coco_loader.COCO(json)
                    self.assertTrue(coco.getAnnIds())
        elif format_name == "TFRecord 1.0":
            self.assertTrue(zipfile.is_zipfile(content))
        elif format_name == "Segmentation mask 1.1":
            self.assertTrue(zipfile.is_zipfile(content))


    def _run_coco_annotation_upload_test(self, user):
        def generate_coco_anno():
            return b"""{
            "categories": [
                {
                "id": 1,
                "name": "car",
                "supercategory": ""
                },
                {
                "id": 2,
                "name": "person",
                "supercategory": ""
                }
            ],
            "images": [
                {
                "coco_url": "",
                "date_captured": "",
                "flickr_url": "",
                "license": 0,
                "id": 0,
                "file_name": "test_1.jpg",
                "height": 720,
                "width": 1280
                }
            ],
            "annotations": [
                {
                "category_id": 1,
                "id": 1,
                "image_id": 0,
                "iscrowd": 0,
                "segmentation": [
                    []
                ],
                "area": 17702.0,
                "bbox": [
                    574.0,
                    407.0,
                    167.0,
                    106.0
                ]
                }
            ]
            }"""

        task, _ = self._create_task(user, user)

        content = io.BytesIO(generate_coco_anno())
        content.seek(0)

        format_name = "COCO 1.0"
        uploaded_data = {
            "annotation_file": content,
        }
        response = self._upload_api_v1_tasks_id_annotations(
            task["id"], user, uploaded_data,
            "format={}".format(format_name))
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        response = self._upload_api_v1_tasks_id_annotations(
            task["id"], user, {}, "format={}".format(format_name))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self._get_api_v1_tasks_id_annotations(task["id"], user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_api_v1_tasks_id_annotations_admin(self):
        self._run_api_v1_tasks_id_annotations(self.admin, self.assignee,
            self.assignee)

    def test_api_v1_tasks_id_annotations_user(self):
        self._run_api_v1_tasks_id_annotations(self.user, self.assignee,
            self.assignee)

    def test_api_v1_tasks_id_annotations_no_auth(self):
        self._run_api_v1_tasks_id_annotations(self.user, self.assignee, None)

    def test_api_v1_tasks_id_annotations_dump_load_admin(self):
        self._run_api_v1_tasks_id_annotations_dump_load(self.admin, self.assignee,
            self.assignee)

    def test_api_v1_tasks_id_annotations_dump_load_user(self):
        self._run_api_v1_tasks_id_annotations_dump_load(self.user, self.assignee,
            self.assignee)

    def test_api_v1_tasks_id_annotations_dump_load_no_auth(self):
        self._run_api_v1_tasks_id_annotations_dump_load(self.user, self.assignee, None)

    def test_api_v1_tasks_id_annotations_upload_coco_user(self):
        self._run_coco_annotation_upload_test(self.user)

class ServerShareAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        path = os.path.join(settings.SHARE_ROOT, "file0.txt")
        open(path, "w").write("test string")
        path = os.path.join(settings.SHARE_ROOT, "test1")
        os.makedirs(path)
        path = os.path.join(path, "file1.txt")
        open(path, "w").write("test string")
        directory = os.path.join(settings.SHARE_ROOT, "test1", "test3")
        os.makedirs(directory)
        path = os.path.join(settings.SHARE_ROOT, "test2")
        os.makedirs(path)
        path = os.path.join(path, "file2.txt")
        open(path, "w").write("test string")

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        path = os.path.join(settings.SHARE_ROOT, "file0.txt")
        os.remove(path)
        path = os.path.join(settings.SHARE_ROOT, "test1")
        shutil.rmtree(path)
        path = os.path.join(settings.SHARE_ROOT, "test2")
        shutil.rmtree(path)

    def _run_api_v1_server_share(self, user, directory):
        with ForceLogin(user, self.client):
            response = self.client.get(
                '/api/v1/server/share?directory={}'.format(directory))

        return response

    def _test_api_v1_server_share(self, user):
        data = [
            {"name": "test1", "type": "DIR"},
            {"name": "test2", "type": "DIR"},
            {"name": "file0.txt", "type": "REG"},
        ]

        response = self._run_api_v1_server_share(user, "/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        compare_objects(
            self=self,
            obj1=sorted(data, key=lambda d: d["name"]),
            obj2=sorted(response.data, key=lambda d: d["name"]),
            ignore_keys=[]
        )

        data = [
            {"name": "file1.txt", "type": "REG"},
            {"name": "test3", "type": "DIR"},
        ]
        response = self._run_api_v1_server_share(user, "/test1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        compare_objects(
            self=self,
            obj1=sorted(data, key=lambda d: d["name"]),
            obj2=sorted(response.data, key=lambda d: d["name"]),
            ignore_keys=[]
        )

        data = []
        response = self._run_api_v1_server_share(user, "/test1/test3")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        compare_objects(
            self=self,
            obj1=sorted(data, key=lambda d: d["name"]),
            obj2=sorted(response.data, key=lambda d: d["name"]),
            ignore_keys=[]
        )

        data = [
            {"name": "file2.txt", "type": "REG"},
        ]
        response = self._run_api_v1_server_share(user, "/test2")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        compare_objects(
            self=self,
            obj1=sorted(data, key=lambda d: d["name"]),
            obj2=sorted(response.data, key=lambda d: d["name"]),
            ignore_keys=[]
        )

        response = self._run_api_v1_server_share(user, "/test4")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_api_v1_server_share_admin(self):
        self._test_api_v1_server_share(self.admin)

    def test_api_v1_server_share_owner(self):
        self._test_api_v1_server_share(self.owner)

    def test_api_v1_server_share_assignee(self):
        self._test_api_v1_server_share(self.assignee)

    def test_api_v1_server_share_user(self):
        self._test_api_v1_server_share(self.user)

    def test_api_v1_server_share_annotator(self):
        self._test_api_v1_server_share(self.annotator)

    def test_api_v1_server_share_observer(self):
        self._test_api_v1_server_share(self.observer)

    def test_api_v1_server_share_no_auth(self):
        response = self._run_api_v1_server_share(None, "/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
