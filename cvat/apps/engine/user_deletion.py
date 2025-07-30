# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from abc import ABC, ABCMeta, abstractmethod
from dataclasses import dataclass

from django.db import transaction
from django.db.models import Count, Max
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError

from cvat.apps.engine.log import ServerLogManager
from cvat.apps.engine.models import CloudStorage, Project, Task, User
from cvat.apps.organizations.models import Organization

_slogger = ServerLogManager(__name__)
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


@dataclass
class UserDeletionManager:
    user: User

    @transaction.atomic
    def delete_user_with_cleanup(self, dry_run=True) -> None:
        """
        The method removes user and associated resources.

        It does not remove resources created in external organizations
        These resources are considered like "owned" by the organization
        as user has given control over them during creation.
        """
        _slogger.glob.info(f"Deleting the user #{self.user.id} {self.user.username}...")

        for ValidatorClass in _USER_DELETION_VALIDATORS:
            ValidatorClass().validate(self.user)

        db_orgs = Organization.objects.filter(owner=self.user)
        db_projects = Project.objects.select_for_update().filter(owner=self.user, organization=None)
        db_tasks = Task.objects.select_for_update().filter(owner=self.user, organization=None)
        db_cloud_storages = CloudStorage.objects.filter(owner=self.user, organization=None)

        for db_org in db_orgs:
            _slogger.glob.warning(
                f"\tUser organization #{db_org.id} {db_org.slug} will be deleted."
            )

        for db_project in db_projects:
            _slogger.glob.warning(f"\tUser project #{db_project.id} will be deleted.")

        for db_task in db_tasks:
            _slogger.glob.warning(f"\tUser task #{db_task.id} will be deleted.")

        db_cloud_storages = CloudStorage.objects.filter(owner=self.user, organization=None)
        for db_cloud_storage in db_cloud_storages:
            _slogger.glob.warning(f"\tUser cloud storage #{db_cloud_storage.id} will be deleted.")

        if not dry_run:
            db_orgs.delete()
            for db_project in db_projects:
                # call delete on each instance instead of qs.delete() to perform custom .delete() method
                db_project.delete()
            for db_task in db_tasks:
                # call delete on each instance instead of qs.delete() to perform custom .delete() method
                db_task.delete()
            db_cloud_storages.delete()
            self.user.delete()

        _slogger.glob.warning(f"User #{self.user.id} has been deleted.")
