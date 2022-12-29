# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum, auto
from typing import Optional, cast
from rest_framework import exceptions

from attrs import define
from django.conf import settings

from cvat.apps.engine.models import CloudStorage, Project, Task
from cvat.apps.organizations.models import Membership, Organization
from cvat.apps.webhooks.models import Webhook

from cvat.apps.limit_manager.models import Limitation
from cvat.apps.limit_manager.serializers import (
    OrgLimitationWriteSerializer,
    UserLimitationWriteSerializer,
)


class Limits(Enum):
    """
    Represents a capability which has an upper limit, and can be consumed.

    Each capability is also supposed to have a separate CapabilityContext class,
    representing its parameters. Different parameter combinations should each have
    a different enum member, no member reuse is supposed for different limits.
    """

    # TODO: for a capability with N params, there are O(k^N)
    # possible limitation combinations. Not all are meaningful, but even though
    # it is quite a large number. Example:

    # A "task create" capability [user_id, org_id, project_id]
    # yields the following possible limitations:
    # - tasks from the user
    # - tasks from the user outside orgs
    # - tasks from the user inside orgs
    # - tasks from the user in the org
    # - tasks from the user in the project
    # - tasks in the org
    # - tasks in the org projects
    # ...
    #
    # Currently, we will cover all of this with a single request to the limit manager.
    # For each meaningful combination class a capability enum entry is supposed.

    USER_SANDBOX_TASKS = auto()
    USER_SANDBOX_PROJECTS = auto()
    TASKS_IN_USER_SANDBOX_PROJECT = auto()
    USER_OWNED_ORGS = auto()
    USER_SANDBOX_CLOUD_STORAGES = auto()
    USER_SANDBOX_PROJECT_WEBHOOKS = auto()
    USER_SANDBOX_LAMBDA_CALL_OFFLINE = auto()

    ORG_TASKS = auto()
    ORG_PROJECTS = auto()
    TASKS_IN_ORG_PROJECT = auto()
    ORG_CLOUD_STORAGES = auto()
    ORG_MEMBERS = auto()
    ORG_COMMON_WEBHOOKS = auto()
    ORG_PROJECT_WEBHOOKS = auto()
    ORG_LAMBDA_CALL_OFFLINE = auto()


class CapabilityContext:
    pass


@define(kw_only=True)
class UserCapabilityContext(CapabilityContext):
    user_id: int


@define(kw_only=True)
class OrgCapabilityContext(CapabilityContext):
    org_id: int


@define(kw_only=True)
class UserSandboxTasksContext(UserCapabilityContext):
    pass


@define(kw_only=True)
class OrgTasksContext(OrgCapabilityContext):
    pass


@define(kw_only=True)
class TasksInUserSandboxProjectContext(UserCapabilityContext):
    project_id: int


@define(kw_only=True)
class TasksInOrgProjectContext(OrgCapabilityContext):
    project_id: int


@define(kw_only=True)
class UserSandboxProjectsContext(UserCapabilityContext):
    pass


@define(kw_only=True)
class OrgProjectsContext(OrgCapabilityContext):
    pass


@define(kw_only=True)
class UserSandboxCloudStoragesContext(UserCapabilityContext):
    pass


@define(kw_only=True)
class OrgCloudStoragesContext(OrgCapabilityContext):
    pass


@define(kw_only=True)
class UserOrgsContext(UserCapabilityContext):
    pass


@define(kw_only=True)
class UserSandboxProjectWebhooksContext(UserCapabilityContext):
    project_id: int


@define(kw_only=True)
class OrgProjectWebhooksContext(OrgCapabilityContext):
    project_id: int


@define(kw_only=True)
class OrgMembersContext(OrgCapabilityContext):
    pass


@define(kw_only=True)
class OrgCommonWebhooksContext(OrgCapabilityContext):
    pass

@define(kw_only=True)
class UserSandboxLambdaCallOfflineContext(UserCapabilityContext):
    pass

@define(kw_only=True)
class OrgLambdaCallOfflineContext(OrgCapabilityContext):
    pass

@define(frozen=True)
class LimitStatus:
    used: Optional[int]
    max: Optional[int]


