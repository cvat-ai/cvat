# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import json
from collections import defaultdict
from copy import deepcopy

import pytest

from shared.utils.config import ASSETS_DIR


class Container:
    def __init__(self, data, key="id"):
        self.raw_data = data
        self.map_data = {obj[key]: obj for obj in data}

    @property
    def raw(self):
        return self.raw_data

    @property
    def map(self):
        return self.map_data

    def __iter__(self):
        return iter(self.raw_data)

    def __len__(self):
        return len(self.raw_data)

    def __getitem__(self, key):
        if isinstance(key, slice):
            return self.raw_data[key]
        return self.map_data[key]


@pytest.fixture(scope="session")
def users():
    with open(ASSETS_DIR / "users.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def organizations():
    with open(ASSETS_DIR / "organizations.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def memberships():
    with open(ASSETS_DIR / "memberships.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def tasks():
    with open(ASSETS_DIR / "tasks.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def tasks_wlc(labels, tasks):  # tasks with labels count
    tasks = deepcopy(tasks)
    tasks_by_project = defaultdict(list)
    for task in tasks:
        tasks_by_project[task["project_id"]].append(task)
        task["labels"]["count"] = 0

    for label in labels:
        task_id = label.get("task_id")
        project_id = label.get("project_id")
        if not label["parent_id"]:
            if task_id:
                tasks[task_id]["labels"]["count"] += 1
            elif project_id:
                for task in tasks_by_project[project_id]:
                    task["labels"]["count"] += 1

    return tasks


@pytest.fixture(scope="session")
def projects():
    with open(ASSETS_DIR / "projects.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def projects_wlc(projects, labels):  # projects with labels count
    projects = deepcopy(projects)
    for project in projects:
        project["labels"]["count"] = 0

    for label in labels:
        project_id = label.get("project_id")
        if not label["parent_id"] and project_id:
            projects[project_id]["labels"]["count"] += 1

    return projects


@pytest.fixture(scope="session")
def jobs():
    with open(ASSETS_DIR / "jobs.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def jobs_wlc(jobs, tasks_wlc):  # jobs with labels count
    jobs = deepcopy(jobs)
    for job in jobs:
        tid = job["task_id"]
        job["labels"]["count"] = tasks_wlc[tid]["labels"]["count"]
    return jobs


@pytest.fixture(scope="session")
def invitations():
    with open(ASSETS_DIR / "invitations.json") as f:
        return Container(json.load(f)["results"], key="key")


@pytest.fixture(scope="session")
def annotations():
    with open(ASSETS_DIR / "annotations.json") as f:
        return json.load(f)


@pytest.fixture(scope="session")
def cloud_storages():
    with open(ASSETS_DIR / "cloudstorages.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def issues():
    with open(ASSETS_DIR / "issues.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def comments():
    with open(ASSETS_DIR / "comments.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def webhooks():
    with open(ASSETS_DIR / "webhooks.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def labels():
    with open(ASSETS_DIR / "labels.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def quality_reports():
    with open(ASSETS_DIR / "quality_reports.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def quality_conflicts():
    with open(ASSETS_DIR / "quality_conflicts.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def quality_settings():
    with open(ASSETS_DIR / "quality_settings.json") as f:
        return Container(json.load(f)["results"])


@pytest.fixture(scope="session")
def users_by_name(users):
    return {user["username"]: user for user in users}


@pytest.fixture(scope="session")
def jobs_by_org(tasks, jobs):
    data = {}
    for job in jobs:
        data.setdefault(tasks[job["task_id"]]["organization"], []).append(job)
    data[""] = data.pop(None, [])
    return data


@pytest.fixture(scope="session")
def projects_by_org(projects):
    data = {}
    for project in projects:
        data.setdefault(project["organization"], []).append(project)
    data[""] = data.pop(None, [])
    return data


@pytest.fixture(scope="session")
def tasks_by_org(tasks):
    data = {}
    for task in tasks:
        data.setdefault(task["organization"], []).append(task)
    data[""] = data.pop(None, [])
    return data


@pytest.fixture(scope="session")
def issues_by_org(tasks, jobs, issues):
    data = {}
    for issue in issues:
        data.setdefault(tasks[jobs[issue["job"]]["task_id"]]["organization"], []).append(issue)
    data[""] = data.pop(None, [])
    return data


@pytest.fixture(scope="session")
def assignee_id():
    def get_id(data):
        if data.get("assignee") is not None:
            return data["assignee"]["id"]

    return get_id


def ownership(func):
    def wrap(user_id, resource_id):
        if resource_id is None:
            return False
        return func(user_id, resource_id)

    return wrap


@pytest.fixture(scope="session")
def is_project_staff(projects, assignee_id):
    @ownership
    def check(user_id, pid):
        return user_id == projects[pid]["owner"]["id"] or user_id == assignee_id(projects[pid])

    return check


@pytest.fixture(scope="session")
def is_task_staff(tasks, is_project_staff, assignee_id):
    @ownership
    def check(user_id, tid):
        return (
            user_id == tasks[tid]["owner"]["id"]
            or user_id == assignee_id(tasks[tid])
            or is_project_staff(user_id, tasks[tid]["project_id"])
        )

    return check


@pytest.fixture(scope="session")
def is_job_staff(jobs, is_task_staff, assignee_id):
    @ownership
    def check(user_id, jid):
        return user_id == assignee_id(jobs[jid]) or is_task_staff(user_id, jobs[jid]["task_id"])

    return check


@pytest.fixture(scope="session")
def is_issue_staff(issues, jobs, assignee_id):
    @ownership
    def check(user_id, issue_id):
        return (
            user_id == issues[issue_id]["owner"]["id"]
            or user_id == assignee_id(issues[issue_id])
            or user_id == assignee_id(jobs[issues[issue_id]["job"]])
        )

    return check


@pytest.fixture(scope="session")
def is_issue_admin(issues, jobs, is_task_staff):
    @ownership
    def check(user_id, issue_id):
        return is_task_staff(user_id, jobs[issues[issue_id]["job"]]["task_id"])

    return check


@pytest.fixture(scope="session")
def find_users(test_db):
    def find(**kwargs):
        assert len(kwargs) > 0
        assert any(kwargs.values())

        data = test_db
        kwargs = dict(filter(lambda a: a[1] is not None, kwargs.items()))
        for field, value in kwargs.items():
            if field.startswith("exclude_"):
                field = field.split("_", maxsplit=1)[1]
                exclude_rows = set(v["id"] for v in filter(lambda a: a[field] == value, test_db))
                data = list(filter(lambda a: a["id"] not in exclude_rows, data))
            else:
                data = list(filter(lambda a: a[field] == value, data))

        return data

    return find


@pytest.fixture(scope="session")
def test_db(users, users_by_name, memberships):
    data = []
    fields = ["username", "id", "privilege", "role", "org", "membership_id"]

    def add_row(**kwargs):
        data.append({field: kwargs.get(field) for field in fields})

    for user in users:
        for group in user["groups"]:
            add_row(username=user["username"], id=user["id"], privilege=group)

    for membership in memberships:
        username = membership["user"]["username"]
        for group in users_by_name[username]["groups"]:
            add_row(
                username=username,
                role=membership["role"],
                privilege=group,
                id=membership["user"]["id"],
                org=membership["organization"],
                membership_id=membership["id"],
            )

    return data


@pytest.fixture(scope="session")
def org_staff(memberships):
    def find(org_id):
        if org_id in ["", None]:
            return set()
        else:
            return set(
                m["user"]["id"]
                for m in memberships
                if m["role"] in ["maintainer", "owner"]
                and m["user"] is not None
                and m["organization"] == org_id
            )

    return find


@pytest.fixture(scope="session")
def is_org_member(memberships):
    def check(user_id, org_id, *, role=None):
        if org_id in ["", None]:
            return True
        else:
            return user_id in set(
                m["user"]["id"]
                for m in memberships
                if m["user"] is not None
                if m["organization"] == org_id
                if not role or m["role"] == role
            )

    return check


@pytest.fixture(scope="session")
def find_job_staff_user(is_job_staff):
    def find(jobs, users, is_staff, wo_jobs=None):
        for job in jobs:
            if wo_jobs is not None and job["id"] in wo_jobs:
                continue
            for user in users:
                if is_staff == is_job_staff(user["id"], job["id"]):
                    return user["username"], job["id"]
        return None, None

    return find


@pytest.fixture(scope="session")
def find_task_staff_user(is_task_staff):
    def find(tasks, users, is_staff, wo_tasks=None):
        for task in tasks:
            if wo_tasks is not None and task["id"] in wo_tasks:
                continue
            for user in users:
                if is_staff == is_task_staff(user["id"], task["id"]):
                    return user["username"], task["id"]
        return None, None

    return find


@pytest.fixture(scope="session")
def find_issue_staff_user(is_issue_staff, is_issue_admin):
    def find(issues, users, is_staff, is_admin):
        for issue in issues:
            for user in users:
                i_admin, i_staff = (
                    is_issue_admin(user["id"], issue["id"]),
                    is_issue_staff(user["id"], issue["id"]),
                )
                if (is_admin is None and (i_staff or i_admin) == is_staff) or (
                    is_admin == i_admin and is_staff == i_staff
                ):
                    return user["username"], issue["id"]
        return None, None

    return find


@pytest.fixture(scope="session")
def filter_jobs_with_shapes(annotations):
    def find(jobs):
        return list(filter(lambda j: annotations["job"].get(str(j["id"]), {}).get("shapes"), jobs))

    return find


@pytest.fixture(scope="session")
def filter_tasks_with_shapes(annotations):
    def find(tasks):
        return list(
            filter(lambda t: annotations["task"].get(str(t["id"]), {}).get("shapes"), tasks)
        )

    return find


@pytest.fixture(scope="session")
def jobs_with_shapes(jobs, filter_jobs_with_shapes):
    return filter_jobs_with_shapes(jobs)


@pytest.fixture(scope="session")
def tasks_with_shapes(tasks, filter_tasks_with_shapes):
    return filter_tasks_with_shapes(tasks)


@pytest.fixture(scope="session")
def admin_user(users):
    for user in users:
        if user["is_superuser"] and user["is_active"]:
            return user["username"]
    raise Exception("Can't find any admin user in the test DB")


@pytest.fixture(scope="session")
def regular_user(users):
    for user in users:
        if not user["is_superuser"] and user["is_active"]:
            return user["username"]
    raise Exception("Can't find any regular user in the test DB")


@pytest.fixture(scope="session")
def regular_lonely_user(users):
    for user in users:
        if user["username"] == "lonely_user":
            return user["username"]
    raise Exception("Can't find the lonely user in the test DB")
