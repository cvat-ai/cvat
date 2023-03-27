# Copyright (C) 2023 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from threading import Lock

_caches = {}
_locks = {}

class DeleteCache():
    def __init__(self, cache_id):
        from cvat.apps.engine.models import Task, Job, Issue, Comment
        self._cache = _caches.setdefault(cache_id, {
            Task: {},
            Job: {},
            Issue: {},
            Comment: {},
        })
        self._lock = _locks.setdefault(cache_id, Lock())

    def set(self, instance_class, instance_id, value):
        with self._lock:
            self._cache[instance_class][instance_id] = value

    def pop(self, instance_class, instance_id, default=None):
        with self._lock:
            if instance_class in self._cache and \
                instance_id in self._cache[instance_class]:
                return self._cache[instance_class].pop(instance_id, default)

    def has_key(self, instance_class, instance_id):
        with self._lock:
            if instance_class in self._cache and \
                instance_id in self._cache[instance_class]:
                return True
            return False

    def clear(self):
        with self._lock:
            self._cache.clear()

def get_cache():
    from .handlers import request_id
    return DeleteCache(request_id())

def clear_cache():
    get_cache().clear()
