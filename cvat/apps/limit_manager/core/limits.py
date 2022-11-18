# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from enum import Enum, auto
from typing import Optional, Tuple, cast

from attrs import define

from cvat.apps.engine.models import CloudStorage, Project, Task
from cvat.apps.organizations.models import Organization
from cvat.apps.webhooks.models import Webhook


class ConsumableCapability(str, Enum):
    TASK_CREATE = auto()
    TASK_CREATE_IN_PROJECT = auto()
    PROJECT_CREATE = auto()
    ORG_CREATE = auto()
    CLOUD_STORAGE_CREATE = auto()
    WEBHOOK_CREATE = auto()

class CapabilityContext:
    # TODO: for a capability with N params, there are O(k^N)
    # possible limitation combinations. Not all are meaningful, but even though
    # it is quite a large number. Example:
    #
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
    pass

@define(kw_only=True)
class UserCapabilityContext(CapabilityContext):
    user_id: Optional[int] = None

@define(kw_only=True)
class OrgCapabilityContext(CapabilityContext):
    org_id: Optional[int] = None

@define(kw_only=True)
class TaskCreateContext(UserCapabilityContext, OrgCapabilityContext):
    pass

@define(kw_only=True)
class TaskCreateInProjectContext(TaskCreateContext):
    project_id: int = None

@define(kw_only=True)
class ProjectCreateContext(UserCapabilityContext, OrgCapabilityContext):
    pass

@define(kw_only=True)
class CloudStorageCreateContext(UserCapabilityContext, OrgCapabilityContext):
    pass

@define(kw_only=True)
class OrgCreateContext(UserCapabilityContext):
    pass

@define(kw_only=True)
class WebhookCreateContext(UserCapabilityContext, OrgCapabilityContext):
    project_id: Optional[int] = None

ConsumableLimit = Optional[int]

@define(frozen=True)
class CapabilityStatus:
    used: ConsumableLimit
    max: ConsumableLimit

class LimitManager:
    def get_status(self,
        capability: ConsumableCapability, *,
        context: Optional[CapabilityContext] = None,
    ) -> CapabilityStatus:
        if capability == ConsumableCapability.ORG_CREATE:
            assert context is not None
            context = cast(OrgCreateContext, context)
            if context.user_id is None:
                raise ValueError("user_id must be provided")

            return (
                Organization.objects.filter(owner_id=context.user_id).count(),
                1
            )

        elif capability == ConsumableCapability.PROJECT_CREATE:
            assert context is not None
            context = cast(ProjectCreateContext, context)
            if context.user_id is None and context.org_id is None:
                raise ValueError("user_id and/or org_id must be provided")

            return (
                Project.objects.filter(
                    owner=context.user_id,
                    organization=context.org_id
                ).count(),
                5 if context.org_id is not None else None
            )

        elif capability == ConsumableCapability.TASK_CREATE:
            assert context is not None
            context = cast(TaskCreateContext, context)
            if context.user_id is None and context.org_id is None:
                raise ValueError("user_id and/or org_id must be provided")

            return (
                Task.objects.filter(
                    owner=context.user_id,
                    organization=context.org_id
                ).count(),
                10 if context.org_id is not None else None
            )

        elif capability == ConsumableCapability.TASK_CREATE_IN_PROJECT:
            assert context is not None
            context = cast(TaskCreateInProjectContext, context)
            if context.user_id is None and context.org_id is None:
                raise ValueError("user_id and/or org_id must be provided")

            return (
                # TODO: find the correct filter
                Task.objects.filter(
                    owner=context.user_id,
                    organization=context.org_id,
                    project=context.project_id,
                ).count(),
                5 if context.org_id is not None else 5
            )

        elif capability == ConsumableCapability.WEBHOOK_CREATE:
            assert context is not None
            context = cast(WebhookCreateContext, context)
            if context.user_id is None and context.org_id is None:
                raise ValueError("user_id and/or org_id must be provided")

            if context.project_id is not None:
                # We only limit webhooks per project, not per user
                # TODO: think over this limit, maybe we should limit per user
                return (
                    Webhook.objects.filter(project=context.project_id).count(),
                    10
                )
            else:
                return (
                    Webhook.objects.filter(organization=context.org_id, project=None).count(),
                    20
                )

        elif capability == ConsumableCapability.CLOUD_STORAGE_CREATE:
            assert context is not None
            context = cast(CloudStorageCreateContext, context)
            if context.user_id is None and context.org_id is None:
                raise ValueError("user_id and/or org_id must be provided")

            return (
                CloudStorage.objects.filter(
                    owner=context.user_id,
                    organization=context.org_id
                ).count(),
                10
            )

        raise NotImplementedError(f"Unknown capability {capability.name}")
