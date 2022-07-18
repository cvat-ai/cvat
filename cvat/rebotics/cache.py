from diskcache import Cache
from django.conf import settings


class CacheClient:
    def __init__(self, root=settings.CACHE_ROOT):
        self._cache = Cache(root)

    def __del__(self):
        self._cache.close()

    def get(self, key, default=None, **kwargs):
        return self._cache.get(key, default=default, **kwargs)

    def set(self, key, value, expire=settings.CACHE_EXPIRE, **kwargs):
        return self._cache.set(key, value, expire=expire, **kwargs)

    def delete(self, key, **kwargs):
        return self._cache.delete(key, **kwargs)

    def __contains__(self, key):
        return key in self._cache


default_cache = CacheClient()
