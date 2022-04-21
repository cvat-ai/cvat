# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

from itertools import product
from io import BytesIO
from PIL import Image
import os
from os import path as osp
import git
import io
from unittest import mock


from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.utils import timezone
from django.contrib.auth.models import Group, User
from cvat.apps.engine.models import Task
from cvat.apps.dataset_repo.dataset_repo import (Git, initial_create, push, get)
from cvat.apps.dataset_repo.models import GitData, GitStatusChoice

orig_execute = git.cmd.Git.execute
GIT_URL = "https://1.2.3.4/repo/exist.git"
PARSE_GIT_URL = "git@1.2.3.4:repo/exist.git"
EXPORT_FORMAT = "CVAT for video 1.1"

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

class GitRemote:
    def pull(self, refspec=None, progress=None, **kwargs):
        _ = (refspec, progress, *kwargs)
        return 0


class FakeHexShaObject:
    def __init__(self, hexsha):
        self.hexsha = hexsha


class GitRepo(git.Repo):
    def clone(self, path, progress=None, multi_options=None, **kwargs):
        _ = (progress, multi_options, *kwargs)
        if osp.isfile(osp.join(path, '.git')):
            return self
        else:
            return git.Repo.init(path=path)

    def merge_base(self, *rev, **kwargs):
        _ = (rev, *kwargs)
        hexsha = self.git.show_ref('refs/heads/{}'.format(rev[1])).split(" ")
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
                ):
        _ = subprocess_kwargs
        if command[1] == "push":
            return 0
        elif command[1] == "remote" and command[2] == "get-url":
            return PARSE_GIT_URL
        else:
            return orig_execute(self, command, istream, with_extended_output,
                                with_exceptions, as_process, output_stream,
                                stdout_as_string, kill_after_timeout, with_stdout,
                                universal_newlines, shell, env, max_chunk_size)


class TestGit(Git):
    def set_rep(self):
        self._rep = git.Repo(self._cwd) # pylint: disable=W0201

    def pull(self):
        self._pull()

    def create_master_branch(self):
        self._create_master_branch()

    def to_task_branch(self):
        self._to_task_branch()

    def get_cwd(self):
        return self._cwd

    def parse_url(self):
        return Git._parse_url(self)

    def get_rep(self):
        return self._rep

    def update_config(self):
        self._update_config()

    def get_working_dir(self):
        return self._rep.git.working_dir

    def configurate(self):
        self._configurate()

    def clone(self):
        self._clone()

    def reclone(self):
        self._reclone()

