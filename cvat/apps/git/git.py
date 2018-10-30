# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

#!/bin/bash

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

        try:
            self.__rep = git.Repo(self.__cwd)
        except git.exc.InvalidGitRepositoryError:
            shutil.rmtree(self.__cwd, True)
            self.reclone()
        except git.exc.NoSuchPathError:
            self.clone()


    def _parse_url(self):
        http_pattern = "([https|http]+)*[://]*([a-zA-Z0-9._-]+.[a-zA-Z]+)/([a-zA-Z0-9._-]+)/([a-zA-Z0-9._-]+)"
        ssh_pattern = "([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+):([a-zA-Z.-]+)/([a-zA-Z.-]+)"

        http_match = re.match(http_pattern, self.__url)
        ssh_match = re.match(ssh_pattern, self.__url)

        if http_match:
            print("{} is http URL".format(self.__url))
            user = "git"
            scheme = http_match.group(1) if http_match.group(1) else "https"
            host = http_match.group(2)
            repos = "{}/{}".format(http_match.group(3), http_match.group(4))
            if not repos.endswith(".git"):
                repos += ".git"
            return scheme, user, host, repos
        elif ssh_match:
            print("{} is ssh URL".format(self.__url))
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
        if not len(self.__rep.heads):
            readme_md_name = os.path.join(self.__cwd, "README.md")
            with open(readme_md_name, "w"):
                pass
            self.__rep.index.add([readme_md_name])
            self.__rep.head.reference = self.__rep.create_head("master")
            self.__rep.index.commit("CVAT Annotation. Initial commit by {} at {}".format(self.__user, datetime.datetime.now()))


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
        self.__rep = git.Repo.clone_from(ssh_url, self.__cwd)

        with self.__rep.config_writer() as cw:
            if not cw.has_section("user"):
                cw.add_section("user")
            cw.set("user", "name", CVAT_USER)
            cw.set("user", "email", CVAT_EMAIL)
            cw.release()

        self._create_master()
        try:
            self.__rep.git.push("origin", "master")
        except git.exc.GitError:
            print("Remote master branch wasn't found, but script couldn't push it")

        os.makedirs(os.path.join(self.__cwd, DIFF_DIR))
        gitignore = os.path.join(self.__cwd, ".gitignore")
        file_mode = "a" if os.path.isfile(os.path.join(self.__cwd, ".gitignore")) else "w"
        with open(gitignore, file_mode) as gitignore:
            gitignore.writelines(["\n", "{}/".format(DIFF_DIR), "\n"])


    def reclone(self):
        if os.path.exists(self.__cwd):
            if not os.path.isdir(self.__cwd):
                os.remove(self.__cwd)
            else:
                tmp_repo = os.path.join(os.path.split(self.__cwd)[:-1], "tmp_repo".format(self.__user))
                os.rename(self.__cwd, tmp_repo)
                successful_cloning = False

                try:
                    self.clone()
                    successful_cloning = True
                except git.exc.GitError:
                    os.rename(tmp_repo, self.__cwd)
                    raise Exception("Couldn't clone repository")

                if successful_cloning:
                    if os.path.exists(os.path.join(tmp_repo, DIFF_DIR)):
                        diffs_to_move = list(map(lambda x: os.path.join(DIFF_DIR, x), os.listdir(os.path.join(tmp_repo, DIFF_DIR))))
                        diffs_to_move = list(filter(lambda x: len(os.path.splitext(x)) > 1 and os.path.splitext(x)[1] == "diff"), diffs_to_move)

                        for diff in diffs_to_move:
                            os.rename(os.path.join(tmp_repo, diff), os.path.join(self.__cwd, diff))
                    shutil.rmtree(tmp_repo, True)
                return

        self.clone()


    def onsave(self, changes_dict):
        diff_dir = os.path.join(self.__cwd, DIFF_DIR)
        os.makedirs(diff_dir, exist_ok=True)
        diff_files = list(map(lambda x: os.path.join(diff_dir, x), os.listdir(diff_dir)))
        last_num = 0
        for f in diff_files:
            number = f.split("_")[0]
            number = int(number) if number.isdigit() else last_num
            last_num = number

        with open("{}_{}.diff".format(last_num + 1, self.__user), 'w') as f:
            f.write(json.dumps(changes_dict))


    def pull(self):
        if "master" not in self.__rep.heads:
            self._create_master()

        remote_branches = []
        for remote_branch in self.__rep.git.branch("-r").split("\n")[1:]:
            remote_branches.append(remote_branch.split("/")[-1])

        if "master" in remote_branches:
            try:
                self.__rep.git.pull("origin", "master")
            except git.exc.GitError:
                self.reclone()


    def push(self):
        self.pull()
        if CVAT_USER in list(map(lambda x: x.name, self.__rep.heads)):
            git.Head.delete(self.__rep.heads[CVAT_USER].repo, self.__rep.heads[CVAT_USER])
        self.__rep.create_head(CVAT_USER)

        os.makedirs(os.path.join(self.__cwd, 'annotation'), exist_ok = True)
        with open(os.path.join(self.__cwd, 'annotation', 'SomeTask.dump'), 'w'):
            # create fake dump file
            pass

        self.__rep.index.add([os.path.join(self.__cwd, 'annotation', '*.dump')])
        self.__rep.git.push("origin", CVAT_USER, '--force')

        # merge all diffs and push it into README.md or any other place
        # notification


    def remote_status(self):
        diff_dir = os.path.join(self.__cwd, DIFF_DIR)
        os.makedirs(diff_dir, exist_ok=True)
        diffs = list(map(lambda x: os.path.join(diff_dir, x), os.listdir(diff_dir)))
        diffs = list(filter(lambda x: len(os.path.splitext(x)) > 1 and os.path.splitext(x)[1] == "diff", diffs))
        return "actual" if not len(diffs) else "obsolete"
