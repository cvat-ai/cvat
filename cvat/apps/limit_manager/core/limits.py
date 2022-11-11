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
    PROJECT_CREATE = auto()
    ORG_CREATE = auto()
    CLOUD_STORAGE_CREATE = auto()
    WEBHOOK_CREATE = auto()

class CapabilityContext:
    pass

@define
class TaskCreateContext(CapabilityContext):
    project_id: Optional[int] = None

@define
class WebhookCreateContext(CapabilityContext):
    project_id: Optional[int] = None

ConsumableLimit = Optional[int]

class LimitManager:
    def get_used_resources(self,
        capability: ConsumableCapability, *,
        user_id: Optional[int] = None,
        org_id: Optional[int] = None,
        context: Optional[CapabilityContext] = None,
    ) -> ConsumableLimit:
        return self._get_limits(capability=capability,
            user_id=user_id, org_id=org_id, context=context)[0]

    def get_limits(self, capability: ConsumableCapability, *,
        user_id: Optional[int] = None,
        org_id: Optional[int] = None,
        context: Optional[CapabilityContext] = None,
    ) -> ConsumableLimit:
        return self._get_limits(capability=capability,
            user_id=user_id, org_id=org_id, context=context)[1]

    def _get_limits(self, capability: ConsumableCapability, *,
        user_id: Optional[int] = None,
        org_id: Optional[int] = None,
        context: Optional[CapabilityContext] = None,
    ) -> Tuple[ConsumableLimit, ConsumableLimit]:
        if user_id and org_id:
            raise ValueError("user_id or org_id arguments cannot be used together")
        if not user_id and not org_id:
            raise ValueError("At least one of the user_id and org_id arguments must be provided")

        if capability == ConsumableCapability.ORG_CREATE:
            assert user_id
            return (
                Organization.objects.filter(owner_id=user_id).count(),
                1
            )

        elif capability == ConsumableCapability.PROJECT_CREATE:
            # The context doesn't affect results -
            # we limit task count in total, independently of project
            return (
                Project.objects.filter(owner=user_id, organization=org_id).count(),
                5
            )

        elif capability == ConsumableCapability.TASK_CREATE:
            return (
                Task.objects.filter(owner=user_id, organization=org_id).count(),
                10
            )

        elif capability == ConsumableCapability.WEBHOOK_CREATE:
            context = cast(WebhookCreateContext, context) if context else None
            if context and context.project_id is not None:
                # We only limit webhooks per project
                return (
                    Webhook.objects.filter(project=context.project_id).count(),
                    10
                )
            else:
                return (
                    Webhook.objects.filter(organization=org_id, project=None).count(),
                    20
                )

        elif capability == ConsumableCapability.CLOUD_STORAGE_CREATE:
            return (
                CloudStorage.objects.filter(owner=user_id, organization=org_id).count(),
                10
            )

        raise NotImplementedError(f"Unknown capability {capability.name}")
