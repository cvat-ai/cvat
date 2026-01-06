# Copyright (C) 2022 Intel Corporation
# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from typing import Any

from django.conf import settings
from rest_framework.exceptions import PermissionDenied

from cvat.apps.engine.permissions import DownloadExportedExtension
from cvat.apps.engine.types import ExtendedRequest
from cvat.apps.iam.permissions import OpenPolicyAgentPermission, StrEnum
from cvat.utils.http import make_requests_session


class EventsPermission(OpenPolicyAgentPermission, DownloadExportedExtension):
    class Scopes(StrEnum):
        SEND_EVENTS = "send:events"
        DUMP_EVENTS = "dump:events"

    @classmethod
    def create(
        cls, request: ExtendedRequest, view, obj: None, iam_context: dict[str, Any]
    ) -> list[OpenPolicyAgentPermission]:
        permissions = []
        for scope in cls.get_scopes(request, view, obj):
            scope_params = {}
            if DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE == scope:
                cls.extend_params_with_rq_job_details(request=request, params=scope_params)

            self = cls.create_base_perm(request, view, scope, iam_context, obj, **scope_params)
            permissions.append(self)

        return permissions

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.url = settings.IAM_OPA_DATA_URL + "/events/allow"

    def filter(self, query_params: dict[str, Any]):
        url = self.url.replace("/allow", "/filter")

        with make_requests_session() as session:
            r = session.post(url, json=self.payload).json()["result"]

        filter_params = query_params.copy()
        for query in r:
            for attr, value in query.items():
                if str(filter_params.get(attr, value)) != str(value):
                    raise PermissionDenied(
                        f"You don't have permission to view events with {attr}={filter_params.get(attr)}"
                    )
                else:
                    filter_params[attr] = str(value)
        return filter_params

    @classmethod
    def _get_scopes(cls, request: ExtendedRequest, view, obj: None):
        Scopes = cls.Scopes
        return [
            {
                ("create", "POST"): Scopes.SEND_EVENTS,
                ("initiate_export", "POST"): Scopes.DUMP_EVENTS,
                ("download_file", "GET"): DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE,
                # deprecated permissions:
                ("list", "GET"): Scopes.DUMP_EVENTS,
            }[(view.action, request.method)]
        ]

    def get_resource(self):
        data = None

        if DownloadExportedExtension.Scopes.DOWNLOAD_EXPORTED_FILE == self.scope:
            data = {}
            self.extend_resource_with_rq_job_details(data)

        return data
