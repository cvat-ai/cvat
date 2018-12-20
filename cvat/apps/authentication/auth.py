# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
from django.conf import settings
import rules
from . import AUTH_ROLE

def register_signals():
    from django.db.models.signals import post_migrate, post_save
    from django.contrib.auth.models import User, Group

    def create_groups(sender, **kwargs):
        for role in AUTH_ROLE:
            db_group, _ = Group.objects.get_or_create(name=role)
            db_group.save()

    post_migrate.connect(create_groups, weak=False)

    if settings.DJANGO_AUTH_TYPE == 'BASIC':
        from .auth_basic import create_user

        post_save.connect(create_user, sender=User)
    elif settings.DJANGO_AUTH_TYPE == 'LDAP':
        import django_auth_ldap.backend
        from .auth_ldap import create_user

        django_auth_ldap.backend.populate_user.connect(create_user)

# AUTH PREDICATES
has_admin_role = rules.is_group_member(str(AUTH_ROLE.ADMIN))
has_user_role = rules.is_group_member(str(AUTH_ROLE.USER))
has_annotator_role = rules.is_group_member(str(AUTH_ROLE.ANNOTATOR))
has_observer_role = rules.is_group_member(str(AUTH_ROLE.OBSERVER))

@rules.predicate
def is_task_owner(db_user, db_task):
    # If owner is None (null) the task can be accessed/changed/deleted
    # only by admin. At the moment each task has an owner.
    return db_task.owner == db_user

@rules.predicate
def is_task_assignee(db_user, db_task):
    return db_task.assignee == db_user

@rules.predicate
def is_task_annotator(db_user, db_task):
    from functools import reduce

    db_segments = list(db_task.segment_set.prefetch_related('job_set__assignee').all())
    return any([is_job_annotator(db_user, db_job)
        for db_segment in db_segments for db_job in db_segment.job_set.all()])

@rules.predicate
def is_job_owner(db_user, db_job):
    return is_task_owner(db_user, db_job.segment.task)

@rules.predicate
def is_job_annotator(db_user, db_job):
    db_task = db_job.segment.task
    # A job can be annotated by any user if the task's assignee is None.
    has_rights = db_task.assignee is None or is_task_assignee(db_user, db_task)
    if db_job.assignee is not None:
        has_rights |= (db_user == db_job.assignee)

    return has_rights

# AUTH PERMISSIONS RULES
rules.add_perm('engine.task.create', has_admin_role | has_user_role)
rules.add_perm('engine.task.access', has_admin_role | has_observer_role |
    is_task_owner | is_task_annotator)
rules.add_perm('engine.task.change', has_admin_role | is_task_owner |
    is_task_assignee)
rules.add_perm('engine.task.delete', has_admin_role | is_task_owner)

rules.add_perm('engine.job.access', has_admin_role | has_observer_role |
    is_job_owner | is_job_annotator)
rules.add_perm('engine.job.change', has_admin_role | is_job_owner |
    is_job_annotator)
