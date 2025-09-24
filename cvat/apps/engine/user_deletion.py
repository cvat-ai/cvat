# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABC, abstractmethod
from typing import TypedDict

from django.db import transaction
from django.db.models import Count, Q, QuerySet

from cvat.apps.engine.model_utils import _ModelT
from cvat.apps.engine.models import CloudStorage, Project, Task, User
from cvat.apps.organizations.models import Organization

_USER_DELETION_VALIDATORS = []


class UserDeletionValidator(ABC):
    """
    Base class for user deletion validators.
    To add a new validator, inherit from this class and implement the `validate` method.
    Then call classmethod 'register_validator()' to enable the class as validator.
    """

    @classmethod
    def register_validator(cls):
        if cls not in _USER_DELETION_VALIDATORS:
            _USER_DELETION_VALIDATORS.append(cls)

    @abstractmethod
    def validate(self, user: User) -> None:
        """
        Perform validation before user deletion.

        If the user cannot be deleted, this method must raise
        rest_framework.exceptions.ValidationError with a description of the reason.
        """


class _DeletedResources(TypedDict):
    organization: list[int]
    project: list[int]
    task: list[int]
    cloud_storage: list[int]


@transaction.atomic
def delete_user_with_cleanup(user_id: int, dry_run: bool = True) -> _DeletedResources:
    """
    The function removes user and associated resources.

    It does not remove resources created in external organizations
    These resources are considered like "owned" by the organization
    as user has given control over them during creation.
    """

    deleted_resources: _DeletedResources = {
        "organization": [],
        "project": [],
        "task": [],
        "cloud_storage": [],
    }

    user = User.objects.select_for_update().get(pk=user_id)
    for ValidatorClass in _USER_DELETION_VALIDATORS:
        ValidatorClass().validate(user)

    db_orgs = (
        Organization.objects.filter(owner=user)
        .annotate(members_count=Count("members"))
        .filter(members_count__lt=2)
        .prefetch_related("members")
    )

    # The database schema allows a situation where Organization.owner
    # is not the same as the only member of the organization.
    # Therefore, we must explicitly check that the only member (if any) is the owner,
    # and handle cases where the organization has no members or inconsistent membership.
    db_orgs_to_delete = Organization.objects.filter(
        owner=user,
        id__in=[
            db_org.id
            for db_org in db_orgs
            if not db_org.members_count or db_org.members.first().user_id == user_id
        ],
    ).select_for_update()

    def filter_by_owner_and_org(queryset: QuerySet[_ModelT]) -> QuerySet[_ModelT]:
        return queryset.filter(owner=user).filter(
            Q(organization=None) | Q(organization__in=db_orgs_to_delete)
        )

    db_projects = list(filter_by_owner_and_org(Project.objects).select_for_update())
    db_tasks = list(filter_by_owner_and_org(Task.objects.filter(project=None)).select_for_update())
    db_cloud_storages = list(filter_by_owner_and_org(CloudStorage.objects).select_for_update())

    for resource_type, db_resources in (
        ("organization", db_orgs_to_delete),
        ("project", db_projects),
        ("task", db_tasks),
        ("cloud_storage", db_cloud_storages),
    ):
        for db_resource in db_resources:
            deleted_resources[resource_type].append(db_resource.id)

    if not dry_run:
        # call delete on each instance instead of qs.delete()
        # to perform custom .delete() method (e.g. query optimizations, audit logs) if any
        for db_resource in list(db_orgs_to_delete) + db_cloud_storages + db_projects + db_tasks:
            db_resource.delete()
        user.delete()

    return deleted_resources
