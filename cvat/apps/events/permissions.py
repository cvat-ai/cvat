# Copyright (C) 2022 Intel Corporation
# Copyright (C) 2022-2024 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from django.conf import settings

from rest_framework.exceptions import PermissionDenied

from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum
from cvat.utils.http import make_requests_session

class EventsPermission(OpenPolicyAgentPermission):
    class Scopes(StrEnum):
        SEND_EVENTS = 'send:events'
        DUMP_EVENTS = 'dump:events'

    @classmethod
    def create(cls, request, view, obj, iam_context):
        permissions = []
        if view.basename == 'events':
            for scope in cls.get_scopes(request, view, obj):
                self = cls.create_base_perm(request, view, scope, iam_context, obj)
                permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + '/events/allow'

    def filter(self, query_params):
        url = self.url.replace('/allow', '/filter')

        with make_requests_session() as session:
            r = session.post(url, json=self.payload).json()['result']

        filter_params = query_params.copy()
        for query in r:
            for attr, value in query.items():
                if filter_params.get(attr, value) != value:
                    raise PermissionDenied(f"You don't have permission to view events with {attr}={filter_params.get(attr)}")
                else:
                    filter_params[attr] = value
        return filter_params

    @staticmethod
    def get_scopes(request, view, obj):
        Scopes = __class__.Scopes
        return [{
            ('create', 'POST'): Scopes.SEND_EVENTS,
            ('list', 'GET'): Scopes.DUMP_EVENTS,
        }.get((view.action, request.method))]

    def get_resource(self):
        return None
