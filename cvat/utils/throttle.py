from rest_framework.throttling import AnonRateThrottle
from django.core.cache import caches


class SharedCacheThrottle(AnonRateThrottle):
    cache = caches["shared"]


class CVATAnonRateThrottle(SharedCacheThrottle, AnonRateThrottle):
    pass
