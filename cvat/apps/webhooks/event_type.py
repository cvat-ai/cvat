# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from cvat.apps.webhooks.schemas import EventDTO, EventGroupDTO

from .models import WebhookTypeChoice
from .utils import REQUEST_COMPLETION_RESOURCES


def event_key(action: str, resource: str) -> str:
    return f"{action}:{resource}"


class Events:
    RESOURCES: dict[tuple[str, EventGroupDTO], list[str]] = {
        ("project", EventGroupDTO(display_name="Project")): ["create", "update", "delete"],
        ("task", EventGroupDTO(display_name="Task")): ["create", "update", "delete"],
        ("job", EventGroupDTO(display_name="Job")): ["create", "update", "delete"],
        ("issue", EventGroupDTO(display_name="Issue")): ["create", "update", "delete"],
        ("comment", EventGroupDTO(display_name="Comment")): ["create", "update", "delete"],
        ("organization", EventGroupDTO(display_name="Organization")): ["update"],
        ("invitation", EventGroupDTO(display_name="Invitation")): ["create", "delete"],
        ("membership", EventGroupDTO(display_name="Membership")): ["create", "update", "delete"],
        **{(resource, group): ["completed"] for resource, group in REQUEST_COMPLETION_RESOURCES},
    }

    @classmethod
    def select(cls, resources: list[str]) -> list[EventDTO]:
        result: list[EventDTO] = []

        for (resource, group), actions in cls.RESOURCES.items():
            if resource in resources:
                for action in actions:
                    result.append(
                        EventDTO(
                            action=action,
                            resource=resource,
                            group=group,
                        )
                    )

        return result


class EventKeyChoice:
    @classmethod
    def choices(cls):
        return sorted((val.key, val.key.upper()) for val in AllEvents.events)


class AllEvents:
    webhook_type = "all"
    events: list[EventDTO] = list(
        EventDTO(
            resource=resource,
            group=group,
            action=action,
        )
        for (resource, group), actions in Events.RESOURCES.items()
        for action in actions
    )


class ProjectEvents:
    webhook_type = WebhookTypeChoice.PROJECT
    events: list[EventDTO] = [
        *Events.select(
            [
                "task",
                "job",
                "label",
                "issue",
                "comment",
                *(resource for (resource, _) in REQUEST_COMPLETION_RESOURCES),
            ]
        ),
        EventDTO(
            action="update",
            group=EventGroupDTO(display_name="Project"),
            resource="project",
        ),
        EventDTO(
            action="delete",
            group=EventGroupDTO(display_name="Project"),
            resource="project",
        ),
    ]


class OrganizationEvents:
    webhook_type = WebhookTypeChoice.ORGANIZATION
    events: list[EventDTO] = AllEvents.events
