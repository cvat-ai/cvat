# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import copy
from enum import Enum
from django.utils import timezone
from collections import OrderedDict
import numpy as np
from scipy.optimize import linear_sum_assignment
from collections import OrderedDict
from distutils.util import strtobool
from xml.sax.saxutils import XMLGenerator
from abc import ABCMeta, abstractmethod
from PIL import Image

import django_rq
from django.conf import settings
from django.db import transaction

from cvat.apps.profiler import silk_profile
from cvat.apps.engine.plugins import plugin_decorator
from . import models
from .task import get_image_meta_cache
from .log import slogger

class PatchAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"

    def __str__(self):
        return self.value

@silk_profile(name="GET job data")
@transaction.atomic
def get_job_data(pk):
    return {}

@silk_profile(name="POST job data")
@transaction.atomic
def put_job_data(pk, data):
    pass

@silk_profile(name="UPDATE job data")
@transaction.atomic
def patch_job_data(pk, data, action):
    pass

@silk_profile(name="DELETE job data")
@transaction.atomic
def delete_job_data(pk, data=None):
    pass

@silk_profile(name="GET task data")
@transaction.atomic
def get_task_data(pk):
    return {}

@silk_profile(name="POST task data")
@transaction.atomic
def put_task_data(pk, data):
    pass

@silk_profile(name="UPDATE task data")
@transaction.atomic
def patch_task_data(pk, data, action):
    pass

@silk_profile(name="DELETE task data")
@transaction.atomic
def delete_task_data(pk, data=None):
    pass

