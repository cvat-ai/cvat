# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from cvat_sdk.api_client import apis, models
from cvat_sdk.core.model_proxy import (
    Entity,
    ModelCreateMixin,
    ModelDeleteMixin,
    ModelListMixin,
    ModelProxy,
    ModelRetrieveMixin,
    ModelUpdateMixin,
    Repo,
)


class _IssueProxy(ModelProxy[models.IssueRead, apis.IssuesApi]):
    _api_member_name = "issues_api"


class Issue(models.IIssueRead, _IssueProxy, Entity, ModelUpdateMixin, ModelDeleteMixin):
    _model_partial_update_arg = "patched_issue_write_request"


class IssuesRepo(
    _IssueProxy,
    Repo,
    ModelListMixin[Issue],
    ModelCreateMixin[Issue],
    ModelRetrieveMixin[Issue],
):
    _entity_type = Issue
