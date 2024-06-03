# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from contextlib import ExitStack
import io
from itertools import product
import os
import random
import shutil
import sysconfig
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from enum import Enum
from glob import glob
from io import BytesIO, IOBase
from unittest import mock
from time import sleep
import logging
import copy
import json

import av
import numpy as np
from pdf2image import convert_from_bytes
from pyunpack import Archive
from django.conf import settings
from django.contrib.auth.models import Group, User
from django.http import HttpResponse
from PIL import Image
from pycocotools import coco as coco_loader
from rest_framework import status
from rest_framework.test import APIClient

from datumaro.util.test_utils import current_function_name, TestDir
from cvat.apps.engine.models import (AttributeSpec, AttributeType, Data, Job,
    Project, Segment, StageChoice, StatusChoice, Task, Label, StorageMethodChoice,
    StorageChoice, DimensionType, SortingMethod)
from cvat.apps.engine.media_extractors import ValidateDimension, sort
from cvat.apps.engine.tests.utils import get_paginated_collection
from utils.dataset_manifest import ImageManifestManager, VideoManifestManager

from cvat.apps.engine.tests.utils import (ApiTestBase, ForceLogin,
    generate_image_file, generate_video_file)

#suppress av warnings
logging.getLogger('libav').setLevel(logging.ERROR)

def create_db_users(cls):
    (group_admin, _) = Group.objects.get_or_create(name="admin")
    (group_business, _) = Group.objects.get_or_create(name="business")
    (group_user, _) = Group.objects.get_or_create(name="user")
    (group_annotator, _) = Group.objects.get_or_create(name="worker")
    (group_somebody, _) = Group.objects.get_or_create(name="somebody")

    user_admin = User.objects.create_superuser(username="admin", email="",
        password="admin")
    user_admin.groups.add(group_admin)
    user_owner = User.objects.create_user(username="user1", password="user1")
    user_owner.groups.add(group_business)
    user_assignee = User.objects.create_user(username="user2", password="user2")
    user_assignee.groups.add(group_annotator)
    user_annotator = User.objects.create_user(username="user3", password="user3")
    user_annotator.groups.add(group_annotator)
    user_somebody = User.objects.create_user(username="user4", password="user4")
    user_somebody.groups.add(group_somebody)
    user_dummy = User.objects.create_user(username="user5", password="user5")
    user_dummy.groups.add(group_user)

    cls.admin = user_admin
    cls.owner = cls.user1 = user_owner
    cls.assignee = cls.user2 = user_assignee
    cls.annotator = cls.user3 = user_annotator
    cls.somebody = cls.user4 = user_somebody
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

    labels = data.pop('labels', None)
    db_task = Task.objects.create(**data)
    shutil.rmtree(db_task.get_dirname(), ignore_errors=True)
    os.makedirs(db_task.get_dirname())
    db_task.data = db_data
    db_task.save()

    if not labels is None:
        for label_data in labels:
            attributes = label_data.pop('attributes', None)
            db_label = Label(task=db_task, **label_data)
            db_label.save()

            if not attributes is None:
                for attribute_data in attributes:
                    db_attribute = AttributeSpec(label=db_label, **attribute_data)
                    db_attribute.save()

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

def create_db_project(data):
    labels = data.pop('labels', None)
    db_project = Project.objects.create(**data)
    shutil.rmtree(db_project.get_dirname(), ignore_errors=True)
    os.makedirs(db_project.get_dirname())

    if not labels is None:
        for label_data in labels:
            attributes = label_data.pop('attributes', None)
            db_label = Label(project=db_project, **label_data)
            db_label.save()

            if not attributes is None:
                for attribute_data in attributes:
                    db_attribute = AttributeSpec(label=db_label, **attribute_data)
                    db_attribute.save()

    return db_project

