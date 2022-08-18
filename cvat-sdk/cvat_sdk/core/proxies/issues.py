# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from cvat_sdk.api_client import apis, models
from cvat_sdk.core.proxies.model_proxy import (
    ModelCreateMixin,
    ModelDeleteMixin,
    ModelListMixin,
    ModelRetrieveMixin,
    ModelUpdateMixin,
    build_model_bases,
)

_IssueEntityBase, _IssueRepoBase = build_model_bases(
    models.IssueRead, apis.IssuesApi, api_member_name="issues_api"
)


class Issue(
    models.IIssueRead,
    _IssueEntityBase,
    ModelUpdateMixin[models.IPatchedIssueWriteRequest],
    ModelDeleteMixin,
):
    _model_partial_update_arg = "patched_issue_write_request"


class IssuesRepo(
    _IssueRepoBase,
    ModelListMixin[Issue],
    ModelCreateMixin[Issue, models.IIssueWriteRequest],
    ModelRetrieveMixin[Issue],
):
    _entity_type = Issue
