# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

import requests
import logging
import sys

from django.apps import AppConfig
from django.conf import settings


class EngineConfig(AppConfig):
    name = 'cvat.apps.engine'

    def ready(self):
        logging.debug(f"Starting CVAT with version: {settings.VERSION}")

        # Required to define signals in application
        import cvat.apps.engine.signals
        # Required in order to silent "unused-import" in pyflake
        assert cvat.apps.engine.signals

        self._track_version()

    def _track_version(self):
        if settings.VERSION_TRACKER_URL and not settings.DEBUG and 'mod_wsgi' in sys.argv:
            try:
                response = requests.post(settings.VERSION_TRACKER_URL, json={
                    'application': 'cvat',
                    'environment': settings.ENVIRONMENT,
                    'version': settings.VERSION,
                }, timeout=5)
                response.raise_for_status()
                logging.info(f"Version {settings.VERSION} tracked!")
            except Exception as exc:
                logging.warning(f"Failed to track version {settings.VERSION} with exception {exc}")
        else:
            logging.info("Version tracking is disabled.")
