# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import requests
import sqlite3

from health_check.backends import BaseHealthCheckBackend
from health_check.exceptions import HealthCheckException
from health_check.exceptions import ServiceReturnedUnexpectedResult, ServiceUnavailable

from django.conf import settings
from django.core.cache import CacheKeyWarning, caches

from cvat.utils.http import make_requests_session

class OPAHealthCheck(BaseHealthCheckBackend):
    critical_service = True

    def check_status(self):
        opa_health_url = f'{settings.IAM_OPA_HOST}/health?bundles'
        try:
            with make_requests_session() as session:
                response = session.get(opa_health_url)
                response.raise_for_status()
        except requests.RequestException as e:
            raise HealthCheckException(str(e))

    def identifier(self):
        return self.__class__.__name__

class CustomCacheBackend(BaseHealthCheckBackend):
    def __init__(self, backend="default"):
        super().__init__()
        self.backend = backend

    def identifier(self):
        return f"Cache backend: {self.backend}"

    def check_status(self):
        try:
            cache = caches[self.backend]

            cache.set("djangohealtcheck_test", "itworks")
            if not cache.get("djangohealtcheck_test") == "itworks":
                raise ServiceUnavailable("Cache key does not match")
        except CacheKeyWarning as e:
            self.add_error(ServiceReturnedUnexpectedResult("Cache key warning"), e)
        except ValueError as e:
            self.add_error(ServiceReturnedUnexpectedResult("ValueError"), e)
        except ConnectionError as e:
            self.add_error(ServiceReturnedUnexpectedResult("Connection Error"), e)
        except sqlite3.DatabaseError as e:
            raise ServiceUnavailable("Cache error: {}".format(str(e)))