class GitDatasetRepoTest(APITestCase):
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
        (group_admin, _) = Group.objects.get_or_create(name="admin")
        (group_user, _) = Group.objects.get_or_create(name="user")
        Group.objects.get_or_create(name="annotator")
        Group.objects.get_or_create(name="observer")

        user_admin = User.objects.create_superuser(username="admin", email="admin_example@cvat.com")
        user_admin.groups.add(group_admin)
        user = User.objects.create_user(username="user", email="user_example@cvat.com")
        user.groups.add(group_user)

        cls.admin = user_admin
        cls.owner = user
        cls.assignee = user
        cls.annotator = user
        cls.observer = user
        cls.user = user
        cls.empty_task_example = {
            "name": "task",
            "owner_id": cls.owner.id,
            "assignee_id": cls.assignee.id,
            "overlap": 0,
            "segment_size": 100,
            "labels": [
                {
                    "label_id": 1,
                    "name": "car",
                    "color": "#2080c0",
                    "attributes": []
                  }
            ]
        }

    def _run_api_v2_job_id_annotation(self, jid, data, user):
        with ForceLogin(user, self.client):
            response = self.client.patch('/api/jobs/{}/annotations?action=create'.format(jid),
                data=data, format="json")

        return response

    def _get_jobs(self, task_id):
        with ForceLogin(self.admin, self.client):
            response = self.client.get("/api/tasks/{}/jobs".format(task_id))
        return response.data

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
            response = self.client.post('/api/tasks', data=data, format="json")
            assert response.status_code == status.HTTP_201_CREATED, response.status_code
            tid = response.data["id"]

            response = self.client.post("/api/tasks/%s/data" % tid,
                                        data=images)
            assert response.status_code == status.HTTP_202_ACCEPTED, response.status_code

            response = self.client.get("/api/tasks/%s" % tid)
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
            fake_git = GitDatasetRepoTest.FakeGit(url)
            try:
                actual = TestGit.parse_url(fake_git)
                self.assertEqual(expected, actual, "URL #%s: '%s'" % (i, url))
            except Exception: # pylint: disable=broad-except
                self.fail("URL #%s: '%s'" % (i, url))

    def test_correct_urls_can_be_parsed(self):
        hosts = ['host.zone', '1.2.3.4']
        ports = ['', ':42']
        repo_groups = ['repo', 'r4p0', 'multi/group', 'multi/group/level']
        repo_repos = ['nkjl23', 'hewj']
        git_suffixes = ['', '.git']

        samples = []

        # http samples
        protocols = ['', 'http://', 'https://']
        for protocol, host, port, repo_group, repo, git_suffix in product(
                protocols, hosts, ports, repo_groups, repo_repos, git_suffixes):
            url = '{protocol}{host}{port}/{repo_group}/{repo}{git}'.format(
                protocol=protocol, host=host, port=port,
                repo_group=repo_group, repo=repo, git=git_suffix
            )
            expected = ('git', host + port, '%s/%s.git' % (repo_group, repo))
            samples.append((expected, url))

        # git samples
        users = ['user', 'u123_.']
        for user, host, port, repo_group, repo, git_suffix in product(
                users, hosts, ports, repo_groups, repo_repos, git_suffixes):
            url = '{user}@{host}{port}:{repo_group}/{repo}{git}'.format(
                user=user, host=host, port=port,
                repo_group=repo_group, repo=repo, git=git_suffix
            )
            expected = (user, host + port, '%s/%s.git' % (repo_group, repo))
            samples.append((expected, url))

        self._check_correct_urls(samples)

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    def test_init_repos(self):
        for git_rep_already_init in [True, False]:
            task = self._create_task(init_repos=git_rep_already_init)
            db_task = Task.objects.get(pk=task["id"])
            db_git = GitData()
            db_git.url = GIT_URL

            cvat_git = TestGit(db_git, db_task, self.user)
            cvat_git.init_repos()
            self.assertTrue(osp.isdir(osp.join(cvat_git.get_working_dir(), '.git')))

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    def test_git_create_master_branch(self):
        task = self._create_task(init_repos=True)
        db_task = Task.objects.get(pk=task["id"])
        db_git = GitData()
        db_git.url = GIT_URL

        cvat_git = TestGit(db_git, db_task, self.user)
        cvat_git.set_rep()
        cvat_git.create_master_branch()
        cwd = cvat_git.get_cwd()
        self.assertTrue(osp.isfile(osp.join(cwd, "README.md")))

        repo = cvat_git.get_rep()
        self.assertFalse(repo.is_dirty())
        self.assertTrue(len(repo.heads) == 1)
        self.assertTrue(repo.heads[0].name == "master")

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    def test_to_task_branch(self):
        task = self._create_task(init_repos=True)
        tid = task["id"]
        task_name = task["name"]
        db_task = Task.objects.get(pk=tid)
        db_git = GitData()

        cvat_git = TestGit(db_git, db_task, self.user)
        cvat_git.set_rep()
        cvat_git.create_master_branch()
        cvat_git.to_task_branch()

        repo = cvat_git.get_rep()
        heads = [head.name for head in repo.heads]
        self.assertTrue('cvat_{}_{}'.format(tid, task_name) in heads)

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    def test_update_config(self):
        for user in [self.admin, self.user]:
            task = self._create_task(init_repos=True)
            db_task = Task.objects.get(pk=task["id"])
            db_git = GitData()

            cvat_git = TestGit(db_git, db_task, user)
            cvat_git.set_rep()
            cvat_git.create_master_branch()

            cvat_git.update_config()
            repo = cvat_git.get_rep()
            with repo.config_reader() as cw:
                self.assertEqual(user.username, cw.get("user", "name"))
                self.assertEqual(user.email, cw.get("user", "email"))

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    def test_configurate(self):
        task = self._create_task(init_repos=True)
        db_task = Task.objects.get(pk=task["id"])
        db_git = GitData()

        cvat_git = TestGit(db_git, db_task, self.user)
        cvat_git.set_rep()
        cvat_git.configurate()

        repo = cvat_git.get_rep()
        self.assertTrue(len(repo.heads))
        self.assertTrue(osp.isdir(osp.join(db_task.get_task_artifacts_dirname(), "repos_diffs_v2")))

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    def test_clone(self):
        task = self._create_task(init_repos=False)
        db_task = Task.objects.get(pk=task["id"])
        db_git = GitData()
        db_git.url = GIT_URL

        cvat_git = TestGit(db_git, db_task, self.user)
        cvat_git.clone()
        repo = cvat_git.get_rep()
        self.assertTrue(osp.isdir(osp.join(cvat_git.get_working_dir(), '.git')))
        self.assertTrue(len(repo.heads))

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    def test_reclone(self):
        for git_rep_already_init in [True, False]:
            task = self._create_task(init_repos=git_rep_already_init)
            db_task = Task.objects.get(pk=task["id"])
            db_git = GitData()
            db_git.url = GIT_URL

            cvat_git = TestGit(db_git, db_task, self.user)
            cvat_git.reclone()
            self.assertTrue(osp.isdir(osp.join(cvat_git.get_working_dir(), '.git')))
            self.assertTrue(len(cvat_git.get_rep().heads))

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.remote.Remote.pull', new=GitRemote.pull)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    def test_push(self):
        task = self._create_task(init_repos=True)
        db_task = Task.objects.get(pk=task["id"])
        db_git = GitData()
        db_git.url = GIT_URL
        db_git.format = EXPORT_FORMAT
        db_git.path = "annotation.zip"
        db_git.sync_date = timezone.now()

        cvat_git = TestGit(db_git, db_task, self.user)
        cvat_git.set_rep()
        cvat_git.create_master_branch()
        self.add_file(cvat_git.get_cwd(), "file.txt")
        cvat_git.push(self.user, "", "", db_task, db_task.updated_date)
        self.assertFalse(cvat_git.get_rep().is_dirty())

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    def test_request_initial_create(self):
        task = self._create_task(init_repos=False)
        initial_create(task["id"], GIT_URL, EXPORT_FORMAT, 1, self.user)
        self.assertTrue(osp.isdir(osp.join(task["repos_path"], '.git')))
        git_repo = git.Repo(task["repos_path"])
        with git_repo.config_reader() as cw:
            self.assertEqual(self.user.username, cw.get("user", "name"))
            self.assertEqual(self.user.email, cw.get("user", "email"))
        self.assertTrue(len(git_repo.heads))

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.remote.Remote.pull', new=GitRemote.pull)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    def test_request_push(self):
        task = self._create_task(init_repos=False)
        tid = task["id"]
        initial_create(tid, GIT_URL, EXPORT_FORMAT, 1, self.user)
        self.add_file(task["repos_path"], "file.txt")
        push(tid, self.user, "", "")

        git_repo = git.Repo(task["repos_path"])
        self.assertFalse(git_repo.is_dirty())

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.remote.Remote.pull', new=GitRemote.pull)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    @mock.patch('git.Repo.merge_base', new=GitRepo.merge_base)
    def test_push_and_request_get(self):
        task = self._create_task(init_repos=False)
        tid = task["id"]
        initial_create(tid, GIT_URL, EXPORT_FORMAT, 1, self.user)
        self.add_file(task["repos_path"], "file.txt")
        push(tid, self.user, "", "")
        response = get(tid, self.user)
        self.assertTrue(response["status"]["value"], "merged")
        self.assertIsNone(response["status"]["error"])

    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.remote.Remote.pull', new=GitRemote.pull)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    @mock.patch('git.Repo.merge_base', new=GitRepo.merge_base)
    def test_request_get(self):
        task = self._create_task(init_repos=False)
        tid = task["id"]
        initial_create(tid, GIT_URL, EXPORT_FORMAT, 1, self.user)
        response = get(tid, self.user)

        self.assertTrue(response["status"]["value"], "not sync")


    @mock.patch('git.cmd.Git.execute', new=GitCmd.execute)
    @mock.patch('git.remote.Remote.pull', new=GitRemote.pull)
    @mock.patch('git.Repo.clone', new=GitRepo.clone)
    @mock.patch('git.Repo.clone_from', new=GitRepo.clone)
    def test_request_on_save(self):
        task = self._create_task(init_repos=False)
        tid = task["id"]
        initial_create(tid, GIT_URL, EXPORT_FORMAT, 1, self.user)

        jobs = self._get_jobs(tid)
        ann = {
            "version": 0,
            "tags": [],
            "shapes": [
                {
                    "type": "points",
                    "occluded": False,
                    "z_order": 1,
                    "points": [42.95, 33.59],
                    "frame": 1,
                    "label_id": 1,
                    "group": 0,
                    "source": "manual",
                    "attributes": []
                },
            ],
            "tracks": []
        }
        self._run_api_v2_job_id_annotation(jobs[0]["id"], ann, self.user)
        db_git = GitData()
        self.assertEqual(db_git.status, GitStatusChoice.NON_SYNCED)
