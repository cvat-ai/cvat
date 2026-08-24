# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT


from .models import Event, EventGroup, WebhookTypeChoice
from .utils import REQUEST_COMPLETION_RESOURCES


def event_key(action: str, resource: str) -> str:
    return f"{action}:{resource}"


class Events:
    _RESOURCES: dict[tuple[str, EventGroup], list[str]] = {
        ("user", EventGroup(display_name="User")): ["create", "update", "delete"],
        ("project", EventGroup(display_name="Project")): ["create", "update", "delete"],
        ("task", EventGroup(display_name="Task")): ["create", "update", "delete"],
        ("job", EventGroup(display_name="Job")): ["create", "update", "delete"],
        ("issue", EventGroup(display_name="Issue")): ["create", "update", "delete"],
        ("comment", EventGroup(display_name="Comment")): ["create", "update", "delete"],
        ("organization", EventGroup(display_name="Organization")): ["create", "update", "delete"],
        ("invitation", EventGroup(display_name="Invitation")): ["create", "delete"],
        ("membership", EventGroup(display_name="Membership")): ["create", "update", "delete"],
        **{(resource, group): ["completed"] for resource, group in REQUEST_COMPLETION_RESOURCES},
    }

    @classmethod
    def as_list(cls) -> list[Event]:
        return [
            Event(action=action, resource=resource, group=group)
            for (resource, group), actions in cls._RESOURCES.items()
            for action in actions
        ]

    @classmethod
    def select_by_resources(cls, resources: list[str]) -> list[Event]:
        return [event for event in cls.as_list() if event.resource in resources]

    @classmethod
    def select_by_keys(cls, keys: list[str]) -> list[Event]:
        return [event for event in cls.as_list() if event.key in keys]


class EventKeyChoice:
    @classmethod
    def choices(cls):
        return sorted((event.key, event.key.upper()) for event in Events.as_list())


class ProjectEvents:
    webhook_type = WebhookTypeChoice.PROJECT
    events: list[Event] = [
        *Events.select_by_resources(
            [
                "task",
                "job",
                "label",
                "issue",
                "comment",
                *(resource for (resource, _) in REQUEST_COMPLETION_RESOURCES),
            ]
        ),
        *Events.select_by_keys(["update:project", "delete:project"]),
    ]


class OrganizationEvents:
    webhook_type = WebhookTypeChoice.ORGANIZATION
    events: list[Event] = [
        *Events.select_by_resources(
            resources=[
                "project",
                "task",
                "job",
                "issue",
                "comment",
                "invitation",
                "membership",
                *(resource for (resource, _) in REQUEST_COMPLETION_RESOURCES),
            ]
        ),
        *Events.select_by_keys(
            keys=[
                "update:organization",
            ]
        ),
    ]


class ServerEvents:
    webhook_type = WebhookTypeChoice.SERVER
    events: list[Event] = [
        *Events.select_by_resources(
            resources=[
                "user",
            ]
        ),
        *Events.select_by_keys(keys=["create:organization", "delete:organization"]),
    ]
