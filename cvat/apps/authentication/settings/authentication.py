# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from django.conf import settings
import rules
from . import AUTH_GROUP

settings.LOGIN_URL = 'login'
settings.LOGIN_REDIRECT_URL = '/'

settings.AUTHENTICATION_BACKENDS = [
    'rules.permissions.ObjectPermissionBackend',
    'django.contrib.auth.backends.ModelBackend'
]

DJANGO_AUTH_TYPE = 'LDAP' if os.environ.get('DJANGO_AUTH_TYPE', '') == 'LDAP' else 'SIMPLE'
if DJANGO_AUTH_TYPE == 'SIMPLE':
    from .auth_simple import create_user
elif DJANGO_AUTH_TYPE == 'LDAP':
    from .auth_ldap import create_user


has_admins_group = rules.is_group_member(AUTH_GROUP.ADMINS.value)
has_users_group = rules.is_group_member(AUTH_GROUP.USERS.value)
has_annotators_group = rules.is_group_member(AUTH_GROUP.ANNOTATORS.value)
has_observers_group = rules.is_group_member(AUTH_GROUP.OBSERVERS.value)

@rules.predicate
def is_task_owner(db_user, db_task):
    return db_task.owner == db_user

@rules.predicate
def is_task_assignee(db_user, db_task):
    return db_task.assignee == db_user

@rules.predicate
def is_task_annotator(db_user, db_task):
    db_segments = list(db_task.segment_set.prefetch_related('job_set__assignee').all())
    db_jobs = [db_job for db_segment in db_segments
        for db_job in db_segment.job_set.all()]
    return db_user in [db_job.assignee for db_job in db_jobs] + [db_task.assignee]

@rules.predicate
def is_job_owner(db_user, db_job):
    return db_user == db_job.segment.task.owner

@rules.predicate
def is_job_assignee(db_user, db_job):
    return db_user == db_job.assignee

@rules.predicate
def is_job_annotator(db_user, db_job):
    return db_user in [db_job.assignee, db_job.segment.task.assignee]


# Auth rules
rules.add_perm('engine.task.create', has_admins_group | has_users_group)
rules.add_perm('engine.task.access', has_admins_group | is_task_owner |
    has_observers_group | is_task_annotator)
rules.add_perm('engine.task.change', has_admins_group | is_task_owner |
    is_task_assignee)
rules.add_perm('engine.task.delete', has_admins_group | is_task_owner)

rules.add_perm('engine.job.access', has_admins_group | is_job_owner |
    has_observers_group | is_job_annotator)
rules.add_perm('engine.job.change', has_admins_group | is_job_owner |
    is_job_annotator)
