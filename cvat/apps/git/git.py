# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.db import transaction

from cvat.apps.engine.log import slogger
from cvat.apps.engine.models import Task
from cvat.apps.git.models import GitData

import datetime
import shutil
import json
import git
import re
import os

DIFF_DIR = "cvat_diffs"
CVAT_USER = "cvat"
CVAT_EMAIL = "cvat@example.com"


class Git:
    __url = None
    __tid = None
    __user = None
    __cwd = None
    __rep = None


    def __init__(self, url, tid, user):
        self.__url = url
        self.__tid = tid
        self.__user = user
        self.__cwd = os.path.join(os.getcwd(), "data", str(tid), "repository")


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
            raise Exception("Couldn't parse URL")


    def _create_master(self):
        assert not len(self.__rep.heads)
        readme_md_name = os.path.join(self.__cwd, "README.md")
        with open(readme_md_name, "w"):
            pass
        self.__rep.index.add([readme_md_name])
        self.__rep.index.commit("CVAT Annotation. Initial commit by {} at {}".format(self.__user.username, datetime.datetime.now()))


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
            slogger.task[self.__tid].info("Local repository reinitialization..")
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


    def clone(self):
        os.makedirs(self.__cwd)
        ssh_url = self.ssh_url()

        # Clone repository
        slogger.task[self.__tid].info("Cloning remote repository from {}..".format(ssh_url))
        self.__rep = git.Repo.clone_from(ssh_url, self.__cwd)

        # Setup config file for CVAT user
        slogger.task[self.__tid].info("User config initialization..")
        with self.__rep.config_writer() as cw:
            if not cw.has_section("user"):
                cw.add_section("user")
            cw.set("user", "name", CVAT_USER)
            cw.set("user", "email", CVAT_EMAIL)
            cw.release()

        # Create master branch if it doesn't exist and push it into server for remote repository initialization
        if not len(self.__rep.heads):
            self._create_master()
            try:
                self.__rep.git.push("origin", "master")
            except git.exc.GitError:
                slogger.task[self.__tid].warning("Remote repository doesn't contain any " +
                    "heads but master push process is fault", exc_info = True)

        # Create dir for diffs and add it into .gitignore
        os.makedirs(os.path.join(self.__cwd, DIFF_DIR))
        gitignore = os.path.join(self.__cwd, ".gitignore")
        file_mode = "a" if os.path.isfile(os.path.join(self.__cwd, ".gitignore")) else "w"
        with open(gitignore, file_mode) as gitignore:
            gitignore.writelines(["\n", "{}/".format(DIFF_DIR), "\n"])


    # Reclone method instead of clone try to save all accumulated diffs
    def reclone(self):
        if os.path.exists(self.__cwd):
            if not os.path.isdir(self.__cwd):
                os.remove(self.__cwd)
            else:
                # Rename current repository dir
                tmp_repo = os.path.join(self.__cwd, "..", "tmp_repo")
                os.rename(self.__cwd, tmp_repo)
                successful_cloning = False

                try:
                    self.clone()
                    successful_cloning = True
                except Exception as ex:
                    # Restore state if any error has been occured
                    if os.path.isdir(self.__cwd):
                        shutil.rmtree(self.__cwd, True)
                    os.rename(tmp_repo, self.__cwd)
                    raise ex

                # If clone process is successful, push all diffs into new local repository
                if successful_cloning:
                    if os.path.exists(os.path.join(tmp_repo, DIFF_DIR)):
                        diffs_to_move = list(map(lambda x: os.path.join(DIFF_DIR, x), os.listdir(os.path.join(tmp_repo, DIFF_DIR))))
                        diffs_to_move = list(filter(lambda x: len(os.path.splitext(x)) > 1 and os.path.splitext(x)[1] == "diff", diffs_to_move))

                        for diff in diffs_to_move:
                            os.rename(os.path.join(tmp_repo, diff), os.path.join(self.__cwd, diff))
                    shutil.rmtree(tmp_repo, True)
                return

        self.clone()


    def onsave(self, changes_dict):
        diff_dir = os.path.join(self.__cwd, DIFF_DIR)
        if os.path.isdir(diff_dir):
            diff_files = list(map(lambda x: os.path.join(diff_dir, x), os.listdir(diff_dir)))
            last_num = 0
            for f in diff_files:
                number = f.split("_")[0]
                number = int(number) if number.isdigit() else last_num
                last_num = number

            with open("{}_{}.diff".format(last_num + 1, self.__user.username), 'w') as f:
                f.write(json.dumps(changes_dict))
        else:
            raise Exception("Local repository isn't found")


    def pull(self):
        self.__rep.head.reference = self.__rep.heads["master"]
        remote_branches = []
        for remote_branch in self.__rep.git.branch("-r").split("\n")[1:]:
            remote_branches.append(remote_branch.split("/")[-1])
        if "master" in remote_branches:
            try:
                self.__rep.git.pull("origin", "master")
            except git.exc.GitError:
                # Merge conflicts
                self.reclone()


    def push(self):
        # Update local repository
        self.pull()

        # Remove user branch from local repository if it exists
        if self.__user.username in list(map(lambda x: x.name, self.__rep.heads)):
            git.Head.delete(self.__rep.heads[self.__user.username].repo, self.__rep.heads[self.__user.username])

        # Create new user branch from master
        self.__rep.create_head(self.__user.username)

        # Dump annotation and zip it
        os.makedirs(os.path.join(self.__cwd, 'annotation'), exist_ok = True)
        with open(os.path.join(self.__cwd, 'annotation', 'SomeTask.dump'), 'w'):
            pass

        # Add to index
        self.__rep.index.add([os.path.join(self.__cwd, 'annotation', '*.dump')])
        self.__rep.git.push("origin", self.__user.username, '--force')


        # TODO:
        # 1) Dump real file
        # 2) ZIP real file
        # 3) Merge diffs into one file with name summary.diff. This file contains diffs by date
        # 4) LFS
        # 5) Using workers
        # Notification
        #
        #
        # Setup it in the container
        # 1) Register CVAT user. Create SSH keys for it.
        # 2)
        #
        # Future:
        # 1) Checkout from other branches (not only master

    def delete(self):
        if os.path.isdir(self.__cwd):
            shutil.rmtree(self.__cwd)


    def remote_status(self):
        diff_dir = os.path.join(self.__cwd, DIFF_DIR)
        if os.path.isdir(diff_dir):
            diffs = list(map(lambda x: os.path.join(diff_dir, x), os.listdir(diff_dir)))
            diffs = list(filter(lambda x: len(os.path.splitext(x)) > 1 and os.path.splitext(x)[1] == "diff", diffs))
            return "actual" if not len(diffs) else "obsolete"
        else:
            raise Exception("Local repository isn't found")


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


@transaction.atomic
def update(url, tid, user):
    db_task = Task.objects.get(pk = tid)
    db_git = GitData.objects.select_for_update().get(pk = db_task)

    Git(url, tid, user).init_repos()

    db_git.url = url
    db_git.save()


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
            response['status']['value'] = Git(db_git.url, tid, user).remote_status()
        except Exception as ex:
            response['status']['error'] = str(ex)
    return response


@transaction.atomic
def delete(tid, user):
    db_task = Task.objects.get(pk = tid)

    if GitData.objects.filter(pk = db_task).exists():
        db_git = GitData.objects.select_for_update().get(pk = db_task)
        Git(db_git.url, tid, user).delete()
        db_git.delete()





