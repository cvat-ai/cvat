# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from .models import WebhookTypeChoice

def event_name(action, resource):
    return f"{action}:{resource}"

class Events:
    RESOURCES = {
        "project":      ["create", "update", "delete"],
        "task":         ["create", "update", "delete"],
        "issue":        ["create", "delete"], # TO-DO: implement issue_updated
        "comment":      ["create", "update", "delete"],
        "invitation":   ["create", "update", "delete"],
        "membership":   ["update", "delete"],
        "job":          ["update"],
        "organization": ["update"]
    }

    @classmethod
    def select(cls, resources):
        ret = set()
        for resource in resources:
            ret |= set(f"{event_name(action, resource)}" for action in cls.RESOURCES.get(resource, []))
        return ret


class EventTypeChoice:
    @classmethod
    def choices(cls):
        return sorted((val, val.upper()) for val in AllEvents.events)


class AllEvents:
    webhook_type = "all"
    events = list(
        set(
            event_name(action, resource)
            for resource, actions in Events.RESOURCES.items()
            for action in actions
        )
    )


class ProjectEvents:
    webhook_type = WebhookTypeChoice.PROJECT
    events = list(
        set((event_name("update", "project"),)) | Events.select(["job", "task", "issue", "comment"])
    )


class OrganizationEvents:
    webhook_type = WebhookTypeChoice.ORGANIZATION
    events = list(
        set((event_name("update", "organization"),))
        | Events.select(["membership", "invitation", "project"])
        | set(ProjectEvents.events)
    )
