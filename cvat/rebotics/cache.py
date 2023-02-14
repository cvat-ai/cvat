import redis
import json
from django.conf import settings


class CacheClient:
    def __init__(self, root=settings.CACHE_ROOT):
        self.root = root
        self._cache = redis.Redis.from_url(settings.REDIS_URL)

    def __del__(self):
        self._cache.close()

    def get(self, key, default=None, tag=False):
        data = self._cache.get(key)
        data = {'value': default} if data is None else json.loads(data)
        if tag:
            return data['value'], data.get('tag', None)
        return data['value']

    def set(self, key, value, expire=settings.CACHE_EXPIRE, tag=None):
        data = {'value': value}
        if tag:
            data['tag'] = tag
        return self._cache.set(key, json.dumps(data), ex=expire)

    def delete(self, key):
        return self._cache.delete(key)

    def __contains__(self, key):
        return key in self._cache


default_cache = CacheClient()
