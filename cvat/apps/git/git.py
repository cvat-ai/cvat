# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.db import transaction
from django.utils import timezone

from cvat.apps.engine.log import slogger
from cvat.apps.engine.models import Task, Job, User
from cvat.apps.engine.annotation import _dump as dump, FORMAT_XML
from cvat.apps.engine.plugins import add_plugin
from cvat.apps.git.models import GitStatusChoice

from cvat.apps.git.models import GitData
from collections import OrderedDict


import subprocess
import django_rq
import shutil
import json
import git
import os
import re
import rq

def _have_no_access_exception(ex):
    if 'Permission denied' in ex.stderr or 'Could not read from remote repository' in ex.stderr:
        keys = subprocess.run(['ssh-add -L'], shell = True,
            stdout = subprocess.PIPE).stdout.decode('utf-8').split('\n')
        keys = list(filter(len, list(map(lambda x: x.strip(), keys))))
        raise Exception(
            'Could not connect to the remote repository. ' +
            'Please make sure you have the correct access rights and the repository exists. ' +
            'Available public keys are: ' + str(keys)
        )
    else:
        raise ex


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
    __sync_date = None
    __lfs = None

    def __init__(self, db_git, tid, user):
        self.__db_git = db_git
        self.__url = db_git.url
        self.__path = db_git.path
        self.__tid = tid
        self.__user = {
            "name": user.username,
            "email": user.email or "dummy@cvat.com"
        }
        self.__cwd = os.path.join(os.getcwd(), "data", str(tid), "repos")
        self.__diffs_dir = os.path.join(os.getcwd(), "data", str(tid), "repos_diffs")
        self.__task_name = re.sub(r'[\\/*?:"<>|\s]', '_', Task.objects.get(pk = tid).name)[:100]
        self.__branch_name = 'cvat_{}_{}'.format(tid, self.__task_name)
        self.__annotation_file = os.path.join(self.__cwd, self.__path)
        self.__sync_date = db_git.sync_date
        self.__lfs = db_git.lfs


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
        if len(self.__rep.heads):
            raise Exception("Some heads already exists")
        readme_md_name = os.path.join(self.__cwd, "README.md")
        with open(readme_md_name, "w"):
            pass
        self.__rep.index.add([readme_md_name])
        self.__rep.index.commit("CVAT Annotation. Initial commit by {} at {}".format(self.__user["name"], timezone.now()))

        self.__rep.git.push("origin", "master")


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
                tmp_repo = os.path.abspath(os.path.join(self.__cwd, "..", "tmp_repo"))
                os.rename(self.__cwd, tmp_repo)

                # Try clone repository
                try:
                    self._clone()
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
        except git.exc.GitError:
            if wo_remote:
                raise Exception('Local repository is failed')
            slogger.task[self.__tid].info("Local repository initialization..")
            shutil.rmtree(self.__cwd, True)
            self._clone()


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

        # Initialize LFS if need
        if self.__lfs:
            updated = False
            lfs_settings = ["*.xml\tfilter=lfs diff=lfs merge=lfs -text\n", "*.zip\tfilter=lfs diff=lfs merge=lfs -text\n"]
            if not os.path.isfile(os.path.join(self.__cwd, ".gitattributes")):
                with open(os.path.join(self.__cwd, ".gitattributes"), "w") as gitattributes:
                    gitattributes.writelines(lfs_settings)
                    updated = True
            else:
                with open(os.path.join(self.__cwd, ".gitattributes"), "r+") as gitattributes:
                    lines = gitattributes.readlines()
                    for setting in lfs_settings:
                        if setting not in lines:
                            updated = True
                            lines.append(setting)
                    gitattributes.seek(0)
                    gitattributes.writelines(lines)
                    gitattributes.truncate()

            if updated:
                self.__rep.git.add(['.gitattributes'])

        # Dump an annotation
        dump(self.__tid, format, scheme, host, OrderedDict())
        dump_name = Task.objects.get(pk = self.__tid).get_dump_path()

        ext = os.path.splitext(self.__path)[1]
        if ext == '.zip':
            subprocess.call('zip -j -r "{}" "{}"'.format(self.__annotation_file, dump_name), shell=True)
        elif ext == '.xml':
            shutil.copyfile(dump_name, self.__annotation_file)
        else:
            raise Exception("Got unknown annotation file type")

        self.__rep.git.add(self.__annotation_file)

        # Merge diffs
        summary_diff = {}
        for diff_name in list(map(lambda x: os.path.join(self.__diffs_dir, x), os.listdir(self.__diffs_dir))):
            with open(diff_name, 'r') as f:
                diff = json.loads(f.read())
                _accumulate(diff, summary_diff, None)

        self.__rep.index.commit("CVAT Annotation updated by {}. Summary: {}".format(self.__user["name"], str(summary_diff)))
        self.__rep.git.push("origin", self.__branch_name, "--force")

        shutil.rmtree(self.__diffs_dir, True)


    # Method checks status of repository annotation
    def remote_status(self, last_save):
        # Check repository exists and archive exists
        if not os.path.isfile(self.__annotation_file) or last_save != self.__sync_date:
            return GitStatusChoice.NON_SYNCED
        else:
            self.__rep.git.update_ref('-d', 'refs/remotes/origin/{}'.format(self.__branch_name))
            self.__rep.git.remote('-v', 'update')

            last_hash = self.__rep.git.show_ref('refs/heads/{}'.format(self.__branch_name), '--hash')
            merge_base_hash = self.__rep.merge_base('refs/remotes/origin/master', self.__branch_name)[0].hexsha
            if last_hash == merge_base_hash:
                return GitStatusChoice.MERGED
            else:
                try:
                    self.__rep.git.show_ref('refs/remotes/origin/{}'.format(self.__branch_name), '--hash')
                    return GitStatusChoice.SYNCED
                except git.exc.GitCommandError:
                    # Remote branch has been deleted w/o merge
                    return GitStatusChoice.NON_SYNCED


