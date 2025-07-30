# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABC, ABCMeta, abstractmethod
from dataclasses import dataclass
from typing import TypedDict

from django.db import transaction
from django.db.models import Count, Max, Q, QuerySet
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.models import CloudStorage, Project, Task, User
from cvat.apps.organizations.models import Organization

_USER_DELETION_VALIDATORS = []


class AutoRegisterValidatorMeta(ABCMeta):
    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        if not getattr(cls, "__abstractmethods__", None):
            _USER_DELETION_VALIDATORS.append(cls)
        return cls


class UserDeletionValidator(ABC, metaclass=AutoRegisterValidatorMeta):
    """
    Base class for user deletion validators.
    To add a new validator, inherit from this class and implement the `validate` method.
    The implemented class will be automatically registered and used during user deletion.
    """

    @abstractmethod
    def validate(self, user: User) -> None:
        """
        Perform validation before user deletion.

        If the user cannot be deleted, this method must raise
        rest_framework.exceptions.ValidationError with a description of the reason.
        """


class NonEmptyOrgsValidator(UserDeletionValidator):
    def validate(self, user: User) -> None:
        max_members = (
            Organization.objects.filter(owner=user)
            .annotate(members_count=Count("members"))
            .aggregate(max_members=Coalesce(Max("members_count"), 0))["max_members"]
        )

        if max_members > 1:
            raise ValidationError(
                "Cannot delete a user who is the owner of an organization with multiple members."
            )


class _DeletedResources(TypedDict):
    organization: list[int]
    project: list[int]
    task: list[int]
    cloud_storage: list[int]


@dataclass
class UserDeletionManager:
    user: User

    @transaction.atomic
    def delete_user_with_cleanup(self, dry_run=True) -> _DeletedResources:
        """
        The method removes user and associated resources.

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

        for ValidatorClass in _USER_DELETION_VALIDATORS:
            ValidatorClass().validate(self.user)

        db_orgs = Organization.objects.select_for_update().filter(owner=self.user)

        def filter_by_owner_and_org(queryset: QuerySet) -> QuerySet:
            return queryset.filter(owner=self.user).filter(
                Q(organization=None) | Q(organization__in=db_orgs)
            )

        db_projects = list(filter_by_owner_and_org(Project.objects).select_for_update())
        db_tasks = list(
            filter_by_owner_and_org(Task.objects.filter(project=None)).select_for_update()
        )
        db_cloud_storages = filter_by_owner_and_org(CloudStorage.objects).select_for_update()

        for resource_type, db_resources in (
            ("organization", db_orgs),
            ("project", db_projects),
            ("task", db_tasks),
            ("cloud_storage", db_cloud_storages),
        ):
            for db_resource in db_resources:
                deleted_resources[resource_type].append(db_resource.id)

        if not dry_run:
            db_orgs.delete()
            db_cloud_storages.delete()
            # for projects and tasks
            # call delete on each instance instead of qs.delete()
            # to perform custom .delete() method (e.g. query optimizations, audit logs)
            for db_project_or_task in db_projects + db_tasks:
                db_project_or_task.delete()
            self.user.delete()

        return deleted_resources
