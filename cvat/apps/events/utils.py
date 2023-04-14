# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from .cache import clear_cache

def _prepare_objects_to_delete(object_to_delete):
    from cvat.apps.engine.models import Project, Task, Segment, Job, Issue, Comment

    relation_chain = (Project, Task, Segment, Job, Issue, Comment)
    related_field_names = ('task_set', 'segment_set', 'job_set', 'issues', 'comments')
    field_names = tuple(m._meta.model_name for m in relation_chain)

    # Find object Model
    index = relation_chain.index(object_to_delete.__class__)

    # Need to prefetch 'next' Model objects in the chain
    index += 1
    if index >= len(relation_chain):
        return []

    # Fill filter param
    filter_params = {
        f'{object_to_delete.__class__._meta.model_name}_id': object_to_delete.id,
    }

    # Fill prefetch
    prefetch = []
    if index < len(relation_chain) - 1:
        forward_prefetch = '__'.join(related_field_names[index:])
        prefetch.append(forward_prefetch)

    if index > 0:
        backward_prefetch = '__'.join(reversed(field_names[:index]))
        prefetch.append(backward_prefetch)

    # make queryset
    objects = relation_chain[index].objects.filter(
        **filter_params
    ).prefetch_related(
        *prefetch
    )

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
