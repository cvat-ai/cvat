# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from itertools import product

from django.test import TestCase
from django.contrib.auth.models import Group, User
from io import BytesIO
from PIL import Image
import os
from os import path as osp
import shutil
import git
from contextlib import contextmanager
import io

# Create your tests here.

import cvat.apps.dataset_repo.dataset_repo as CVATGit
from cvat.apps.dataset_repo.dataset_repo import (Git, initial_create, push, get,
     update_states, _onsave)
from cvat.apps.dataset_repo.models import GitData
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.utils import timezone
from cvat.apps.engine.models import Job, Task, User, Data
from cvat.apps.engine.models import (AttributeSpec, AttributeType, Data, Job, Project,
    Segment, StatusChoice, Task, Label, StorageMethodChoice, StorageChoice)
from unittest import mock

orig_execute = git.cmd.Git.execute
GIT_URL = "https://1.2.3.4/repo/exist.git"
PARSE_GIT_URL = "git@1.2.3.4:repo/exist.git"


def generate_image_file(filename, size=(100, 50)):
    f = BytesIO()
    image = Image.new('RGB', size=size)
    image.save(f, 'jpeg')
    f.name = filename
    f.seek(0)
    return f


class ForceLogin:
    def __init__(self, user, client):
        self.user = user
        self.client = client

    def __enter__(self):
        if self.user:
            self.client.force_login(self.user,
                backend='django.contrib.auth.backends.ModelBackend')

        return self

    def __exit__(self, exception_type, exception_value, traceback):
        if self.user:
            self.client.logout()


def create_db_users(cls):
    (group_admin, _) = Group.objects.get_or_create(name="admin")
    (group_user, _) = Group.objects.get_or_create(name="user")
    (group_annotator, _) = Group.objects.get_or_create(name="annotator")
    (group_observer, _) = Group.objects.get_or_create(name="observer")

    user_admin = User.objects.create_superuser(username="admin", email="admin_example@cvat.com",
                                               password="admin")
    user_admin.groups.add(group_admin)
    user = User.objects.create_user(username="user", password="user", email="user_example@cvat.com")
    user.groups.add(group_user)

    cls.admin = user_admin
    cls.owner = user
    cls.assignee = user
    cls.annotator = user
    cls.observer = user
    cls.user = user


class GitRemote:
    def pull(self, refspec=None, progress=None, **kwargs):
        return 0

class FakeHexShaObject:
    def __init__(self, hexsha):
        self.hexsha = hexsha

class GitRepo:
    def _clone(self, git_url, url, path, odb_default_type, progress, multi_options=None, **kwargs):
        if osp.isfile(osp.join(self._working_dir, '.git')):
            return self
        else:
            return git.Repo.init(path=url)

    def merge_base(self, *rev, **kwargs):
        hexsha = self.git.show_ref('refs/heads/{}'.format(rev[1], '--hash')).split(" ")
        return [FakeHexShaObject(hexsha[0])]


class GitCmd:
    def execute(self, command,
                istream=None,
                with_extended_output=False,
                with_exceptions=True,
                as_process=False,
                output_stream=None,
                stdout_as_string=True,
                kill_after_timeout=None,
                with_stdout=True,
                universal_newlines=False,
                shell=None,
                env=None,
                max_chunk_size=io.DEFAULT_BUFFER_SIZE,
                **subprocess_kwargs
                ):  # o, method, *args, **kwargs
        if command[1] == "push":
            return 0
        elif command[1] == "remote" and command[2] == "get-url":
            return PARSE_GIT_URL
        else:
            return orig_execute(self, command, istream, with_extended_output,
                                with_exceptions, as_process, output_stream,
                                stdout_as_string, kill_after_timeout, with_stdout,
                                universal_newlines, shell, env, max_chunk_size)