class LimitationManager:
    def __init__(self, context: CapabilityContext, instance: Optional[Limitation] = None) -> None:
        assert isinstance(context, CapabilityContext)

        org_id = getattr(context, "org_id", None)
        user_id = getattr(context, "user_id", None)
        assert (org_id is not None) ^ (user_id is not None)

        if instance is not None:
            assert instance.user_id == user_id
            assert instance.org_id == org_id

        if org_id:
            self._owner = {"org": org_id}
            self._serializer_class = OrgLimitationWriteSerializer
            mapping = settings.ORG_LIMITS_MAPPING
        else:
            self._owner = {"user": user_id}
            self._serializer_class = UserLimitationWriteSerializer
            mapping = settings.USER_LIMITS_MAPPING

        self._instance = instance
        self._default_limits = {
            display_limit_name: settings.DEFAULT_LIMITS[limit_name]
            for limit_name, display_limit_name in mapping.items()
        }

    @staticmethod
    def from_instance(instance: Limitation):
        context = UserCapabilityContext(user_id=instance.user_id)
        if instance.org_id is not None:
            context = OrgCapabilityContext(org_id=instance.org_id)
        return LimitationManager(context, instance=instance)

    def _create_default(self) -> Limitation:
        serializer = self._serializer_class(data={**self._owner, **self._default_limits})
        serializer.is_valid(raise_exception=True)
        self._instance = serializer.save()

        return self._instance

    def _get(self) -> Limitation:
        if self._instance is not None:
            return self._instance
        try:
            self._instance = Limitation.objects.get(**self._owner)
        except Limitation.DoesNotExist:
            raise exceptions.NotFound(f"Cannot find limitations with provided data: {self._owner}")

        return self._instance

    def update(self, data) -> dict:
        instance = self.get_or_create()
        serializer = self._serializer_class(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self._instance = serializer.save()
        return serializer.data

    def get_or_create(self) -> Limitation:
        try:
            self._get()
        except exceptions.NotFound:
            self._create_default()

        return self._instance


class LimitManager:
    def get_status(
        self,
        limit: Limits,
        *,
        context: Optional[CapabilityContext] = None,
    ) -> LimitStatus:

        limitation = LimitationManager(context).get_or_create()

        if limit == Limits.USER_OWNED_ORGS:
            assert context is not None
            context = cast(UserOrgsContext, context)

            return LimitStatus(
                Organization.objects.filter(owner_id=context.user_id).count(),
                limitation.organizations,
            )

        elif limit == Limits.USER_SANDBOX_PROJECTS:
            assert context is not None
            context = cast(UserSandboxProjectsContext, context)

            return LimitStatus(
                # TODO: check about active/removed projects
                Project.objects.filter(owner=context.user_id, organization=None).count(),
                limitation.projects
            )

        elif limit == Limits.ORG_PROJECTS:
            assert context is not None
            context = cast(OrgProjectsContext, context)

            return LimitStatus(
                # TODO: check about active/removed projects
                Project.objects.filter(organization=context.org_id).count(),
                limitation.projects
            )

        elif limit == Limits.USER_SANDBOX_TASKS:
            assert context is not None
            context = cast(UserSandboxTasksContext, context)

            return LimitStatus(
                # TODO: check about active/removed tasks
                Task.objects.filter(owner=context.user_id, organization=None).count(),
                limitation.tasks
            )

        elif limit == Limits.ORG_TASKS:
            assert context is not None
            context = cast(OrgTasksContext, context)

            return LimitStatus(
                # TODO: check about active/removed tasks
                Task.objects.filter(organization=context.org_id).count(),
                limitation.tasks
            )

        elif limit == Limits.TASKS_IN_USER_SANDBOX_PROJECT:
            assert context is not None
            context = cast(TasksInUserSandboxProjectContext, context)

            return LimitStatus(
                # TODO: check about active/removed tasks
                Task.objects.filter(project=context.project_id).count(),
                limitation.tasks_per_project
            )

        elif limit == Limits.TASKS_IN_ORG_PROJECT:
            assert context is not None
            context = cast(TasksInOrgProjectContext, context)

            return LimitStatus(
                # TODO: check about active/removed tasks
                Task.objects.filter(project=context.project_id).count(),
                limitation.tasks_per_project
            )

        elif limit in [Limits.USER_SANDBOX_PROJECT_WEBHOOKS, Limits.ORG_PROJECT_WEBHOOKS]:
            assert isinstance(context,
                (UserSandboxProjectWebhooksContext, OrgProjectWebhooksContext)
            )

            return LimitStatus(
                # We only limit webhooks per project, not per user
                # TODO: think over this limit, maybe we should limit per user
                Webhook.objects.filter(project=context.project_id).count(),
                limitation.webhooks_per_project
            )

        elif limit == Limits.ORG_COMMON_WEBHOOKS:
            assert context is not None
            context = cast(OrgCommonWebhooksContext, context)

            return LimitStatus(
                Webhook.objects.filter(organization=context.org_id, project=None).count(),
                limitation.webhooks_per_organization
            )

        elif limit == Limits.USER_SANDBOX_CLOUD_STORAGES:
            assert context is not None
            context = cast(UserSandboxCloudStoragesContext, context)

            return LimitStatus(
                CloudStorage.objects.filter(owner=context.user_id, organization=None).count(),
                limitation.cloud_storages
            )

        elif limit == Limits.ORG_CLOUD_STORAGES:
            assert context is not None
            context = cast(OrgCloudStoragesContext, context)

            return LimitStatus(
                CloudStorage.objects.filter(organization=context.org_id).count(),
                limitation.cloud_storages
            )

        elif limit == Limits.ORG_MEMBERS:
            assert context is not None
            context = cast(OrgMembersContext, context)

            return LimitStatus(
                Membership.objects.filter(organization=context.org_id).count(),
                limitation.memberships,
            )

        elif limit == Limits.USER_SANDBOX_LAMBDA_CALL_OFFLINE:
            assert context is not None
            context = cast(UserSandboxLambdaCallOfflineContext, context)

            return LimitStatus(
                0,
                limitation.lambda_requests
            )

        elif limit == Limits.ORG_LAMBDA_CALL_OFFLINE:
            assert context is not None
            context = cast(OrgLambdaCallOfflineContext, context)

            return LimitStatus(
                0,
                limitation.lambda_requests
            )


        raise NotImplementedError(f"Unknown capability {limit.name}")
