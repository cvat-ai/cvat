# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum, auto
from typing import Optional, cast

from attrs import define

from cvat.apps.engine.models import CloudStorage, Project, Task
from cvat.apps.organizations.models import Organization
from cvat.apps.webhooks.models import Webhook


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

    ORG_TASKS = auto()
    ORG_PROJECTS = auto()
    TASKS_IN_ORG_PROJECT = auto()
    ORG_CLOUD_STORAGES = auto()
    ORG_COMMON_WEBHOOKS = auto()

    PROJECT_WEBHOOKS = auto()

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
class ProjectWebhooksContext(CapabilityContext):
    project_id: int

@define(kw_only=True)
class OrgCommonWebhooksContext(OrgCapabilityContext):
    pass


@define(frozen=True)
class LimitStatus:
    used: Optional[int]
    max: Optional[int]

class LimitManager:
    def get_status(self,
        limit: Limits, *,
        context: Optional[CapabilityContext] = None,
    ) -> LimitStatus:
        if limit == Limits.USER_OWNED_ORGS:
            assert context is not None
            context = cast(UserOrgsContext, context)

            return (
                Organization.objects.filter(owner_id=context.user_id).count(),
                1
            )

        elif limit == Limits.USER_SANDBOX_PROJECTS:
            assert context is not None
            context = cast(UserSandboxProjectsContext, context)

            return (
                # TODO: check about active/removed projects
                Project.objects.filter(owner=context.user_id, organization=None).count(),
                5
            )

        elif limit == Limits.ORG_PROJECTS:
            assert context is not None
            context = cast(OrgProjectsContext, context)

            return (
                # TODO: check about active/removed projects
                Project.objects.filter(organization=context.org_id).count(),
                5
            )

        elif limit == Limits.USER_SANDBOX_TASKS:
            assert context is not None
            context = cast(UserSandboxTasksContext, context)

            return (
                # TODO: check about active/removed tasks
                Task.objects.filter(owner=context.user_id, organization=None).count(),
                10
            )

        elif limit == Limits.ORG_TASKS:
            assert context is not None
            context = cast(OrgTasksContext, context)

            return (
                # TODO: check about active/removed tasks
                Task.objects.filter(organization=context.org_id).count(),
                10
            )

        elif limit == Limits.TASKS_IN_USER_SANDBOX_PROJECT:
            assert context is not None
            context = cast(TasksInUserSandboxProjectContext, context)

            return (
                # TODO: check about active/removed tasks
                Task.objects.filter(project=context.project_id).count(),
                5
            )

        elif limit == Limits.TASKS_IN_ORG_PROJECT:
            assert context is not None
            context = cast(TasksInOrgProjectContext, context)

            return (
                # TODO: check about active/removed tasks
                Task.objects.filter(project=context.project_id).count(),
                5
            )

        elif limit == Limits.PROJECT_WEBHOOKS:
            assert context is not None
            context = cast(ProjectWebhooksContext, context)

            return (
                # We only limit webhooks per project, not per user
                # TODO: think over this limit, maybe we should limit per user
                Webhook.objects.filter(project=context.project_id).count(),
                10
            )

        elif limit == Limits.ORG_COMMON_WEBHOOKS:
            assert context is not None
            context = cast(OrgCommonWebhooksContext, context)

            return (
                Webhook.objects.filter(organization=context.org_id, project=None).count(),
                20
            )

        elif limit == Limits.USER_SANDBOX_CLOUD_STORAGES:
            assert context is not None
            context = cast(UserSandboxCloudStoragesContext, context)

            return (
                CloudStorage.objects.filter(owner=context.user_id, organization=None).count(),
                10
            )

        elif limit == Limits.ORG_CLOUD_STORAGES:
            assert context is not None
            context = cast(OrgCloudStoragesContext, context)

            return (
                CloudStorage.objects.filter(organization=context.org_id).count(),
                10
            )

        raise NotImplementedError(f"Unknown capability {limit.name}")
