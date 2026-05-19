# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

_caches = {}


def _default_cache_value():
    from cvat.apps.engine.models import Comment, Issue, Job, Task

    return {
        Task: {},
        Job: {},
        Issue: {},
        Comment: {},
    }


class DeleteCache:
    def __init__(self, cache_id):
        self._cache = _caches.setdefault(cache_id, _default_cache_value())

    def set(self, instance_class, instance_id, value):
        self._cache[instance_class][instance_id] = value

    def pop(self, instance_class, instance_id, default=None):
        if instance_class in self._cache and instance_id in self._cache[instance_class]:
            return self._cache[instance_class].pop(instance_id, default)

    def has_key(self, instance_class, instance_id):
        if instance_class in self._cache and instance_id in self._cache[instance_class]:
            return True
        return False

    def clear(self):
        self._cache.clear()
        self._cache.update(_default_cache_value())


def get_cache():
    from .handlers import request_info

    return DeleteCache(request_info()["id"])


def clear_cache():
    get_cache().clear()
