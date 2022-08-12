# Copyright (C) 2020-2022 Intel Corporation
# Copyright (C) 2022 CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

from __future__ import annotations

from cvat_sdk import apis, models
from cvat_sdk.impl.model_proxy import ModelCrudMixin, ModelProxy


class IssueProxy(
    models.IIssueRead,
    ModelProxy[models.IIssueRead, models.IssueRead, apis.IssuesApi],
    ModelCrudMixin,
):
    _api_member_name = "issues_api"
    _model_partial_update_arg = "patched_issue_write_request"
