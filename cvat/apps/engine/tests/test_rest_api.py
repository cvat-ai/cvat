# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth.models import User, Group
from cvat.apps.engine.models import Task, Segment, Job, StatusChoice

def setUpModule():
    import logging
    global django_request_logger
    global django_request_loglevel

    django_request_logger = logging.getLogger('django.request')
    django_request_loglevel = django_request_logger.getEffectiveLevel()
    django_request_logger.setLevel(logging.ERROR)

def tearDownModule():
    django_request_logger.setLevel(django_request_loglevel)


def createUsers(cls):
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
    cls.owner = user_owner
    cls.assignee = user_assignee
    cls.annotator = user_annotator
    cls.observer = user_observer
    cls.user = user_dummy

def createTask(cls):
    task = {
        "name": "my test task",
        "owner": cls.owner,
        "assignee": cls.assignee,
        "overlap": 0,
        "segment_size": 100,
        "z_order": False,
        "image_quality": 75,
        "size": 100
    }
    cls.task = Task.objects.create(**task)

    segment = {
        "start_frame": 0,
        "stop_frame": 100
    }
    cls.segment = Segment.objects.create(task=cls.task, **segment)
    cls.job = Job.objects.create(segment=cls.segment, assignee=cls.annotator)


class JobGetAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        createUsers(cls)
        createTask(cls)

    def _run_api_v1_jobs_id(self, jid, user):
        if user:
            self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

        response = self.client.get('/api/v1/jobs/{}'.format(jid))

        if user:
            self.client.logout()

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
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self._run_api_v1_jobs_id(self.job.id + 10, None)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class JobUpdateAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        createTask(self)

    @classmethod
    def setUpTestData(cls):
        createUsers(cls)

    def _run_api_v1_jobs_id(self, jid, user, data):
        if user:
            self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

        response = self.client.put('/api/v1/jobs/{}'.format(jid), data=data, format='json')

        if user:
            self.client.logout()

        return response

    def _check_request(self, response, data):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.job.id)
        self.assertEqual(response.data["status"], data.get('status', self.job.status))
        self.assertEqual(response.data["assignee"], data.get('assignee', self.job.assignee.id))
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
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self._run_api_v1_jobs_id(self.job.id + 10, None, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class JobPartialUpdateAPITestCase(JobUpdateAPITestCase):
    def _run_api_v1_jobs_id(self, jid, user, data):
        if user:
            self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

        response = self.client.patch('/api/v1/jobs/{}'.format(jid), data=data, format='json')

        if user:
            self.client.logout()

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
        createUsers(cls)

    def _run_api_v1_server_about(self, user):
        if user:
            self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

        response = self.client.get('/api/v1/server/about')

        if user:
            self.client.logout()

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
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class ServerExceptionAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        createUsers(cls)
        cls.data = {
            "system": "Linux",
            "client": "rest_framework.APIClient",
            "task": None,
            "job": None,
            "message": "just test message",
            "filename": "http://localhost/my_file.js",
            "line": 1,
            "column": 1,
            "stack": None
        }

    def _run_api_v1_server_exception(self, user):
        if user:
            self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

        response = self.client.post('/api/v1/server/exception', self.data, format='json')

        if user:
            self.client.logout()

        return response

    def test_api_v1_server_exception_admin(self):
        response = self._run_api_v1_server_exception(self.admin)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_api_v1_server_exception_user(self):
        response = self._run_api_v1_server_exception(self.user)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_api_v1_server_exception_no_auth(self):
        response = self._run_api_v1_server_exception(None)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class UserListAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        createUsers(cls)

    def _run_api_v1_users(self, user):
        if user:
            self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

        response = self.client.get('/api/v1/users')

        if user:
            self.client.logout()

        return response

    def test_api_v1_users_admin(self):
        response = self._run_api_v1_users(self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            ["admin", "user1", "user2", "user3", "user4", "user5"],
            [res["username"] for res in response.data["results"]])

    def test_api_v1_users_user(self):
        response = self._run_api_v1_users(self.user)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v1_users_no_auth(self):
        response = self._run_api_v1_users(None)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class UserSelfAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        createUsers(cls)

    def _run_api_v1_users_self(self, user):
        if user:
            self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

        response = self.client.get('/api/v1/users/self')

        if user:
            self.client.logout()

        return response

    def _check_response(self, user, response):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], user.username)

    def test_api_v1_users_self_admin(self):
        response = self._run_api_v1_users_self(self.admin)
        self._check_response(self.admin, response)

    def test_api_v1_users_self_user(self):
        response = self._run_api_v1_users_self(self.user)
        self._check_response(self.user, response)

    def test_api_v1_users_self_annotator(self):
        response = self._run_api_v1_users_self(self.annotator)
        self._check_response(self.annotator, response)


    def test_api_v1_users_self_no_auth(self):
        response = self._run_api_v1_users_self(None)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class UserGetAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        createUsers(cls)

    def _run_api_v1_users_id(self, user, id):
        if user:
            self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

        response = self.client.get('/api/v1/users/{}'.format(id))

        if user:
            self.client.logout()

        return response

    def _check_response(self, user, response):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], user.id)
        self.assertEqual(response.data["username"], user.username)

    def test_api_v1_users_id_admin(self):
        response = self._run_api_v1_users_id(self.admin, self.user.id)
        self._check_response(self.user, response)

        response = self._run_api_v1_users_id(self.admin, self.admin.id)
        self._check_response(self.admin, response)

        response = self._run_api_v1_users_id(self.admin, self.owner.id)
        self._check_response(self.owner, response)

    def test_api_v1_users_id_user(self):
        response = self._run_api_v1_users_id(self.user, self.user.id)
        self._check_response(self.user, response)

        response = self._run_api_v1_users_id(self.user, self.owner.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v1_users_id_annotator(self):
        response = self._run_api_v1_users_id(self.annotator, self.annotator.id)
        self._check_response(self.annotator, response)

        response = self._run_api_v1_users_id(self.annotator, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v1_users_id_no_auth(self):
        response = self._run_api_v1_users_id(None, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class UserUpdateAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        createUsers(self)

    def _run_api_v1_users_id(self, user, id, data):
        if user:
            self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

        response = self.client.put('/api/v1/users/{}'.format(id), data=data)

        if user:
            self.client.logout()

        return response

    def test_api_v1_users_id_admin(self):
        data = {"username": "user09", "groups": ["user", "admin"],
            "first_name": "my name"}
        response = self._run_api_v1_users_id(self.admin, self.user.id, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user09 = User.objects.get(id=self.user.id)
        self.assertEqual(user09.username, data["username"])
        self.assertEqual(user09.first_name, data["first_name"])

    def test_api_v1_users_id_user(self):
        data = {"username": "user10", "groups": ["user", "annotator"],
            "first_name": "my name"}
        response = self._run_api_v1_users_id(self.user, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v1_users_id_annotator(self):
        data = {"username": "user11", "groups": ["annotator"],
            "first_name": "my name"}
        response = self._run_api_v1_users_id(self.annotator, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v1_users_id_no_auth(self):
        data = {"username": "user12", "groups": ["user", "observer"],
            "first_name": "my name"}
        response = self._run_api_v1_users_id(None, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class UserPartialUpdateAPITestCase(UserUpdateAPITestCase):
    def _run_api_v1_users_id(self, user, id, data):
        if user:
            self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

        response = self.client.patch('/api/v1/users/{}'.format(id), data=data)

        if user:
            self.client.logout()

        return response

    def test_api_v1_users_id_admin_partial(self):
        data = {"username": "user09", "last_name": "my last name"}
        response = self._run_api_v1_users_id(self.admin, self.user.id, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user09 = User.objects.get(id=self.user.id)
        self.assertEqual(user09.username, data["username"])
        self.assertEqual(user09.last_name, data["last_name"])

    def test_api_v1_users_id_user_partial(self):
        data = {"username": "user10", "first_name": "my name"}
        response = self._run_api_v1_users_id(self.user, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v1_users_id_no_auth_partial(self):
        data = {"username": "user12"}
        response = self._run_api_v1_users_id(None, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

def createManyTasks(cls):
    cls.tasks = []

    task = {
        "name": "my task #1",
        "owner": cls.owner,
        "assignee": cls.assignee,
        "overlap": 0,
        "segment_size": 100,
        "z_order": False,
        "image_quality": 75,
        "size": 100
    }
    db_task = Task.objects.create(**task)

    segment = {
        "start_frame": 0,
        "stop_frame": 99
    }
    db_segment = Segment.objects.create(task=db_task, **segment)
    db_job = Job.objects.create(segment=db_segment, assignee=cls.annotator)

    cls.tasks.append(db_task)

    task = {
        "name": "my multijob task",
        "owner": cls.user,
        "overlap": 0,
        "segment_size": 100,
        "z_order": True,
        "image_quality": 50,
        "size": 200
    }
    db_task = Task.objects.create(**task)

    segment = {
        "start_frame": 0,
        "stop_frame": 99
    }
    db_segment = Segment.objects.create(task=db_task, **segment)
    db_job = Job.objects.create(segment=db_segment, assignee=cls.annotator)

    segment = {
        "start_frame": 100,
        "stop_frame": 199
    }
    db_segment = Segment.objects.create(task=db_task, **segment)
    db_job = Job.objects.create(segment=db_segment, assignee=cls.annotator)

    cls.tasks.append(db_task)

    task = {
        "name": "my task #2",
        "owner": cls.owner,
        "assignee": cls.assignee,
        "overlap": 0,
        "segment_size": 100,
        "z_order": False,
        "image_quality": 75,
        "size": 100
    }
    db_task = Task.objects.create(**task)

    segment = {
        "start_frame": 0,
        "stop_frame": 99
    }
    db_segment = Segment.objects.create(task=db_task, **segment)
    db_job = Job.objects.create(segment=db_segment, assignee=cls.annotator)

    cls.tasks.append(db_task)

    task = {
        "name": "super task",
        "owner": cls.admin,
        "overlap": 0,
        "segment_size": 50,
        "z_order": False,
        "image_quality": 95,
        "size": 50
    }
    db_task = Task.objects.create(**task)

    segment = {
        "start_frame": 0,
        "stop_frame": 49
    }
    db_segment = Segment.objects.create(task=db_task, **segment)
    db_job = Job.objects.create(segment=db_segment, assignee=cls.annotator)

    cls.tasks.append(db_task)


class TaskListAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        createUsers(cls)
        createManyTasks(cls)

    def _run_api_v1_tasks(self, user, params=""):
        if user:
            self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

        response = self.client.get('/api/v1/tasks{}'.format(params))

        if user:
            self.client.logout()

        return response

    def test_api_v1_tasks_admin(self):
        response = self._run_api_v1_tasks(self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            [task.name for task in self.tasks],
            [res["name"] for res in response.data["results"]])

    def test_api_v1_tasks_user(self):
        response = self._run_api_v1_tasks(self.user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            [task.name for task in self.tasks if task.owner == self.user],
            [res["name"] for res in response.data["results"]])

    def test_api_v1_tasks_observer(self):
        response = self._run_api_v1_tasks(self.observer)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            [task.name for task in self.tasks],
            [res["name"] for res in response.data["results"]])

    def test_api_v1_tasks_no_auth(self):
        response = self._run_api_v1_tasks(None)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TaskGetAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()

    @classmethod
    def setUpTestData(cls):
        createUsers(cls)
        createManyTasks(cls)

    def _run_api_v1_tasks_id(self, tid, user):
        if user:
            self.client.force_login(user, backend='django.contrib.auth.backends.ModelBackend')

        response = self.client.get('/api/v1/tasks/{}'.format(tid))

        if user:
            self.client.logout()

        return response

    def _check_response(self, response, db_task):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], db_task.name)
        self.assertEqual(response.data["size"], db_task.size)
        self.assertEqual(response.data["mode"], db_task.mode)
        owner = db_task.owner.id if db_task.owner else None
        self.assertEqual(response.data["owner"], owner)
        assignee = db_task.assignee.id if db_task.assignee else None
        self.assertEqual(response.data["assignee"], assignee)
        self.assertEqual(response.data["overlap"], db_task.overlap)
        self.assertEqual(response.data["segment_size"], db_task.segment_size)
        self.assertEqual(response.data["z_order"], db_task.z_order)
        self.assertEqual(response.data["image_quality"], db_task.image_quality)
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
            else:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v1_tasks_id_admin(self):
        self._check_api_v1_tasks_id(self.admin)

    def test_api_v1_tasks_id_user(self):
        self._check_api_v1_tasks_id(self.user)

    def test_api_v1_tasks_id_observer(self):
        self._check_api_v1_tasks_id(self.observer)

    def test_api_v1_tasks_id_no_auth(self):
        self._check_api_v1_tasks_id(None)
