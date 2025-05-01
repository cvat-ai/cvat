# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import datetime
from contextlib import suppress
from typing import Optional

from django.db.models import Min

from .cache import clear_cache
from .const import COMPRESSED_EVENT_SCOPES, MAX_EVENT_DURATION


def _prepare_objects_to_delete(object_to_delete):
    from cvat.apps.engine.models import Comment, Issue, Job, Project, Segment, Task

    relation_chain = (Project, Task, Segment, Job, Issue, Comment)
    related_field_names = ("task_set", "segment_set", "job_set", "issues", "comments")
    field_names = tuple(m._meta.model_name for m in relation_chain)

    # Find object Model
    index = relation_chain.index(object_to_delete.__class__)

    # Need to prefetch 'next' Model objects in the chain
    index += 1
    if index >= len(relation_chain):
        return []

    # Fill filter param
    filter_params = {
        f"{object_to_delete.__class__._meta.model_name}_id": object_to_delete.id,
    }

    # Fill prefetch
    prefetch = []
    if index < len(relation_chain) - 1:
        forward_prefetch = "__".join(related_field_names[index:])
        prefetch.append(forward_prefetch)

    if index > 0:
        backward_prefetch = "__".join(reversed(field_names[:index]))
        prefetch.append(backward_prefetch)

    # make queryset
    objects = relation_chain[index].objects.filter(**filter_params).prefetch_related(*prefetch)

    # list of objects which will be deleted with current object
    objects_to_delete = list(objects)
    parents = objects
    for rn in related_field_names[index:]:
        related = [related for parent in parents for related in getattr(parent, rn).all()]
        objects_to_delete.extend(related)
        parents = related

    return objects_to_delete


def cache_deleted(method):
    def wrap(self, *args, **kwargs):
        from .signals import resource_delete

        objects = _prepare_objects_to_delete(self)
        try:
            for obj in objects:
                resource_delete(obj.__class__, obj, store_in_deletion_cache=True)

            method(self, *args, **kwargs)
        finally:
            clear_cache()

    return wrap


def get_end_timestamp(event: dict) -> datetime.datetime:
    if event["scope"] in COMPRESSED_EVENT_SCOPES:
        return event["timestamp"] + datetime.timedelta(milliseconds=event["duration"])
    return event["timestamp"]


def is_contained(event1: dict, event2: dict) -> bool:
    return event1["timestamp"] < get_end_timestamp(event2)


def compute_working_time_per_ids(data: dict) -> dict:
    def read_ids(event: dict) -> tuple[int | None, int | None, int | None]:
        return event.get("job_id"), event.get("task_id"), event.get("project_id")

    if previous_event := data["previous_event"]:
        previous_end_timestamp = get_end_timestamp(previous_event)
        previous_ids = read_ids(previous_event)
    elif data["events"]:
        previous_end_timestamp = data["events"][0]["timestamp"]
        previous_ids = read_ids(data["events"][0])

    working_time_per_ids = {}
    for event in data["events"]:
        working_time = datetime.timedelta()
        timestamp = event["timestamp"]

        if timestamp > previous_end_timestamp:
            t_diff = timestamp - previous_end_timestamp
            if t_diff < MAX_EVENT_DURATION:
                working_time += t_diff

            previous_end_timestamp = timestamp

        end_timestamp = get_end_timestamp(event)
        if end_timestamp > previous_end_timestamp:
            working_time += end_timestamp - previous_end_timestamp
            previous_end_timestamp = end_timestamp

        if previous_ids not in working_time_per_ids:
            working_time_per_ids[previous_ids] = {
                "value": datetime.timedelta(),
                "timestamp": timestamp,
            }

        working_time_per_ids[previous_ids]["value"] += working_time
        previous_ids = read_ids(event)

    return working_time_per_ids


def find_minimal_date_for_filter(
    job_id: Optional[str | int] = None,
    task_id: Optional[str | int] = None,
    project_id: Optional[str | int] = None,
    org_id: Optional[str | int] = None,
) -> datetime.datetime:
    from cvat.apps.engine.models import Job, Project, Task
    from cvat.apps.organizations.models import Organization

    for resource_id, Class in ((job_id, Job), (task_id, Task), (project_id, Project)):
        if resource_id:
            with suppress(Class.DoesNotExist):
                return Class.objects.get(pk=int(resource_id)).created_date

    if org_id:
        with suppress(Organization.DoesNotExist):
            # support cases when older resources have been transferred to the organization
            created_date = Organization.objects.get(pk=int(org_id)).created_date
            project_created_date = Project.objects.filter(organization_id=int(org_id)).aggregate(
                min_created_date=Min("created_date")
            )["min_created_date"]
            task_created_date = Task.objects.filter(organization_id=int(org_id)).aggregate(
                min_created_date=Min("created_date")
            )["min_created_date"]

            return min(
                date
                for date in (created_date, project_created_date, task_created_date)
                if date is not None
            )
    return datetime.datetime.fromtimestamp(0, datetime.timezone.utc)
