# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from .models import Event, EventGroup, WebhookTypeChoice
from .utils import REQUEST_COMPLETION_RESOURCES


def event_key(action: str, resource: str) -> str:
    return f"{action}:{resource}"


class Events:
    _RESOURCES: dict[tuple[str, EventGroup], list[str]] = {
        ("project", EventGroup(display_name="Project")): ["create", "update", "delete"],
        ("task", EventGroup(display_name="Task")): ["create", "update", "delete"],
        ("job", EventGroup(display_name="Job")): ["create", "update", "delete"],
        ("issue", EventGroup(display_name="Issue")): ["create", "update", "delete"],
        ("comment", EventGroup(display_name="Comment")): ["create", "update", "delete"],
        ("organization", EventGroup(display_name="Organization")): ["update"],
        ("invitation", EventGroup(display_name="Invitation")): ["create", "delete"],
        ("membership", EventGroup(display_name="Membership")): ["create", "update", "delete"],
        **{(resource, group): ["completed"] for resource, group in REQUEST_COMPLETION_RESOURCES},
    }

    @classmethod
    def select(cls, resources: list[str]) -> list[Event]:
        result: list[Event] = []

        for (resource, group), actions in cls._RESOURCES.items():
            if resource in resources:
                for action in actions:
                    result.append(
                        Event(
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
    events: list[Event] = list(
        Event(
            resource=resource,
            group=group,
            action=action,
        )
        for (resource, group), actions in Events._RESOURCES.items()
        for action in actions
    )


class ProjectEvents:
    webhook_type = WebhookTypeChoice.PROJECT
    events: list[Event] = [
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
        Event(
            action="update",
            group=EventGroup(display_name="Project"),
            resource="project",
        ),
        Event(
            action="delete",
            group=EventGroup(display_name="Project"),
            resource="project",
        ),
    ]


class OrganizationEvents:
    webhook_type = WebhookTypeChoice.ORGANIZATION
    events: list[Event] = AllEvents.events
