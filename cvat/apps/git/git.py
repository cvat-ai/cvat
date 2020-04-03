# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.db import transaction
from django.utils import timezone

from cvat.apps.engine.log import slogger
from cvat.apps.engine.models import Task, Job, User
from cvat.apps.engine.annotation import dump_task_data
from cvat.apps.engine.plugins import add_plugin
from cvat.apps.git.models import GitStatusChoice
from cvat.apps.annotation.models import AnnotationDumper

from cvat.apps.git.models import GitData
from collections import OrderedDict

import subprocess
import django_rq
import datetime
import shutil
import json
import math
import git
import os
import re


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


def _read_old_diffs(diff_dir, summary):
    diff_files = list(map(lambda x: os.path.join(diff_dir, x), os.listdir(diff_dir)))
    for diff_file in diff_files:
        diff_file = open(diff_file, 'r')
        diff = json.loads(diff_file.read())

        for action_key in diff:
            summary[action_key] += sum([diff[action_key][key] for key in diff[action_key]])



class Git:
    def __init__(self, db_git, tid, user):
        self._db_git = db_git
        self._url = db_git.url
        self._path = db_git.path
        self._tid = tid
        self._user = {
            "name": user.username,
            "email": user.email or "dummy@cvat.com"
        }
        self._cwd = os.path.join(os.getcwd(), "data", str(tid), "repos")
        self._diffs_dir = os.path.join(os.getcwd(), "data", str(tid), "repos_diffs_v2")
        self._task_mode = Task.objects.get(pk = tid).mode
        self._task_name = re.sub(r'[\\/*?:"<>|\s]', '_', Task.objects.get(pk = tid).name)[:100]
        self._branch_name = 'cvat_{}_{}'.format(tid, self._task_name)
        self._annotation_file = os.path.join(self._cwd, self._path)
        self._sync_date = db_git.sync_date
        self._lfs = db_git.lfs


    # Method parses an got URL.
    # SSH: git@github.com/proj/repos[.git]
    # HTTP/HTTPS: [http://]github.com/proj/repos[.git]
    def _parse_url(self):
        try:
            # Almost STD66 (RFC3986), but schema can include a leading digit
            # Reference on URL formats accepted by Git:
            # https://github.com/git/git/blob/77bd3ea9f54f1584147b594abc04c26ca516d987/url.c

            host_pattern = r"((?:(?:(?:\d{1,3}\.){3}\d{1,3})|(?:[a-zA-Z0-9._-]+.[a-zA-Z]+))(?::\d+)?)"
            http_pattern = r"(?:http[s]?://)?" + host_pattern + r"((?:/[a-zA-Z0-9._-]+){2})"
            ssh_pattern = r"([a-zA-Z0-9._-]+)@" + host_pattern + r":([a-zA-Z0-9._-]+)/([a-zA-Z0-9._-]+)"

            http_match = re.match(http_pattern, self._url)
            ssh_match = re.match(ssh_pattern, self._url)

            user = "git"
            host = None
            repos = None

            if http_match:
                host = http_match.group(1)
                repos = http_match.group(2)[1:]
            elif ssh_match:
                user = ssh_match.group(1)
                host = ssh_match.group(2)
                repos = "{}/{}".format(ssh_match.group(3), ssh_match.group(4))
            else:
                raise Exception("Git repository URL does not satisfy pattern")

            if not repos.endswith(".git"):
                repos += ".git"

            return user, host, repos
        except Exception as ex:
            slogger.glob.exception('URL parsing errors occurred', exc_info = True)
            raise ex


    # Method creates the main branch if repostory doesn't have any branches
    def _create_master_branch(self):
        if len(self._rep.heads):
            raise Exception("Some heads already exists")
        readme_md_name = os.path.join(self._cwd, "README.md")
        with open(readme_md_name, "w"):
            pass
        self._rep.index.add([readme_md_name])
        self._rep.index.commit("CVAT Annotation. Initial commit by {} at {}".format(self._user["name"], timezone.now()))

        self._rep.git.push("origin", "master")


    # Method creates task branch for repository from current master
    def _to_task_branch(self):
        # Remove user branch from local repository if it exists
        if self._branch_name not in list(map(lambda x: x.name, self._rep.heads)):
            self._rep.create_head(self._branch_name)

        self._rep.head.reference = self._rep.heads[self._branch_name]


    # Method setups a config file for current user
    def _update_config(self):
        slogger.task[self._tid].info("User config initialization..")
        with self._rep.config_writer() as cw:
            if not cw.has_section("user"):
                cw.add_section("user")
            cw.set("user", "name", self._user["name"])
            cw.set("user", "email", self._user["email"])
            cw.release()

    # Method initializes repos. It setup configuration, creates master branch if need and checkouts to task branch
    def _configurate(self):
        self._update_config()
        if not len(self._rep.heads):
            self._create_master_branch()
        self._to_task_branch()
        os.makedirs(self._diffs_dir, exist_ok = True)


    def _ssh_url(self):
        user, host, repos = self._parse_url()
        return "{}@{}:{}".format(user, host, repos)


    # Method clones a remote repos to the local storage using SSH and initializes it
    def _clone(self):
        os.makedirs(self._cwd)
        ssh_url = self._ssh_url()

        # Cloning
        slogger.task[self._tid].info("Cloning remote repository from {}..".format(ssh_url))
        self._rep = git.Repo.clone_from(ssh_url, self._cwd)

        # Intitialization
        self._configurate()


    # Method is some wrapper for clone
    # It restores state if any errors have occured
    # It useful if merge conflicts have occured during pull
    def _reclone(self):
        if os.path.exists(self._cwd):
            if not os.path.isdir(self._cwd):
                os.remove(self._cwd)
            else:
                # Rename current repository dir
                tmp_repo = os.path.abspath(os.path.join(self._cwd, "..", "tmp_repo"))
                os.rename(self._cwd, tmp_repo)

                # Try clone repository
                try:
                    self._clone()
                    shutil.rmtree(tmp_repo, True)
                except Exception as ex:
                    # Restore state if any errors have occured
                    if os.path.isdir(self._cwd):
                        shutil.rmtree(self._cwd, True)
                    os.rename(tmp_repo, self._cwd)
                    raise ex
        else:
            self._clone()


    # Method checkouts to master branch and pulls it from remote repos
    def _pull(self):
        self._rep.head.reference = self._rep.heads["master"]
        try:
            self._rep.git.pull("origin", "master")

            if self._branch_name in list(map(lambda x: x.name, self._rep.heads)):
                self._rep.head.reference = self._rep.heads["master"]
                self._rep.delete_head(self._branch_name, force=True)
                self._rep.head.reset("HEAD", index=True, working_tree=True)

            self._to_task_branch()
        except git.exc.GitError:
            # Merge conflicts
            self._reclone()


    # Method connects a local repository if it exists
    # Otherwise it clones it before
    def init_repos(self, wo_remote = False):
        try:
            # Try to use a local repos. It can throw GitError exception
            self._rep = git.Repo(self._cwd)
            self._configurate()

            # Check if remote URL is actual
            if self._ssh_url() != self._rep.git.remote('get-url', '--all', 'origin'):
                slogger.task[self._tid].info("Local repository URL is obsolete.")
                # We need reinitialize repository if it's false
                raise git.exc.GitError("Actual and saved repository URLs aren't match")
        except git.exc.GitError:
            if wo_remote:
                raise Exception('Local repository is failed')
            slogger.task[self._tid].info("Local repository initialization..")
            shutil.rmtree(self._cwd, True)
            self._clone()


    # Method prepares an annotation, merges diffs and pushes it to remote repository to user branch
    def push(self, user, scheme, host, db_task, last_save):
        # Update local repository
        self._pull()

        os.makedirs(os.path.join(self._cwd, os.path.dirname(self._annotation_file)), exist_ok = True)
        # Remove old annotation file if it exists
        if os.path.exists(self._annotation_file):
            os.remove(self._annotation_file)

        # Initialize LFS if need
        if self._lfs:
            updated = False
            lfs_settings = ["*.xml\tfilter=lfs diff=lfs merge=lfs -text\n", "*.zip\tfilter=lfs diff=lfs merge=lfs -text\n"]
            if not os.path.isfile(os.path.join(self._cwd, ".gitattributes")):
                with open(os.path.join(self._cwd, ".gitattributes"), "w") as gitattributes:
                    gitattributes.writelines(lfs_settings)
                    updated = True
            else:
                with open(os.path.join(self._cwd, ".gitattributes"), "r+") as gitattributes:
                    lines = gitattributes.readlines()
                    for setting in lfs_settings:
                        if setting not in lines:
                            updated = True
                            lines.append(setting)
                    gitattributes.seek(0)
                    gitattributes.writelines(lines)
                    gitattributes.truncate()

            if updated:
                self._rep.git.add(['.gitattributes'])

        # Dump an annotation
        timestamp = datetime.datetime.now().strftime("%Y_%m_%d_%H_%M_%S")
        display_name = "CVAT XML 1.1"
        display_name += " for images" if self._task_mode == "annotation" else " for videos"
        cvat_dumper = AnnotationDumper.objects.get(display_name=display_name)
        dump_name = os.path.join(db_task.get_task_dirname(),
            "git_annotation_{}.xml".format(timestamp))
        dump_task_data(
            pk=self._tid,
            user=user,
            filename=dump_name,
            dumper=cvat_dumper,
            scheme=scheme,
            host=host,
        )

        ext = os.path.splitext(self._path)[1]
        if ext == '.zip':
            subprocess.run(args=['7z', 'a', self._annotation_file, dump_name])
        elif ext == '.xml':
            shutil.copyfile(dump_name, self._annotation_file)
        else:
            raise Exception("Got unknown annotation file type")

        os.remove(dump_name)
        self._rep.git.add(self._annotation_file)

        # Merge diffs
        summary_diff = {
            "update": 0,
            "create": 0,
            "delete": 0
        }

        old_diffs_dir = os.path.join(os.path.dirname(self._diffs_dir), 'repos_diffs')
        if (os.path.isdir(old_diffs_dir)):
            _read_old_diffs(old_diffs_dir, summary_diff)

        for diff_name in list(map(lambda x: os.path.join(self._diffs_dir, x), os.listdir(self._diffs_dir))):
            with open(diff_name, 'r') as f:
                diff = json.loads(f.read())
                for key in diff:
                    summary_diff[key] += diff[key]

        message = "CVAT Annotation updated by {}. \n".format(self._user["name"])
        message += 'Task URL: {}://{}/dashboard?id={}\n'.format(scheme, host, db_task.id)
        if db_task.bug_tracker:
            message += 'Bug Tracker URL: {}\n'.format(db_task.bug_tracker)
        message += "Created: {}, updated: {}, deleted: {}\n".format(
            summary_diff["create"],
            summary_diff["update"],
            summary_diff["delete"]
        )
        message += "Annotation time: {} hours\n".format(math.ceil((last_save - self._sync_date).total_seconds() / 3600))
        message += "Total annotation time: {} hours".format(math.ceil((last_save - db_task.created_date).total_seconds() / 3600))

        self._rep.index.commit(message)
        self._rep.git.push("origin", self._branch_name, "--force")

        shutil.rmtree(old_diffs_dir, True)
        shutil.rmtree(self._diffs_dir, True)


    # Method checks status of repository annotation
    def remote_status(self, last_save):
        # Check repository exists and archive exists
        if not os.path.isfile(self._annotation_file) or last_save != self._sync_date:
            return GitStatusChoice.NON_SYNCED
        else:
            self._rep.git.update_ref('-d', 'refs/remotes/origin/{}'.format(self._branch_name))
            self._rep.git.remote('-v', 'update')

            last_hash = self._rep.git.show_ref('refs/heads/{}'.format(self._branch_name), '--hash')
            merge_base_hash = self._rep.merge_base('refs/remotes/origin/master', self._branch_name)[0].hexsha
            if last_hash == merge_base_hash:
                return GitStatusChoice.MERGED
            else:
                try:
                    self._rep.git.show_ref('refs/remotes/origin/{}'.format(self._branch_name), '--hash')
                    return GitStatusChoice.SYNCED
                except git.exc.GitCommandError:
                    # Remote branch has been deleted w/o merge
                    return GitStatusChoice.NON_SYNCED


