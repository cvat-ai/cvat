# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from cvat.apps.engine.log import slogger
from cvat.apps.engine.models import Task, Job
from cvat.apps.engine.annotation import _dump as dump, FORMAT_XML, save_job
from cvat.apps.engine.plugins import add_plugin

from cvat.apps.git.models import GitData
from cvat.apps.git.settings import *

import subprocess
import datetime
import shutil
import json
import git
import re
import os


class Git:
    __url = None
    __tid = None
    __user = None
    __cwd = None
    __rep = None
    __diffs_dir = None


    def __init__(self, url, tid, user):
        self.__url = url
        self.__tid = tid
        self.__user = '{}_{}'.format(CVAT_BRANCH_PREFIX, user.username)
        self.__cwd = os.path.join(os.getcwd(), "data", str(tid), "repos")
        self.__diffs_dir = os.path.join(os.getcwd(), "data", str(tid), "repos_diffs")


    # Method parses an got URL.
    # SSH: git@github.com/proj/repos[.git]
    # HTTP/HTTPS: [http://]github.com/proj/repos[.git]
    def _parse_url(self):
        http_pattern = "([https|http]+)*[://]*([a-zA-Z0-9._-]+.[a-zA-Z]+)/([a-zA-Z0-9._-]+)/([a-zA-Z0-9._-]+)"
        ssh_pattern = "([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+):([a-zA-Z.-]+)/([a-zA-Z.-]+)"

        http_match = re.match(http_pattern, self.__url)
        ssh_match = re.match(ssh_pattern, self.__url)

        if http_match:
            user = "git"
            scheme = http_match.group(1) if http_match.group(1) else "https"
            host = http_match.group(2)
            repos = "{}/{}".format(http_match.group(3), http_match.group(4))
            if not repos.endswith(".git"):
                repos += ".git"
            return scheme, user, host, repos
        elif ssh_match:
            scheme = "https"
            user = ssh_match.group(1)
            host = ssh_match.group(2)
            repos = "{}/{}".format(ssh_match.group(3), ssh_match.group(4))
            if not repos.endswith(".git"):
                repos += ".git"
            return scheme, user, host, repos
        else:
            raise Exception("Got URL doesn't sutisfy for regular expression")


    # Method creates the main branch if repostory don't have any branches
    def _create_master(self):
        assert not len(self.__rep.heads)
        readme_md_name = os.path.join(self.__cwd, "README.md")
        with open(readme_md_name, "w"):
            pass
        self.__rep.index.add([readme_md_name])
        self.__rep.index.commit("CVAT Annotation. Initial commit by {} at {}".format(self.__user, datetime.datetime.now()))


    def _init_host(self):
        user, host = self._parse_url()[1:-1]
        check_command = 'ssh-keygen -F {} | grep "Host {} found"'.format(host, host)
        add_command = 'ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -q {}@{} && echo $?'.format(user, host)
        if not len(subprocess.run([check_command], shell = True, stdout = subprocess.PIPE).stdout):
            proc = subprocess.run([add_command], shell = True, stdout = subprocess.PIPE, stderr = subprocess.PIPE)
            stderr = proc.stderr.decode('utf-8')[:-2]
            if proc.returncode > 1:
                raise Exception('Failed ssh connection: {}'.format(stderr))
            slogger.task[self.__tid].info('Host {} has been added to known_hosts.'.format(host))


    # Method connects local report if it exists
    # Otherwise it clones it before
    def init_repos(self):
        try:
            # Try to use a local repos. It can throw GitError exception
            self.__rep = git.Repo(self.__cwd)

            # Check if remote URL is actual
            if self.ssh_url() != self.__rep.git.remote('get-url', '--all', 'origin'):
                slogger.task[self.__tid].info("Local repository URL is obsolete.")
                # We need reinitialize repository if it's false
                raise git.exc.GitError
        except git.exc.GitError:
            slogger.task[self.__tid].info("Local repository initialization..")
            shutil.rmtree(self.__cwd, True)
            self.clone()

        return self


    def ssh_url(self):
        user, host, repos = self._parse_url()[1:]
        return "{}@{}:{}".format(user, host, repos)


    def http_url(self):
        data = self._parse_url()
        scheme = data[0]
        host, repos = data[2:]
        return "{}://{}/{}".format(scheme, host, repos)


    # Method clones a remote repos to the local storage using SSH
    # Method also initializes a repos after it has been cloned
    def clone(self):
        os.makedirs(self.__cwd)
        ssh_url = self.ssh_url()

        # Clone repository
        slogger.task[self.__tid].info("Cloning remote repository from {}..".format(ssh_url))
        self._init_host()
        self.__rep = git.Repo.clone_from(ssh_url, self.__cwd)

        # Setup config file for CVAT_HEADLESS user
        slogger.task[self.__tid].info("User config initialization..")
        with self.__rep.config_writer() as cw:
            if not cw.has_section("user"):
                cw.add_section("user")
            cw.set("user", "name", CVAT_HEADLESS_USERNAME)
            cw.set("user", "email", CVAT_HEADLESS_EMAIL)
            cw.release()

        # Create master branch if it doesn't exist
        # And push it into server for a remote repos initialization
        if not len(self.__rep.heads):
            self._create_master()
            try:
                self.__rep.git.push("origin", "master")
            except git.exc.GitError:
                slogger.task[self.__tid].warning("Remote repository doesn't contain any " +
                    "heads but 'master' branch push process has been failed", exc_info = True)

        os.makedirs(self.__diffs_dir, exist_ok = True)


    # Method is some wrapper for clone
    # It restores state if any errors have occured
    # It useful if merge conflicts have occured during pull
    def reclone(self):
        if os.path.exists(self.__cwd):
            if not os.path.isdir(self.__cwd):
                os.remove(self.__cwd)
            else:
                # Rename current repository dir
                tmp_repo = os.path.join(self.__cwd, "..", "tmp_repo")
                os.rename(self.__cwd, tmp_repo)

                # Try clone repository
                try:
                    self.clone()
                    shutil.rmtree(tmp_repo, True)
                except Exception as ex:
                    # Restore state if any errors have occured
                    if os.path.isdir(self.__cwd):
                        shutil.rmtree(self.__cwd, True)
                    os.rename(tmp_repo, self.__cwd)
                    raise ex
                return

        self.clone()


    # Method checkout to master branch and pull it from remote repos
    def pull(self):
        self.__rep.head.reference = self.__rep.heads["master"]
        remote_branches = []
        for remote_branch in self.__rep.git.branch("-r").split("\n")[1:]:
            remote_branches.append(remote_branch.split("/")[-1])
        if "master" in remote_branches:
            try:
                self._init_host()
                self.__rep.git.pull("origin", "master")
            except git.exc.GitError:
                # Merge conflicts
                self.reclone()


    # Method prepares an annotation, merges diffs and pushes it to remote repository to user branch
    def push(self, scheme, host, format):

        # Helpful function which merges diffs
        def _accumulate(source, target, target_key):
            if isinstance(source, dict):
                if target_key is not None and target_key not in target:
                    target[target_key] = {}

                for key in source:
                    if target_key is not None:
                        _accumulate(source[key], target[target_key], key)
                    else:
                        _accumulate(source[key], target, key)
            elif isinstance(source, int):
                if source:
                    if target_key is not None and target_key not in target:
                        target[target_key] = 0
                    target[target_key] += source
            else:
                raise Exception("Unhandled accumulate type: {}".format(type(source)))

        # Update local repository
        self.pull()

        # Remove user branch from local repository if it exists
        if self.__user in list(map(lambda x: x.name, self.__rep.heads)):
            self.__rep.delete_head(self.__user, force=True)
            self.__rep.head.reference = self.__rep.heads["master"]
            self.__rep.head.reset('HEAD', index=True, working_tree=True)

        # Checkout new user branch from master
        self.__rep.create_head(self.__user)
        self.__rep.head.reference = self.__rep.heads[self.__user]

        # Dump an annotation
        dump(self.__tid, format, scheme, host)
        dump_name = Task.objects.get(pk = self.__tid).get_dump_path()

        # Remove other annotation if it exists
        base_path = os.path.join(self.__cwd, "annotation")
        shutil.rmtree(base_path, True)
        os.makedirs(base_path)

        # Zip an annotation and remove it
        archive_name = os.path.join(base_path, "annotation.zip")
        subprocess.call('zip -j -r "{}" "{}"'.format(archive_name, dump_name), shell=True)
        os.remove(dump_name)

        # Merge diffs
        summary_diff = {}
        for diff_name in list(map(lambda x: os.path.join(self.__diffs_dir, x), os.listdir(self.__diffs_dir))):
            with open(diff_name, 'r') as f:
                diff = json.loads(f.read())
                _accumulate(diff, summary_diff, None)

        summary_diff["timestamp"] = str(timezone.now())

        # Save merged diffs file
        diff_name = os.path.join(self.__cwd, "changelog.diff")
        old_changes = []

        if os.path.isfile(diff_name):
            with open(diff_name, 'r') as f:
                try:
                    old_changes = json.loads(f.read())
                except json.decoder.JSONDecodeError:
                    pass

        old_changes.append(summary_diff)
        with open(diff_name, 'w') as f:
            f.write(json.dumps(old_changes, sort_keys = True, indent = 4))

        # Setup LFS for *.zip files
        self.__rep.git.lfs("track", "*.zip")

        # Commit and push
        self.__rep.index.add([
            '.gitattributes',
            diff_name,
            archive_name
        ])
        self.__rep.index.commit("CVAT Annotation. Annotation updated by {} at {}".format(self.__user, datetime.datetime.now()))

        self._init_host()
        self.__rep.git.push("origin", self.__user, "--force")

        shutil.rmtree(self.__diffs_dir, True)


    # Method deletes a local repos
    def delete(self):
        if os.path.isdir(self.__cwd):
            shutil.rmtree(self.__cwd)


    # Method checks status of repository annotation
    def remote_status(self, last_save):
        anno_archive_name = os.path.join(self.__cwd, "annotation", "annotation.zip")
        changelog_name = os.path.join(self.__cwd, "changelog.diff")

        # Check repository exists and archive exists
        if not os.path.isfile(anno_archive_name) or not os.path.isfile(changelog_name):
            return "empty"
        else:
            with open(changelog_name, 'r') as f:
                try:
                    data = json.loads(f.read())
                    last_push = data[-1]["timestamp"]
                    last_push = parse_datetime(last_push)
                    if last_save > last_push:
                        return "obsolete"
                    else:
                        return "actual"
                except json.decoder.JSONDecodeError:
                    raise Exception("Bad local repository.")

        # Check accumulated diffs
        os.makedirs(self.__diffs_dir, exist_ok = True)
        diffs = list(map(lambda x: os.path.join(self.__diffs_dir, x), os.listdir(self.__diffs_dir)))
        diffs = list(filter(lambda x: len(os.path.splitext(x)) > 1 and os.path.splitext(x)[1] == ".diff", diffs))
        return "actual" if not len(diffs) else "obsolete"


