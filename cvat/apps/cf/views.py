# Copyright (C) 2018 Intel Corporation
#
# SPDX-License-Identifier: MIT

from django.http import HttpResponseBadRequest, JsonResponse
from rules.contrib.views import permission_required, objectgetter

from cvat.apps.authentication.decorators import login_required
from cvat.apps.engine.log import slogger
from cvat.apps.engine import models

import django_rq
import json
