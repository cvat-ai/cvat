# Copyright (C) 2018-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT

# Inherit parent config
from .base import *  # pylint: disable=wildcard-import

DEBUG = False

NUCLIO["HOST"] = os.getenv("CVAT_NUCLIO_HOST", "nuclio")

# Django-sendfile:
# https://github.com/moggers87/django-sendfile2
SENDFILE_BACKEND = "django_sendfile.backends.nginx"
SENDFILE_URL = "/"

LOGGING["formatters"]["verbose_uvicorn_access"] = {
    "()": "uvicorn.logging.AccessFormatter",
    "format": '[{asctime}] {levelprefix} {client_addr} - "{request_line}" {status_code}',
    "style": "{",
}
LOGGING["handlers"]["verbose_uvicorn_access"] = {
    "formatter": "verbose_uvicorn_access",
    "class": "logging.StreamHandler",
    "stream": "ext://sys.stdout",
}
LOGGING["loggers"]["uvicorn.access"] = {
    "handlers": ["verbose_uvicorn_access"],
    "level": "INFO",
    "propagate": False,
}
