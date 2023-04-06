# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from .models import WebhookTypeChoice


def event_name(action, resource):
    return f"{action}:{resource}"


class Events:
    RESOURCES = {
        "project": ["create", "update", "delete"],
        "task": ["create", "update", "delete"],
        "job": ["create", "update", "delete"],
        "issue": ["create", "update", "delete"],
        "comment": ["create", "update", "delete"],
        "organization": ["update", "delete"],
        "invitation": ["create", "delete"],
        "membership": ["create", "update", "delete"],
    }

    @classmethod
    def select(cls, resources):
        return [
            f"{event_name(action, resource)}"
            for resource in resources
            for action in cls.RESOURCES.get(resource, [])
        ]


class EventTypeChoice:
    @classmethod
    def choices(cls):
        return sorted((val, val.upper()) for val in AllEvents.events)


class AllEvents:
    webhook_type = "all"
    events = list(
        event_name(action, resource)
        for resource, actions in Events.RESOURCES.items()
        for action in actions
    )


class ProjectEvents:
    webhook_type = WebhookTypeChoice.PROJECT
    events = [*Events.select(["task", "job", "label", "issue", "comment"]), event_name("update", "project"), event_name("delete", "project")]


class OrganizationEvents:
    webhook_type = WebhookTypeChoice.ORGANIZATION
    events = AllEvents.events