def create_dummy_db_tasks(obj, project=None):
    tasks = []

    data = {
        "name": "my task #1",
        "owner": obj.owner,
        "assignee": obj.assignee,
        "overlap": 0,
        "segment_size": 100,
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
    db_project = create_db_project(data)
    projects.append(db_project)

    data = {
        "name": "my project without assignee",
        "owner": obj.user,
    }
    db_project = create_db_project(data)
    create_dummy_db_tasks(obj, db_project)
    projects.append(db_project)

    data = {
        "name": "my big project",
        "owner": obj.owner,
        "assignee": obj.assignee,
    }
    db_project = create_db_project(data)
    create_dummy_db_tasks(obj, db_project)
    projects.append(db_project)

    data = {
        "name": "public project",
    }
    db_project = create_db_project(data)
    create_dummy_db_tasks(obj, db_project)
    projects.append(db_project)

    data = {
        "name": "super project",
        "owner": obj.admin,
        "assignee": obj.assignee,
    }
    db_project = create_db_project(data)
    create_dummy_db_tasks(obj, db_project)
    projects.append(db_project)

    return projects

class JobGetAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.task = create_dummy_db_tasks(cls)[0]
        cls.job = Job.objects.filter(segment__task_id=cls.task.id).first()
        cls.job.assignee = cls.annotator
        cls.job.save()

    def _run_api_v2_jobs_id(self, jid, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/jobs/{}'.format(jid))

        return response

    def _check_request(self, response):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.job.id)
        self.assertEqual(response.data["status"], StatusChoice.ANNOTATION)
        self.assertEqual(response.data["start_frame"], self.job.segment.start_frame)
        self.assertEqual(response.data["stop_frame"], self.job.segment.stop_frame)

    def test_api_v2_jobs_id_admin(self):
        response = self._run_api_v2_jobs_id(self.job.id, self.admin)
        self._check_request(response)
        response = self._run_api_v2_jobs_id(self.job.id + 10, self.admin)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v2_jobs_id_owner(self):
        response = self._run_api_v2_jobs_id(self.job.id, self.owner)
        self._check_request(response)
        response = self._run_api_v2_jobs_id(self.job.id + 10, self.owner)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v2_jobs_id_annotator(self):
        response = self._run_api_v2_jobs_id(self.job.id, self.annotator)
        self._check_request(response)
        response = self._run_api_v2_jobs_id(self.job.id + 10, self.annotator)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v2_jobs_id_somebody(self):
        response = self._run_api_v2_jobs_id(self.job.id, self.somebody)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self._run_api_v2_jobs_id(self.job.id + 10, self.somebody)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v2_jobs_id_user(self):
        response = self._run_api_v2_jobs_id(self.job.id, self.user)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self._run_api_v2_jobs_id(self.job.id + 10, self.user)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v2_jobs_id_no_auth(self):
        response = self._run_api_v2_jobs_id(self.job.id, None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        response = self._run_api_v2_jobs_id(self.job.id + 10, None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class JobPartialUpdateAPITestCase(ApiTestBase):
    def setUp(self):
        super().setUp()
        self.task = create_dummy_db_tasks(self)[0]
        self.job = Job.objects.filter(segment__task_id=self.task.id).first()
        self.job.assignee = self.annotator
        self.job.save()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _run_api_v2_jobs_id(self, jid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/jobs/{}'.format(jid), data=data, format='json')

        return response

    def _check_request(self, response, data):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.job.id)
        self.assertEqual(response.data["stage"], data.get('stage', self.job.status))
        assignee = self.job.assignee.id if self.job.assignee else None
        self.assertEqual(response.data["assignee"]["id"], data.get('assignee', assignee))
        self.assertEqual(response.data["start_frame"], self.job.segment.start_frame)
        self.assertEqual(response.data["stop_frame"], self.job.segment.stop_frame)

    def test_api_v2_jobs_id_admin(self):
        data = {"stage": StageChoice.ANNOTATION, "assignee": self.owner.id }
        response = self._run_api_v2_jobs_id(self.job.id, self.admin, data)
        self._check_request(response, data)
        response = self._run_api_v2_jobs_id(self.job.id + 10, self.admin, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v2_jobs_id_owner(self):
        data = {"stage": StageChoice.ANNOTATION, "assignee": self.owner.id}
        response = self._run_api_v2_jobs_id(self.job.id, self.owner, data)
        self._check_request(response, data)
        response = self._run_api_v2_jobs_id(self.job.id + 10, self.owner, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v2_jobs_id_annotator(self):
        data = {"stage": StageChoice.ANNOTATION, "assignee": self.annotator.id}
        response = self._run_api_v2_jobs_id(self.job.id, self.annotator, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self._run_api_v2_jobs_id(self.job.id + 10, self.annotator, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v2_jobs_id_somebody(self):
        data = {"stage": StageChoice.ANNOTATION, "assignee": self.admin.id}
        response = self._run_api_v2_jobs_id(self.job.id, self.somebody, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self._run_api_v2_jobs_id(self.job.id + 10, self.somebody, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v2_jobs_id_user(self):
        data = {"stage": StageChoice.ANNOTATION, "assignee": self.user.id}
        response = self._run_api_v2_jobs_id(self.job.id, self.user, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        response = self._run_api_v2_jobs_id(self.job.id + 10, self.user, data)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_v2_jobs_id_no_auth(self):
        data = {"stage": StageChoice.ANNOTATION, "assignee": self.user.id}
        response = self._run_api_v2_jobs_id(self.job.id, None, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        response = self._run_api_v2_jobs_id(self.job.id + 10, None, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_v2_jobs_id_annotator_partial(self):
        data = {"stage": StageChoice.ANNOTATION}
        response = self._run_api_v2_jobs_id(self.job.id, self.annotator, data)
        self.assertEquals(response.status_code, status.HTTP_403_FORBIDDEN, response)

    def test_api_v2_jobs_id_admin_partial(self):
        data = {"assignee_id": self.user.id}
        response = self._run_api_v2_jobs_id(self.job.id, self.owner, data)
        self._check_request(response, data)

class JobUpdateAPITestCase(ApiTestBase):
    def setUp(self):
        super().setUp()
        self.task = create_dummy_db_tasks(self)[0]
        self.job = Job.objects.filter(segment__task_id=self.task.id).first()
        self.job.assignee = self.annotator
        self.job.save()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _run_api_v2_jobs_id(self, jid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.put('/api/jobs/{}'.format(jid), data=data, format='json')

        return response

    def test_api_v2_jobs_id_annotator(self):
        data = {"stage": StageChoice.ANNOTATION}
        response = self._run_api_v2_jobs_id(self.job.id, self.annotator, data)
        self.assertEquals(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED, response)

    def test_api_v2_jobs_id_admin(self):
        data = {"assignee_id": self.user.id}
        response = self._run_api_v2_jobs_id(self.job.id, self.owner, data)
        self.assertEquals(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED, response)

class JobDataMetaPartialUpdateAPITestCase(ApiTestBase):
    def setUp(self):
        super().setUp()
        self.task = create_dummy_db_tasks(self)[0]
        self.job = Job.objects.filter(segment__task_id=self.task.id).first()
        self.job.assignee = self.annotator
        self.job.save()

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _run_api_v1_jobs_data_meta_id(self, jid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/jobs/{}/data/meta'.format(jid), data=data, format='json')

        return response

    def _check_response(self, response, db_data, data):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        deleted_frames = data.get("deleted_frames", db_data.deleted_frames)
        self.assertEqual(response.data["deleted_frames"], deleted_frames)

    def _check_api_v1_jobs_data_meta_id(self, user, data):
        response = self._run_api_v1_jobs_data_meta_id(self.job.id, user, data)
        if user is None:
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        elif user == self.job.segment.task.owner or user == self.job.segment.task.assignee or user == self.job.assignee or user.is_superuser:
            self._check_response(response, self.job.segment.task.data, data)
        else:
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v1_jobss_data_meta(self):
        data = {
            "deleted_frames": [1,2,3]
        }
        self._check_api_v1_jobs_data_meta_id(self.admin, data)

        data = {
            "deleted_frames": []
        }
        self._check_api_v1_jobs_data_meta_id(self.admin, data)

class ServerAboutAPITestCase(ApiTestBase):
    ACCEPT_HEADER_TEMPLATE = 'application/vnd.cvat+json; version={}'

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _run_api_v2_server_about(self, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/server/about')

        return response

    def _run_api_server_about(self, user, version):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/server/about',
                HTTP_ACCEPT=self.ACCEPT_HEADER_TEMPLATE.format(version))
        return response

    def _check_response_version(self, response, version):
        self.assertEqual(response.accepted_media_type, self.ACCEPT_HEADER_TEMPLATE.format(version))

    def _check_request(self, response):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.data.get("name", None))
        self.assertIsNotNone(response.data.get("description", None))
        self.assertIsNotNone(response.data.get("version", None))

    def test_api_v2_server_about_admin(self):
        response = self._run_api_v2_server_about(self.admin)
        self._check_request(response)

    def test_api_v2_server_about_user(self):
        response = self._run_api_v2_server_about(self.user)
        self._check_request(response)

    def test_api_v2_server_about_no_auth(self):
        response = self._run_api_v2_server_about(None)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_api_server_about_versions_admin(self):
        for version in settings.REST_FRAMEWORK['ALLOWED_VERSIONS']:
            response = self._run_api_server_about(self.admin, version)
            self._check_response_version(response, version)

class ServerExceptionAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.data = {
            "events": [{
            "scope": "send:exception",
            "timestamp": "2019-01-29T12:34:56.000000Z",
            "payload": json.dumps({
                "system": "Linux",
                "client": "rest_framework.APIClient",

                "task_id": 1,
                "job_id": 1,
                "proj_id": 2,
                "client_id": 12321235123,
                "message": "just test message",
                "filename": "http://localhost/my_file.js",
                "line": 1,
                "column": 1,
                "stack": "",
            })}],
            "timestamp": "2019-01-29T12:34:57.000000Z",
        }


    def _run_api_v2_server_exception(self, user):
        with ForceLogin(user, self.client):
            #pylint: disable=unused-variable
            with mock.patch("cvat.apps.events.views.vlogger") as vlogger:
                response = self.client.post('/api/events',
                    self.data, format='json')

        return response

    def test_api_v2_server_exception_admin(self):
        response = self._run_api_v2_server_exception(self.admin)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_api_v2_server_exception_user(self):
        response = self._run_api_v2_server_exception(self.user)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_api_v2_server_exception_no_auth(self):
        response = self._run_api_v2_server_exception(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ServerLogsAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.data = {
            "events": [{
                "scope": "debug:info",
                "timestamp": "2024-05-30T17:05:13.776Z",
                "task_id": 1,
                "job_id": 1,
                "project_id": 2,
                "organization": 2,
                "count": 1,
                "payload": json.dumps({
                    "client_id": 123456,
                    "message": "just test message",
                    "name": "add point",
                    "is_active": True,
                }),
            },
            {
                "timestamp": "2024-05-30T17:05:14.776Z",
                "scope": "debug:info",
            }],
            "timestamp": "2024-05-30T17:05:15.776Z",
        }


    def _run_api_v2_server_logs(self, user):
        with ForceLogin(user, self.client):
            #pylint: disable=unused-variable
            with mock.patch("cvat.apps.events.views.vlogger") as vlogger:
                response = self.client.post('/api/events',
                    self.data, format='json')

        return response

    def test_api_v2_server_logs_admin(self):
        response = self._run_api_v2_server_logs(self.admin)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_api_v2_server_logs_user(self):
        response = self._run_api_v2_server_logs(self.user)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_api_v2_server_logs_no_auth(self):
        response = self._run_api_v2_server_logs(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserAPITestCase(ApiTestBase):
    def setUp(self):
        super().setUp()
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
    def _run_api_v2_users(self, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/users')

        return response

    def _check_response(self, user, response, is_full=True):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user_info in response.data['results']:
            db_user = getattr(self, user_info['username'])
            self._check_data(db_user, user_info, is_full)

    def test_api_v2_users_admin(self):
        response = self._run_api_v2_users(self.admin)
        self._check_response(self.admin, response, True)

    def test_api_v2_users_user(self):
        response = self._run_api_v2_users(self.user)
        self._check_response(self.user, response, False)

    def test_api_v2_users_annotator(self):
        response = self._run_api_v2_users(self.annotator)
        self._check_response(self.annotator, response, False)

    def test_api_v2_users_somebody(self):
        response = self._run_api_v2_users(self.somebody)
        self._check_response(self.somebody, response, False)

    def test_api_v2_users_no_auth(self):
        response = self._run_api_v2_users(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class UserSelfAPITestCase(UserAPITestCase):
    def _run_api_v2_users_self(self, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/users/self')

        return response

    def test_api_v2_users_self_admin(self):
        response = self._run_api_v2_users_self(self.admin)
        self._check_response(self.admin, response)

    def test_api_v2_users_self_user(self):
        response = self._run_api_v2_users_self(self.user)
        self._check_response(self.user, response)

    def test_api_v2_users_self_annotator(self):
        response = self._run_api_v2_users_self(self.annotator)
        self._check_response(self.annotator, response)

    def test_api_v2_users_self_somebody(self):
        response = self._run_api_v2_users_self(self.somebody)
        self._check_response(self.somebody, response)

    def test_api_v2_users_self_no_auth(self):
        response = self._run_api_v2_users_self(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class UserGetAPITestCase(UserAPITestCase):
    def _run_api_v2_users_id(self, user, user_id):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/users/{}'.format(user_id))

        return response

    def test_api_v2_users_id_admin(self):
        response = self._run_api_v2_users_id(self.admin, self.user.id)
        self._check_response(self.user, response, True)

        response = self._run_api_v2_users_id(self.admin, self.admin.id)
        self._check_response(self.admin, response, True)

        response = self._run_api_v2_users_id(self.admin, self.owner.id)
        self._check_response(self.owner, response, True)

    def test_api_v2_users_id_user(self):
        response = self._run_api_v2_users_id(self.user, self.user.id)
        self._check_response(self.user, response, True)

        response = self._run_api_v2_users_id(self.user, self.owner.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v2_users_id_annotator(self):
        response = self._run_api_v2_users_id(self.annotator, self.annotator.id)
        self._check_response(self.annotator, response, True)

        response = self._run_api_v2_users_id(self.annotator, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v2_users_id_somebody(self):
        response = self._run_api_v2_users_id(self.somebody, self.somebody.id)
        self._check_response(self.somebody, response, True)

        response = self._run_api_v2_users_id(self.somebody, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v2_users_id_no_auth(self):
        response = self._run_api_v2_users_id(None, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class UserPartialUpdateAPITestCase(UserAPITestCase):
    def _run_api_v2_users_id(self, user, user_id, data):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/users/{}'.format(user_id), data=data, format='json')

        return response

    def _check_response_with_data(self, user, response, data, is_full):
        # refresh information about the user from DB
        user = User.objects.get(id=user.id)
        for k,v in data.items():
            self.assertEqual(response.data[k], v)
        self._check_response(user, response, is_full)

    def test_api_v2_users_id_admin_partial(self):
        data = {"username": "user09", "last_name": "my last name"}
        response = self._run_api_v2_users_id(self.admin, self.user.id, data)

        self._check_response_with_data(self.user, response, data, True)

    def test_api_v2_users_id_user_partial(self):
        data = {"username": "user10", "first_name": "my name"}
        response = self._run_api_v2_users_id(self.user, self.user.id, data)
        self._check_response_with_data(self.user, response, data, False)

        data = {"is_staff": True}
        response = self._run_api_v2_users_id(self.user, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        data = {"username": "admin", "is_superuser": True}
        response = self._run_api_v2_users_id(self.user, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        data = {"username": "non_active", "is_active": False}
        response = self._run_api_v2_users_id(self.user, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        data = {"username": "annotator01", "first_name": "slave"}
        response = self._run_api_v2_users_id(self.user, self.annotator.id, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v2_users_id_no_auth_partial(self):
        data = {"username": "user12"}
        response = self._run_api_v2_users_id(None, self.user.id, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class UserDeleteAPITestCase(UserAPITestCase):
    def _run_api_v2_users_id(self, user, user_id):
        with ForceLogin(user, self.client):
            response = self.client.delete('/api/users/{}'.format(user_id))

        return response

    def test_api_v2_users_id_admin(self):
        response = self._run_api_v2_users_id(self.admin, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        response = self._run_api_v2_users_id(self.admin, self.admin.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_api_v2_users_id_user(self):
        response = self._run_api_v2_users_id(self.user, self.owner.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self._run_api_v2_users_id(self.user, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_api_v2_users_id_annotator(self):
        response = self._run_api_v2_users_id(self.annotator, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self._run_api_v2_users_id(self.annotator, self.annotator.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_api_v2_users_id_somebody(self):
        response = self._run_api_v2_users_id(self.somebody, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self._run_api_v2_users_id(self.somebody, self.somebody.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_api_v2_users_id_no_auth(self):
        response = self._run_api_v2_users_id(None, self.user.id)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class ProjectListAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.projects = create_dummy_db_projects(cls)

    def _run_api_v2_projects(self, user, params=""):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/projects{}'.format(params))

        return response

    def test_api_v2_projects_admin(self):
        response = self._run_api_v2_projects(self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([project.name for project in self.projects]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v2_projects_user(self):
        response = self._run_api_v2_projects(self.user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([project.name for project in self.projects
                if self.user in [project.owner, project.assignee]]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v2_projects_somebody(self):
        response = self._run_api_v2_projects(self.somebody)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual([],
            [res["name"] for res in response.data["results"]])

    def test_api_v2_projects_no_auth(self):
        response = self._run_api_v2_projects(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class ProjectGetAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.projects = create_dummy_db_projects(cls)

    def _run_api_v2_projects_id(self, pid, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/projects/{}'.format(pid))

        return response

    def _check_response(self, response, db_project):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], db_project.name)
        owner = db_project.owner.id if db_project.owner else None
        response_owner = response.data["owner"]["id"] if response.data["owner"] else None
        self.assertEqual(response_owner, owner)
        assignee = db_project.assignee.id if db_project.assignee else None
        response_assignee = response.data["assignee"]["id"] if response.data["assignee"] else None
        self.assertEqual(response_assignee, assignee)
        self.assertEqual(response.data["status"], db_project.status)
        self.assertEqual(response.data["bug_tracker"], db_project.bug_tracker)

    def _check_api_v2_projects_id(self, user):
        for db_project in self.projects:
            response = self._run_api_v2_projects_id(db_project.id, user)
            if user is None:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            elif user == db_project.owner or user == db_project.assignee or user.is_superuser:
                self._check_response(response, db_project)
            else:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v2_projects_id_admin(self):
        self._check_api_v2_projects_id(self.admin)

    def test_api_v2_projects_id_user(self):
        self._check_api_v2_projects_id(self.user)

    def test_api_v2_projects_id_somebody(self):
        self._check_api_v2_projects_id(self.somebody)

    def test_api_v2_projects_id_no_auth(self):
        self._check_api_v2_projects_id(None)

class ProjectDeleteAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.projects = create_dummy_db_projects(cls)

    def _run_api_v2_projects_id(self, pid, user):
        with ForceLogin(user, self.client):
            response = self.client.delete('/api/projects/{}'.format(pid), format="json")

        return response

    def _check_api_v2_projects_id(self, user):
        for db_project in self.projects:
            response = self._run_api_v2_projects_id(db_project.id, user)
            if user is None:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            elif user == db_project.owner or user.is_superuser:
                self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
            else:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_api_v2_projects_id_admin(self):
        self._check_api_v2_projects_id(self.admin)

    def test_api_v2_projects_id_user(self):
        self._check_api_v2_projects_id(self.user)

    def test_api_v2_projects_id_somebody(self):
        self._check_api_v2_projects_id(self.somebody)

    def test_api_v2_projects_id_no_auth(self):
        self._check_api_v2_projects_id(None)

    def test_api_v2_projects_delete_project_data_after_delete_project(self):
        tasks = {}
        for project in self.projects:
            tasks[project.name] = create_dummy_db_tasks(self.__class__, project)

            project_dir = project.get_dirname()
            self.assertTrue(os.path.exists(project_dir))

            for task in tasks[project.name]:
                task_dir = task.get_dirname()
                self.assertTrue(os.path.exists(task_dir))

        with self.captureOnCommitCallbacks(execute=True):
            self._check_api_v2_projects_id(self.admin)

        for project in self.projects:
            project_dir = project.get_dirname()
            self.assertFalse(os.path.exists(project_dir))

            for task in tasks[project.name]:
                task_dir = task.get_dirname()
                self.assertFalse(os.path.exists(task_dir))

class ProjectCreateAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _run_api_v2_projects(self, user, data):
        with ForceLogin(user, self.client):
            response = self.client.post('/api/projects', data=data, format="json")

            if 200 <= response.status_code < 400:
                labels_response = list(get_paginated_collection(
                    lambda page: self.client.get(
                        "/api/labels?project_id=%s&page=%s" % (response.data["id"], page)
                    )
                ))
                response.data["labels"] = labels_response

        return response

    def _check_response(self, response, user, data):
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], data["name"])
        self.assertEqual(response.data["owner"]["id"], data.get("owner_id", user.id))
        response_assignee = response.data["assignee"]["id"] if response.data["assignee"] else None
        self.assertEqual(response_assignee, data.get('assignee_id', None))
        self.assertEqual(response.data["bug_tracker"], data.get("bug_tracker", ""))
        self.assertEqual(response.data["status"], StatusChoice.ANNOTATION)
        self.assertListEqual(
            [label["name"] for label in data.get("labels", [])],
            [label["name"] for label in response.data["labels"]]
        )

    def _check_api_v2_projects(self, user, data):
        response = self._run_api_v2_projects(user, data)
        if user:
            self._check_response(response, user, data)
        else:
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_v2_projects_admin(self):
        data = {
            "name": "new name for the project",
            "bug_tracker": "http://example.com"
        }
        self._check_api_v2_projects(self.admin, data)

        data = {
            "owner_id": self.owner.id,
            "assignee_id": self.assignee.id,
            "name": "new name for the project"
        }
        self._check_api_v2_projects(self.admin, data)

        data = {
            "owner_id": self.admin.id,
            "name": "2"
        }
        self._check_api_v2_projects(self.admin, data)

        data = {
            "name": "Project with labels",
            "labels": [{
                "name": "car",
            }]
        }
        self._check_api_v2_projects(self.admin, data)


    def test_api_v2_projects_user(self):
        data = {
            "name": "Dummy name",
            "bug_tracker": "it is just text"
        }
        self._check_api_v2_projects(self.user, data)

        data = {
            "owner_id": self.user.id,
            "assignee_id": self.user.id,
            "name": "My import project with data"
        }
        self._check_api_v2_projects(self.user, data)


    def test_api_v2_projects_somebody(self):
        data = {
            "name": "My Project #1",
            "owner_id": self.somebody.id,
            "assignee_id": self.somebody.id
        }
        self._check_api_v2_projects(self.somebody, data)

    def test_api_v2_projects_no_auth(self):
        data = {
            "name": "My Project #2",
            "owner_id": self.admin.id,
        }
        self._check_api_v2_projects(None, data)

class ProjectPartialUpdateAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.projects = create_dummy_db_projects(cls)

    def _run_api_v2_projects_id(self, pid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/projects/{}'.format(pid),
                data=data, format="json")

            if 200 <= response.status_code < 400:
                labels_response = list(get_paginated_collection(
                    lambda page: self.client.get("/api/labels?project_id=%s&page=%s" % (pid, page))
                ))
                response.data["labels"] = labels_response

        return response

    def _check_response(self, response, db_project, data):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        name = data.get("name", db_project.name)
        self.assertEqual(response.data["name"], name)
        response_owner = response.data["owner"]["id"] if response.data["owner"] else None
        db_owner = db_project.owner.id if db_project.owner else None
        self.assertEqual(response_owner, data.get("owner_id", db_owner))
        response_assignee = response.data["assignee"]["id"] if response.data["assignee"] else None
        db_assignee = db_project.assignee.id if db_project.assignee else None
        self.assertEqual(response_assignee, data.get("assignee_id", db_assignee))
        self.assertEqual(response.data["status"], data.get("status", db_project.status))
        self.assertEqual(response.data["bug_tracker"], data.get("bug_tracker", db_project.bug_tracker))
        if data.get("labels"):
            self.assertListEqual(
                [label["name"] for label in data.get("labels") if not label.get("deleted", False)],
                [label["name"] for label in response.data["labels"]]
            )
        else:
            self.assertListEqual(
                [label.name for label in db_project.label_set.all()],
                [label["name"] for label in response.data["labels"]]
            )

    def _check_api_v2_projects_id(self, user, data):
        for db_project in self.projects:
            response = self._run_api_v2_projects_id(db_project.id, user, data)
            if user and user.has_perm("engine.project.change", db_project):
                self._check_response(response, db_project, data)
            elif user:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            else:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_v2_projects_id_admin(self):
        data = {
            "name": "project with some labels",
            "owner_id": self.owner.id,
            "bug_tracker": "https://new.bug.tracker",
            "labels": [
                {"name": "car"},
                {"name": "person"}
            ],
        }
        self._check_api_v2_projects_id(self.admin, data)

    def test_api_v2_projects_id_user(self):
        data = {
            "name": "new name for the project",
            "owner_id": self.assignee.id,
        }
        self._check_api_v2_projects_id(self.user, data)

    def test_api_v2_projects_id_somebody(self):
        data = {
            "name": "new name for the project",
        }
        self._check_api_v2_projects_id(self.somebody, data)

    def test_api_v2_projects_id_no_auth(self):
        data = {
            "name": "new name for the project",
        }
        self._check_api_v2_projects_id(None, data)

class UpdateLabelsAPITestCase(ApiTestBase):
    def assertLabelsEqual(self, label1, label2):
        self.assertEqual(label1.get("name", label2.get("name")), label2.get("name"))
        self.assertEqual(label1.get("color", label2.get("color")), label2.get("color"))

    def _check_response(self, response, db_object, data):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        db_labels = db_object.label_set.all()
        response_labels = response.data["labels"]
        for label in data["labels"]:
            if label.get("id", None) is None:
                self.assertLabelsEqual(
                    label,
                    [l for l in response_labels if label.get("name") == l.get("name")][0],
                )
                db_labels = [l for l in db_labels if label.get("name") != l.name]
                response_labels = [l for l in response_labels if label.get("name") != l.get("name")]
            else:
                if not label.get("deleted", False):
                    self.assertLabelsEqual(
                        label,
                        [l for l in response_labels if label.get("id") == l.get("id")][0],
                    )
                    response_labels = [l for l in response_labels if label.get("id") != l.get("id")]
                    db_labels = [l for l in db_labels if label.get("id") != l.id]
                else:
                    self.assertEqual(
                        len([l for l in response_labels if label.get("id") == l.get("id")]), 0
                    )
            self.assertEqual(len(response_labels), len(db_labels))

class ProjectUpdateLabelsAPITestCase(UpdateLabelsAPITestCase):
    @classmethod
    def setUpTestData(cls):
        project_data = {
            "name": "Project with labels",
            "bug_tracker": "https://new.bug.tracker",
            "labels": [{
                "name": "car",
                "color": "#ff00ff",
                "attributes": [{
                    "name": "bool_attribute",
                    "mutable": True,
                    "input_type": AttributeType.CHECKBOX,
                    "default_value": "true"
                }],
            }, {
                "name": "person",
            }]
        }

        create_db_users(cls)
        db_project = create_db_project(project_data)
        create_dummy_db_tasks(cls, db_project)
        cls.project = db_project

    def _check_api_v2_project(self, data):
        response = self._run_api_v2_project_id(self.project.id, self.admin, data)
        self._check_response(response, self.project, data)

    def _run_api_v2_project_id(self, pid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/projects/{}'.format(pid),
                data=data, format="json")

            if 200 <= response.status_code < 400:
                labels_response = list(get_paginated_collection(
                    lambda page: self.client.get("/api/labels?project_id=%s&page=%s" % (pid, page))
                ))
                response.data["labels"] = labels_response

        return response

    def test_api_v2_projects_create_label(self):
        data = {
            "labels": [{
                "name": "new label",
            }],
        }
        self._check_api_v2_project(data)

    def test_api_v2_projects_edit_label(self):
        data = {
            "labels": [{
                "id": 1,
                "name": "New name for label",
                "color": "#fefefe",
            }],
        }
        self._check_api_v2_project(data)

    def test_api_v2_projects_delete_label(self):
        data = {
            "labels": [{
                "id": 2,
                "name": "Label for deletion",
                "deleted": True
            }]
        }
        self._check_api_v2_project(data)

class ProjectListOfTasksAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.projects = create_dummy_db_projects(cls)

    def _run_api_v2_projects_id_tasks(self, user, pid):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/tasks?project_id={}'.format(pid))

        return response

    def test_api_v2_projects_id_tasks_admin(self):
        project = self.projects[1]
        response = self._run_api_v2_projects_id_tasks(self.admin, project.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([task.name for task in project.tasks.all()]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v2_projects_id_tasks_user(self):
        project = self.projects[1] # the user is owner of the project
        response = self._run_api_v2_projects_id_tasks(self.user, project.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([task.name for task in project.tasks.all()]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v2_projects_id_tasks_somebody(self):
        project = self.projects[1]
        response = self._run_api_v2_projects_id_tasks(self.somebody, project.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([], response.data['results'])

    def test_api_v2_projects_id_tasks_no_auth(self):
        project = self.projects[1]
        response = self._run_api_v2_projects_id_tasks(None, project.id)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class ProjectBackupAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls._create_media()
        cls.client = APIClient()
        cls._create_projects()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        for task in cls.tasks:
            shutil.rmtree(os.path.join(settings.TASKS_ROOT, str(task["id"])))
            shutil.rmtree(os.path.join(settings.MEDIA_DATA_ROOT, str(task["data_id"])))

        for f in cls.media['files']:
            os.remove(f)
        for d in cls.media['dirs']:
            shutil.rmtree(d)

    @classmethod
    def _create_media(cls):
        cls.media_data = []
        cls.media = {
            'files': [],
            'dirs': [],
        }
        image_count = 10
        imagename_pattern = "test_{}.jpg"
        for i in range(image_count):
            filename = imagename_pattern.format(i)
            path = os.path.join(settings.SHARE_ROOT, filename)
            cls.media['files'].append(path)
            _, data = generate_random_image_file(filename)
            with open(path, "wb") as image:
                image.write(data.read())

        cls.media_data.append(
            {
                **{"image_quality": 75,
                   "copy_data": True,
                   "start_frame": 2,
                   "stop_frame": 9,
                   "frame_filter": "step=2",
                },
                **{"server_files[{}]".format(i): imagename_pattern.format(i) for i in range(image_count)},
            }
        )

        filename = "test_video_1.mp4"
        path = os.path.join(settings.SHARE_ROOT, filename)
        cls.media['files'].append(path)
        _, data = generate_video_file(filename, width=1280, height=720)
        with open(path, "wb") as video:
            video.write(data.read())
        cls.media_data.append(
            {
                "image_quality": 75,
                "copy_data": True,
                "start_frame": 2,
                "stop_frame": 24,
                "frame_filter": "step=2",
                "server_files[0]": filename,
            }
        )

        filename = os.path.join("test_archive_1.zip")
        path = os.path.join(settings.SHARE_ROOT, filename)
        cls.media['files'].append(path)
        _, data = generate_zip_archive_file(filename, count=5)
        with open(path, "wb") as zip_archive:
            zip_archive.write(data.read())
        cls.media_data.append(
            {
                "image_quality": 75,
                "server_files[0]": filename,
            }
        )

        filename = os.path.join("videos", "test_video_1.mp4")
        path = os.path.join(settings.SHARE_ROOT, filename)
        cls.media['dirs'].append(os.path.dirname(path))
        os.makedirs(os.path.dirname(path))
        _, data = generate_video_file(filename, width=1280, height=720)
        with open(path, "wb") as video:
            video.write(data.read())

        manifest_path = os.path.join(settings.SHARE_ROOT, 'videos', 'manifest.jsonl')
        generate_manifest_file(data_type='video', manifest_path=manifest_path, sources=[path])

        cls.media_data.append(
            {
                "image_quality": 70,
                "copy_data": True,
                "server_files[0]": filename,
                "server_files[1]": os.path.join("videos", "manifest.jsonl"),
                "use_cache": True,
            }
        )

        manifest_path = manifest_path=os.path.join(settings.SHARE_ROOT, 'manifest.jsonl')
        generate_manifest_file(data_type='images', manifest_path=manifest_path,
            sources=[os.path.join(settings.SHARE_ROOT, imagename_pattern.format(i)) for i in range(1, 8)])
        cls.media['files'].append(manifest_path)
        cls.media_data.append(
            {
                **{"image_quality": 70,
                    "copy_data": True,
                    "use_cache": True,
                    "frame_filter": "step=2",
                    "server_files[0]": "manifest.jsonl",
                },
                **{
                    **{"server_files[{}]".format(i): imagename_pattern.format(i) for i in range(1, 8)},
                }
            }
        )

        cls.media_data.extend([
            # image list local
            {
                "client_files[0]": generate_random_image_file("test_1.jpg")[1],
                "client_files[1]": generate_random_image_file("test_2.jpg")[1],
                "client_files[2]": generate_random_image_file("test_3.jpg")[1],
                "image_quality": 75,
            },
            # video local
            {
                "client_files[0]": generate_video_file("test_video.mp4")[1],
                "image_quality": 75,
            },
            # zip archive local
            {
                "client_files[0]": generate_zip_archive_file("test_archive_1.zip", 10)[1],
                "image_quality": 50,
            },
            # pdf local
            {
                "client_files[0]": generate_pdf_file("test_pdf_1.pdf", 7)[1],
                "image_quality": 54,
            },
        ])

    @classmethod
    def _create_tasks(cls, project):
        def _create_task(task_data, media_data):
            response = cls.client.post('/api/tasks', data=task_data, format="json")
            assert response.status_code == status.HTTP_201_CREATED
            tid = response.data["id"]

            for media in media_data.values():
                if isinstance(media, io.BytesIO):
                    media.seek(0)
            response = cls.client.post("/api/tasks/{}/data".format(tid), data=media_data)
            assert response.status_code == status.HTTP_202_ACCEPTED
            response = cls.client.get("/api/tasks/{}".format(tid))
            data_id = response.data["data"]
            cls.tasks.append({
                "id": tid,
                "data_id": data_id,
            })

        task_data = [
            {
                "name": "my task #1",
                "owner_id": project.owner.id,
                "overlap": 0,
                "segment_size": 100,
                "project_id": project.id,
            },
            {
                "name": "my task #2",
                "owner_id": project.owner.id,
                "overlap": 1,
                "segment_size": 3,
                "project_id": project.id,
            },
        ]

        with ForceLogin(project.owner, cls.client):
            for data in task_data:
                for media in cls.media_data:
                    _create_task(data, media)

    @classmethod
    def _create_projects(cls):
        cls.projects = []
        cls.tasks = []
        data = {
            "name": "my empty project",
            "owner": cls.owner,
            "labels": [{
                "name": "car",
                "color": "#ff00ff",
                "attributes": [{
                    "name": "bool_attribute",
                    "mutable": True,
                    "input_type": AttributeType.CHECKBOX,
                    "default_value": "true"
                }],
                }, {
                    "name": "person",
                },
            ],
        }
        db_project = create_db_project(data)
        cls.projects.append(db_project)

        data = {
            "name": "my project without assignee",
            "owner": cls.owner,
            "labels": [{
                "name": "car",
                "color": "#ff00ff",
                "attributes": [{
                    "name": "bool_attribute",
                    "mutable": True,
                    "input_type": AttributeType.CHECKBOX,
                    "default_value": "true"
                }],
                }, {
                    "name": "person",
                },
            ],
        }
        db_project = create_db_project(data)
        cls._create_tasks(db_project)
        cls.projects.append(db_project)

        data = {
            "name": "my big project",
            "owner": cls.owner,
            "labels": [{
                "name": "car",
                "color": "#ff00ff",
                "attributes": [{
                    "name": "bool_attribute",
                    "mutable": True,
                    "input_type": AttributeType.CHECKBOX,
                    "default_value": "true"
                }],
                }, {
                    "name": "person",
                },
            ],
        }
        db_project = create_db_project(data)
        cls._create_tasks(db_project)
        cls.projects.append(db_project)

        data = {
            "name": "public project",
            "owner": cls.owner,
            "labels": [{
                "name": "car",
                "color": "#ff00ff",
                "attributes": [{
                    "name": "bool_attribute",
                    "mutable": True,
                    "input_type": AttributeType.CHECKBOX,
                    "default_value": "true"
                }],
                }, {
                    "name": "person",
                },
            ],
        }
        db_project = create_db_project(data)
        cls._create_tasks(db_project)
        cls.projects.append(db_project)

        data = {
            "name": "super project",
            "owner": cls.admin,
            "labels": [{
                "name": "car",
                "color": "#ff00ff",
                "attributes": [{
                    "name": "bool_attribute",
                    "mutable": True,
                    "input_type": AttributeType.CHECKBOX,
                    "default_value": "true"
                }],
                }, {
                    "name": "person",
                },
            ],
        }
        db_project = create_db_project(data)
        cls._create_tasks(db_project)
        cls.projects.append(db_project)

    def _run_api_v2_projects_id_export(self, pid, user, query_params=""):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/projects/{}/backup?{}'.format(pid, query_params), format="json")

        return response

    def _run_api_v2_projects_import(self, user, data):
        with ForceLogin(user, self.client):
            response = self.client.post('/api/projects/backup', data=data, format="multipart")

        return response

    def _run_api_v2_projects_id(self, pid, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/projects/{}'.format(pid), format="json")

        return response.data

    def _run_api_v2_projects_id_export_import(self, user):
        for project in self.projects:
            if user:
                if user in [project.assignee, project.owner, self.admin]:
                    HTTP_200_OK = status.HTTP_200_OK
                    HTTP_202_ACCEPTED = status.HTTP_202_ACCEPTED
                    HTTP_201_CREATED = status.HTTP_201_CREATED
                else:
                    HTTP_200_OK = status.HTTP_403_FORBIDDEN
                    HTTP_202_ACCEPTED = status.HTTP_403_FORBIDDEN
                    HTTP_201_CREATED = status.HTTP_403_FORBIDDEN
            else:
                HTTP_200_OK = status.HTTP_401_UNAUTHORIZED
                HTTP_202_ACCEPTED = status.HTTP_401_UNAUTHORIZED
                HTTP_201_CREATED = status.HTTP_401_UNAUTHORIZED

            pid = project.id
            response = self._run_api_v2_projects_id_export(pid, user)
            self.assertEqual(response.status_code, HTTP_202_ACCEPTED)

            response = self._run_api_v2_projects_id_export(pid, user)
            self.assertEqual(response.status_code, HTTP_201_CREATED)

            response = self._run_api_v2_projects_id_export(pid, user, "action=download")
            self.assertEqual(response.status_code, HTTP_200_OK)

            if response.status_code == status.HTTP_200_OK:
                self.assertTrue(response.streaming)
                content = io.BytesIO(b"".join(response.streaming_content))
                content.seek(0)

                uploaded_data = {
                    "project_file": content,
                }
                response = self._run_api_v2_projects_import(user, uploaded_data)
                self.assertEqual(response.status_code, HTTP_202_ACCEPTED)
                if response.status_code == status.HTTP_200_OK:
                    rq_id = response.data["rq_id"]
                    response = self._run_api_v2_projects_import(user, {"rq_id": rq_id})
                    self.assertEqual(response.status_code, HTTP_201_CREATED)
                    original_project = self._run_api_v2_projects_id(pid, user)
                    imported_project = self._run_api_v2_projects_id(response.data["id"], user)
                    compare_objects(
                        self=self,
                        obj1=original_project,
                        obj2=imported_project,
                        ignore_keys=(
                            "data",
                            "id",
                            "url",
                            "owner",
                            "assignee",
                            "created_date",
                            "updated_date",
                            "project_id",
                            "tasks",
                        ),
                    )

    def test_api_v2_projects_id_export_admin(self):
        self._run_api_v2_projects_id_export_import(self.admin)

    def test_api_v2_projects_id_export_user(self):
        self._run_api_v2_projects_id_export_import(self.user)

    def test_api_v2_projects_id_export_somebody(self):
        self._run_api_v2_projects_id_export_import(self.somebody)

    def test_api_v2_projects_id_export_no_auth(self):
        self._run_api_v2_projects_id_export_import(None)

class ProjectExportAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        project_data = {
            "name": "Project for check tasks in a xml",
            "owner": cls.admin,
            "labels": [{
                "name": "car"
            }]
        }

        db_project = create_db_project(project_data)
        create_dummy_db_tasks(cls, db_project)
        cls.project = db_project

    def _run_api_v2_project_id_export(self, pid, user, annotation_format=""):
        with ForceLogin(user, self.client):
            response = self.client.get(
                '/api/projects/{}/annotations?format={}'.format(pid, annotation_format),
                format="json")
        return response

    def _run_api_v2_tasks_id_delete(self, tid, user):
        with ForceLogin(user, self.client):
            response = self.client.delete('/api/tasks/{}'.format(tid), format="json")
        return response

    def _check_tasks_count(self, project, expected_result):
        tasks_id = [task.id for task in project.tasks.all()]
        self.assertEqual(len(tasks_id), expected_result)

    def _check_xml(self, pid, user, expected_result):
        annotation_format = "CVAT for images 1.1"
        response = self._run_api_v2_project_id_export(pid, user, annotation_format)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        response = self._run_api_v2_project_id_export(pid, user, annotation_format)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        annotation_format = "CVAT for images 1.1&action=download"
        response = self._run_api_v2_project_id_export(pid, user, annotation_format)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        content = io.BytesIO(b"".join(response.streaming_content))
        content.seek(0)

        with tempfile.TemporaryDirectory() as tmp_dir:
            zipfile.ZipFile(content).extractall(tmp_dir)
            xml = os.path.join(tmp_dir, 'annotations.xml')
            self.assertTrue(xml)
            root = ET.parse(xml).getroot()
            tasks = root.findall('meta/project/tasks/task/name')
            self.assertEqual(len(tasks), expected_result)

    def test_api_v2_projects_remove_task_export(self):
        project = self.project
        pid = project.id
        user = self.admin

        self._check_tasks_count(project, 4)
        self._check_xml(pid, user, 4)

        tasks_id = [task.id for task in project.tasks.all()]
        response = self._run_api_v2_tasks_id_delete(tasks_id[0], self.admin)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self._check_tasks_count(project, 3)
        self._check_xml(pid, user, 3)


class ProjectImportExportAPITestCase(ApiTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.tasks = []
        self.projects = []

    @classmethod
    def setUpTestData(cls) -> None:
        create_db_users(cls)

        cls.media_data = [
            {
                **{
                   **{
                        f"client_files[{i}]": generate_random_image_file(f"test_{i}.jpg")[1]
                        for i in range(10)
                    },
                },
                **{
                    "image_quality": 75,
                },
            },
            {
                **{
                   **{
                        f"client_files[{i}]": generate_random_image_file(f"test_{i}.jpg")[1]
                        for i in range(10)
                    },
                },
                "image_quality": 75,
            },
        ]

    def _create_tasks(self):
        self.tasks = []

        def _create_task(task_data, media_data):
            response = self.client.post('/api/tasks', data=task_data, format="json")
            assert response.status_code == status.HTTP_201_CREATED
            tid = response.data["id"]

            for media in media_data.values():
                if isinstance(media, io.BytesIO):
                    media.seek(0)
            response = self.client.post("/api/tasks/{}/data".format(tid), data=media_data)
            assert response.status_code == status.HTTP_202_ACCEPTED
            response = self.client.get("/api/tasks/{}".format(tid))
            data_id = response.data["data"]
            self.tasks.append({
                "id": tid,
                "data_id": data_id,
            })

        task_data = [
            {
                "name": "my task #1",
                "owner_id": self.owner.id,
                "overlap": 0,
                "segment_size": 100,
                "project_id": self.projects[0]["id"],
            },
            {
                "name": "my task #2",
                "owner_id": self.owner.id,
                "overlap": 1,
                "segment_size": 3,
                "project_id": self.projects[0]["id"],
            },
        ]

        with ForceLogin(self.owner, self.client):
            for data, media in zip(task_data, self.media_data):
                _create_task(data, media)

    def _create_projects(self):
        self.projects = []

        def _create_project(project_data):
            response = self.client.post('/api/projects', data=project_data, format="json")
            assert response.status_code == status.HTTP_201_CREATED
            self.projects.append(response.data)

        project_data = [
            {
                "name": "Project for export",
                "owner_id": self.owner.id,
                "labels": [
                    {
                        "name": "car",
                        "color": "#ff00ff",
                        "attributes": [{
                            "name": "bool_attribute",
                            "mutable": True,
                            "input_type": AttributeType.CHECKBOX,
                            "default_value": "true",
                            "values": [],
                        }],
                    }, {
                        "name": "person",
                    },
                ]
            }, {
                "name": "Project for import",
                "owner_id": self.owner.id,
            },
        ]

        with ForceLogin(self.owner, self.client):
            for data in project_data:
                _create_project(data)

    def _run_api_v2_projects_id_dataset_export(self, pid, user, query_params=""):
        with ForceLogin(user, self.client):
            response = self.client.get("/api/projects/{}/dataset?{}".format(pid, query_params), format="json")
        return response

    def _run_api_v2_projects_id_dataset_import(self, pid, user, data, f):
        with ForceLogin(user, self.client):
            response = self.client.post("/api/projects/{}/dataset?format={}".format(pid, f),  data=data, format="multipart")
        return response

    def _run_api_v2_projects_id_dataset_import_status(self, pid, user, rq_id):
        with ForceLogin(user, self.client):
            response = self.client.get("/api/projects/{}/dataset?action=import_status&rq_id={}".format(pid, rq_id), format="json")
        return response

    def test_api_v2_projects_id_export_import(self):

        self._create_projects()
        self._create_tasks()
        pid_export, pid_import = self.projects[0]["id"], self.projects[1]["id"]
        response = self._run_api_v2_projects_id_dataset_export(pid_export, self.owner, "format=CVAT for images 1.1")
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        response = self._run_api_v2_projects_id_dataset_export(pid_export, self.owner, "format=CVAT for images 1.1")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self._run_api_v2_projects_id_dataset_export(pid_export, self.owner, "format=CVAT for images 1.1&action=download")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertTrue(response.streaming)
        tmp_file = tempfile.NamedTemporaryFile(suffix=".zip")
        tmp_file.write(b"".join(response.streaming_content))
        tmp_file.seek(0)

        import_data = {
            "dataset_file": tmp_file,
        }

        response = self._run_api_v2_projects_id_dataset_import(pid_import, self.owner, import_data, "CVAT 1.1")
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        rq_id = response.data.get('rq_id')
        response = self._run_api_v2_projects_id_dataset_import_status(pid_import, self.owner, rq_id)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def tearDown(self):
        for task in self.tasks:
            shutil.rmtree(os.path.join(settings.TASKS_ROOT, str(task["id"])))
            shutil.rmtree(os.path.join(settings.MEDIA_DATA_ROOT, str(task["data_id"])))
        for project in self.projects:
            shutil.rmtree(os.path.join(settings.PROJECTS_ROOT, str(project["id"])))
        return super().tearDown()

class TaskListAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.tasks = create_dummy_db_tasks(cls)

    def _run_api_v2_tasks(self, user, params=""):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/tasks{}'.format(params))

        return response

    def test_api_v2_tasks_admin(self):
        response = self._run_api_v2_tasks(self.admin)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([task.name for task in self.tasks]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v2_tasks_user(self):
        response = self._run_api_v2_tasks(self.user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual(
            sorted([task.name for task in self.tasks
                if self.user in [task.owner, task.assignee]]),
            sorted([res["name"] for res in response.data["results"]]))

    def test_api_v2_tasks_somebody(self):
        response = self._run_api_v2_tasks(self.somebody)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertListEqual([],
            [res["name"] for res in response.data["results"]])

    def test_api_v2_tasks_no_auth(self):
        response = self._run_api_v2_tasks(None)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class TaskGetAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.tasks = create_dummy_db_tasks(cls)

    def _run_api_v2_tasks_id(self, tid, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/tasks/{}'.format(tid))

            if 200 <= response.status_code < 400:
                labels_response = list(get_paginated_collection(
                    lambda page: self.client.get(
                        "/api/labels?task_id=%s&page=%s" % (tid, page)
                    )
                ))
                response.data["labels"] = labels_response

        return response

    def _check_response(self, response, db_task):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], db_task.name)
        self.assertEqual(response.data["size"], db_task.data.size)
        self.assertEqual(response.data["mode"], db_task.mode)
        owner = db_task.owner.id if db_task.owner else None
        response_owner = response.data["owner"]["id"] if response.data["owner"] else None
        self.assertEqual(response_owner, owner)
        assignee = db_task.assignee.id if db_task.assignee else None
        response_assignee = response.data["assignee"]["id"] if response.data["assignee"] else None
        self.assertEqual(response_assignee, assignee)
        self.assertEqual(response.data["overlap"], db_task.overlap)
        self.assertEqual(response.data["segment_size"], db_task.segment_size)
        self.assertEqual(response.data["image_quality"], db_task.data.image_quality)
        self.assertEqual(response.data["status"], db_task.status)
        self.assertListEqual(
            [label.name for label in db_task.label_set.all()],
            [label["name"] for label in response.data["labels"]]
        )

    def _check_api_v2_tasks_id(self, user):
        for db_task in self.tasks:
            response = self._run_api_v2_tasks_id(db_task.id, user)
            if user is None:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            elif user == db_task.owner or user.is_superuser:
                self._check_response(response, db_task)
            else:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_api_v2_tasks_id_admin(self):
        self._check_api_v2_tasks_id(self.admin)

    def test_api_v2_tasks_id_user(self):
        self._check_api_v2_tasks_id(self.user)

    def test_api_v2_tasks_id_somebody(self):
        self._check_api_v2_tasks_id(self.somebody)

    def test_api_v2_tasks_id_no_auth(self):
        self._check_api_v2_tasks_id(None)

class TaskDeleteAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.tasks = create_dummy_db_tasks(cls)

    def _run_api_v2_tasks_id(self, tid, user):
        with ForceLogin(user, self.client):
            response = self.client.delete('/api/tasks/{}'.format(tid), format="json")

        return response

    def _check_api_v2_tasks_id(self, user):
        for db_task in self.tasks:
            response = self._run_api_v2_tasks_id(db_task.id, user)
            if user is None:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            elif user == db_task.owner or user.is_superuser:
                self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
            else:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_api_v2_tasks_id_admin(self):
        self._check_api_v2_tasks_id(self.admin)

    def test_api_v2_tasks_id_user(self):
        self._check_api_v2_tasks_id(self.user)

    def test_api_v2_tasks_id_somebody(self):
        self._check_api_v2_tasks_id(self.somebody)

    def test_api_v2_tasks_id_no_auth(self):
        self._check_api_v2_tasks_id(None)

    def test_api_v2_tasks_delete_task_data_after_delete_task(self):
        for task in self.tasks:
            task_dir = task.get_dirname()
            self.assertTrue(os.path.exists(task_dir))

        with self.captureOnCommitCallbacks(execute=True):
            self._check_api_v2_tasks_id(self.admin)

        for task in self.tasks:
            task_dir = task.get_dirname()
            self.assertFalse(os.path.exists(task_dir))

class TaskUpdateAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.tasks = create_dummy_db_tasks(cls)

    def _run_api_v2_tasks_id(self, tid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.put('/api/tasks/{}'.format(tid),
                data=data, format="json")

        return response

    def _check_api_v2_tasks_id(self, user, data):
        for db_task in self.tasks:
            response = self._run_api_v2_tasks_id(db_task.id, user, data)
            if user is None:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            else:
                self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_api_v2_tasks_id_admin(self):
        data = { "name": "new name for the task" }
        self._check_api_v2_tasks_id(self.admin, data)

    def test_api_v2_tasks_id_user(self):
        data = { "name": "new name for the task" }
        self._check_api_v2_tasks_id(self.user, data)

    def test_api_v2_tasks_id_somebody(self):
        data = { "name": "new name for the task" }
        self._check_api_v2_tasks_id(self.somebody, data)

    def test_api_v2_tasks_id_no_auth(self):
        data = { "name": "new name for the task" }
        self._check_api_v2_tasks_id(None, data)

class TaskPartialUpdateAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.tasks = create_dummy_db_tasks(cls)

    def _check_response(self, response, db_task, data):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        name = data.get("name", db_task.name)
        self.assertEqual(response.data["name"], name)
        self.assertEqual(response.data["size"], db_task.data.size)
        mode = data.get("mode", db_task.mode)
        self.assertEqual(response.data["mode"], mode)
        owner = db_task.owner.id if db_task.owner else None
        owner = data.get("owner_id", owner)
        response_owner = response.data["owner"]["id"] if response.data["owner"] else None
        self.assertEqual(response_owner, owner)
        assignee = db_task.assignee.id if db_task.assignee else None
        assignee = data.get("assignee_id", assignee)
        response_assignee = response.data["assignee"]["id"] if response.data["assignee"] else None
        self.assertEqual(response_assignee, assignee)
        self.assertEqual(response.data["overlap"], db_task.overlap)
        self.assertEqual(response.data["segment_size"], db_task.segment_size)
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

    def _run_api_v2_tasks_id(self, tid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/tasks/{}'.format(tid),
                data=data, format="json")

            if 200 <= response.status_code < 400:
                labels_response = list(get_paginated_collection(
                    lambda page: self.client.get("/api/labels?task_id=%s&page=%s" % (tid, page))
                ))
                response.data["labels"] = labels_response

        return response

    def _check_api_v2_tasks_id(self, user, data):
        for db_task in self.tasks:
            response = self._run_api_v2_tasks_id(db_task.id, user, data)
            if user is None:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            elif user == db_task.owner or user == db_task.assignee or user.is_superuser:
                self._check_response(response, db_task, data)
            else:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v2_tasks_id_admin(self):
        data = {
            "name": "new name for the task",
            "owner_id": self.owner.id,
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
        self._check_api_v2_tasks_id(self.admin, data)

    def test_api_v2_tasks_id_user(self):
        data = {
            "name": "new name for the task",
            "owner_id": self.user.id,
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
        self._check_api_v2_tasks_id(self.user, data)

    def test_api_v2_tasks_id_admin_partial(self):
        data = {
            "name": "new name for the task #2",
        }
        self._check_api_v2_tasks_id(self.admin, data)

        data = {
            "name": "new name for the task",
            "owner_id": self.owner.id
        }
        self._check_api_v2_tasks_id(self.admin, data)
        # Now owner is updated, but self.db_tasks are obsolete
        # We can't do any tests without owner in data below


    def test_api_v2_tasks_id_user_partial(self):
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
        self._check_api_v2_tasks_id(self.user, data)

        data = {
            "owner_id": self.user.id,
            "assignee_id": self.user.id
        }
        self._check_api_v2_tasks_id(self.user, data)


    def test_api_v2_tasks_id_somebody(self):
        data = {
            "name": "my task #3"
        }
        self._check_api_v2_tasks_id(self.somebody, data)

    def test_api_v2_tasks_id_no_auth(self):
        data = {
            "name": "new name for the task",
            "labels": [{
                "name": "test",
            }]
        }
        self._check_api_v2_tasks_id(None, data)

class TaskDataMetaPartialUpdateAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.tasks = create_dummy_db_tasks(cls)

    def _run_api_v1_task_data_meta_id(self, tid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/tasks/{}/data/meta'.format(tid),
                data=data, format="json")

        return response

    def _check_response(self, response, db_data, data):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        deleted_frames = data.get("deleted_frames", db_data.deleted_frames)
        self.assertEqual(response.data["deleted_frames"], deleted_frames)

    def _check_api_v1_task_data_id(self, user, data):
        for db_task in self.tasks:
            response = self._run_api_v1_task_data_meta_id(db_task.id, user, data)
            if user is None:
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            elif user == db_task.owner or user == db_task.assignee or user.is_superuser:
                self._check_response(response, db_task.data, data)
            else:
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_v1_tasks_data_meta(self):
        data = {
            "deleted_frames": [1,2,3]
        }
        self._check_api_v1_task_data_id(self.user, data)

        data = {
            "deleted_frames": []
        }
        self._check_api_v1_task_data_id(self.user, data)

class TaskUpdateLabelsAPITestCase(UpdateLabelsAPITestCase):
    @classmethod
    def setUpTestData(cls):
        task_data = {
            "name": "Project with labels",
            "bug_tracker": "https://new.bug.tracker",
            "overlap": 0,
            "segment_size": 100,
            "image_quality": 75,
            "size": 100,
            "labels": [{
                "name": "car",
                "color": "#ff00ff",
                "attributes": [{
                    "name": "bool_attribute",
                    "mutable": True,
                    "input_type": AttributeType.CHECKBOX,
                    "default_value": "true"
                }],
            }, {
                "name": "person",
            }]
        }

        create_db_users(cls)
        db_task = create_db_task(task_data)
        cls.task = db_task

    def _check_api_v2_task(self, data):
        response = self._run_api_v2_task_id(self.task.id, self.admin, data)
        self._check_response(response, self.task, data)

    def _run_api_v2_task_id(self, tid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/tasks/{}'.format(tid),
                data=data, format="json")

            if 200 <= response.status_code < 400:
                labels_response = list(get_paginated_collection(
                    lambda page: self.client.get("/api/labels?task_id=%s&page=%s" % (tid, page))
                ))
                response.data["labels"] = labels_response

        return response

    def test_api_v2_tasks_create_label(self):
        data = {
            "labels": [{
                "name": "new label",
            }],
        }
        self._check_api_v2_task(data)

    def test_api_v2_tasks_edit_label(self):
        data = {
            "labels": [{
                "id": 1,
                "name": "New name for label",
                "color": "#fefefe",
            }],
        }
        self._check_api_v2_task(data)

    def test_api_v2_tasks_delete_label(self):
        data = {
            "labels": [{
                "id": 2,
                "name": "Label for deletion",
                "deleted": True
            }]
        }
        self._check_api_v2_task(data)

class TaskMoveAPITestCase(ApiTestBase):
    def setUp(self):
        super().setUp()
        self._run_api_v2_job_id_annotation(self.task.segment_set.first().job_set.first().id, self.annotation_data)

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

        projects = []

        project_data = {
            "name": "Project for task move 1",
            "owner": cls.admin,
            "labels": [{
                "name": "car",
                "attributes": [{
                    "name": "color",
                    "mutable": False,
                    "input_type": AttributeType.SELECT,
                    "default_value": "white",
                    "values": ["white", "yellow", "green", "red"]
                }]
            }, {
                "name": "person"
            }]
        }
        db_project = create_db_project(project_data)
        projects.append(db_project)

        project_data = {
            "name": "Project for task move 2",
            "owner": cls.admin,
            "labels": [{
                "name": "car",
                "attributes": [{
                    "name": "color",
                    "mutable": False,
                    "input_type": AttributeType.SELECT,
                    "default_value": "white",
                    "values": ["white", "yellow", "green", "red"]
                }]
            }, {
                "name": "test"
            }, {
                "name": "other.label"
            }]
        }

        db_project = create_db_project(project_data)
        projects.append(db_project)

        cls.projects = projects

        task_data = {
            "name": "Task for moving",
            "owner": cls.admin,
            "overlap": 0,
            "segment_size": 100,
            "image_quality": 75,
            "size": 100,
            "project": None,
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
        db_task = create_db_task(task_data)
        cls.task = db_task

        cls.annotation_data = {
            "version": 1,
            "tags": [
                {
                    "frame": 0,
                    "label_id": cls.task.label_set.first().id,
                    "group": None,
                    "source": "manual",
                    "attributes": []
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": cls.task.label_set.first().id,
                    "group": None,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": cls.task.label_set.first().attributespec_set.first().id,
                            "value": cls.task.label_set.first().attributespec_set.first().values.split('\'')[1]
                        }
                    ],
                    "points": [1.0, 2.1, 100, 300.222],
                    "type": "rectangle",
                    "occluded": False
                }
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": cls.task.label_set.first().id,
                    "group": None,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": cls.task.label_set.first().attributespec_set.first().id,
                            "value": cls.task.label_set.first().attributespec_set.first().values.split('\'')[1]
                        }
                    ],
                    "shapes": [
                        {
                            "frame": 0,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False
                        },
                        {
                            "frame": 2,
                            "attributes": [],
                            "points": [2.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": True,
                            "outside": True
                        },
                    ]
                }
            ]
        }

    def _run_api_v2_tasks_id(self, tid, data):
        with ForceLogin(self.admin, self.client):
            response = self.client.patch('/api/tasks/{}'.format(tid),
                data=data, format="json")

        return response

    def _run_api_v2_job_id_annotation(self, jid, data):
        with ForceLogin(self.admin, self.client):
            response = self.client.patch('/api/jobs/{}/annotations?action=create'.format(jid),
                data=data, format="json")

        return response

    def _check_response(self, response, data):
        self.assertEqual(response.data["project_id"], data["project_id"])

    def _check_api_v2_tasks(self, tid, data, expected_status=status.HTTP_200_OK):
        response = self._run_api_v2_tasks_id(tid, data)
        self.assertEqual(response.status_code, expected_status)
        if expected_status == status.HTTP_200_OK:
            self._check_response(response, data)

    def test_move_task_bad_request(self):
        # Try to move task without proper label mapping
        data = {
            "project_id": self.projects[0].id,
            "labels": [{
                "id": self.task.label_set.first().id,
                "name": "some.other.label"
            }]
        }
        self._check_api_v2_tasks(self.task.id, data, status.HTTP_400_BAD_REQUEST)

    def test_move_task(self):
        # Try to move single task to the project
        data = {
            "project_id": self.projects[0].id
        }
        self._check_api_v2_tasks(self.task.id, data)

        # Try to move task from project to the other project
        data = {
            "project_id": self.projects[1].id,
            "labels": [{
                "id": self.projects[0].label_set.all()[1].id,
                "name": "test"
            }]
        }
        self._check_api_v2_tasks(self.task.id, data)

class TaskCreateAPITestCase(ApiTestBase):
    def setUp(self):
        super().setUp()
        project = {
            "name": "Project for task creation",
            "owner": self.user,
        }
        self.project = Project.objects.create(**project)
        label = {
            "name": "car",
            "project": self.project
        }
        Label.objects.create(**label)

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _run_api_v2_tasks(self, user, data):
        with ForceLogin(user, self.client):
            response = self.client.post('/api/tasks', data=data, format="json")

            if 200 <= response.status_code < 400:
                labels_response = list(get_paginated_collection(
                    lambda page: self.client.get(
                        "/api/labels?task_id=%s&page=%s" % (response.data["id"], page)
                    )
                ))
                response.data["labels"] = labels_response

        return response

    def _check_response(self, response, user, data):
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], data["name"])
        self.assertEqual(response.data["mode"], "")
        self.assertEqual(response.data["project_id"], data.get("project_id", None))
        self.assertEqual(response.data["owner"]["id"], data.get("owner_id", user.id))
        assignee = response.data["assignee"]["id"] if response.data["assignee"] else None
        self.assertEqual(assignee, data.get("assignee_id", None))
        self.assertEqual(response.data["bug_tracker"], data.get("bug_tracker", ""))
        self.assertEqual(response.data["overlap"], data.get("overlap", None))
        self.assertEqual(response.data["segment_size"], data.get("segment_size", 0))
        self.assertEqual(response.data["status"], StatusChoice.ANNOTATION)
        self.assertListEqual(
            [label["name"] for label in data.get("labels")],
            [label["name"] for label in response.data["labels"]]
        )

    def _check_api_v2_tasks(self, user, data):
        response = self._run_api_v2_tasks(user, data)
        if user is None:
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        else:
            self._check_response(response, user, data)

    def test_api_v2_tasks_admin(self):
        data = {
            "name": "new name for the task",
            "labels": [{
                "name": "non-vehicle",
                "attributes": [{
                    "name": "my_attribute",
                    "mutable": True,
                    "input_type": AttributeType.CHECKBOX,
                    "default_value": "true",
                    "values": [],
                }]
            }]
        }
        self._check_api_v2_tasks(self.admin, data)

    def test_api_v2_tasks_user(self):
        data = {
            "name": "new name for the task",
            "owner_id": self.user.id,
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
        self._check_api_v2_tasks(self.user, data)

    def test_api_vi_tasks_user_project(self):
        data = {
            "name": "new name for the task",
            "project_id": self.project.id,
        }
        response = self._run_api_v2_tasks(self.user, data)
        data["labels"] = [{
            "name": "car"
        }]
        self._check_response(response, self.user, data)

    def test_api_v2_tasks_somebody(self):
        data = {
            "name": "new name for the task",
            "labels": [{
                "name": "test",
            }]
        }
        self._check_api_v2_tasks(self.somebody, data)

    def test_api_v2_tasks_no_auth(self):
        data = {
            "name": "new name for the task",
            "labels": [{
                "name": "test",
            }]
        }
        self._check_api_v2_tasks(None, data)

class TaskImportExportAPITestCase(ApiTestBase):
    def setUp(self):
        super().setUp()
        self.tasks = []

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

        cls.media_data = []

        image_count = 10
        imagename_pattern = "test_{}.jpg"
        for i in range(image_count):
            filename = imagename_pattern.format(i)
            path = os.path.join(settings.SHARE_ROOT, filename)
            _, data = generate_random_image_file(filename)
            with open(path, "wb") as image:
                image.write(data.read())

        data = {
            "image_quality": 75,
            "copy_data": True,
            "start_frame": 2,
            "stop_frame": 9,
            "frame_filter": "step=2",
            **{"server_files[{}]".format(i): imagename_pattern.format(i) for i in range(image_count)},
        }
        use_cache_data = {
            **data,
            'use_cache': True,
        }
        cls.media_data.append(data)

        data['sorting_method'] = SortingMethod.NATURAL
        cls.media_data.append(data)
        cls.media_data.append(use_cache_data)

        use_cache_data['sorting_method'] = SortingMethod.NATURAL
        cls.media_data.append(use_cache_data)

        use_cache_data['sorting_method'] = SortingMethod.RANDOM
        cls.media_data.append(use_cache_data)

        filename = "test_video_1.mp4"
        path = os.path.join(settings.SHARE_ROOT, filename)
        _, data = generate_video_file(filename, width=1280, height=720)
        with open(path, "wb") as video:
            video.write(data.read())
        cls.media_data.append(
            {
                "image_quality": 75,
                "copy_data": True,
                "start_frame": 2,
                "stop_frame": 24,
                "frame_filter": "step=2",
                "server_files[0]": filename,
            }
        )

        filename = os.path.join("test_archive_1.zip")
        path = os.path.join(settings.SHARE_ROOT, filename)
        _, data = generate_zip_archive_file(filename, count=5)
        with open(path, "wb") as zip_archive:
            zip_archive.write(data.read())
        cls.media_data.append(
            {
                "image_quality": 75,
                "server_files[0]": filename,
            }
        )

        filename = "test_pointcloud_pcd.zip"
        source_path = os.path.join(os.path.dirname(__file__), 'assets', filename)
        path = os.path.join(settings.SHARE_ROOT, filename)
        shutil.copyfile(source_path, path)
        cls.media_data.append(
            {
                "image_quality": 75,
                "server_files[0]": filename,
            }
        )

        filename = "test_velodyne_points.zip"
        source_path = os.path.join(os.path.dirname(__file__), 'assets', filename)
        path = os.path.join(settings.SHARE_ROOT, filename)
        shutil.copyfile(source_path, path)
        cls.media_data.append(
            {
                "image_quality": 75,
                "server_files[0]": filename,
            }
        )

        for sorting, _ in SortingMethod.choices():
            cls.media_data.append(
                {
                    "image_quality": 75,
                    "server_files[0]": filename,
                    'use_cache': True,
                    'sorting_method': sorting,
                }
            )

        filename = os.path.join("videos", "test_video_1.mp4")
        path = os.path.join(settings.SHARE_ROOT, filename)
        os.makedirs(os.path.dirname(path))
        _, data = generate_video_file(filename, width=1280, height=720)
        with open(path, "wb") as video:
            video.write(data.read())

        generate_manifest_file(data_type='video', manifest_path=os.path.join(settings.SHARE_ROOT, 'videos', 'manifest.jsonl'),
            sources=[path])

        cls.media_data.append(
            {
                "image_quality": 70,
                "copy_data": True,
                "server_files[0]": filename,
                "server_files[1]": os.path.join("videos", "manifest.jsonl"),
                "use_cache": True,
            }
        )

        generate_manifest_file(data_type='images', manifest_path=os.path.join(settings.SHARE_ROOT, 'manifest.jsonl'),
            sources=[os.path.join(settings.SHARE_ROOT, imagename_pattern.format(i)) for i in range(1, 8)])
        cls.media_data.append(
            {
                **{"image_quality": 70,
                    "copy_data": True,
                    "use_cache": True,
                    "frame_filter": "step=2",
                    "server_files[0]": "manifest.jsonl",
                },
                **{
                    **{"server_files[{}]".format(i): imagename_pattern.format(i) for i in range(1, 8)},
                }
            }
        )

        data = {
            "client_files[0]": generate_random_image_file("test_1.jpg")[1],
            "client_files[1]": generate_random_image_file("test_2.jpg")[1],
            "client_files[2]": generate_random_image_file("test_10.jpg")[1],
            "client_files[3]": generate_random_image_file("test_3.jpg")[1],
            "image_quality": 75,
        }
        use_cache_data = {
            **data,
            'use_cache': True,
        }
        cls.media_data.extend([
            # image list local
            # sorted data
            # natural: test_1.jpg, test_2.jpg, test_3.jpg, test_10.jpg
            {
                **use_cache_data,
                'sorting_method': SortingMethod.NATURAL,
            },
            {
                **data,
                'sorting_method': SortingMethod.NATURAL,
            },
            # random
            {
                **use_cache_data,
                'sorting_method': SortingMethod.RANDOM,
            },
            # predefined: test_1.jpg, test_2.jpg, test_10.jpg, test_3.jpg
            {
                **use_cache_data,
                'sorting_method': SortingMethod.PREDEFINED,
            },
            # lexicographical: test_1.jpg, test_10.jpg, test_2.jpg, test_3.jpg
            {
                **use_cache_data,
                'sorting_method': SortingMethod.LEXICOGRAPHICAL,
            },
            {
                **data,
                'sorting_method': SortingMethod.LEXICOGRAPHICAL,
            },
            # video local
            {
                "client_files[0]": generate_video_file("test_video.mp4")[1],
                "image_quality": 75,
            },
            # zip archive local
            {
                "client_files[0]": generate_zip_archive_file("test_archive_1.zip", 10)[1],
                "image_quality": 50,
            },
            # pdf local
            {
                "client_files[0]": generate_pdf_file("test_pdf_1.pdf", 7)[1],
                "image_quality": 54,
            },
        ])

    def tearDown(self):
        for task in self.tasks:
            shutil.rmtree(os.path.join(settings.TASKS_ROOT, str(task["id"])))
            shutil.rmtree(os.path.join(settings.MEDIA_DATA_ROOT, str(task["data_id"])))

        return super().tearDown()

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        path = os.path.join(settings.SHARE_ROOT, "test_1.jpg")
        os.remove(path)

        path = os.path.join(settings.SHARE_ROOT, "test_2.jpg")
        os.remove(path)

        path = os.path.join(settings.SHARE_ROOT, "test_3.jpg")
        os.remove(path)

        path = os.path.join(settings.SHARE_ROOT, "test_video_1.mp4")
        os.remove(path)

        path = os.path.join(settings.SHARE_ROOT, "videos", "test_video_1.mp4")
        os.remove(path)

        path = os.path.join(settings.SHARE_ROOT, "videos", "manifest.jsonl")
        os.remove(path)
        os.rmdir(os.path.dirname(path))

        path = os.path.join(settings.SHARE_ROOT, "test_pointcloud_pcd.zip")
        os.remove(path)

        path = os.path.join(settings.SHARE_ROOT, "test_velodyne_points.zip")
        os.remove(path)

        path = os.path.join(settings.SHARE_ROOT, "manifest.jsonl")
        os.remove(path)

    def _create_tasks(self):
        self.tasks = []

        def _create_task(task_data, media_data):
            response = self.client.post('/api/tasks', data=task_data, format="json")
            assert response.status_code == status.HTTP_201_CREATED
            tid = response.data["id"]

            for media in media_data.values():
                if isinstance(media, io.BytesIO):
                    media.seek(0)
            response = self.client.post("/api/tasks/{}/data".format(tid), data=media_data)
            assert response.status_code == status.HTTP_202_ACCEPTED
            response = self.client.get("/api/tasks/{}".format(tid))
            data_id = response.data["data"]
            self.tasks.append({
                "id": tid,
                "data_id": data_id,
            })

        task_data = [
            {
                "name": "my task #1",
                "owner_id": self.owner.id,
                "assignee_id": self.owner.id,
                "overlap": 0,
                "segment_size": 100,
                "labels": [{
                    "name": "car",
                    "color": "#ff00ff",
                    "attributes": [{
                        "name": "bool_attribute",
                        "mutable": True,
                        "input_type": AttributeType.CHECKBOX,
                        "default_value": "true",
                        "values": [],
                    }],
                    }, {
                        "name": "person",
                    },
                ]
            },
            {
                "name": "my task #2",
                "owner_id": self.owner.id,
                "assignee_id": self.owner.id,
                "overlap": 1,
                "segment_size": 3,
                "labels": [{
                    "name": "car",
                    "color": "#ff00ff",
                    "attributes": [{
                        "name": "bool_attribute",
                        "mutable": True,
                        "input_type": AttributeType.CHECKBOX,
                        "default_value": "true",
                        "values": [],
                    }],
                    }, {
                        "name": "person",
                    },
                ]
            },
        ]

        with ForceLogin(self.owner, self.client):
            for data in task_data:
                for media in self.media_data:
                    _create_task(data, media)

    def _run_api_v2_tasks_id_export(self, tid, user, query_params=""):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/tasks/{}/backup?{}'.format(tid, query_params), format="json")

        return response

    def _run_api_v2_tasks_id_import(self, user, data):
        with ForceLogin(user, self.client):
            response = self.client.post('/api/tasks/backup', data=data, format="multipart")

        return response

    def _run_api_v2_tasks_id(self, tid, user):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/tasks/{}'.format(tid), format="json")

        return response.data

    def _run_api_v2_tasks_id_export_import(self, user):
        if user:
            if user == self.owner or user.is_superuser:
                HTTP_200_OK = status.HTTP_200_OK
                HTTP_202_ACCEPTED = status.HTTP_202_ACCEPTED
                HTTP_201_CREATED = status.HTTP_201_CREATED
            else:
                HTTP_200_OK = status.HTTP_403_FORBIDDEN
                HTTP_202_ACCEPTED = status.HTTP_403_FORBIDDEN
                HTTP_201_CREATED = status.HTTP_403_FORBIDDEN
        else:
            HTTP_200_OK = status.HTTP_401_UNAUTHORIZED
            HTTP_202_ACCEPTED = status.HTTP_401_UNAUTHORIZED
            HTTP_201_CREATED = status.HTTP_401_UNAUTHORIZED

        self._create_tasks()
        for task in self.tasks:
            tid = task["id"]
            response = self._run_api_v2_tasks_id_export(tid, user)
            self.assertEqual(response.status_code, HTTP_202_ACCEPTED)

            response = self._run_api_v2_tasks_id_export(tid, user)
            self.assertEqual(response.status_code, HTTP_201_CREATED)

            response = self._run_api_v2_tasks_id_export(tid, user, "action=download")
            self.assertEqual(response.status_code, HTTP_200_OK)

            if user and user is not self.somebody and user is not self.user and user is not self.annotator:
                self.assertTrue(response.streaming)
                content = io.BytesIO(b"".join(response.streaming_content))
                content.seek(0)

                uploaded_data = {
                    "task_file": content,
                }
                response = self._run_api_v2_tasks_id_import(user, uploaded_data)
                self.assertEqual(response.status_code, HTTP_202_ACCEPTED)
                if user is not self.somebody and user is not self.user and user is not self.annotator:
                    rq_id = response.data["rq_id"]
                    response = self._run_api_v2_tasks_id_import(user, {"rq_id": rq_id})
                    self.assertEqual(response.status_code, HTTP_201_CREATED)
                    original_task = self._run_api_v2_tasks_id(tid, user)
                    imported_task = self._run_api_v2_tasks_id(response.data["id"], user)
                    compare_objects(
                        self=self,
                        obj1=original_task,
                        obj2=imported_task,
                        ignore_keys=(
                            "id",
                            "url",
                            "owner",
                            "project_id",
                            "assignee",
                            "created_date",
                            "updated_date",
                            "data",
                            "source_storage",
                            "target_storage",
                            "jobs",
                        ),
                    )

    def test_api_v2_tasks_id_export_admin(self):
        self._run_api_v2_tasks_id_export_import(self.admin)

    def test_api_v2_tasks_id_export_user(self):
        self._run_api_v2_tasks_id_export_import(self.user)

    def test_api_v2_tasks_id_export_annotator(self):
        self._run_api_v2_tasks_id_export_import(self.annotator)

    def test_api_v2_tasks_id_export_somebody(self):
        self._run_api_v2_tasks_id_export_import(self.somebody)

    def test_api_v2_tasks_id_export_no_auth(self):
        self._run_api_v2_tasks_id_export_import(None)

def generate_random_image_file(filename):
    gen = random.SystemRandom()
    width = gen.randint(100, 800)
    height = gen.randint(100, 800)
    f = generate_image_file(filename, size=(width, height))
    return (width, height), f

def generate_random_image_files(*filenames):
    images = []
    image_sizes = []
    for image_name in filenames:
        img_size, image = generate_random_image_file(image_name)
        image_sizes.append(img_size)
        images.append(image)

    return image_sizes, images

def generate_zip_archive_file(filename, count):
    image_sizes = []
    zip_buf = BytesIO()
    with zipfile.ZipFile(zip_buf, 'w') as zip_chunk:
        for idx in range(count):
            image_name = "image_{:6d}.jpg".format(idx)
            size, image_buf = generate_random_image_file(image_name)
            image_sizes.append(size)
            zip_chunk.writestr(image_name, image_buf.getvalue())

    zip_buf.name = filename
    zip_buf.seek(0)
    return image_sizes, zip_buf

def generate_pdf_file(filename, page_count=1):
    images = [Image.fromarray(np.ones((50, 100, 3), dtype=np.uint8))
        for _ in range(page_count)]
    image_sizes = [img.size for img in images]

    file_buf = BytesIO()
    images[0].save(file_buf, 'pdf', save_all=True, resolution=200,
        append_images=images[1:])

    file_buf.name = filename
    file_buf.seek(0)
    return image_sizes, file_buf

def generate_manifest_file(data_type, manifest_path, sources, *,
    sorting_method=SortingMethod.LEXICOGRAPHICAL,
    root_dir=None,
):
    if data_type == 'video':
        kwargs = {
            'media_file': sources[0],
            'upload_dir': os.path.dirname(sources[0]),
            'force': True
        }
        manifest = VideoManifestManager(manifest_path, create_index=False)
    else:
        kwargs = {
            'sources': sources,
            'sorting_method': sorting_method,
            'use_image_hash': True,
            'data_dir': root_dir,
        }
        manifest = ImageManifestManager(manifest_path, create_index=False)
    manifest.link(**kwargs)
    manifest.create()


def get_manifest_images_list(manifest_path):
    return list(ImageManifestManager(manifest_path, create_index=False).data)


class TaskDataAPITestCase(ApiTestBase):
    _share_image_sizes = {}
    _client_images = {}
    _client_mp4_video = {}
    _client_archive = {}
    _client_pdf = {}
    _client_mxf_video = {}

    class ChunkType(str, Enum):
        IMAGESET = 'imageset'
        VIDEO = 'video'

        def __str__(self):
            return self.value

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls._share_image_sizes = {}
        cls._share_files = []

        for filename in [
            "test_1.jpg", "test_2.jpg", "test_3.jpg", "test_10.jpg", "test_qwe.jpg",
            "subdir2/subdir3/test_zxc.jpg", "data/test_3.jpg"
        ]:
            path = os.path.join(settings.SHARE_ROOT, filename)
            img_size, data = generate_random_image_file(filename)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "wb") as image:
                image.write(data.read())
            cls._share_image_sizes[filename] = img_size
            cls._share_files.append(filename)

        filename = "test_video_1.mp4"
        path = os.path.join(settings.SHARE_ROOT, filename)
        img_sizes, data = generate_video_file(filename, width=1280, height=720)
        with open(path, "wb") as video:
            video.write(data.read())
        cls._share_image_sizes[filename] = img_sizes
        cls._share_files.append(filename)

        filename = "test_rotated_90_video.mp4"
        path = os.path.join(os.path.dirname(__file__), 'assets', 'test_rotated_90_video.mp4')
        container = av.open(path, 'r')
        for frame in container.decode(video=0):
            # pyav ignores rotation record in metadata when decoding frames
            img_sizes = [(frame.height, frame.width)] * container.streams.video[0].frames
            break
        container.close()
        cls._share_image_sizes[filename] = img_sizes

        filename = os.path.join("videos", "test_video_1.mp4")
        path = os.path.join(settings.SHARE_ROOT, filename)
        os.makedirs(os.path.dirname(path))
        img_sizes, data = generate_video_file(filename, width=1280, height=720)
        with open(path, "wb") as video:
            video.write(data.read())
        cls._share_image_sizes[filename] = img_sizes
        cls._share_files.append(filename)

        filename = os.path.join("test_archive_1.zip")
        path = os.path.join(settings.SHARE_ROOT, filename)
        img_sizes, data = generate_zip_archive_file(filename, count=5)
        with open(path, "wb") as zip_archive:
            zip_archive.write(data.read())
        cls._share_image_sizes[filename] = img_sizes
        cls._share_files.append(filename)

        filename = "test_pointcloud_pcd.zip"
        path = os.path.join(os.path.dirname(__file__), 'assets', filename)
        image_sizes = []
        # container = av.open(path, 'r')
        zip_file = zipfile.ZipFile(path)
        for info in zip_file.namelist():
            if info.rsplit(".", maxsplit=1)[-1] == "pcd":
                with zip_file.open(info, "r") as file:
                    data = ValidateDimension.get_pcd_properties(file)
                    image_sizes.append((int(data["WIDTH"]), int(data["HEIGHT"])))
        cls._share_image_sizes[filename] = image_sizes

        filename = "test_rar.rar"
        source_path = os.path.join(os.path.dirname(__file__), 'assets', filename)
        path = os.path.join(settings.SHARE_ROOT, filename)
        shutil.copyfile(source_path, path)
        image_sizes = []
        images = cls._extract_rar_archive(source_path)
        for [f, image] in images:
            width, height = image.size
            image_sizes.append((width, height))
        cls._share_image_sizes[filename] = image_sizes
        cls._share_files.append(filename)

        filename = "test_velodyne_points.zip"
        path = os.path.join(os.path.dirname(__file__), 'assets', filename)
        image_sizes = []

        # create zip instance
        zip_file = zipfile.ZipFile(path, mode='a')

        source_path = []
        root_path = os.path.abspath(os.path.split(path)[0])

        for info in zip_file.namelist():
            if os.path.splitext(info)[1][1:] == "bin":
                zip_file.extract(info, root_path)
                bin_path = os.path.abspath(os.path.join(root_path, info))
                source_path.append(ValidateDimension.convert_bin_to_pcd(bin_path))

        for path in source_path:
            zip_file.write(path, os.path.abspath(path.replace(root_path, "")))

        for info in zip_file.namelist():
            if os.path.splitext(info)[1][1:] == "pcd":
                with zip_file.open(info, "r") as file:
                    data = ValidateDimension.get_pcd_properties(file)
                    image_sizes.append((int(data["WIDTH"]), int(data["HEIGHT"])))

        root_path = os.path.abspath(os.path.join(root_path, filename.split(".")[0]))
        shutil.rmtree(root_path, ignore_errors=True)

        cls._share_image_sizes[filename] = image_sizes

        filename = 'test_1.pdf'
        path = os.path.join(settings.SHARE_ROOT, filename)
        img_sizes, data = generate_pdf_file(filename, page_count=5)
        with open(path, "wb") as pdf_file:
            pdf_file.write(data.read())
        cls._share_image_sizes[filename] = img_sizes
        cls._share_files.append(filename)

        filename = 'videos/manifest.jsonl'
        generate_manifest_file(data_type='video',
            manifest_path=os.path.join(settings.SHARE_ROOT, filename),
            sources=[os.path.join(settings.SHARE_ROOT, 'videos', 'test_video_1.mp4')])
        cls._share_files.append(filename)

        image_files = [
            'test_1.jpg', "subdir2/subdir3/test_zxc.jpg", 'test_qwe.jpg',
            'test_3.jpg', 'test_10.jpg', 'data/test_3.jpg', 'test_2.jpg',
        ]
        for ordered in [True, False]:
            filename = 'images_manifest{}.jsonl'.format(
                "_sorted" if ordered else ""
            )
            generate_manifest_file(data_type='images',
                manifest_path=os.path.join(settings.SHARE_ROOT, filename),
                sources=[os.path.join(settings.SHARE_ROOT, fn) for fn in image_files],
                sorting_method=SortingMethod.LEXICOGRAPHICAL if ordered else SortingMethod.PREDEFINED,
                root_dir=settings.SHARE_ROOT,
            )
            cls._share_files.append(filename)

        filename = "test_archive_2.zip"
        with zipfile.ZipFile(os.path.join(settings.SHARE_ROOT, filename), 'x') as f:
            for fn in image_files:
                f.write(os.path.join(settings.SHARE_ROOT, fn), fn)
        cls._share_files.append(filename)

        filename = "test_archive_2_sorted.zip"
        with zipfile.ZipFile(os.path.join(settings.SHARE_ROOT, filename), 'x') as f:
            for fn in sorted(image_files):
                f.write(os.path.join(settings.SHARE_ROOT, fn), fn)
        cls._share_files.append(filename)

        image_sizes, images = generate_random_image_files("test_1.jpg", "test_2.jpg", "test_3.jpg")
        cls._client_images = {
            'images': images,
            'image_sizes': image_sizes,
        }

        image_sizes, video = generate_video_file(filename="test_video_1.mp4", width=1280, height=720)
        cls._client_mp4_video = {
            'video': video,
            'image_sizes': image_sizes,
        }

        image_sizes, archive = generate_zip_archive_file("test_archive_2.zip", 7)
        cls._client_archive = {
            'archive': archive,
            'image_sizes': image_sizes
        }

        image_sizes, document = generate_pdf_file("test_pdf_1.pdf", 5)
        cls._client_pdf = {
            'pdf': document,
            'image_sizes': image_sizes
        }

        image_sizes, video = generate_video_file(filename="test_video_1.mxf",
            width=1280, height=720, codec_name='mpeg2video')
        cls._client_mxf_video = {
            'video': video,
            'image_sizes': image_sizes,
        }

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()

        dirs = set()
        for filename in cls._share_files:
            dirs.add(os.path.dirname(filename))
            os.remove(os.path.join(settings.SHARE_ROOT, filename))

        for dirname in sorted(dirs, reverse=True):
            path = os.path.join(settings.SHARE_ROOT, dirname)
            if not os.listdir(path):
                os.rmdir(path)

    def _run_api_v2_tasks_id_data_post(self, tid, user, data, *, headers=None):
        with ForceLogin(user, self.client):
            response = self.client.post('/api/tasks/{}/data'.format(tid),
                data=data, **{'HTTP_' + k: v for k, v in (headers or {}).items()})

        return response

    def _get_task_creation_status(self, tid, user, *, headers=None):
        with ForceLogin(user, self.client):
            response = self.client.get('/api/tasks/{}/status'.format(tid),
                **{'HTTP_' + k: v for k, v in (headers or {}).items()})

        return response

    def _create_task(self, user, data):
        with ForceLogin(user, self.client):
            response = self.client.post('/api/tasks', data=data, format="json")
        return response

    def _get_task(self, user, tid):
        with ForceLogin(user, self.client):
            return self.client.get("/api/tasks/{}".format(tid))

    def _run_api_v2_task_id_data_get(self, tid, user, data_type, data_quality=None, data_number=None):
        url = '/api/tasks/{}/data?type={}'.format(tid, data_type)
        if data_quality is not None:
            url += '&quality={}'.format(data_quality)
        if data_number is not None:
            url += '&number={}'.format(data_number)
        with ForceLogin(user, self.client):
            return self.client.get(url)

    def _get_preview(self, tid, user):
        url = '/api/tasks/{}/preview'.format(tid)
        with ForceLogin(user, self.client):
            return self.client.get(url)

    def _get_compressed_chunk(self, tid, user, number):
        return self._run_api_v2_task_id_data_get(tid, user, "chunk", "compressed", number)

    def _get_original_chunk(self, tid, user, number):
        return self._run_api_v2_task_id_data_get(tid, user, "chunk", "original", number)

    def _get_compressed_frame(self, tid, user, number):
        return self._run_api_v2_task_id_data_get(tid, user, "frame", "compressed", number)

    def _get_original_frame(self, tid, user, number):
        return self._run_api_v2_task_id_data_get(tid, user, "frame", "original", number)

    @staticmethod
    def _extract_zip_archive(archive, dimension=DimensionType.DIM_2D):
        chunk = zipfile.ZipFile(archive, mode='r')
        if dimension == DimensionType.DIM_3D:
            return [(f, BytesIO(chunk.read(f)))
                for f in sorted(chunk.namelist())
                if f.rsplit(".", maxsplit=1)[-1] == "pcd"
            ]
        return [(f, Image.open(BytesIO(chunk.read(f))))
            for f in sorted(chunk.namelist())
        ]

    @staticmethod
    def _extract_rar_archive(archive):
        with tempfile.TemporaryDirectory(dir=settings.TMP_FILES_ROOT) as archive_dir:
            patool_path = os.path.join(sysconfig.get_path('scripts'), 'patool')
            Archive(archive).extractall_patool(archive_dir, patool_path)

            images = [(image, Image.open(os.path.join(archive_dir, image)))
                for image in os.listdir(archive_dir)
            ]
            return images

    @classmethod
    def _extract_zip_chunk(cls, chunk_buffer, dimension=DimensionType.DIM_2D):
        return [f[1] for f in cls._extract_zip_archive(chunk_buffer, dimension=dimension)]

    @staticmethod
    def _extract_video_chunk(chunk_buffer):
        container = av.open(chunk_buffer)
        stream = container.streams.video[0]
        return [f.to_image() for f in container.decode(stream)]

    def _test_api_v2_tasks_id_data_spec(self, user, spec, data,
                                        expected_compressed_type,
                                        expected_original_type,
                                        expected_image_sizes,
                                        expected_storage_method=StorageMethodChoice.FILE_SYSTEM,
                                        expected_uploaded_data_location=StorageChoice.LOCAL,
                                        dimension=DimensionType.DIM_2D,
                                        expected_task_creation_status_state='Finished',
                                        expected_task_creation_status_reason=None,
                                        *,
                                        send_data_callback=None,
                                        get_status_callback=None,
                                        ):
        if send_data_callback is None:
            send_data_callback = self._run_api_v2_tasks_id_data_post

        if get_status_callback is None:
            get_status_callback = self._get_task_creation_status

        # create task
        response = self._create_task(user, spec)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        task_id = response.data["id"]

        # post data for the task
        response = send_data_callback(task_id, user, data)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.reason_phrase)

        if get_status_callback:
            max_number_of_attempt = 100
            state = None
            while state not in ('Failed', 'Finished'):
                assert max_number_of_attempt, "Too much time to create a task"
                response = get_status_callback(task_id, user)
                state = response.data['state']
                sleep(0.1)
                max_number_of_attempt -= 1
            self.assertEqual(state, expected_task_creation_status_state)
            if expected_task_creation_status_state == 'Failed':
                self.assertIn(expected_task_creation_status_reason, response.data['message'])
                return

        response = self._get_task(user, task_id)

        expected_status_code = status.HTTP_200_OK
        if user == self.user and "owner_id" in spec and spec["owner_id"] != user.id and \
           "assignee_id" in spec and spec["assignee_id"] != user.id:
            expected_status_code = status.HTTP_403_FORBIDDEN
        self.assertEqual(response.status_code, expected_status_code)

        if expected_status_code == status.HTTP_200_OK:
            task = response.json()
            self.assertEqual(expected_compressed_type, task["data_compressed_chunk_type"])
            self.assertEqual(expected_original_type, task["data_original_chunk_type"])
            self.assertEqual(len(expected_image_sizes), task["size"])
            db_data = Task.objects.get(pk=task_id).data
            self.assertEqual(expected_storage_method, db_data.storage_method)
            self.assertEqual(expected_uploaded_data_location, db_data.storage)
            # check if used share without copying inside and files doesn`t exist in ../raw/ and exist in share
            if expected_uploaded_data_location is StorageChoice.SHARE:
                filename = next(
                    (v for k, v in data.items() if k.startswith('server_files[') ),
                    None
                )
                raw_file_path = os.path.join(db_data.get_upload_dirname(), filename)
                share_file_path = os.path.join(settings.SHARE_ROOT, filename)
                self.assertEqual(False, os.path.exists(raw_file_path))
                self.assertEqual(True, os.path.exists(share_file_path))

        # check preview
        response = self._get_preview(task_id, user)
        self.assertEqual(response.status_code, expected_status_code)
        if expected_status_code == status.HTTP_200_OK:
            if dimension == DimensionType.DIM_2D:
                preview = Image.open(io.BytesIO(response.content))
                self.assertLessEqual(preview.size, expected_image_sizes[0])

        # check compressed chunk
        response = self._get_compressed_chunk(task_id, user, 0)
        self.assertEqual(response.status_code, expected_status_code)
        if expected_status_code == status.HTTP_200_OK:
            if isinstance(response, HttpResponse):
                compressed_chunk = io.BytesIO(response.content)
            else:
                compressed_chunk = io.BytesIO(b"".join(response.streaming_content))
            if task["data_compressed_chunk_type"] == self.ChunkType.IMAGESET:
                images = self._extract_zip_chunk(compressed_chunk, dimension=dimension)
            else:
                images = self._extract_video_chunk(compressed_chunk)

            self.assertEqual(len(images), min(task["data_chunk_size"], len(expected_image_sizes)))

            for image_idx, received_image in enumerate(images):
                if dimension == DimensionType.DIM_3D:
                    properties = ValidateDimension.get_pcd_properties(received_image)
                    self.assertEqual((int(properties["WIDTH"]),int(properties["HEIGHT"])), expected_image_sizes[image_idx])
                else:
                    self.assertEqual(received_image.size, expected_image_sizes[image_idx])

        # check original chunk
        response = self._get_original_chunk(task_id, user, 0)
        self.assertEqual(response.status_code, expected_status_code)
        if expected_status_code == status.HTTP_200_OK:
            if isinstance(response, HttpResponse):
                original_chunk = io.BytesIO(response.getvalue())
            else:
                original_chunk  = io.BytesIO(b"".join(response.streaming_content))
            if task["data_original_chunk_type"] == self.ChunkType.IMAGESET:
                images = self._extract_zip_chunk(original_chunk, dimension=dimension)
            else:
                images = self._extract_video_chunk(original_chunk)

            for image_idx, received_image in enumerate(images):
                if dimension == DimensionType.DIM_3D:
                    properties = ValidateDimension.get_pcd_properties(received_image)
                    self.assertEqual((int(properties["WIDTH"]), int(properties["HEIGHT"])), expected_image_sizes[image_idx])
                else:
                    self.assertEqual(received_image.size, expected_image_sizes[image_idx])

            self.assertEqual(len(images), min(task["data_chunk_size"], len(expected_image_sizes)))

            if task["data_original_chunk_type"] == self.ChunkType.IMAGESET:
                server_files = [img for key, img in data.items() if key.startswith("server_files")]
                client_files = [img for key, img in data.items() if key.startswith("client_files")]

                _name_key = lambda x: getattr(x, 'name', x)

                if server_files:
                    _add_prefix = lambda x: os.path.join(settings.SHARE_ROOT, x)
                    source_files = server_files
                else:
                    _add_prefix = lambda x: x
                    source_files = client_files

                manifest = next((v for v in source_files if _name_key(v).endswith('.jsonl')), None)
                source_files = [_add_prefix(f)
                    for f in source_files if not _name_key(f).endswith('jsonl')]

                # Load images
                source_images = {}
                for f in source_files:
                    if zipfile.is_zipfile(f):
                        for frame_name, frame in self._extract_zip_archive(f, dimension=dimension):
                            source_images[frame_name] = frame
                    elif isinstance(f, str) and f.endswith('.rar'):
                        archive_frames = self._extract_rar_archive(f)
                        for fn, frame in archive_frames:
                            source_images[fn] = frame
                    elif isinstance(f, str) and f.endswith('.pdf'):
                        with open(f, 'rb') as pdf_file:
                            for i, frame in enumerate(convert_from_bytes(pdf_file.read(), fmt='png')):
                                source_images[f"frame_{i}"] = frame
                    elif isinstance(f, IOBase) and getattr(f, 'name', '').endswith('.pdf'):
                        for i, frame in enumerate(convert_from_bytes(f.getvalue(), fmt='png')):
                            source_images[f"frame_{i}"] = frame
                    elif isinstance(f, str) and not f.endswith('.jsonl'):
                        source_images[f] = Image.open(f)
                    elif isinstance(f, IOBase) and not f.name.endswith('.jsonl'):
                        source_images[f.name] = Image.open(f)

                # Apply the requested sorting to the expected results
                sorting = data.get('sorting_method', SortingMethod.LEXICOGRAPHICAL)
                if sorting == SortingMethod.PREDEFINED and manifest:
                    manifest = _add_prefix(_name_key(manifest))
                    manifest_root = os.path.dirname(manifest)
                    manifest_files = get_manifest_images_list(manifest)
                    assert len(manifest_files) == len(source_images)
                    source_images = [
                        source_images.get(os.path.join(manifest_root, f)) or source_images[f]
                        for f in manifest_files
                    ]
                else:
                    source_images = [v[1] for v in sort(
                        source_images.items(),
                        sorting_method=sorting,
                        func=lambda e: _name_key(e[0])
                    )]

                for (received_image, source_image) in zip(images, source_images):
                    if dimension == DimensionType.DIM_3D:
                        server_image = np.array(received_image.getbuffer())
                        source_image = np.array(source_image.getbuffer())
                        self.assertTrue(np.array_equal(source_image, server_image))
                    else:
                        server_image = np.array(received_image)
                        source_image = np.array(source_image)
                        self.assertTrue(np.array_equal(source_image, server_image))

    def _test_api_v2_tasks_id_data_create_can_upload_local_images(self, user):
        task_spec = {
            "name": "my task #1",
            "owner_id": user.id,
            "assignee_id": user.id,
            "overlap": 0,
            "segment_size": 100,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        images = copy.deepcopy(self._client_images['images'])
        image_sizes = self._client_images['image_sizes']
        task_data = {
            "client_files[0]": images[0],
            "client_files[1]": images[1],
            "client_files[2]": images[2],
            "image_quality": 75,
        }

        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET, image_sizes)

    def _test_api_v2_tasks_id_data_create_can_use_server_images(self, user):
        task_spec = {
            "name": "my task without copying #2",
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
            self._share_image_sizes[task_data["server_files[3]"]],
            self._share_image_sizes[task_data["server_files[0]"]],
            self._share_image_sizes[task_data["server_files[1]"]],
            self._share_image_sizes[task_data["server_files[2]"]],
        ]

        with self.subTest(current_function_name() + " no copy"):
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET, image_sizes,
                                             expected_uploaded_data_location=StorageChoice.SHARE)

        with self.subTest(current_function_name() + " with copy"):
            task_spec.update([('name', 'my task #3')])
            task_data.update([('copy_data', True)])
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                                             image_sizes, expected_uploaded_data_location=StorageChoice.LOCAL)

    def _test_api_v2_tasks_id_data_create_can_use_local_video(self, user):
        task_spec = {
            "name": "my video task #4",
            "overlap": 0,
            "segment_size": 100,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }
        video = copy.deepcopy(self._client_mp4_video['video'])
        image_sizes = self._client_mp4_video['image_sizes']
        task_data = {
            "client_files[0]": video,
            "image_quality": 43,
        }

        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO, self.ChunkType.VIDEO, image_sizes)

    def _test_api_v2_tasks_id_data_create_can_use_server_video(self, user):
        task_spec = {
            "name": "my video task without copying #5",
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
        image_sizes = self._share_image_sizes[task_data["server_files[0]"]]

        with self.subTest(current_function_name() + " no copy"):
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO, self.ChunkType.VIDEO, image_sizes,
                                             expected_uploaded_data_location=StorageChoice.SHARE)

        with self.subTest(current_function_name() + " with copy"):
            task_spec.update([('name', 'my video task #6')])
            task_data.update([('copy_data', True)])
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO, self.ChunkType.VIDEO,
                                             image_sizes, expected_uploaded_data_location=StorageChoice.LOCAL)

    def _test_api_v2_tasks_id_data_create_can_use_server_video_default_segment_size(self, user):
        task_spec = {
            "name": "my video task without copying #7",
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
        image_sizes = self._share_image_sizes[task_data["server_files[0]"]]

        with self.subTest(current_function_name() + " no copy"):
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO, self.ChunkType.VIDEO, image_sizes,
                                             expected_uploaded_data_location=StorageChoice.SHARE)

        with self.subTest(current_function_name() + " with copy"):
            task_spec.update([("name", "my video task #8")])
            task_data.update([("copy_data", True)])
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO, self.ChunkType.VIDEO,
                                             image_sizes, expected_uploaded_data_location=StorageChoice.LOCAL)

    def _test_api_v2_tasks_id_data_create_can_compress_server_video(self, user):
        task_spec = {
            "name": "my video task without copying #9",
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
        image_sizes = self._share_image_sizes[task_data["server_files[0]"]]

        with self.subTest(current_function_name() + " no copy"):
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.VIDEO, image_sizes,
                                             expected_uploaded_data_location=StorageChoice.SHARE)

        with self.subTest(current_function_name() + " with copy"):
            task_spec.update([('name', 'my video task #10')])
            task_data.update([('copy_data', True)])
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.VIDEO,
                                             image_sizes, expected_uploaded_data_location=StorageChoice.LOCAL)

    def _test_api_v2_tasks_id_data_create_can_use_server_zip_archive(self, user):
        task_spec = {
            "name": "my archive task without copying #11",
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
        image_sizes = self._share_image_sizes[task_data["server_files[0]"]]

        with self.subTest(current_function_name() + " no copy"):
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET, image_sizes,
                                             expected_uploaded_data_location=StorageChoice.LOCAL)

        with self.subTest(current_function_name() + " with copy"):
            task_spec.update([('name', 'my archive task #12')])
            task_data.update([('copy_data', True)])
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                                             image_sizes, expected_uploaded_data_location=StorageChoice.LOCAL)

    def _test_api_v2_tasks_id_data_create_can_use_local_archive(self, user):
        task_spec = {
            "name": "my archive task #13",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }
        archive = copy.deepcopy(self._client_archive['archive'])
        image_sizes = self._client_archive['image_sizes']
        task_data = {
            "client_files[0]": archive,
            "image_quality": 100,
        }

        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET, image_sizes)

    def _test_api_v2_tasks_id_data_create_can_use_cached_server_video(self, user):
        task_spec = {
            "name": "cached video task without copying #14",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "server_files[0]": 'test_video_1.mp4',
            "image_quality": 70,
            "use_cache": True,
        }

        image_sizes = self._share_image_sizes[task_data["server_files[0]"]]

        with self.subTest(current_function_name() + " no copy"):
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO,
                self.ChunkType.VIDEO, image_sizes, StorageMethodChoice.CACHE, StorageChoice.SHARE)

        with self.subTest(current_function_name() + " with copy"):
            task_spec.update([('name', 'cached video task #15')])
            task_data.update([('copy_data', True)])
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO,
                self.ChunkType.VIDEO, image_sizes, StorageMethodChoice.CACHE, StorageChoice.LOCAL)

    def _test_api_v2_tasks_id_data_create_can_use_cached_server_images(self, user):
        task_spec = {
            "name": "cached images task with default sorting data and without copying #16",
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
            "server_files[2]": "test_10.jpg",
            "image_quality": 70,
            "use_cache": True,
        }
        image_sizes = [
            self._share_image_sizes[task_data["server_files[0]"]],
            self._share_image_sizes[task_data["server_files[2]"]],
            self._share_image_sizes[task_data["server_files[1]"]],
        ]

        with self.subTest(current_function_name() + " no copy"):
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET,
                self.ChunkType.IMAGESET, image_sizes, StorageMethodChoice.CACHE, StorageChoice.SHARE)

        with self.subTest(current_function_name() + " with copy"):
            task_spec.update([('name', 'cached images task #17')])
            task_data.update([('copy_data', True)])
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                                             image_sizes, StorageMethodChoice.CACHE, StorageChoice.LOCAL)

    def _test_api_v2_tasks_id_data_create_can_use_cached_server_zip_archive(self, user):
        task_spec = {
            "name": "my cached zip archive task without copying #18",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "server_files[0]": "test_archive_1.zip",
            "image_quality": 70,
            "use_cache": True
        }

        image_sizes = self._share_image_sizes[task_data["server_files[0]"]]

        with self.subTest(current_function_name() + " no copy"):
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET,
                self.ChunkType.IMAGESET, image_sizes, StorageMethodChoice.CACHE, StorageChoice.LOCAL)

        with self.subTest(current_function_name() + " with copy"):
            task_spec.update([('name', 'my cached zip archive task #19')])
            task_data.update([('copy_data', True)])
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                                             image_sizes, StorageMethodChoice.CACHE, StorageChoice.LOCAL)

    def _test_api_v2_tasks_id_data_create_can_use_cached_local_pdf(self, user):
        task_spec = {
            "name": "my cached pdf task #20",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        document = copy.deepcopy(self._client_pdf['pdf'])
        image_sizes = self._client_pdf['image_sizes']

        task_data = {
            "client_files[0]": document,
            "image_quality": 70,
            "use_cache": True
        }

        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data,
            self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
            image_sizes, StorageMethodChoice.CACHE)

    def _test_api_v2_tasks_id_data_create_can_use_local_pdf(self, user):
        task_spec = {
            "name": "my pdf task #21",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        document = copy.deepcopy(self._client_pdf['pdf'])
        image_sizes = self._client_pdf['image_sizes']
        task_data = {
            "client_files[0]": document,
            "image_quality": 70,
        }

        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data,
            self.ChunkType.IMAGESET, self.ChunkType.IMAGESET, image_sizes)

    def _test_api_v2_tasks_id_data_create_can_use_server_video_with_meta(self, user):
        task_spec = {
            "name": "my video with meta info task without copying #22",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }
        task_data = {
            "server_files[0]": os.path.join("videos", "test_video_1.mp4"),
            "server_files[1]": os.path.join("videos", "manifest.jsonl"),
            "image_quality": 70,
            "use_cache": True
        }
        image_sizes = self._share_image_sizes[task_data['server_files[0]']]

        with self.subTest(current_function_name() + " no copy"):
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO,
                                            self.ChunkType.VIDEO, image_sizes, StorageMethodChoice.CACHE,
                                            StorageChoice.SHARE)

        with self.subTest(current_function_name() + " with copy"):
            task_spec.update([('name', 'my video with meta info task #23')])
            task_data.update([('copy_data', True)])
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO, self.ChunkType.VIDEO,
                                             image_sizes, StorageMethodChoice.CACHE, StorageChoice.LOCAL)

    def _test_api_v2_tasks_id_data_create_can_use_chunked_local_video(self, user):
        task_spec = {
            "name": "my cached video task #14",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "client_files[0]": open(os.path.join(os.path.dirname(__file__), 'assets', 'test_rotated_90_video.mp4'), 'rb'),
            "image_quality": 70,
            "use_zip_chunks": True
        }

        image_sizes = self._share_image_sizes['test_rotated_90_video.mp4']
        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET,
            self.ChunkType.VIDEO, image_sizes, StorageMethodChoice.FILE_SYSTEM)

    def _test_api_v2_tasks_id_data_create_can_use_chunked_cached_local_video(self, user):
        task_spec = {
            "name": "my video task #15",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "client_files[0]": open(os.path.join(os.path.dirname(__file__), 'assets', 'test_rotated_90_video.mp4'), 'rb'),
            "image_quality": 70,
            "use_cache": True,
            "use_zip_chunks": True
        }

        image_sizes = self._share_image_sizes['test_rotated_90_video.mp4']
        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET,
            self.ChunkType.VIDEO, image_sizes, StorageMethodChoice.CACHE)

    def _test_api_v2_tasks_id_data_create_can_use_mxf_video(self, user):
        task_spec = {
            "name": "test mxf format",
            "use_zip_chunks": False,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ],
        }

        video = copy.deepcopy(self._client_mxf_video['video'])
        image_sizes = self._client_mxf_video['image_sizes']
        task_data = {
            "client_files[0]": video,
            "image_quality": 51,
        }

        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.VIDEO, self.ChunkType.VIDEO, image_sizes)

    def _test_api_v2_tasks_id_data_create_can_use_local_pcd_zip(self, user):
        task_spec = {
            "name": "my archive task #24",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "client_files[0]": open(os.path.join(os.path.dirname(__file__), 'assets', 'test_pointcloud_pcd.zip'), 'rb'),
            "image_quality": 100,
        }
        image_sizes = self._share_image_sizes["test_pointcloud_pcd.zip"]
        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET,
                                             self.ChunkType.IMAGESET,
                                             image_sizes, dimension=DimensionType.DIM_3D)

    def _test_api_v2_tasks_id_data_create_can_use_local_pcd_kitti(self, user):
        task_spec = {
            "name": "my archive task #25",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "client_files[0]": open(os.path.join(os.path.dirname(__file__), 'assets', 'test_velodyne_points.zip'),
                                    'rb'),
            "image_quality": 100,
        }
        image_sizes = self._share_image_sizes["test_velodyne_points.zip"]
        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET,
                                             self.ChunkType.IMAGESET,
                                             image_sizes, dimension=DimensionType.DIM_3D)

    def _test_api_v2_tasks_id_data_create_can_use_server_images_and_manifest(self, user):
        task_spec_common = {
            "name": "images+manifest #26",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "image_quality": 70,
            "use_cache": True
        }

        manifest_name = "images_manifest_sorted.jsonl"
        images = get_manifest_images_list(os.path.join(settings.SHARE_ROOT, manifest_name))
        image_sizes = [self._share_image_sizes[fn] for fn in images]
        task_data.update({
            f"server_files[{i}]": fn
            for i, fn in enumerate(images + [manifest_name])
        })

        for copy_data in [True, False]:
            with self.subTest(current_function_name(), copy=copy_data):
                task_spec = task_spec_common.copy()
                task_spec['name'] = task_spec['name'] + f' copy={copy_data}'
                task_data['copy_data'] = copy_data
                self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data,
                    self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                    image_sizes, StorageMethodChoice.CACHE,
                    StorageChoice.LOCAL if copy_data else StorageChoice.SHARE)

        with self.subTest(current_function_name() + ' file order mismatch'):
            task_spec = task_spec_common.copy()
            task_spec['name'] = task_spec['name'] + f' mismatching file order'
            task_data_copy = task_data.copy()
            task_data_copy[f'server_files[{len(images)}]'] = "images_manifest.jsonl"
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data_copy,
                self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                image_sizes, StorageMethodChoice.CACHE, StorageChoice.SHARE,
                expected_task_creation_status_state='Failed',
                expected_task_creation_status_reason='Incorrect file mapping to manifest content')

        for copy_data in [True, False]:
            with self.subTest(current_function_name(), copy=copy_data):
                task_spec = task_spec_common.copy()
                task_spec['name'] = task_spec['name'] + f' copy={copy_data}'
                task_data['copy_data'] = copy_data
                self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data,
                    self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                    image_sizes, StorageMethodChoice.CACHE,
                    StorageChoice.LOCAL if copy_data else StorageChoice.SHARE)

        with self.subTest(current_function_name() + ' file order mismatch'):
            task_spec = task_spec_common.copy()
            task_spec['name'] = task_spec['name'] + f' mismatching file order'
            task_data_copy = task_data.copy()
            task_data_copy[f'server_files[{len(images)}]'] = "images_manifest.jsonl"
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data_copy,
                self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                image_sizes, StorageMethodChoice.CACHE, StorageChoice.SHARE,
                expected_task_creation_status_state='Failed',
                expected_task_creation_status_reason='Incorrect file mapping to manifest content')

        for copy_data in [True, False]:
            with self.subTest(current_function_name(), copy=copy_data):
                task_spec = task_spec_common.copy()
                task_spec['name'] = task_spec['name'] + f' copy={copy_data}'
                task_data['copy_data'] = copy_data
                self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data,
                    self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                    image_sizes, StorageMethodChoice.CACHE,
                    StorageChoice.LOCAL if copy_data else StorageChoice.SHARE)

        with self.subTest(current_function_name() + ' file order mismatch'):
            task_spec = task_spec_common.copy()
            task_spec['name'] = task_spec['name'] + f' mismatching file order'
            task_data_copy = task_data.copy()
            task_data_copy[f'server_files[{len(images)}]'] = "images_manifest.jsonl"
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data_copy,
                self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                image_sizes, StorageMethodChoice.CACHE, StorageChoice.SHARE,
                expected_task_creation_status_state='Failed',
                expected_task_creation_status_reason='Incorrect file mapping to manifest content')

        with self.subTest(current_function_name() + ' without use cache'):
            task_spec = task_spec_common.copy()
            task_spec['name'] = task_spec['name'] + f' manifest without cache'
            task_data_copy = task_data.copy()
            task_data_copy['use_cache'] = False
            self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data_copy,
                self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                image_sizes, StorageMethodChoice.CACHE, StorageChoice.SHARE,
                expected_task_creation_status_state='Failed',
                expected_task_creation_status_reason="A manifest file can only be used with the 'use cache' option")

    def _test_api_v2_tasks_id_data_create_can_use_server_images_with_predefined_sorting(self, user):
        task_spec = {
            "name": 'task custom data sequence server files #28-1',
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data_common = {
            "image_quality": 70,
            "sorting_method": SortingMethod.PREDEFINED
        }

        manifest_name = "images_manifest.jsonl"
        images = get_manifest_images_list(os.path.join(settings.SHARE_ROOT, manifest_name))
        image_sizes = [self._share_image_sizes[v] for v in images]

        for caching_enabled, manifest in product(
            [True, False], [True, False]
        ):
            with self.subTest(current_function_name(),
                manifest=manifest,
                caching_enabled=caching_enabled,
            ):
                task_data = task_data_common.copy()

                task_data["use_cache"] = caching_enabled
                if caching_enabled:
                    storage_method = StorageMethodChoice.CACHE
                else:
                    storage_method = StorageMethodChoice.FILE_SYSTEM

                if manifest:
                    task_data.update(
                        (f"server_files[{i}]", f)
                        for i, f in enumerate(reversed(images + [manifest_name]))
                        # Use a different order from what we have in the manifest.
                        # The files should be sorted during the task creation.
                        # Then we compare them with the original manifest order
                    )
                else:
                    task_data.update(
                        (f"server_files[{i}]", f)
                        for i, f in enumerate(images)
                    )

                self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data,
                    self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                    image_sizes, storage_method, StorageChoice.SHARE)

    def _test_api_v2_tasks_id_data_create_can_use_local_images_with_predefined_sorting(self, user):
        task_spec = {
            "name": 'task custom data sequence client files single request #28-2',
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        with TestDir() as test_dir:
            image_sizes, image_files = generate_random_image_files(
                "test_1.jpg", "test_3.jpg", "test_5.jpg", "test_4.jpg", "test_2.jpg"
            )
            image_paths = []
            for image in image_files:
                fp = os.path.join(test_dir, image.name)
                with open(fp, 'wb') as f:
                    f.write(image.getvalue())
                image_paths.append(fp)
            del image_files

            task_data_common = {
                "image_quality": 75,
                "sorting_method": SortingMethod.PREDEFINED
            }

            for (caching_enabled, manifest) in product(
                [True, False], [True, False]
            ):
                manifest_path = os.path.join(test_dir, "manifest.jsonl")
                generate_manifest_file("images", manifest_path, image_paths,
                    sorting_method=SortingMethod.PREDEFINED)

                task_data_common["use_cache"] = caching_enabled
                if caching_enabled:
                    storage_method = StorageMethodChoice.CACHE
                else:
                    storage_method = StorageMethodChoice.FILE_SYSTEM

                with self.subTest(current_function_name(),
                    manifest=manifest,
                    caching_enabled=caching_enabled,
                ), ExitStack() as es:
                    images = [es.enter_context(open(p, 'rb')) for p in image_paths]

                    task_data = task_data_common.copy()
                    expected_image_sizes = image_sizes

                    if manifest:
                        manifest_file = es.enter_context(open(manifest_path))
                        task_data.update(
                            (f"client_files[{i}]", f)
                            for i, f in enumerate(reversed(images))
                            # Use a different order from what we have in the manifest.
                            # The files should be sorted during the task creation.
                            # Then we compare them with the original manifest order
                        )
                        task_data[f"client_files[{len(images)}]"] = manifest_file
                    else:
                        task_data.update(
                            (f"client_files[{i}]", f)
                            for i, f in enumerate(images)
                        )

                    self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data,
                        self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                        expected_image_sizes, storage_method, StorageChoice.LOCAL)

    def _test_api_v2_tasks_id_data_create_can_use_server_archive_with_predefined_sorting(self, user):
        task_spec = {
            "name": 'task custom data sequence server files single request #28-3',
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data_common = {
            "image_quality": 75,
            "sorting_method": SortingMethod.PREDEFINED,
        }
        archive_name = "test_archive_2.zip"

        for (caching_enabled, manifest) in product(
            [True, False], [True, False]
        ):
            with self.subTest(current_function_name(),
                manifest=manifest,
                caching_enabled=caching_enabled,
            ):
                task_data = task_data_common.copy()

                task_data["use_cache"] = caching_enabled
                if caching_enabled:
                    storage_method = StorageMethodChoice.CACHE
                else:
                    storage_method = StorageMethodChoice.FILE_SYSTEM

                task_data["server_files[0]"] = archive_name

                manifest_name = "images_manifest.jsonl"
                images = get_manifest_images_list(os.path.join(settings.SHARE_ROOT, manifest_name))
                image_sizes = [self._share_image_sizes[v] for v in images]

                kwargs = {}
                if manifest:
                    task_data["server_files[1]"] = manifest_name
                else:
                    kwargs.update({
                        'expected_task_creation_status_state': 'Failed',
                        'expected_task_creation_status_reason': "Can't find upload manifest file",
                    })

                self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data,
                    self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                    image_sizes, storage_method, StorageChoice.LOCAL, **kwargs)

    def _test_api_v2_tasks_id_data_create_can_use_local_archive_with_predefined_sorting(self, user):
        task_spec = {
            "name": 'task custom data sequence client files single request #28-4',
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        with TestDir() as test_dir:
            image_sizes, image_files = generate_random_image_files(
                "test_1.jpg", "test_3.jpg", "test_5.jpg", "test_4.jpg", "test_2.jpg"
            )
            image_paths = []
            for image in image_files:
                fp = os.path.join(test_dir, image.name)
                with open(fp, 'wb') as f:
                    f.write(image.getvalue())
                image_paths.append(fp)

            archive_path = os.path.join(test_dir, 'archive.zip')
            with zipfile.ZipFile(archive_path, 'x') as archive:
                for image_path in image_paths:
                    archive.write(image_path, os.path.relpath(image_path, test_dir))

            del image_files

            task_data_common = {
                "image_quality": 75,
                "sorting_method": SortingMethod.PREDEFINED,
            }

            for (caching_enabled, include_image_info, manifest) in product(
                [True, False], [True, False], [True, False]
            ):
                with self.subTest(current_function_name(),
                    manifest=manifest,
                    caching_enabled=caching_enabled,
                    include_image_info=include_image_info
                ), ExitStack() as es:
                    task_data = task_data_common.copy()

                    manifest_path = os.path.join(test_dir, "manifest.jsonl")
                    generate_manifest_file("images", manifest_path, image_paths,
                        sorting_method=SortingMethod.PREDEFINED)

                    task_data["use_cache"] = caching_enabled
                    if caching_enabled:
                        storage_method = StorageMethodChoice.CACHE
                    else:
                        storage_method = StorageMethodChoice.FILE_SYSTEM

                    task_data[f"client_files[0]"] = es.enter_context(open(archive_path, 'rb'))

                    kwargs = {}
                    if manifest:
                        task_data[f"client_files[1]"] = es.enter_context(open(manifest_path))
                    else:
                        kwargs.update({
                            'expected_task_creation_status_state': 'Failed',
                            'expected_task_creation_status_reason': "Can't find upload manifest file",
                        })
                    self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data,
                        self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                        image_sizes, storage_method, StorageChoice.LOCAL, **kwargs)

    def _test_api_v2_tasks_id_data_create_can_use_server_images_with_natural_sorting(self, user):
        task_spec = {
            "name": 'task native data sequence #29',
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "server_files[0]": "test_10.jpg",
            "server_files[1]": "test_2.jpg",
            "server_files[2]": "test_1.jpg",
            "image_quality": 70,
            "use_cache": True,
            "sorting_method": SortingMethod.NATURAL
        }
        image_sizes = [
            self._share_image_sizes[task_data["server_files[2]"]],
            self._share_image_sizes[task_data["server_files[1]"]],
            self._share_image_sizes[task_data["server_files[0]"]],
        ]

        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
            image_sizes, StorageMethodChoice.CACHE, StorageChoice.SHARE)

    def _test_api_v2_tasks_id_data_create_can_use_server_pdf(self, user):
        task_spec = {
            "name": 'task pdf in the shared folder #30',
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "server_files[0]": "test_1.pdf",
            "image_quality": 70,
            "copy_data": False,
            "use_cache": True,
        }
        image_sizes = self._share_image_sizes[task_data["server_files[0]"]]

        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
            image_sizes, StorageMethodChoice.CACHE, StorageChoice.LOCAL)

    def _test_api_v2_tasks_id_data_create_can_send_ordered_images_with_multifile_requests(self, user):
        task_spec = {
            "name": 'task custom data sequence client files multi request #31',
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data_common = {
            "image_quality": 70,
            "sorting_method": SortingMethod.PREDEFINED,
        }

        def _send_data(tid, user, data):
            response = self._run_api_v2_tasks_id_data_post(tid, user,
                data={ 'image_quality': task_data["image_quality"] },
                headers={ 'Upload-Start': True })
            assert response.status_code == status.HTTP_202_ACCEPTED, response.status_code

            for group_idx, file_group in enumerate(file_groups):
                request_data = {k: v for k, v in data.items() if '_files' not in k}
                request_data.update({
                    f'client_files[{i}]': images[f] for i, f in enumerate(file_group)
                })

                if group_idx == len(file_groups) - 1:
                    headers = { 'Upload-Finish': True }
                    request_data['upload_file_order'] = upload_info
                else:
                    headers = { 'Upload-Multiple': True }

                response = self._run_api_v2_tasks_id_data_post(tid, user, data=request_data,
                    headers=headers)

                if group_idx != len(file_groups) - 1:
                    assert response.status_code == status.HTTP_200_OK, response.status_code
            return response

        def _send_data_and_fail(*args, **kwargs):
            response = _send_data(*args, **kwargs)
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            raise Exception(response.data)

        filenames = [
            "test_1.jpg", "test_3.jpg", "test_5.jpg", "test_qwe.jpg", "test_4.jpg", "test_2.jpg"
        ]

        for name, upload_info, file_groups in (
            (
                "input ordering, multiple requests, the last one has data",
                [],
                [
                    [ 0, 1, 2 ],
                    [ 3, 4 ],
                    [ 5, ],
                ]
            ),

            (
                "input ordering, multiple requests, the last one has no data",
                [],
                [
                    [ 0, 1, 2 ],
                    [ 3, 4, 5 ],
                    [ ],
                ]
            ),

            (
                "input ordering, multiple requests, the last one has data, has an empty request",
                [],
                [
                    [ 0, 1, 2 ],
                    [ ],
                    [ 3, 4, 5 ],
                ]
            ),

            (
                "custom ordering, multiple requests, the last one has no data, files unordered",
                filenames,
                [
                    [ 2, 4, 0 ],
                    [ 3, 5, 1 ],
                    [  ],
                ]
            ),

            (
                "custom ordering, multiple requests, the last one has data, files unordered",
                filenames,
                [
                    [ 2, 0 ],
                    [ 3, 5, 4 ],
                    [ 1, ],
                ]
            ),
        ):
            with self.subTest(current_function_name() + ' ' + name):
                image_sizes, images = generate_random_image_files(*filenames)

                task_data = task_data_common.copy()
                task_data.update((f"client_files[{i}]", f) for i, f in enumerate(images))

                self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data,
                    self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                    image_sizes, StorageMethodChoice.FILE_SYSTEM, StorageChoice.LOCAL,
                    send_data_callback=_send_data)

        with self.subTest(current_function_name() + ' mismatching file sets - extra files'):
            upload_info = [filenames[0]]
            file_groups = [[ 0, 1 ]]
            image_sizes, images = generate_random_image_files(*filenames[:2])

            task_data = task_data_common.copy()
            task_data.update((f"client_files[{i}]", f) for i, f in enumerate(images))

            with self.assertRaisesMessage(Exception, "(extra)"):
                self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data,
                    self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                    image_sizes, StorageMethodChoice.FILE_SYSTEM, StorageChoice.LOCAL,
                    send_data_callback=_send_data_and_fail)

        with self.subTest(current_function_name() + ' mismatching file sets - missing files'):
            upload_info = filenames[0:3]
            file_groups = [[ 0, 1 ]]
            image_sizes, images = generate_random_image_files(*upload_info)

            task_data = task_data_common.copy()
            task_data.update((f"client_files[{i}]", f) for i, f in enumerate(images))

            with self.assertRaisesMessage(Exception, "(missing)"):
                self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data,
                    self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
                    image_sizes, StorageMethodChoice.FILE_SYSTEM, StorageChoice.LOCAL,
                    send_data_callback=_send_data_and_fail)

    def _test_api_v2_tasks_id_data_create_can_use_server_rar(self, user):
        task_spec = {
            "name": 'task rar in the shared folder #32',
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

        task_data = {
            "server_files[0]": "test_rar.rar",
            "image_quality": 75,
            "copy_data": False,
            "use_cache": True,
        }
        image_sizes = self._share_image_sizes[task_data["server_files[0]"]]

        self._test_api_v2_tasks_id_data_spec(user, task_spec, task_data, self.ChunkType.IMAGESET, self.ChunkType.IMAGESET,
            image_sizes, StorageMethodChoice.CACHE, StorageChoice.LOCAL)

    def _test_api_v2_tasks_id_data_create(self, user):
        method_list = {
            func: getattr(self, func) for func in dir(self)
            if func.startswith('_test_api_v2_tasks_id_data_create_') and
            callable(getattr(self, func))
        }
        assert method_list
        for name, func in method_list.items():
            with self.subTest(name):
                func(user)

    def test_api_v2_tasks_id_data_admin(self):
        self._test_api_v2_tasks_id_data_create(self.admin)

    def test_api_v2_tasks_id_data_owner(self):
        self._test_api_v2_tasks_id_data_create(self.owner)

    def test_api_v2_tasks_id_data_user(self):
        self._test_api_v2_tasks_id_data_create(self.user)

    def test_api_v2_tasks_id_data_no_auth(self):
        data = {
            "name": "my task #3",
            "owner_id": self.owner.id,
            "overlap": 0,
            "segment_size": 100,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }
        response = self._create_task(None, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

def compare_objects(self, obj1, obj2, ignore_keys, fp_tolerance=.001,
        current_key=None):
    key_info = "{}: ".format(current_key) if current_key else ""

    if isinstance(obj1, dict):
        self.assertTrue(isinstance(obj2, dict),
            "{}{} != {}".format(key_info, obj1, obj2))
        for k, v1 in obj1.items():
            if k in ignore_keys:
                continue
            v2 = obj2[k]
            if k == 'attributes':
                key = lambda a: a['spec_id'] if 'spec_id' in a else a['id']
                v1.sort(key=key)
                v2.sort(key=key)
            compare_objects(self, v1, v2, ignore_keys, current_key=k)
    elif isinstance(obj1, list):
        self.assertTrue(isinstance(obj2, list),
            "{}{} != {}".format(key_info, obj1, obj2))
        self.assertEqual(len(obj1), len(obj2),
            "{}{} != {}".format(key_info, obj1, obj2))
        for v1, v2 in zip(obj1, obj2):
            compare_objects(self, v1, v2, ignore_keys, current_key=current_key)
    else:
        if isinstance(obj1, float) or isinstance(obj2, float):
            self.assertAlmostEqual(obj1, obj2, delta=fp_tolerance,
                msg=current_key)
        else:
            self.assertEqual(obj1, obj2, msg=current_key)

class JobAnnotationAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _create_task(self, owner, assignee, annotation_format=""):
        dimension = DimensionType.DIM_2D
        data = {
            "name": "my task #1",
            "owner_id": owner.id,
            "assignee_id": assignee.id,
            "overlap": 0,
            "segment_size": 100,
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
                            "default_value": "false",
                            "values": [],
                        },
                    ]
                },
                {"name": "person"},
                {
                    "name": "widerface",
                    "attributes": [
                        {
                            "name": "blur",
                            "mutable": False,
                            "input_type": "select",
                            "default_value": "0",
                            "values": ["0", "1", "2"]
                        },
                        {
                            "name": "expression",
                            "mutable": False,
                            "input_type": "select",
                            "default_value": "0",
                            "values": ["0", "1"]
                        },
                        {
                            "name": "illumination",
                            "mutable": False,
                            "input_type": "select",
                            "default_value": "0",
                            "values": ["0", "1"]
                        },
                    ]
                },
            ]
        }
        if annotation_format == "Market-1501 1.0":
            data["labels"] = [{
                "name": "market-1501",
                "attributes": [
                    {
                        "name": "query",
                        "mutable": False,
                        "input_type": "select",
                        "values": ["True", "False"]
                    },
                    {
                        "name": "camera_id",
                        "mutable": False,
                        "input_type": "number",
                        "values": ["0", "1", "2", "3", "4", "5"]
                    },
                    {
                        "name": "person_id",
                        "mutable": False,
                        "input_type": "number",
                        "values": ["1", "2", "3"]
                    },
                ]
            }]
        elif annotation_format in ["ICDAR Recognition 1.0",
                "ICDAR Localization 1.0"]:
            data["labels"] = [{
                "name": "icdar",
                "attributes": [
                    {
                        "name": "text",
                        "mutable": False,
                        "input_type": "text",
                        "values": ["word_1", "word_2", "word_3"]
                    },
                ]
            }]
        elif annotation_format in ['Kitti Raw Format 1.0', 'Sly Point Cloud Format 1.0']:
            data["labels"] = [{
                "name": "car"},
                {"name": "bus"}
            ]
            dimension = DimensionType.DIM_3D
        elif annotation_format == "ICDAR Segmentation 1.0":
            data["labels"] = [{
                "name": "icdar",
                "attributes": [
                    {
                        "name": "text",
                        "mutable": False,
                        "input_type": "text",
                        "values": ["word_1", "word_2", "word_3"]
                    },
                    {
                        "name": "index",
                        "mutable": False,
                        "input_type": "number",
                        "values": ["0", "1", "2"]
                    },
                    {
                        "name": "color",
                        "mutable": False,
                        "input_type": "text",
                        "values": ["100 110 240", "10 15 20", "120 128 64"]
                    },
                    {
                        "name": "center",
                        "mutable": False,
                        "input_type": "text",
                        "values": ["1 2", "2 4", "10 45"]
                    },
                ]
            }]

        with ForceLogin(owner, self.client):
            response = self.client.post('/api/tasks', data=data, format="json")
            assert response.status_code == status.HTTP_201_CREATED
            tid = response.data["id"]

            images = {
                "client_files[0]": generate_random_image_file("test_1.jpg")[1],
                "client_files[1]": generate_random_image_file("test_2.jpg")[1],
                "client_files[2]": generate_random_image_file("test_3.jpg")[1],
                "client_files[4]": generate_random_image_file("test_4.jpg")[1],
                "client_files[5]": generate_random_image_file("test_5.jpg")[1],
                "client_files[6]": generate_random_image_file("test_6.jpg")[1],
                "client_files[7]": generate_random_image_file("test_7.jpg")[1],
                "client_files[8]": generate_random_image_file("test_8.jpg")[1],
                "client_files[9]": generate_random_image_file("test_9.jpg")[1],
                "image_quality": 75,
                "frame_filter": "step=3",
            }
            if dimension == DimensionType.DIM_3D:
                images = {
                    "client_files[0]": open(
                        os.path.join(os.path.dirname(__file__), 'assets', 'test_pointcloud_pcd.zip'
                        if annotation_format == 'Sly Point Cloud Format 1.0' else 'test_velodyne_points.zip'),
                        'rb'),
                    "image_quality": 100,
                }

            response = self.client.post("/api/tasks/{}/data".format(tid), data=images)
            assert response.status_code == status.HTTP_202_ACCEPTED

            response = self.client.get("/api/tasks/{}".format(tid))
            task = response.data

            if 200 <= response.status_code < 400:
                labels_response = list(get_paginated_collection(
                    lambda page: self.client.get(
                        "/api/labels?task_id=%s&page=%s" % (response.data["id"], page)
                    )
                ))
                response.data["labels"] = labels_response

            jobs = get_paginated_collection(lambda page:
                self.client.get("/api/jobs?task_id={}&page={}".format(tid, page))
            )

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

    def _put_api_v2_jobs_id_data(self, jid, user, data):
        with ForceLogin(user, self.client):
            response = self.client.put("/api/jobs/{}/annotations".format(jid),
                data=data, format="json")

        return response

    def _get_api_v2_jobs_id_data(self, jid, user):
        with ForceLogin(user, self.client):
            response = self.client.get("/api/jobs/{}/annotations".format(jid))

        return response

    def _delete_api_v2_jobs_id_data(self, jid, user):
        with ForceLogin(user, self.client):
            response = self.client.delete("/api/jobs/{}/annotations".format(jid),
            format="json")

        return response

    def _patch_api_v2_jobs_id_data(self, jid, user, action, data):
        with ForceLogin(user, self.client):
            response = self.client.patch(
                "/api/jobs/{}/annotations?action={}".format(jid, action),
                data=data, format="json")

        return response

    def _check_response(self, response, data):
        if not response.status_code in [
            status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]:
            compare_objects(self, data, response.data, ignore_keys=["id", "version"])

    def _run_api_v2_jobs_id_annotations(self, owner, assignee, annotator):
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
        response = self._put_api_v2_jobs_id_data(job["id"], annotator, data)
        self.assertEqual(response.status_code, HTTP_200_OK)

        data = {
            "version": 1,
            "tags": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": []
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
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
                    "frame": 2,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
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
                    "source": "manual",
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
                            "frame": 2,
                            "attributes": [],
                            "points": [2.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": True,
                            "outside": True
                        },
                    ]
                },
                {
                    "frame": 2,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 2,
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
        response = self._put_api_v2_jobs_id_data(job["id"], annotator, data)
        data["version"] += 1 # need to update the version
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._get_api_v2_jobs_id_data(job["id"], annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        # server should add default attribute values if puted data doesn't contain it
        data["tags"][0]["attributes"] = default_attr_values[data["tags"][0]["label_id"]]["all"]
        data["tracks"][0]["shapes"][1]["attributes"] = default_attr_values[data["tracks"][0]["label_id"]]["mutable"]
        self._check_response(response, data)

        response = self._delete_api_v2_jobs_id_data(job["id"], annotator)
        data["version"] += 1 # need to update the version
        self.assertEqual(response.status_code, HTTP_204_NO_CONTENT)

        data = {
            "version": data["version"],
            "tags": [],
            "shapes": [],
            "tracks": []
        }
        response = self._get_api_v2_jobs_id_data(job["id"], annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        data = {
            "version": data["version"],
            "tags": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": []
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
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
                    "occluded": False,
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False,
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
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
                            "outside": True,
                        },
                    ]
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                        }
                    ]
                },
            ]
        }
        response = self._patch_api_v2_jobs_id_data(job["id"], annotator,
            "create", data)
        data["version"] += 1
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._get_api_v2_jobs_id_data(job["id"], annotator)
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

        response = self._patch_api_v2_jobs_id_data(job["id"], annotator,
            "update", data)
        data["version"] = data.get("version", 0) + 1 # need to update the version
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._get_api_v2_jobs_id_data(job["id"], annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._patch_api_v2_jobs_id_data(job["id"], annotator,
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
        response = self._get_api_v2_jobs_id_data(job["id"], annotator)
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        data = {
            "version": data["version"],
            "tags": [
                {
                    "frame": 0,
                    "label_id": 11010101,
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
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
                    "occluded": False,
                },
                {
                    "frame": 1,
                    "label_id": 1212121,
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False,
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": 0,
                    "group": None,
                    "source": "manual",
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
                            "outside": True,
                        },
                    ]
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                        }
                    ]
                },
            ]
        }
        response = self._patch_api_v2_jobs_id_data(job["id"], annotator,
            "create", data)
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    def test_api_v2_jobs_id_annotations_admin(self):
        self._run_api_v2_jobs_id_annotations(self.admin, self.assignee,
            self.assignee)

    def test_api_v2_jobs_id_annotations_user(self):
        self._run_api_v2_jobs_id_annotations(self.user, self.user,
            self.user)

    def test_api_v2_jobs_id_annotations_somebody(self):
        _, jobs = self._create_task(self.user, self.user)
        job = jobs[0]
        data = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": []
        }

        response = self._get_api_v2_jobs_id_data(job["id"], self.somebody)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self._put_api_v2_jobs_id_data(job["id"], self.somebody, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self._patch_api_v2_jobs_id_data(job["id"], self.somebody, "create", data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self._delete_api_v2_jobs_id_data(job["id"], self.somebody)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_api_v2_jobs_id_annotations_no_auth(self):
        self._run_api_v2_jobs_id_annotations(self.user, self.user, None)

class TaskAnnotationAPITestCase(JobAnnotationAPITestCase):
    def _put_api_v2_tasks_id_annotations(self, pk, user, data):
        with ForceLogin(user, self.client):
            response = self.client.put("/api/tasks/{}/annotations".format(pk),
                data=data, format="json")

        return response

    def _get_api_v2_tasks_id_annotations(self, pk, user):
        with ForceLogin(user, self.client):
            response = self.client.get("/api/tasks/{}/annotations".format(pk))

        return response

    def _delete_api_v2_tasks_id_annotations(self, pk, user):
        with ForceLogin(user, self.client):
            response = self.client.delete("/api/tasks/{}/annotations".format(pk),
            format="json")

        return response

    def _dump_api_v2_tasks_id_annotations(self, pk, user, query_params=""):
        with ForceLogin(user, self.client):
            response = self.client.get(
                "/api/tasks/{0}/annotations{1}".format(pk, query_params))

        return response

    def _patch_api_v2_tasks_id_annotations(self, pk, user, action, data):
        with ForceLogin(user, self.client):
            response = self.client.patch(
                "/api/tasks/{}/annotations?action={}".format(pk, action),
                data=data, format="json")

        return response

    def _upload_api_v2_tasks_id_annotations(self, pk, user, data, query_params=""):
        with ForceLogin(user, self.client):
            response = self.client.put(
                path="/api/tasks/{0}/annotations?{1}".format(pk, query_params),
                data=data,
                format="multipart",
                )

        return response

    def _get_formats(self, user):
        with ForceLogin(user, self.client):
            response = self.client.get(
                path="/api/server/annotation/formats"
            )
        return response

    def _check_response(self, response, data):
        if not response.status_code in [
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]:
            try:
                compare_objects(self, data, response.data, ignore_keys=["id", "version"])
            except AssertionError as e:
                print("Objects are not equal: ", data, response.data)
                print(e)
                raise

    def _run_api_v2_tasks_id_annotations(self, owner, assignee):
        task, _ = self._create_task(owner, assignee)
        HTTP_200_OK = status.HTTP_200_OK
        HTTP_204_NO_CONTENT = status.HTTP_204_NO_CONTENT
        HTTP_400_BAD_REQUEST = status.HTTP_400_BAD_REQUEST

        data = {
            "version": 0,
            "tags": [],
            "shapes": [],
            "tracks": []
        }
        response = self._put_api_v2_tasks_id_annotations(task["id"], owner, data)
        data["version"] += 1
        self.assertEqual(response.status_code, HTTP_200_OK)

        data = {
            "version": data["version"],
            "tags": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
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
                    "occluded": False,
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False,
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
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
                            "outside": True,

                        },
                    ]
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                        }
                    ]
                },
            ]
        }
        response = self._put_api_v2_tasks_id_annotations(task["id"], owner, data)
        data["version"] += 1

        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        default_attr_values = self._get_default_attr_values(task)
        response = self._get_api_v2_tasks_id_annotations(task["id"], owner)
        # server should add default attribute values if puted data doesn't contain it
        data["tags"][0]["attributes"] = default_attr_values[data["tags"][0]["label_id"]]["all"]
        data["tracks"][0]["shapes"][1]["attributes"] = default_attr_values[data["tracks"][0]["label_id"]]["mutable"]
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._delete_api_v2_tasks_id_annotations(task["id"], owner)
        data["version"] += 1
        self.assertEqual(response.status_code, HTTP_204_NO_CONTENT)

        data = {
            "version": data["version"],
            "tags": [],
            "shapes": [],
            "tracks": []
        }
        response = self._get_api_v2_tasks_id_annotations(task["id"], owner)
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        data = {
            "version": data["version"],
            "tags": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
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
                    "occluded": False,
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False,
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
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
                            "outside": True,
                        },
                    ]
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                        }
                    ]
                },
            ]
        }
        response = self._patch_api_v2_tasks_id_annotations(task["id"], owner,
            "create", data)
        data["version"] += 1
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._get_api_v2_tasks_id_annotations(task["id"], owner)
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

        response = self._patch_api_v2_tasks_id_annotations(task["id"], owner,
            "update", data)
        data["version"] = data.get("version", 0) + 1
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._get_api_v2_tasks_id_annotations(task["id"], owner)
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        response = self._patch_api_v2_tasks_id_annotations(task["id"], owner,
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
        response = self._get_api_v2_tasks_id_annotations(task["id"], owner)
        self.assertEqual(response.status_code, HTTP_200_OK)
        self._check_response(response, data)

        data = {
            "version": data["version"],
            "tags": [
                {
                    "frame": 0,
                    "label_id": 11010101,
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                }
            ],
            "shapes": [
                {
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": None,
                    "source": "manual",
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
                    "occluded": False,
                },
                {
                    "frame": 1,
                    "label_id": 1212121,
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 300.222, 400, 500, 1, 3],
                    "type": "polygon",
                    "occluded": False,
                },
            ],
            "tracks": [
                {
                    "frame": 0,
                    "label_id": 0,
                    "group": None,
                    "source": "manual",
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
                            "outside": True,
                        },
                    ]
                },
                {
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": None,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 100, 300.222],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                        }
                    ]
                },
            ]
        }
        response = self._patch_api_v2_tasks_id_annotations(task["id"], owner,
            "create", data)
        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    def _run_api_v2_tasks_id_annotations_dump_load(self, owner):
        if owner:
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
            if annotation_format not in ["Market-1501 1.0", "ICDAR Recognition 1.0",
                                         "ICDAR Localization 1.0", "ICDAR Segmentation 1.0",
                                         'Kitti Raw Format 1.0', 'Sly Point Cloud Format 1.0',
                                         'Datumaro 3D 1.0']:
                rectangle_tracks_with_attrs = [{
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
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
                            "outside": False,
                            "attributes": [
                                {
                                    "spec_id": task["labels"][0]["attributes"][1]["id"],
                                    "value": task["labels"][0]["attributes"][1]["default_value"]
                                }
                            ]
                        },
                        {
                            "frame": 2,
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
                    "frame": 0,
                    "label_id": task["labels"][1]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 0,
                            "attributes": [],
                            "points": [1.0, 2.1, 50.2, 36.6],
                            "type": "rectangle",
                            "occluded": False,
                            "outside": False,
                        },
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 51, 36.6],
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
                            "outside": True,
                        }
                    ]
                }]
                polygon_tracks_wo_attrs = [{
                    "frame": 0,
                    "label_id": task["labels"][1]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [],
                    "shapes": [
                        {
                            "frame": 0,
                            "attributes": [],
                            "points": [1.0, 2.1, 50.2, 36.6, 7.0, 10.0],
                            "type": "polygon",
                            "occluded": False,
                            "outside": False,
                        },
                        {
                            "frame": 1,
                            "attributes": [],
                            "points": [1.0, 2.1, 51, 36.6, 8.0, 11.0],
                            "type": "polygon",
                            "occluded": False,
                            "outside": True
                        },
                        {
                            "frame": 2,
                            "attributes": [],
                            "points": [1.0, 2.1, 51, 36.6, 14.0, 15.0],
                            "type": "polygon",
                            "occluded": False,
                            "outside": False,
                        }
                    ]
                }]

                rectangle_shapes_with_attrs = [{
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
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
                    "occluded": False,
                }]

                rectangle_shapes_with_wider_attrs = [{
                    "frame": 0,
                    "label_id": task["labels"][2]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][2]["attributes"][0]["id"],
                            "value": task["labels"][2]["attributes"][0]["default_value"]
                        },
                        {
                            "spec_id": task["labels"][2]["attributes"][1]["id"],
                            "value": task["labels"][2]["attributes"][1]["values"][1]
                        },
                        {
                            "spec_id": task["labels"][2]["attributes"][2]["id"],
                            "value": task["labels"][2]["attributes"][2]["default_value"]
                        }
                    ],
                    "points": [1.0, 2.1, 10.6, 53.22],
                    "type": "rectangle",
                    "occluded": False,
                }]

                rectangle_shapes_wo_attrs = [{
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [],
                    "points": [2.0, 2.1, 40, 50.7],
                    "type": "rectangle",
                    "occluded": False,
                }]

                polygon_shapes_wo_attrs = [{
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [],
                    "points": [2.0, 2.1, 100, 30.22, 40, 77, 1, 3],
                    "type": "polygon",
                    "occluded": False,
                }]

                polygon_shapes_with_attrs = [{
                    "frame": 2,
                    "label_id": task["labels"][0]["id"],
                    "group": 1,
                    "source": "manual",
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
                    "occluded": True,
                },
                {
                    "frame": 2,
                    "label_id": task["labels"][1]["id"],
                    "group": 1,
                    "source": "manual",
                    "attributes": [],
                    "points": [4, 7, 10, 30, 4, 5.55],
                    "type": "polygon",
                    "occluded": False,
                }]

                points_wo_attrs = [{
                    "frame": 1,
                    "label_id": task["labels"][1]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [],
                    "points": [20.0, 0.1, 10, 3.22, 4, 7, 10, 30, 1, 2],
                    "type": "points",
                    "occluded": False,
                }]

                tags_wo_attrs = [{
                    "frame": 2,
                    "label_id": task["labels"][1]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [],
                }]
                tags_with_attrs = [{
                    "frame": 1,
                    "label_id": task["labels"][0]["id"],
                    "group": 3,
                    "source": "manual",
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
                annotations["tracks"] = rectangle_tracks_with_attrs \
                                      + rectangle_tracks_wo_attrs \
                                      + polygon_tracks_wo_attrs

            elif annotation_format == "CVAT for images 1.1":
                annotations["shapes"] = rectangle_shapes_with_attrs \
                                      + rectangle_shapes_wo_attrs \
                                      + polygon_shapes_wo_attrs \
                                      + polygon_shapes_with_attrs
                annotations["tags"] = tags_with_attrs + tags_wo_attrs

            elif annotation_format == "PASCAL VOC 1.1":
                annotations["shapes"] = rectangle_shapes_wo_attrs
                annotations["tags"] = tags_wo_attrs

            elif annotation_format == "YOLO 1.1":
                annotations["shapes"] = rectangle_shapes_wo_attrs

            elif annotation_format == "COCO 1.0":
                annotations["shapes"] = polygon_shapes_wo_attrs

            elif annotation_format == "COCO Keypoints 1.0":
                annotations["shapes"] = points_wo_attrs

            elif annotation_format == "Segmentation mask 1.1":
                annotations["shapes"] = rectangle_shapes_wo_attrs \
                                      + polygon_shapes_wo_attrs
                annotations["tracks"] = rectangle_tracks_wo_attrs

            elif annotation_format == "MOT 1.1":
                annotations["shapes"] = rectangle_shapes_wo_attrs
                annotations["tracks"] = rectangle_tracks_wo_attrs

            elif annotation_format == "MOTS PNG 1.0":
                annotations["tracks"] = polygon_tracks_wo_attrs

            elif annotation_format == "LabelMe 3.0":
                annotations["shapes"] = rectangle_shapes_with_attrs \
                                      + rectangle_shapes_wo_attrs \
                                      + polygon_shapes_wo_attrs \
                                      + polygon_shapes_with_attrs

            elif annotation_format == "Datumaro 1.0":
                annotations["shapes"] = rectangle_shapes_with_attrs \
                                      + rectangle_shapes_wo_attrs \
                                      + polygon_shapes_wo_attrs \
                                      + polygon_shapes_with_attrs
                annotations["tags"] = tags_with_attrs + tags_wo_attrs

            elif annotation_format == "ImageNet 1.0":
                annotations["tags"] = tags_wo_attrs

            elif annotation_format == "CamVid 1.0":
                annotations["shapes"] = rectangle_shapes_wo_attrs \
                                      + polygon_shapes_wo_attrs

            elif annotation_format == "WiderFace 1.0":
                annotations["tags"] = tags_wo_attrs
                annotations["shapes"] = rectangle_shapes_with_wider_attrs

            elif annotation_format == "VGGFace2 1.0":
                annotations["tags"] = tags_wo_attrs
                annotations["shapes"] = points_wo_attrs \
                                      + rectangle_shapes_wo_attrs
            elif annotation_format == "Cityscapes 1.0":
                annotations["shapes"] = points_wo_attrs \
                                      + rectangle_shapes_wo_attrs
            elif annotation_format == "Open Images V6 1.0":
                annotations["tags"] = tags_wo_attrs
                annotations["shapes"] = rectangle_shapes_wo_attrs \
                                      + polygon_shapes_wo_attrs

            elif annotation_format == "LFW 1.0":
                annotations["shapes"] = points_wo_attrs \
                                      + tags_wo_attrs

            elif annotation_format == "KITTI 1.0":
                annotations["shapes"] = rectangle_shapes_wo_attrs \
                                            + polygon_shapes_wo_attrs

            elif annotation_format == "Market-1501 1.0":
                tags_with_attrs = [{
                    "frame": 1,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][1]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][1]["values"][2]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][2]["id"],
                            "value": task["labels"][0]["attributes"][2]["values"][0]
                        }
                    ],
                }]
                annotations["tags"] = tags_with_attrs
            elif annotation_format in ['Kitti Raw Format 1.0',
                    'Sly Point Cloud Format 1.0', 'Datumaro 3D 1.0']:
                velodyne_wo_attrs = [{
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [
                    ],
                    "points": [-3.62, 7.95, -1.03, 0.0, 0.0, 0.0, 1.0, 1.0,
                               1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
                    "type": "cuboid_3d",
                    "occluded": False,
                },
                    {
                        "frame": 0,
                        "label_id": task["labels"][0]["id"],
                        "group": 0,
                        "source": "manual",
                        "attributes": [],
                        "points": [23.01, 8.34, -0.76, 0.0, 0.0, 0.0, 1.0, 1.0,
                                   1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
                        "type": "cuboid_3d",
                        "occluded": False,
                    }
                ]
                annotations["shapes"] = velodyne_wo_attrs
            elif annotation_format == "ICDAR Recognition 1.0":
                tags_with_attrs = [{
                    "frame": 1,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][1]
                        }
                    ],
                }]

                annotations["tags"] = tags_with_attrs

            elif annotation_format == "ICDAR Localization 1.0":
                rectangle_shapes_with_attrs = [{
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                    ],
                    "points": [1.0, 2.1, 10.6, 53.22],
                    "type": "rectangle",
                    "occluded": False,
                }]
                polygon_shapes_with_attrs = [{
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][1]
                        },
                    ],
                    "points": [20.0, 0.1, 10, 3.22, 4, 7, 10, 30],
                    "type": "polygon",
                    "occluded": False,
                }]

                annotations["shapes"] = rectangle_shapes_with_attrs \
                                      + polygon_shapes_with_attrs

            elif annotation_format == "ICDAR Segmentation 1.0":
                rectangle_shapes_with_attrs = [{
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][0]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][1]["values"][0]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][2]["id"],
                            "value": task["labels"][0]["attributes"][2]["values"][1]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][3]["id"],
                            "value": task["labels"][0]["attributes"][3]["values"][2]
                        }
                    ],
                    "points": [1.0, 2.1, 10.6, 53.22],
                    "type": "rectangle",
                    "occluded": False,
                }]
                polygon_shapes_with_attrs = [{
                    "frame": 0,
                    "label_id": task["labels"][0]["id"],
                    "group": 0,
                    "source": "manual",
                    "attributes": [
                        {
                            "spec_id": task["labels"][0]["attributes"][0]["id"],
                            "value": task["labels"][0]["attributes"][0]["values"][1]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][1]["id"],
                            "value": task["labels"][0]["attributes"][1]["values"][1]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][2]["id"],
                            "value": task["labels"][0]["attributes"][2]["values"][0]
                        },
                        {
                            "spec_id": task["labels"][0]["attributes"][3]["id"],
                            "value": task["labels"][0]["attributes"][3]["values"][1]
                        }
                    ],
                    "points": [20.0, 0.1, 10, 3.22, 4, 7, 10, 30],
                    "type": "polygon",
                    "occluded": False,
                }]

                annotations["shapes"] = rectangle_shapes_with_attrs \
                                      + polygon_shapes_with_attrs

            else:
                raise Exception("Unknown format {}".format(annotation_format))

            return annotations

        response = self._get_formats(owner)
        self.assertEqual(response.status_code, HTTP_200_OK)
        if owner is not None:
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
                task, jobs = self._create_task(owner, owner, import_format)

                # 2. add annotation
                data = _get_initial_annotation(export_format)
                response = self._put_api_v2_tasks_id_annotations(task["id"], owner, data)
                data["version"] += 1

                self.assertEqual(response.status_code, HTTP_200_OK)
                self._check_response(response, data)

                # 3. download annotation
                response = self._dump_api_v2_tasks_id_annotations(task["id"], owner,
                    "?format={}".format(export_format))
                if not export_formats[export_format]['enabled']:
                    self.assertEqual(response.status_code,
                        status.HTTP_405_METHOD_NOT_ALLOWED)
                    continue
                else:
                    self.assertEqual(response.status_code, HTTP_202_ACCEPTED)

                response = self._dump_api_v2_tasks_id_annotations(task["id"], owner,
                    "?format={}".format(export_format))
                self.assertEqual(response.status_code, HTTP_201_CREATED)

                response = self._dump_api_v2_tasks_id_annotations(task["id"], owner,
                    "?format={}&action=download".format(export_format))
                self.assertEqual(response.status_code, HTTP_200_OK)

                # 4. check downloaded data
                self.assertTrue(response.streaming)
                content = io.BytesIO(b"".join(response.streaming_content))
                self._check_dump_content(content, task, jobs, data, export_format)
                content.seek(0)

                # 5. remove annotation form the task
                response = self._delete_api_v2_tasks_id_annotations(task["id"], owner)
                data["version"] += 1
                self.assertEqual(response.status_code, HTTP_204_NO_CONTENT)

                # 6. upload annotation
                if not import_format:
                    continue

                uploaded_data = {
                    "annotation_file": content,
                }
                response = self._upload_api_v2_tasks_id_annotations(
                    task["id"], owner, uploaded_data,
                    "format={}".format(import_format))
                self.assertEqual(response.status_code, HTTP_202_ACCEPTED)

                response = self._upload_api_v2_tasks_id_annotations(
                    task["id"], owner, {},
                    "format={}".format(import_format))
                self.assertEqual(response.status_code, HTTP_201_CREATED)

                # 7. check annotation
                if export_format in {"Segmentation mask 1.1", "MOTS PNG 1.0",
                        "CamVid 1.0", "ICDAR Segmentation 1.0"}:
                    continue # can't really predict the result to check
                response = self._get_api_v2_tasks_id_annotations(task["id"], owner)
                self.assertEqual(response.status_code, HTTP_200_OK)

                data["version"] += 2 # upload is delete + put
                self._check_response(response, data)

                break
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
                xmls = glob(os.path.join(tmp_dir, '**', '*.xml'), recursive=True)
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
        elif format_name in ['Kitti Raw Format 1.0','Sly Point Cloud Format 1.0']:
            self.assertTrue(zipfile.is_zipfile(content))
        elif format_name in ["COCO 1.0", "COCO Keypoints 1.0"]:
            with tempfile.TemporaryDirectory() as tmp_dir:
                zipfile.ZipFile(content).extractall(tmp_dir)
                jsons = glob(os.path.join(tmp_dir, '**', '*.json'), recursive=True)
                self.assertTrue(jsons)
                for json in jsons:
                    coco = coco_loader.COCO(json)
                    self.assertTrue(coco.getAnnIds())
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
        response = self._upload_api_v2_tasks_id_annotations(
            task["id"], user, uploaded_data,
            "format={}".format(format_name))
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        response = self._upload_api_v2_tasks_id_annotations(
            task["id"], user, {}, "format={}".format(format_name))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self._get_api_v2_tasks_id_annotations(task["id"], user)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_api_v2_tasks_id_annotations_admin(self):
        self._run_api_v2_tasks_id_annotations(self.admin, self.assignee)

    def test_api_v2_tasks_id_annotations_user(self):
        self._run_api_v2_tasks_id_annotations(self.user, self.user)

    def test_api_v2_tasks_id_annotations_dump_load_admin(self):
        self._run_api_v2_tasks_id_annotations_dump_load(self.admin)

    def test_api_v2_tasks_id_annotations_dump_load_user(self):
        self._run_api_v2_tasks_id_annotations_dump_load(self.user)

    def test_api_v2_tasks_id_annotations_dump_load_no_auth(self):
        self._run_api_v2_tasks_id_annotations_dump_load(self.user)

    def test_api_v2_tasks_id_annotations_upload_coco_user(self):
        self._run_coco_annotation_upload_test(self.user)

