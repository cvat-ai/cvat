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
        "issue": ["create", "update", "delete"],
        "comment": ["create", "update", "delete"],
        "invitation": ["create", "delete"],  # TO-DO: implement invitation_updated,
        "membership": ["update", "delete"],
        "job": ["update"],
        "organization": ["update"],
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
    events = [event_name("update", "project")] \
        + Events.select(["job", "task", "issue", "comment"])


class OrganizationEvents:
    webhook_type = WebhookTypeChoice.ORGANIZATION
    events = [event_name("update", "organization")] \
        + Events.select(["membership", "invitation", "project"]) \
        + ProjectEvents.events