def initial_create(tid, git_path, lfs, user):
    try:
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
        db_git.lfs = lfs

        try:
            _git = Git(db_git, tid, db_task.owner)
            _git.init_repos()
            db_git.save()
        except git.exc.GitCommandError as ex:
            _have_no_access_exception(ex)
    except Exception as ex:
        slogger.task[tid].exception('exception occured during git initial_create', exc_info = True)
        raise ex


@transaction.atomic
def push(tid, user, scheme, host):
    try:
        db_task = Task.objects.get(pk = tid)
        db_git = GitData.objects.select_for_update().get(pk = db_task)
        try:
            _git = Git(db_git, tid, user)
            _git.init_repos()
            _git.push(user, scheme, host, db_task, db_task.updated_date)

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
            db_git.save()
        except Exception as ex:
            db_git.status = GitStatusChoice.NON_SYNCED
            db_git.save()
            response['status']['error'] = str(ex)

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
def _onsave(jid, user, data, action):
    db_task = Job.objects.select_related('segment__task').get(pk = jid).segment.task
    try:
        db_git = GitData.objects.select_for_update().get(pk = db_task.id)
        diff_dir = os.path.join(os.getcwd(), "data", str(db_task.id), "repos_diffs")
        diff_dir_v2 = os.path.join(os.getcwd(), "data", str(db_task.id), "repos_diffs_v2")

        summary = {
            "update": 0,
            "create": 0,
            "delete": 0
        }

        if os.path.isdir(diff_dir):
            _read_old_diffs(diff_dir, summary)
            shutil.rmtree(diff_dir, True)

        os.makedirs(diff_dir_v2, exist_ok = True)

        summary[action] += sum([len(data[key]) for key in ['shapes', 'tracks', 'tags']])

        if summary["update"] or summary["create"] or summary["delete"]:
            diff_files = list(map(lambda x: os.path.join(diff_dir_v2, x), os.listdir(diff_dir_v2)))
            last_num = 0
            for f in diff_files:
                number = os.path.splitext(os.path.basename(f))[0]
                number = int(number) if number.isdigit() else last_num
                last_num = max(last_num, number)

            with open(os.path.join(diff_dir_v2, "{}.diff".format(last_num + 1)), 'w') as f:
                f.write(json.dumps(summary))

            db_git.status = GitStatusChoice.NON_SYNCED
            db_git.save()

    except GitData.DoesNotExist:
        pass

def _ondump(tid, user, data_format, scheme, host, plugin_meta_data):
    db_task = Task.objects.get(pk = tid)
    try:
        db_git = GitData.objects.get(pk = db_task)
        plugin_meta_data['git'] = OrderedDict({
            "url": db_git.url,
            "path": db_git.path,
        })
    except GitData.DoesNotExist:
        pass

add_plugin("patch_job_data", _onsave, "after", exc_ok = False)

# TODO: Append git repository into dump file
# add_plugin("_dump", _ondump, "before", exc_ok = False)