class ServerShareAPITestCase(ApiTestBase):
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

    def _run_api_v2_server_share(self, user, directory):
        with ForceLogin(user, self.client):
            response = self.client.get(
                '/api/server/share?directory={}'.format(directory))

        return response

    def _test_api_v2_server_share(self, user):
        data = [
            {"name": "test1", "type": "DIR"},
            {"name": "test2", "type": "DIR"},
            {"name": "file0.txt", "type": "REG"},
        ]

        response = self._run_api_v2_server_share(user, "/")
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
        response = self._run_api_v2_server_share(user, "/test1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        compare_objects(
            self=self,
            obj1=sorted(data, key=lambda d: d["name"]),
            obj2=sorted(response.data, key=lambda d: d["name"]),
            ignore_keys=[]
        )

        data = []
        response = self._run_api_v2_server_share(user, "/test1/test3")
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
        response = self._run_api_v2_server_share(user, "/test2")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        compare_objects(
            self=self,
            obj1=sorted(data, key=lambda d: d["name"]),
            obj2=sorted(response.data, key=lambda d: d["name"]),
            ignore_keys=[]
        )

        response = self._run_api_v2_server_share(user, "/test4")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_api_v2_server_share_admin(self):
        self._test_api_v2_server_share(self.admin)

    def test_api_v2_server_share_owner(self):
        self._test_api_v2_server_share(self.owner)

    def test_api_v2_server_share_assignee(self):
        self._test_api_v2_server_share(self.assignee)

    def test_api_v2_server_share_user(self):
        self._test_api_v2_server_share(self.user)

    def test_api_v2_server_share_annotator(self):
        self._test_api_v2_server_share(self.annotator)

    def test_api_v2_server_share_somebody(self):
        self._test_api_v2_server_share(self.somebody)

    def test_api_v2_server_share_no_auth(self):
        response = self._run_api_v2_server_share(None, "/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ServerShareDifferentTypesAPITestCase(ApiTestBase):
    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    @staticmethod
    def _create_shared_files(shared_images):
        image = Image.new('RGB', size=(100, 50))
        for img in shared_images:
            img_path = os.path.join(settings.SHARE_ROOT, img)
            if not os.path.exists(os.path.dirname(img_path)):
                os.makedirs(os.path.dirname(img_path))
            image.save(img_path)

    def _get_request(self, path):
        with ForceLogin(self.user, self.client):
            response = self.client.get(path)
        return response

    def _run_api_v2_server_share(self, directory):
        with ForceLogin(self.user, self.client):
            response = self.client.get(
                '/api/server/share?directory={}'.format(directory))

        return response

    def _create_task(self, data, image_data):
        with ForceLogin(self.user, self.client):
            response = self.client.post('/api/tasks', data=data, format="json")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            tid = response.data["id"]

            response = self.client.post("/api/tasks/%s/data" % tid,
                                        data=image_data)
            self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
            response = self.client.get("/api/tasks/%s" % tid)
            task = response.data

        return task

    def test_api_v2_combined_image_and_directory_extractors(self):
        shared_images = ["data1/street.png", "data1/people.jpeg", "data1/street_1.jpeg", "data1/street_2.jpeg",
                         "data1/street_3.jpeg", "data1/subdir/image_4.jpeg", "data1/subdir/image_5.jpeg",
                         "data1/subdir/image_6.jpeg"]
        images_count = len(shared_images)
        self._create_shared_files(shared_images)
        response = self._run_api_v2_server_share("/data1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        shared_images = [img for img in shared_images if os.path.dirname(img) != "/data1/subdir"]
        shared_images.append("/data1/subdir/")
        shared_images.append("/data1/")
        remote_files = {"server_files[%d]" % i: shared_images[i] for i in range(len(shared_images))}

        task = {
            "name": "task combined image and directory extractors",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }
        image_data = {
            "size": 0,
            "image_quality": 70,
            "compressed_chunk_type": "imageset",
            "original_chunk_type": "imageset",
            "client_files": [],
            "remote_files": [],
            "use_zip_chunks": False,
            "use_cache": False,
            "copy_data": False
        }
        image_data.update(remote_files)
        # create task with server
        task = self._create_task(task, image_data)
        response = self._get_request("/api/tasks/%s/data/meta" % task["id"])
        self.assertEqual(len(response.data["frames"]), images_count)


class TaskAnnotation2DContext(ApiTestBase):
    def setUp(self):
        super().setUp()
        self.task = {
            "name": "my archive task without copying #11",
            "overlap": 0,
            "segment_size": 0,
            "labels": [
                {"name": "car"},
                {"name": "person"},
            ]
        }

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)

    def _get_request_with_data(self, path, data, user):
        with ForceLogin(user, self.client):
            response = self.client.get(path, data)
        return response

    def _get_request(self, path, user):
        with ForceLogin(user, self.client):
            response = self.client.get(path)
        return response

    def _create_task(self, data, image_data):
        with ForceLogin(self.user, self.client):
            response = self.client.post('/api/tasks', data=data, format="json")
            assert response.status_code == status.HTTP_201_CREATED, response.status_code
            tid = response.data["id"]

            response = self.client.post("/api/tasks/%s/data" % tid,
                                            data=image_data)
            assert response.status_code == status.HTTP_202_ACCEPTED, response.status_code

            response = self.client.get("/api/tasks/%s" % tid)
            task = response.data

        return task

    def create_zip_archive_with_related_images(self, file_name, test_dir, context_images_info):
        with tempfile.TemporaryDirectory() as tmp_dir:
            for img in context_images_info:
                image = Image.new('RGB', size=(100, 50))
                image.save(os.path.join(tmp_dir, img), 'png')
                if context_images_info[img]:
                    related_path = os.path.join(tmp_dir, "related_images", img.replace(".", "_"))
                    os.makedirs(related_path)
                    image.save(os.path.join(related_path, f"related_{img}"), 'png')

            zip_file_path = os.path.join(test_dir, file_name)
            shutil.make_archive(zip_file_path, 'zip', tmp_dir)
        return f"{zip_file_path}.zip"

    def test_check_flag_has_related_context(self):
        with TestDir() as test_dir:
            test_cases = {
                "All images with context": {"image_1.png": True, "image_2.png": True},
                "One image with context": {"image_1.png": True, "image_2.png": False}
            }
            for test_case, context_img_data in test_cases.items():
                filename = self.create_zip_archive_with_related_images(test_case, test_dir, context_img_data)
                img_data = {
                    "client_files[0]": open(filename, 'rb'),
                    "image_quality": 75,
                }
                task = self._create_task(self.task, img_data)
                task_id = task["id"]

                response = self._get_request("/api/tasks/%s/data/meta" % task_id, self.admin)
                for frame in response.data["frames"]:
                    self.assertEqual(context_img_data[frame["name"]], frame["has_related_context"])

    def test_fetch_related_image_from_server(self):
        test_name = self._testMethodName
        context_img_data ={"image_1.png": True}
        with TestDir() as test_dir:
            filename = self.create_zip_archive_with_related_images(test_name, test_dir, context_img_data)
            img_data = {
                "client_files[0]": open(filename, 'rb'),
                "image_quality": 75,
            }
            task = self._create_task(self.task , img_data)
            task_id = task["id"]
            data = {
                "quality": "original",
                "type": "context_image",
                "number": 0
            }
            response = self._get_request_with_data("/api/tasks/%s/data" % task_id, data, self.admin)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
