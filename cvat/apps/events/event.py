# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from rest_framework.renderers import JSONRenderer
from datetime import datetime, timezone

def event_scope(action, resource):
    return f"{action}:{resource}"


class EventScopes:
    RESOURCES = {
        "project": ["create", "update", "delete"],
        "task": ["create", "update", "delete"],
        "job": ["create", "update", "delete"],
        "organization": ["create", "update", "delete"],
        "user": ["create", "update", "delete"],
        "cloudstorage": ["create", "update", "delete"],
        "issue": ["create", "update", "delete"],
        "comment": ["create", "update", "delete"],
        "annotations": ["create", "update", "delete"],
        "label": ["create", "update", "delete"],
    }

    @classmethod
    def select(cls, resources):
        return [
            f"{event_scope(action, resource)}"
            for resource in resources
            for action in cls.RESOURCES.get(resource, [])
        ]

def create_event(scope,
    source,
    **kwargs):
    payload = kwargs.pop('payload', {})
    timestamp = kwargs.pop('timestamp', str(datetime.now(timezone.utc).timestamp()))

    data = {
        "scope": scope,
        "timestamp": timestamp,
        "source": source,
        **kwargs,
    }
    if payload:
        data["payload"] = JSONRenderer().render(payload).decode('UTF-8')

    return data

class EventScopeChoice:
    @classmethod
    def choices(cls):
        return sorted((val, val.upper()) for val in AllEvents.events)

class AllEvents:
    events = list(
        event_scope(action, resource)
        for resource, actions in EventScopes.RESOURCES.items()
        for action in actions
    )