class GitUrlTest(APITestCase):
    class FakeGit:
        def __init__(self, url):
            self._url = url

    def setUp(self):
        self.client = APIClient()
        db_git = GitData()
        db_git.url = GIT_URL

    def add_file(self, path, filename):
        readme_md_name = os.path.join(path, filename)
        with open(readme_md_name, "w"):
            pass

    @classmethod
    def setUpTestData(cls):
        create_db_users(cls)
        cls.empty_task_example = {
            "name": "task",
            "owner_id": cls.owner.id,
            "assignee_id": cls.assignee.id,
            "overlap": 0,
            "segment_size": 100,
            "labels": [
                {
                    "name": "car",
                    "color": "#2080c0",
                    "attributes": []
                  }
            ]
        }

    def _create_task(self, init_repos=False):
        data = {
            "name": "task_example",
            "owner_id": self.owner.id,
            "assignee_id": self.assignee.id,
            "overlap": 0,
            "segment_size": 100,
            "image_quality": 75,
            "size": 100,
            "labels": [
                {
                    "name": "car",
                    "color": "#2080c0",
                    "attributes": []
                }
            ]
        }
        images = {"client_files[0]": generate_image_file("image_0.jpg")}
        images["image_quality"] = 75

        with ForceLogin(self.user, self.client):
            response = self.client.post('/api/v1/tasks', data=data, format="json")
            assert response.status_code == status.HTTP_201_CREATED, response.status_code
            tid = response.data["id"]

            response = self.client.post("/api/v1/tasks/%s/data" % tid,
                                        data=images)
            assert response.status_code == status.HTTP_202_ACCEPTED, response.status_code

            response = self.client.get("/api/v1/tasks/%s" % tid)
            task = response.data

            db_task = Task.objects.get(pk=task["id"])
            repos_dir = os.path.join(db_task.get_task_artifacts_dirname(), "repos")
            task["repos_path"] = repos_dir

            if init_repos:
                os.makedirs(repos_dir)
                git.Repo.init(path=repos_dir)

        return task

    def _check_correct_urls(self, samples):
        for i, (expected, url) in enumerate(samples):
            git = GitUrlTest.FakeGit(url)
            try:
                actual = Git._parse_url(git)
                self.assertEqual(expected, actual, "URL #%s: '%s'" % (i, url))
            except Exception:
                self.assertFalse(True, "URL #%s: '%s'" % (i, url))

    def test_correct_urls_can_be_parsed(self):
        hosts = ['host.zone', '1.2.3.4']
        ports = ['', ':42']
        repo_groups = ['repo', 'r4p0', 'multi/group', 'multi/group/level']
        repo_repos = ['nkjl23', 'hewj']
        git_suffixes = ['', '.git']

        samples = []

        # http samples
        protocols = ['', 'http://', 'https://']
        for protocol, host, port, repo_group, repo, git in product(
                protocols, hosts, ports, repo_groups, repo_repos, git_suffixes):
            url = '{protocol}{host}{port}/{repo_group}/{repo}{git}'.format(
                protocol=protocol, host=host, port=port,
                repo_group=repo_group, repo=repo, git=git
            )
            expected = ('git', host + port, '%s/%s.git' % (repo_group, repo))
            samples.append((expected, url))

        # git samples
        users = ['user', 'u123_.']
        for user, host, port, repo_group, repo, git in product(
                users, hosts, ports, repo_groups, repo_repos, git_suffixes):
            url = '{user}@{host}{port}:{repo_group}/{repo}{git}'.format(
                user=user, host=host, port=port,
                repo_group=repo_group, repo=repo, git=git
            )
            expected = (user, host + port, '%s/%s.git' % (repo_group, repo))
            samples.append((expected, url))

        self._check_correct_urls(samples)

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo._clone', new=GitRepo._clone)
    def test_init_repos(self):
        for git_rep_already_init in [True, False]:
            task = self._create_task(init_repos=git_rep_already_init)
            db_task = Task.objects.get(pk=task["id"])
            db_git = GitData()
            db_git.url = GIT_URL

            cvat_git = Git(db_git, db_task, self.user)
            cvat_git.init_repos()
            self.assertTrue(osp.isdir(osp.join(cvat_git._rep.git._working_dir, '.git')))

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo._clone', new=GitRepo._clone)
    def test_git_create_master_branch(self):
        task = self._create_task(init_repos=True)
        db_task = Task.objects.get(pk=task["id"])
        db_git = GitData()
        db_git.url = GIT_URL

        cvat_git = Git(db_git, db_task, self.user)
        cvat_git._rep = git.Repo(cvat_git._cwd)
        cvat_git._create_master_branch()
        self.assertTrue(osp.isfile(osp.join(cvat_git._cwd, "README.md")))
        self.assertFalse(cvat_git._rep.is_dirty())
        self.assertTrue(len(cvat_git._rep.heads) == 1)
        self.assertTrue(cvat_git._rep.heads[0].name == "master")

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo._clone', new=GitRepo._clone)
    def test_to_task_branch(self):
        task = self._create_task(init_repos=True)
        tid = task["id"]
        task_name = task["name"]
        db_task = Task.objects.get(pk=tid)
        db_git = GitData()

        cvat_git = Git(db_git, db_task, self.user)
        cvat_git._rep = git.Repo(cvat_git._cwd)
        cvat_git._create_master_branch()
        cvat_git._to_task_branch()
        heads = [head.name for head in cvat_git._rep.heads]
        self.assertTrue('cvat_{}_{}'.format(tid, task_name) in heads)

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo._clone', new=GitRepo._clone)
    def test_update_config(self):
        for user in [self.admin, self.user]:
            task = self._create_task(init_repos=True)
            db_task = Task.objects.get(pk=task["id"])
            db_git = GitData()

            cvat_git = Git(db_git, db_task, user)
            cvat_git._rep = git.Repo(cvat_git._cwd)
            cvat_git._create_master_branch()

            cvat_git._update_config()
            with cvat_git._rep.config_reader() as cw:
                self.assertEqual(user.username, cw.get("user", "name"))
                self.assertEqual(user.email, cw.get("user", "email"))

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo._clone', new=GitRepo._clone)
    def test_configurate(self):
        task = self._create_task(init_repos=True)
        db_task = Task.objects.get(pk=task["id"])
        db_git = GitData()

        cvat_git = Git(db_git, db_task, self.user)
        cvat_git._rep = git.Repo(cvat_git._cwd)

        cvat_git._configurate()

        self.assertTrue(len(cvat_git._rep.heads))
        self.assertTrue(osp.isdir(osp.join(db_task.get_task_artifacts_dirname(), "repos_diffs_v2")))

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo._clone', new=GitRepo._clone)
    def test_clone(self):
        task = self._create_task(init_repos=False)
        db_task = Task.objects.get(pk=task["id"])
        db_git = GitData()
        db_git.url = GIT_URL

        cvat_git = Git(db_git, db_task, self.user)
        cvat_git._clone()
        self.assertTrue(osp.isdir(osp.join(cvat_git._rep.git._working_dir, '.git')))
        self.assertTrue(len(cvat_git._rep.heads))

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    def test_clone_nonexistent_repo(self):
        # Do not mock git.Repo._clone method and try to clone nonexistent repository
        task = self._create_task(init_repos=False)
        db_task = Task.objects.get(pk=task["id"])
        db_git = GitData()
        db_git.url = GIT_URL

        cvat_git = Git(db_git, db_task, self.user)
        with self.assertRaises(git.exc.GitCommandError):
           cvat_git._clone()

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo._clone', new=GitRepo._clone)
    def test_reclone(self):
        for git_rep_already_init in [True, False]:
            task = self._create_task(init_repos=git_rep_already_init)
            db_task = Task.objects.get(pk=task["id"])
            db_git = GitData()
            db_git.url = GIT_URL

            cvat_git = Git(db_git, db_task, self.user)
            cvat_git._reclone()
            self.assertTrue(osp.isdir(osp.join(cvat_git._rep.git._working_dir, '.git')))
            self.assertTrue(len(cvat_git._rep.heads))


    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.remote.Remote.pull', new=GitRemote.pull)
    @mock.patch('git.Repo._clone', new=GitRepo._clone)
    def test_push(self):
        task = self._create_task(init_repos=True)
        db_task = Task.objects.get(pk=task["id"])
        db_git = GitData()
        db_git.url = GIT_URL
        db_git.path = "annotation.zip"
        db_git.sync_date = timezone.now()

        cvat_git = Git(db_git, db_task, self.user)
        cvat_git._rep = git.Repo(cvat_git._cwd)
        cvat_git._create_master_branch()
        self.add_file(cvat_git._cwd, "file.txt")
        cvat_git.push(self.user, "", "", db_task, db_task.updated_date)
        self.assertFalse(cvat_git._rep.is_dirty())

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo._clone', new=GitRepo._clone)
    def test_request_initial_create(self):
        task = self._create_task(init_repos=False)
        initial_create(task["id"], GIT_URL, 1, self.user)
        self.assertTrue(osp.isdir(osp.join(task["repos_path"], '.git')))
        git_repo = git.Repo(task["repos_path"])
        with git_repo.config_reader() as cw:
            self.assertEqual(self.user.username, cw.get("user", "name"))
            self.assertEqual(self.user.email, cw.get("user", "email"))
        self.assertTrue(len(git_repo.heads))

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.remote.Remote.pull', new=GitRemote.pull)
    @mock.patch('git.Repo._clone', new=GitRepo._clone)
    def test_request_push(self):
        task = self._create_task(init_repos=False)
        tid = task["id"]
        initial_create(tid, GIT_URL, 1, self.user)
        self.add_file(task["repos_path"], "file.txt")
        push(tid, self.user, "", "")

        git_repo = git.Repo(task["repos_path"])
        self.assertFalse(git_repo.is_dirty())

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.remote.Remote.pull', new=GitRemote.pull)
    @mock.patch('git.Repo._clone', new=GitRepo._clone)
    @mock.patch('git.Repo.merge_base', new=GitRepo.merge_base)
    def test_push_and_request_get(self):
        task = self._create_task(init_repos=False)
        tid = task["id"]
        initial_create(tid, GIT_URL, 1, self.user)
        self.add_file(task["repos_path"], "file.txt")
        push(tid, self.user, "", "")
        response = get(tid, self.user)
        self.assertTrue(response["status"]["value"], "merged")
        self.assertIsNone(response["status"]["error"])

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.remote.Remote.pull', new=GitRemote.pull)
    @mock.patch('git.Repo._clone', new=GitRepo._clone)
    @mock.patch('git.Repo.merge_base', new=GitRepo.merge_base)
    def test_request_get(self):
        task = self._create_task(init_repos=False)
        tid = task["id"]
        initial_create(tid, GIT_URL, 1, self.user)
        response = get(tid, self.user)

        self.assertTrue(response["status"]["value"], "not sync")
