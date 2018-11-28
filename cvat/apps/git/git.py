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

import subprocess
import datetime
import shutil
import json
import git
import os
import re
import rq


class Git:
    __url = None
    __path = None
    __tid = None
    __task_name = None
    __branch_name = None
    __user = None
    __cwd = None
    __rep = None
    __diffs_dir = None
    __annotation_file = None
    __changelog_file = None


    def __init__(self, url, path, tid, user):
        self.__url = url
        self.__path = path
        self.__tid = tid
        self.__user = {
            "name": user.username,
            "email": user.email or "dummy@email.com"
        }
        self.__cwd = os.path.join(os.getcwd(), "data", str(tid), "repos")
        self.__diffs_dir = os.path.join(os.getcwd(), "data", str(tid), "repos_diffs")
        self.__task_name = re.sub(r'[\\/*?:"<>|\s]', '_', Task.objects.get(pk = tid).name)[:100]
        self.__branch_name = 'cvat_{}_{}'.format(tid, self.__task_name)
        self.__annotation_file = os.path.join(self.__cwd, self.__path)
        self.__changelog_file = os.path.join(self.__cwd, os.path.dirname(self.__path), 'changelog_{}_{}.diff'.format(tid, self.__task_name))


    # Method parses an got URL.
    # SSH: git@github.com/proj/repos[.git]
    # HTTP/HTTPS: [http://]github.com/proj/repos[.git]
    def _parse_url(self):
        try:
            http_pattern = "([https|http]+)*[://]*([a-zA-Z0-9._-]+.[a-zA-Z]+)/([a-zA-Z0-9._-]+)/([a-zA-Z0-9._-]+)"
            ssh_pattern = "([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+):([a-zA-Z0-9._-]+)/([a-zA-Z0-9._-]+)"

            http_match = re.match(http_pattern, self.__url)
            ssh_match = re.match(ssh_pattern, self.__url)

            user = "git"
            host = None
            repos = None

            if http_match:
                host = http_match.group(2)
                repos = "{}/{}".format(http_match.group(3), http_match.group(4))
            elif ssh_match:
                user = ssh_match.group(1)
                host = ssh_match.group(2)
                repos = "{}/{}".format(ssh_match.group(3), ssh_match.group(4))
            else:
                raise Exception("Got URL doesn't sutisfy for regular expression")

            if not repos.endswith(".git"):
                repos += ".git"

            return user, host, repos
        except Exception as ex:
            slogger.glob.exception('URL parsing errors occured', exc_info = True)
            raise ex


    # Method creates the main branch if repostory doesn't have any branches
    def _create_master_branch(self):
        assert not len(self.__rep.heads)
        readme_md_name = os.path.join(self.__cwd, "README.md")
        with open(readme_md_name, "w"):
            pass
        self.__rep.index.add([readme_md_name])
        self.__rep.index.commit("CVAT Annotation. Initial commit by {} at {}".format(self.__user["name"], datetime.datetime.now()))

        try:
            self.__rep.git.push("origin", "master")
        except git.exc.GitError:
            slogger.task[self.__tid].warning("Remote repository doesn't contain any " +
                "heads but 'master' branch push process has been failed", exc_info = True)


    # Method creates task branch for repository from current master
    def _to_task_branch(self):
        # Remove user branch from local repository if it exists
        if self.__branch_name not in list(map(lambda x: x.name, self.__rep.heads)):
            self.__rep.create_head(self.__branch_name)

        self.__rep.head.reference = self.__rep.heads[self.__branch_name]


    # Method setups a config file for current user
    def _update_config(self):
        slogger.task[self.__tid].info("User config initialization..")
        with self.__rep.config_writer() as cw:
            if not cw.has_section("user"):
                cw.add_section("user")
            cw.set("user", "name", self.__user["name"])
            cw.set("user", "email", self.__user["email"])
            cw.release()


    # Method configurates and checks SSH for remote repository
    def _init_host(self):
        user, host = self._parse_url()[:-1]
        check_command = 'ssh-keygen -F {} | grep "Host {} found"'.format(host, host)
        add_command = 'ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -q {}@{}'.format(user, host)
        if not len(subprocess.run([check_command], shell = True, stdout = subprocess.PIPE).stdout):
            proc = subprocess.run([add_command], shell = True, stdout = subprocess.PIPE, stderr = subprocess.PIPE)
            stderr = proc.stderr.decode('utf-8')[:-2]
            if proc.returncode > 1:
                raise Exception('Failed ssh connection. {}'.format(stderr))
            slogger.glob.info('Host {} has been added to known_hosts.'.format(host))

        return self


    # Method initializes repos. It setup configuration, creates master branch if need and checkouts to task branch
    def _configurate(self):
        self._update_config()
        if not len(self.__rep.heads):
            self._create_master_branch()
        self._to_task_branch()
        os.makedirs(self.__diffs_dir, exist_ok = True)



    def _ssh_url(self):
        user, host, repos = self._parse_url()
        return "{}@{}:{}".format(user, host, repos)


    # Method clones a remote repos to the local storage using SSH and initializes it
    def _clone(self):
        os.makedirs(self.__cwd)
        ssh_url = self._ssh_url()

        # Cloning
        slogger.task[self.__tid].info("Cloning remote repository from {}..".format(ssh_url))
        self._init_host()
        self.__rep = git.Repo.clone_from(ssh_url, self.__cwd)

        # Intitialization
        self._configurate()


    # Method is some wrapper for clone
    # It restores state if any errors have occured
    # It useful if merge conflicts have occured during pull
    def _reclone(self):
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
        else:
            self._clone()


    # Method checkouts to master branch and pulls it from remote repos
    def _pull(self):
        self.__rep.head.reference = self.__rep.heads["master"]
        try:
            self._init_host()
            self.__rep.git.pull("origin", "master")

            if self.__branch_name in list(map(lambda x: x.name, self.__rep.heads)):
                self.__rep.head.reference = self.__rep.heads["master"]
                self.__rep.delete_head(self.__branch_name, force=True)
                self.__rep.head.reset("HEAD", index=True, working_tree=True)

            self._to_task_branch()
        except git.exc.GitError:
            # Merge conflicts
            self._reclone()


    # Method connects a local repository if it exists
    # Otherwise it clones it before
    def init_repos(self, wo_remote = False):
        try:
            # Try to use a local repos. It can throw GitError exception
            self.__rep = git.Repo(self.__cwd)
            self._configurate()

            # Check if remote URL is actual
            if self._ssh_url() != self.__rep.git.remote('get-url', '--all', 'origin'):
                slogger.task[self.__tid].info("Local repository URL is obsolete.")
                # We need reinitialize repository if it's false
                raise git.exc.GitError("Actual and saved repository URLs aren't match")
            return self
        except git.exc.GitError as ex:
            if wo_remote:
                raise ex

        slogger.task[self.__tid].info("Local repository initialization..")
        shutil.rmtree(self.__cwd, True)
        self._clone()
        return self


    # Method prepares an annotation, merges diffs and pushes it to remote repository to user branch
    def push(self, scheme, host, format, last_save):

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
        self._pull()

        os.makedirs(os.path.join(self.__cwd, os.path.dirname(self.__annotation_file)), exist_ok = True)
        # Remove old annotation file if it exists
        if os.path.exists(self.__annotation_file):
            os.remove(self.__annotation_file)

        # Dump an annotation
        dump(self.__tid, format, scheme, host)
        dump_name = Task.objects.get(pk = self.__tid).get_dump_path()

        ext = os.path.splitext(self.__path)[1]
        if ext == '.zip':
            subprocess.call('zip -j -r "{}" "{}"'.format(self.__annotation_file, dump_name), shell=True)
        elif ext == '.xml':
            shutil.copyfile(dump_name, self.__annotation_file)
        else:
            raise Exception("Got unknown annotation file type")

        # Setup LFS for *.zip files
        self.__rep.git.lfs("track", self.__path)
        self.__rep.git.add(self.__annotation_file)

        # Merge diffs
        summary_diff = {}
        for diff_name in list(map(lambda x: os.path.join(self.__diffs_dir, x), os.listdir(self.__diffs_dir))):
            with open(diff_name, 'r') as f:
                diff = json.loads(f.read())
                _accumulate(diff, summary_diff, None)

        summary_diff["timestamp"] = str(last_save)

        # Save merged diffs file
        old_changes = []

        if os.path.isfile(self.__changelog_file):
            with open(self.__changelog_file, 'r') as f:
                try:
                    old_changes = json.loads(f.read())
                except json.decoder.JSONDecodeError:
                    pass

        old_changes.append(summary_diff)
        with open(self.__changelog_file, 'w') as f:
            f.write(json.dumps(old_changes, sort_keys = True, indent = 4))

        # Commit and push
        self.__rep.index.add([
            '.gitattributes',
            self.__changelog_file
        ])
        self.__rep.index.commit("CVAT Annotation. Annotation updated by {} at {}".format(self.__user["name"], datetime.datetime.now()))

        self._init_host()
        self.__rep.git.push("origin", self.__branch_name, "--force")

        shutil.rmtree(self.__diffs_dir, True)


    # Method checks status of repository annotation
    def remote_status(self, last_save):
        # Check repository exists and archive exists
        if not os.path.isfile(self.__annotation_file) or not os.path.isfile(self.__changelog_file):
            return "empty"
        else:
            with open(self.__changelog_file, 'r') as f:
                try:
                    data = json.loads(f.read())
                    last_push = data[-1]["timestamp"]
                    last_push = parse_datetime(last_push)
                    if last_save != last_push:
                        return "!sync"
                    else:
                        self.__rep.git.remote('-v', 'update')
                        last_hash = self.__rep.git.show_ref('refs/heads/{}'.format(self.__branch_name), '--hash')
                        merge_base_hash = self.__rep.merge_base('refs/remotes/origin/master', self.__branch_name)[0].hexsha
                        if last_hash == merge_base_hash:
                            return "merged"
                        else:
                            return "sync"

                except json.decoder.JSONDecodeError:
                    raise Exception("Bad local repository.")