def _initial_create(tid, params):
    if 'git_path' in params:
        try:
            job = rq.get_current_job()
            job.meta['status'] = 'Cloning a repository..'
            job.save_meta()

            user = params['owner']
            git_path = params['git_path']

            db_task = Task.objects.get(pk = tid)
            path_pattern = r"\[(.+)\]"
            path_search = re.search(path_pattern, git_path)
            path = None

            if path_search is not None:
                path = path_search.group(1)
                git_path = git_path[0:git_path.find(path) - 1].strip()
                path = os.path.join('/', path.strip())
            else:
                anno_file = re.sub(r'[\\/*?:"<>|\s]', '_', db_task.name)[:100]
                path = '/annotation/{}.zip'.format(anno_file)

            path = path[1:]
            _split = os.path.splitext(path)
            if len(_split) < 2 or _split[1] not in [".xml", ".zip"]:
                raise Exception("Only .xml and .zip formats are supported")

            db_git = GitData()
            db_git.url = git_path
            db_git.path = path
            db_git.task = db_task
            db_git.lfs = params["use_lfs"].lower() == "true"

            try:
                _git = Git(db_git, tid, user)
                _git.init_repos()
                db_git.save()
            except git.exc.GitCommandError as ex:
                _have_no_access_exception(ex)
        except Exception as ex:
            slogger.task[tid].exception('exception occured during git _initial_create', exc_info = True)
            raise ex


@transaction.atomic
def push(tid, user, scheme, host):
    try:
        db_task = Task.objects.get(pk = tid)
        db_git = GitData.objects.select_for_update().get(pk = db_task)
        try:
            _git = Git(db_git, tid, user)
            _git.init_repos()
            _git.push(scheme, host, FORMAT_XML, db_task.updated_date)

            # Update timestamp
            db_git.sync_date = db_task.updated_date
            db_git.status = GitStatusChoice.SYNCED
            db_git.save()
        except git.exc.GitCommandError as ex:
            _have_no_access_exception(ex)
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
        response['url']['value'] = '{} [{}]'.format(db_git.url, db_git.path)
        try:
            rq_id = "git.push.{}".format(tid)
            queue = django_rq.get_queue('default')
            rq_job = queue.fetch_job(rq_id)
            if rq_job is not None and (rq_job.is_queued or rq_job.is_started):
                db_git.status = GitStatusChoice.SYNCING
                response['status']['value'] = str(db_git.status)
            else:
                try:
                    _git = Git(db_git, tid, user)
                    _git.init_repos(True)
                    db_git.status = _git.remote_status(db_task.updated_date)
                    response['status']['value'] = str(db_git.status)
                except git.exc.GitCommandError as ex:
                    _have_no_access_exception(ex)
        except Exception as ex:
            db_git.status = GitStatusChoice.NON_SYNCED
            response['status']['error'] = str(ex)

    db_git.save()
    return response

def update_states():
    db_git_records = GitData.objects.all()
    db_user = User.objects.first()
    if db_user is None:
        # User hasn't been created yet
        return

    for db_git in db_git_records:
        try:
            get(db_git.task_id, db_user)
        except Exception:
            slogger.glob("Exception occured during a status updating for db_git with tid: {}".format(db_git.task_id))

@transaction.atomic
def _onsave(jid, data):
    db_task = Job.objects.select_related('segment__task').get(pk = jid).segment.task
    try:
        db_git = GitData.objects.select_for_update().get(pk = db_task.id)
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

            db_git.status = GitStatusChoice.NON_SYNCED
            db_git.save()

    except GitData.DoesNotExist:
        pass

def _ondump(tid, data_format, scheme, host, plugin_meta_data):
    db_task = Task.objects.get(pk = tid)
    try:
        db_git = GitData.objects.get(pk = db_task)
        plugin_meta_data['git'] = OrderedDict({
            "url": db_git.url,
            "path": db_git.path,
        })
    except GitData.DoesNotExist:
        pass

add_plugin("save_job", _onsave, "after", exc_ok = False)
add_plugin("_create_thread", _initial_create, "before", exc_ok = False)
add_plugin("_dump", _ondump, "before", exc_ok = False)