@transaction.atomic
def create(url, tid, user):
    try:
        db_task = Task.objects.get(pk = tid)
        if GitData.objects.filter(pk = db_task).exists():
            raise Exception('git repository for task already exists')

        db_git = GitData()
        db_git.url = url
        db_git.task = db_task
        db_git.save()

        db_git = GitData.objects.select_for_update().get(pk = db_task)
        Git(url, tid, user).init_repos()
    except Exception as ex:
        if isinstance(db_git, GitData):
            db_git.delete()
        raise ex


def _initial_create(tid, params):
    url = params['git_url']
    user = params['owner']
    if len(url):
        create(url, tid, user)


@transaction.atomic
def update(url, tid, user):
    db_task = Task.objects.get(pk = tid)
    db_git = GitData.objects.select_for_update().get(pk = db_task)

    Git(url, tid, user).init_repos()

    db_git.url = url
    db_git.save()


@transaction.atomic
def push(tid, user, scheme, host):
    db_task = Task.objects.get(pk = tid)
    db_git = GitData.objects.select_for_update().get(pk = db_task)
    Git(db_git.url, tid, user).init_repos().push(scheme, host, FORMAT_XML)


@transaction.atomic
def get(tid, user):
    response = {}
    response["url"] = {"value": None}
    response["status"] = {"value": None, "error": None}

    db_task = Task.objects.get(pk = tid)
    if GitData.objects.filter(pk = db_task).exists():
        db_git = GitData.objects.select_for_update().get(pk = db_task)
        response['url']['value'] = db_git.url
        try:
            response['status']['value'] = Git(db_git.url, tid, user).remote_status(db_task.updated_date)
        except Exception as ex:
            response['status']['error'] = str(ex)
    return response