def _initial_create(tid, params):
    if 'git_url' in params:
        try:
            job = rq.get_current_job()
            job.meta['status'] = 'Cloning a repository..'
            job.save_meta()

            user = params['owner']
            url = params['git_url']
            path = '/annotation/annotation.zip'
            if 'git_path' in params:
                path = params['git_path']
                path = os.path.join('/', path)

            path = path[1:]
            _split = os.path.splitext(path)
            if len(_split) < 2 or _split[1] not in [".xml", ".zip"]:
                raise Exception("Only .xml and .zip formats are supported")

            Git(url, path, tid, user).init_repos()

            db_git = GitData()
            db_git.url = url
            db_git.path = path
            db_git.task = Task.objects.get(pk = tid)
            db_git.save()
        except Exception as ex:
            slogger.task[tid].exception('exception occured during git _initial_create', exc_info = True)
            raise ex


@transaction.atomic
def push(tid, user, scheme, host):
    try:
        db_task = Task.objects.get(pk = tid)
        db_git = GitData.objects.select_for_update().get(pk = db_task)
        Git(db_git.url, db_git.path, tid, user).init_repos().push(scheme, host, FORMAT_XML, db_task.updated_date)
    except Exception as ex:
        slogger.task[tid].exception('push to remote repository errors occured', exc_info = True)
        raise ex


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
            response['status']['value'] = Git(db_git.url, db_git.path, tid, user).init_repos(True).remote_status(db_task.updated_date)
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
    except GitData.DoesNotExist:
        pass


add_plugin("save_job", onsave, "after", exc_ok = False)
add_plugin("_create_thread", _initial_create, "before", exc_ok = False)