@transaction.atomic
def onsave(jid, data):
    db_task = Job.objects.select_related('segment__task').get(pk = jid).segment.task
    try:
        GitData.objects.select_for_update().get(pk = db_task.id)
        diff_dir = os.path.join(os.getcwd(), "data", str(db_task.id), "repos_diffs")
        os.makedirs(diff_dir, exist_ok = True)

        updated = sum([  len(data["update"][key]) for key in data["update"] ])
        deleted = sum([  len(data["delete"][key]) for key in data["delete"] ])
        created = sum([  len(data["create"][key]) for key in data["create"] ])

        if updated or deleted or created:
            diff = {
                "update": {key: len(data["update"][key]) for key in data["update"].keys()},
                "delete": {key: len(data["delete"][key]) for key in data["delete"].keys()},
                "create": {key: len(data["create"][key]) for key in data["create"].keys()}
            }

            diff_files = list(map(lambda x: os.path.join(diff_dir, x), os.listdir(diff_dir)))
            last_num = 0
            for f in diff_files:
                number = os.path.splitext(os.path.basename(f))[0]
                number = int(number) if number.isdigit() else last_num
                last_num = max(last_num, number)

            with open(os.path.join(diff_dir, "{}.diff".format(last_num + 1)), 'w') as f:
                f.write(json.dumps(diff))
    except GitData.ObjectDoesNotExist:
        pass


@transaction.atomic
def delete(tid, user):
    db_task = Task.objects.get(pk = tid)

    if GitData.objects.filter(pk = db_task).exists():
        db_git = GitData.objects.select_for_update().get(pk = db_task)
        Git(db_git.url, tid, user).delete()
        db_git.delete()


add_plugin("save_job", onsave, "after", exc_ok = False)
add_plugin("_create_thread", _initial_create, "after", exc_ok = True)
